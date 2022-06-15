import { assert, expect } from "chai"
// @ts-ignore
import { getNamedAccounts, ethers, network } from "hardhat"
import { developmentChains } from "../../helper-hardhat-config"
import { BigNumber } from "ethers"
import { CharityRaffle } from "../../typechain-types"

developmentChains.includes(network.name)
? describe.skip
: describe("CharityRaffle Staging Tests", function () {
        let charityRaffle: CharityRaffle
        let raffleEntranceFee: BigNumber
        let jackpot: BigNumber
        let deployer: string
        let duration: number
        let charity1: string

        beforeEach(async function () {
            deployer = (await getNamedAccounts()).deployer
            charityRaffle = await ethers.getContract("CharityRaffle", deployer)
            raffleEntranceFee = await charityRaffle.getEntranceFee()
            jackpot = await charityRaffle.getJackpot()
            duration = (await charityRaffle.getDuration()).toNumber()
            const charities = await charityRaffle.getCharities()
            charity1 = charities[0]
        })

        describe("CharityRaffle fulfillRandomWords", function () {
            it("works with live Chainlink Keepers and Chainlink VRF, we get a random winner", async function () {
                // enter the raffle
                console.log("Setting up test...")
                const startingTimeStamp = await charityRaffle.getStartTime()
                const accounts = await ethers.getSigners()

                console.log("Setting up Player Winner Listener...")
                await new Promise<void>(async (resolve, reject) => {
                    // setup listener before we enter the raffle
                    // Just in case the blockchain moves REALLY fast
                    charityRaffle.once("WinnerPicked", async () => {
                        console.log("WinnerPicked event fired!")
                        try {
                            // add our asserts here
                            const recentWinner = await charityRaffle.getRecentWinner()
                            const raffleState = await charityRaffle.getRaffleState()
                            const winnerEndingBalance = await accounts[0].getBalance()
                            const blockNum = await ethers.provider.getBlockNumber()
                            const endingBlock = await ethers.provider.getBlock(blockNum)
                            const endingTimestamp = endingBlock.timestamp
                            expect(endingTimestamp).to.be.greaterThan(
                                startingTimeStamp.add(duration).toNumber()
                            )

                            await expect(charityRaffle.getPlayer(0)).to.be.reverted
                            assert.equal(recentWinner.toString(), accounts[0].address)
                            assert.equal(raffleState, 2)
                            assert.equal(
                                winnerEndingBalance.toString(),
                                winnerStartingBalance.add(jackpot).toString()
                            )
                            resolve()
                        } catch (error) {
                            console.log(error)
                            reject(error)
                        }
                    })
                    // Then entering the raffle
                    console.log("Entering Raffle...")
                    await charityRaffle.enterRaffle(0, { value: raffleEntranceFee })
                    console.log("Ok, time to wait...")
                    // accounts[0] = deployer
                    const winnerStartingBalance = await accounts[0].getBalance()
                    // and this code WONT complete until our listener has finished listening!
                })
            })
            it("we get a charity winner and match donation", async function () {
                console.log("Setting up Charity Winner Listener...")
                await new Promise<void>(async (resolve, reject) => {
                    charityRaffle.once("CharityWinnerPicked", async () => {
                        console.log("CharityWinnerPicked event fired!")
                        try {
                            // verify we have a charity winner
                            const charityWinner = await charityRaffle.getCharityWinner()
                            console.log(`We have a charity winner! ${charityWinner}`)
                            const raffleState = await charityRaffle.getRaffleState()
                            assert.equal(raffleState, 2)
                            assert.equal(charityWinner, charity1)
                            // get donation match
                            const highestDonations = await charityRaffle.getHighestDonations()
                            const donationMatch = highestDonations.mul(raffleEntranceFee)
                            // fund the contract
                            console.log("funding contract with donation match ...")
                            const fundTx = await charityRaffle.fundDonationMatch({
                                value: donationMatch,
                            })
                            await fundTx.wait(1)
                            // match the donations of the winning charity
                            console.log("sending donation match to winning charity ...")
                            const matchTx = await charityRaffle.donationMatch()
                            await matchTx.wait(1)
                            // check for successful transfer
                            const charityWinnerEndingBalance = await ethers.provider.getBalance(
                                charity1
                            )
                            const contractBalance = await ethers.provider.getBalance(
                                charityRaffle.address
                            )
                            assert.equal(
                                charityWinnerEndingBalance.toString(),
                                charityWinnerStartingBalance.add(donationMatch).toString()
                            )
                            assert.equal(contractBalance.toString(), "0")
                            console.log("matched donations!")
                            // Check for resets
                            const highestDonation: BigNumber =
                                await charityRaffle.getHighestDonations()
                            assert(highestDonation.eq(ethers.constants.Zero))
                            assert.equal(
                                await charityRaffle.getCharityWinner(),
                                ethers.constants.AddressZero
                            )
                            assert.equal(
                                await charityRaffle.getRecentWinner(),
                                ethers.constants.AddressZero
                            )
                            console.log("success!")
                            resolve()
                        } catch (error) {
                            console.log(error)
                            reject(error)
                        }
                    })
                    console.log("Waiting for Charity Winner ...")
                    const charityWinnerStartingBalance = await ethers.provider.getBalance(
                        charity1
                    )
                })
            })
        })
    })
