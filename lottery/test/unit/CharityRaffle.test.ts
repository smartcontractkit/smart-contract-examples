import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { assert, expect } from "chai"
import { BigNumber } from "ethers"
// @ts-ignore
import { network, deployments, ethers } from "hardhat"
import { developmentChains, networkConfig } from "../../helper-hardhat-config"
import { CharityRaffle, VRFCoordinatorV2Mock } from "../../typechain-types"

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Charity Raffle Unit Tests", function () {
        let charityRaffle: CharityRaffle
        let charityRaffleContract: CharityRaffle
        let vrfCoordinatorV2Mock: VRFCoordinatorV2Mock
        let raffleEntranceFee: BigNumber
        let duration: number
        let deployer: SignerWithAddress
        let player1: SignerWithAddress
        let player2: SignerWithAddress
        let charity1: SignerWithAddress
        let charity2: SignerWithAddress
        let charity3: SignerWithAddress
        let accounts: SignerWithAddress[]

        beforeEach(async () => {
            accounts = await ethers.getSigners()
            deployer = accounts[0]
            player1 = accounts[1]
            player2 = accounts[2]
            charity1 = accounts[3]
            charity2 = accounts[4]
            charity3 = accounts[5]
            await deployments.fixture(["mocks", "charity-raffle"])
            vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
            charityRaffleContract = await ethers.getContract("CharityRaffle")
            charityRaffle = charityRaffleContract.connect(deployer)
            raffleEntranceFee = await charityRaffle.getEntranceFee()
            duration = (await charityRaffle.getDuration()).toNumber()
        })

        describe("constructor", function () {
            it("intitiallizes the charity raffle correctly", async () => {
                console.log(network.config.chainId)
                const raffleState = (await charityRaffle.getRaffleState()).toString()
                assert.equal(raffleState, "0")
                assert.equal(
                    duration.toString(),
                    networkConfig[network.config.chainId!]["charityRaffleDuration"]
                )
                const charities: string[] = await charityRaffle.getCharities()
                assert.equal(charities[0], charity1.address)
                assert.equal(charities[1], charity2.address)
                assert.equal(charities[2], charity3.address)
                assert.equal(await charityRaffle.getFundingWallet(), deployer.address)
                const jackpot = (await charityRaffle.getJackpot()).toString()
                assert.equal(jackpot, networkConfig[network.config.chainId!]["jackpot"])
                // check contract funded with jackpot on initilization
                const contractBalance: BigNumber = await ethers.provider.getBalance(
                    charityRaffle.address
                )
                assert.equal(contractBalance.toString(), jackpot)
            })
        })

        describe("enterCharityRaffle", function () {
            it("reverts when you don't pay enough", async () => {
                await expect(charityRaffle.enterRaffle(1)).to.be.revertedWith(
                    "CharityRaffle__SendMoreToEnterRaffle"
                )
            })
            it("records new charity raffle player when they enter", async () => {
                charityRaffle = charityRaffleContract.connect(player1)
                const charity1StartingBalance = await charity1.getBalance()
                await charityRaffle.enterRaffle(1, { value: raffleEntranceFee })
                const contractPlayer = await charityRaffle.getPlayer(0)
                assert.equal(player1.address, contractPlayer)
                // really should be separate test
                assert.equal(((charity1StartingBalance).add(raffleEntranceFee)).toString(), (await charity1.getBalance()).toString())
            })
            it("donates enterance fee to chosen charity", async () => {
                // ideally would test one at a time, but tested above
                const charity1StartingBalance = await charity1.getBalance()
                const charity2StartingBalance = await charity2.getBalance()
                const charity3StartingBalance = await charity3.getBalance()
                const charity1Donation = await charityRaffleContract
                    .connect(deployer)
                    .enterRaffle(1, { value: raffleEntranceFee })
                charity1Donation.wait()
                const charity2Donation = await charityRaffleContract
                    .connect(player1)
                    .enterRaffle(2, { value: raffleEntranceFee })
                charity2Donation.wait()
                const charity3Donation = await charityRaffleContract
                    .connect(player2)
                    .enterRaffle(3, { value: raffleEntranceFee })
                charity3Donation.wait()
                const charity1EndingBalance = await charity1.getBalance()
                const charity2EndingBalance = await charity2.getBalance()
                const charity3EndingBalance = await charity3.getBalance()
                assert.equal((
                    charity1StartingBalance.add(raffleEntranceFee)).toString(),
                    charity1EndingBalance.toString()
                )
                assert.equal((
                    charity2StartingBalance.add(raffleEntranceFee)).toString(),
                    charity2EndingBalance.toString()
                )
                assert.equal((
                    charity3StartingBalance.add(raffleEntranceFee)).toString(),
                    charity3EndingBalance.toString()
                )
            })
            it("CharityRaffle emits event on enter", async () => {
                await expect(charityRaffle.enterRaffle(2, { value: raffleEntranceFee })).to.emit(
                    charityRaffle,
                    "RaffleEnter"
                )
            })
            it("CharityRaffle doesn't allow entrance when raffle is calculating", async () => {
                await charityRaffle.enterRaffle(3, { value: raffleEntranceFee })
                await network.provider.send("evm_increaseTime", [duration + 1])
                await network.provider.request({ method: "evm_mine", params: [] })
                // we pretend to be a keeper for a second
                await charityRaffle.performUpkeep([])
                await expect(charityRaffle.enterRaffle(3, { value: raffleEntranceFee })).to.be.revertedWith(
                    "CharityRaffle__RaffleNotOpen"
                )
            })
        })
        describe("CharityRaffle checkUpkeep", function () {
            it("CharityRaffle checkUpKeep returns false if people haven't sent any ETH", async () => {
                await network.provider.send("evm_increaseTime", [duration + 1])
                await network.provider.request({ method: "evm_mine", params: [] })
                const { upkeepNeeded } = await charityRaffle.callStatic.checkUpkeep("0x")
                assert(!upkeepNeeded)
            })
            it("CharityRaffle checkUpKeep returns false if raffle isn't open", async () => {
                await charityRaffle.enterRaffle(1, { value: raffleEntranceFee })
                await network.provider.send("evm_increaseTime", [duration + 1])
                await network.provider.request({ method: "evm_mine", params: [] })
                await charityRaffle.performUpkeep([])
                const raffleState = await charityRaffle.getRaffleState()
                const { upkeepNeeded } = await charityRaffle.callStatic.checkUpkeep("0x")
                assert.equal(raffleState.toString() == "1", upkeepNeeded == false)
            })
            it("CharityRaffle checkUpKeep returns false if enough time hasn't passed", async () => {
                await charityRaffle.enterRaffle(1, { value: raffleEntranceFee })
                await network.provider.send("evm_increaseTime", [duration - 10])
                await network.provider.request({ method: "evm_mine", params: [] })
                const { upkeepNeeded } = await charityRaffle.callStatic.checkUpkeep("0x")
                assert(!upkeepNeeded)
            })
            it("CharityRaffle checkUpKeep returns true if enough time has passed, has players, eth, and is open", async () => {
                await charityRaffle.enterRaffle(1, { value: raffleEntranceFee })
                await network.provider.send("evm_increaseTime", [duration + 1])
                await network.provider.request({ method: "evm_mine", params: [] })
                const { upkeepNeeded } = await charityRaffle.callStatic.checkUpkeep("0x")
                assert(upkeepNeeded)
            })
        })

        describe("CharityRaffle performUpkeep", function () {
            it("can only run if checkupkeep is true", async () => {
                await charityRaffle.enterRaffle(1, { value: raffleEntranceFee })
                await network.provider.send("evm_increaseTime", [duration + 1])
                await network.provider.request({ method: "evm_mine", params: [] })
                const tx = await charityRaffle.performUpkeep("0x")
                assert(tx)
            })
            it("reverts if checkup is false", async () => {
                await expect(charityRaffle.performUpkeep("0x")).to.be.revertedWith(
                    "CharityRaffle__UpkeepNotNeeded"
                )
            })
            it("updates the raffle state and emits a requestId", async () => {
                await charityRaffle.enterRaffle(1, { value: raffleEntranceFee })
                await network.provider.send("evm_increaseTime", [duration + 1])
                await network.provider.request({ method: "evm_mine", params: [] })
                const txResponse = await charityRaffle.performUpkeep("0x")
                const txReceipt = await txResponse.wait(1)
                const raffleState = await charityRaffle.getRaffleState()
                const requestId = txReceipt!.events![1].args!.requestId
                assert(requestId.toNumber() > 0)
                assert(raffleState == 1)
            })
        })
          // describe("fulfillRandomWords", function () {
          //     beforeEach(async () => {
          //         await raffle.enterRaffle({ value: raffleEntranceFee })
          //         await network.provider.send("evm_increaseTime", [interval + 1])
          //         await network.provider.request({ method: "evm_mine", params: [] })
          //     })
          //     it("can only be called after performupkeep", async () => {
          //         await expect(
          //             vrfCoordinatorV2Mock.fulfillRandomWords(0, raffle.address)
          //         ).to.be.revertedWith("nonexistent request")
          //         await expect(
          //             vrfCoordinatorV2Mock.fulfillRandomWords(1, raffle.address)
          //         ).to.be.revertedWith("nonexistent request")
          //     })
          //     // This test is too big...
          //     it("picks a winner, resets, and sends money", async () => {
          //         const additionalEntrances = 3
          //         const startingIndex = 2
          //         for (let i = startingIndex; i < startingIndex + additionalEntrances; i++) {
          //             raffle = raffleContract.connect(accounts[i])
          //             await raffle.enterRaffle({ value: raffleEntranceFee })
          //         }
          //         const startingTimeStamp = await raffle.getLastTimeStamp()

          //         // This will be more important for our staging tests...
          //         await new Promise<void>(async (resolve, reject) => {
          //             raffle.once("WinnerPicked", async () => {
          //                 console.log("WinnerPicked event fired!")
          //                 // assert throws an error if it fails, so we need to wrap
          //                 // it in a try/catch so that the promise returns event
          //                 // if it fails.
          //                 try {
          //                     // Now lets get the ending values...
          //                     const recentWinner = await raffle.getRecentWinner()
          //                     const raffleState = await raffle.getRaffleState()
          //                     const winnerBalance = await accounts[2].getBalance()
          //                     const endingTimeStamp = await raffle.getLastTimeStamp()
          //                     await expect(raffle.getPlayer(0)).to.be.reverted
          //                     assert.equal(recentWinner.toString(), accounts[2].address)
          //                     assert.equal(raffleState, 0)
          //                     assert.equal(
          //                         winnerBalance.toString(),
          //                         startingBalance
          //                             .add(
          //                                 raffleEntranceFee
          //                                     .mul(additionalEntrances)
          //                                     .add(raffleEntranceFee)
          //                             )
          //                             .toString()
          //                     )
          //                     assert(endingTimeStamp > startingTimeStamp)
          //                     resolve()
          //                 } catch (e) {
          //                     reject(e)
          //                 }
          //             })

          //             const tx = await raffle.performUpkeep("0x")
          //             const txReceipt = await tx.wait(1)
          //             const startingBalance = await accounts[2].getBalance()
          //             await vrfCoordinatorV2Mock.fulfillRandomWords(
          //                 txReceipt!.events![1].args!.requestId,
          //                 raffle.address
          //             )
          //         })
          //     })
          // })
      })
