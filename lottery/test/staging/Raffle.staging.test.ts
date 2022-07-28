import { assert, expect } from "chai"
// @ts-ignore
import { getNamedAccounts, ethers, network } from "hardhat"
import { developmentChains } from "../../helper-hardhat-config"
import { BigNumber } from "ethers"
import { Raffle } from "../../typechain-types"

developmentChains.includes(network.name)
? describe.skip
: describe("Raffle Staging Tests", function () {
    let raffle: Raffle
    let raffleEntranceFee: BigNumber
    let deployer: string

        beforeEach(async function () {
            deployer = (await getNamedAccounts()).deployer
            raffle = await ethers.getContract("Raffle", deployer)
            raffleEntranceFee = await raffle.getEntranceFee()
        })

        describe("fulfillRandomWords", function () {
            it("works with live Chainlink Keepers and Chainlink VRF, we get a random winner", async function () {
                // enter the raffle
                console.log("Setting up test...")
                const startingTimeStamp = await raffle.getLastTimeStamp()
                const accounts = await ethers.getSigners()

                console.log("Setting up Listener...")
                await new Promise<void>(async (resolve, reject) => {
                    // setup listener before we enter the raffle
                    // Just in case the blockchain moves REALLY fast
                    raffle.once("WinnerPicked", async () => {
                        console.log("WinnerPicked event fired!")
                        try {
                            // add our asserts here
                            const recentWinner = await raffle.getRecentWinner()
                            const raffleState = await raffle.getRaffleState()
                            const winnerEndingBalance = await accounts[0].getBalance()
                            const endingTimeStamp = await raffle.getLastTimeStamp()

                            await expect(raffle.getPlayer(0)).to.be.reverted
                            assert.equal(recentWinner.toString(), accounts[0].address)
                            assert.equal(raffleState, 0)
                            assert.equal(
                                winnerEndingBalance.toString(),
                                winnerStartingBalance.add(raffleEntranceFee).toString()
                            )
                            assert(endingTimeStamp > startingTimeStamp)
                            resolve()
                        } catch (error) {
                            console.log(error)
                            reject(error)
                        }
                    })
                    // Then entering the raffle
                    console.log("Entering Raffle...")
                    await raffle.enterRaffle({ value: raffleEntranceFee })
                    console.log("Ok, time to wait...")
                    const winnerStartingBalance = await accounts[0].getBalance()

                    // and this code WONT complete until our listener has finished listening!
                })
            })
        })
    })
