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
        let jackpot: string
        let deployer: SignerWithAddress
        let player1: SignerWithAddress
        let player2: SignerWithAddress
        let charity1: SignerWithAddress
        let charity2: SignerWithAddress
        let charity3: SignerWithAddress
        let fundingWallet: string;
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
            jackpot = (await charityRaffle.getJackpot()).toString()
            fundingWallet = (await charityRaffle.getFundingWallet())
        })

        describe("CharityRaffle constructor", function () {
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
                assert.equal(fundingWallet, deployer.address)
                assert.equal(jackpot, networkConfig[network.config.chainId!]["jackpot"])
            })
            it("funds the contract with the jackpot", async () => {
                const contractBalance: BigNumber = await ethers.provider.getBalance(charityRaffle.address)
                assert.equal(contractBalance.toString(), jackpot)
            })
        })
        describe("enterCharityRaffle", function () {
            it("CharityRaffle reverts when you don't pay enough", async () => {
                await expect(charityRaffle.enterRaffle(1)).to.be.revertedWith(
                    "CharityRaffle__SendMoreToEnterRaffle"
                )
            })
            it("CharityRaffle doesn't allow entrance when raffle is calculating", async () => {
                await charityRaffle.enterRaffle(3, { value: raffleEntranceFee })
                await network.provider.send("evm_increaseTime", [duration + 1])
                await network.provider.request({ method: "evm_mine", params: [] })
                // we pretend to be a keeper for a second
                await charityRaffle.performUpkeep([])
                await expect(
                    charityRaffle.enterRaffle(3, { value: raffleEntranceFee })
                ).to.be.revertedWith("CharityRaffle__RaffleNotOpen")
            })
            it("records new charity raffle player when they enter", async () => {
                charityRaffle = charityRaffleContract.connect(player1)
                await charityRaffle.enterRaffle(1, { value: raffleEntranceFee })
                const contractPlayer = await charityRaffle.getPlayer(0)
                assert.equal(player1.address, contractPlayer)
                
            })
            it("donates to charity and increases donation count", async () => {
                const charity1StartingBalance = await charity1.getBalance()
                charityRaffle = charityRaffleContract.connect(player1)
                await charityRaffle.enterRaffle(1, { value: raffleEntranceFee })
                assert.equal(
                    charity1StartingBalance.add(raffleEntranceFee).toString(),
                    (await charity1.getBalance()).toString()
                )
                expect( await charityRaffle.getDonations(charity1.address)).to.equal("1")
            })
            it("donates enterance fee to chosen charity", async () => {
                // ideally would test one at a time, but tested once above
                const charity1StartingBalance: BigNumber= await charity1.getBalance()
                const charity2StartingBalance: BigNumber = await charity2.getBalance()
                const charity3StartingBalance: BigNumber = await charity3.getBalance()
                await charityRaffleContract.enterRaffle(1, { value: raffleEntranceFee })
                await charityRaffleContract.connect(player1).enterRaffle(2, { value: raffleEntranceFee })
                await charityRaffleContract.connect(player2).enterRaffle(3, { value: raffleEntranceFee })
                const charity1EndingBalance: BigNumber = await charity1.getBalance()
                const charity2EndingBalance: BigNumber = await charity2.getBalance()
                const charity3EndingBalance: BigNumber = await charity3.getBalance()
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
                expect(await charityRaffle.getDonations(charity1.address)).to.equal("1")
                expect(await charityRaffle.getDonations(charity2.address)).to.equal("1")
                expect(await charityRaffle.getDonations(charity3.address)).to.equal("1")
            })
            it("CharityRaffle emits event on enter", async () => {
                await expect(charityRaffle.enterRaffle(2, { value: raffleEntranceFee })).to.emit(
                    charityRaffle,
                    "RaffleEnter"
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
        describe("CharityRaffle fulfillRandomWords", function () {
            beforeEach(async () => {
                await charityRaffle.enterRaffle(1, { value: raffleEntranceFee })
                await network.provider.send("evm_increaseTime", [duration + 1])
                await network.provider.request({ method: "evm_mine", params: [] })
            })
            it("can only be called after performupkeep", async () => {
                await expect(
                    vrfCoordinatorV2Mock.fulfillRandomWords(0, charityRaffle.address)
                ).to.be.revertedWith("nonexistent request")
                await expect(
                    vrfCoordinatorV2Mock.fulfillRandomWords(1, charityRaffle.address)
                ).to.be.revertedWith("nonexistent request")
            })
            it("picks a winner, resets, and sends money", async () => {
                await charityRaffleContract.connect(player1).enterRaffle(2, { value: raffleEntranceFee })
                await charityRaffleContract.connect(player2).enterRaffle(3, { value: raffleEntranceFee })
                const startingTimeStamp = await charityRaffle.getStartTime()
                await new Promise<void>(async (resolve, reject) => {
                    charityRaffle.once("WinnerPicked", async () => {
                        console.log("WinnerPicked event fired!")
                        try {
                            const recentWinner = await charityRaffle.getRecentWinner()
                            // console.log(recentWinner)
                            // console.log(deployer.address)
                            // console.log(player1.address)
                            // console.log(player2.address) -> winner
                            const raffleState = await charityRaffle.getRaffleState()
                            const winnerBalance = await player2.getBalance()
                            await expect(charityRaffle.getPlayer(0)).to.be.reverted
                            assert.equal(recentWinner.toString(), player2.address)
                            assert.equal(raffleState, 2)
                            assert.equal(winnerBalance.toString(),
                                (startingBalance.add(jackpot)).toString()
                            )
                            const contractBalance = await ethers.provider.getBalance(charityRaffle.address)
                            assert.equal(contractBalance.toString(), "0")
                            const blockNum = await ethers.provider.getBlockNumber()
                            const endingBlock = await ethers.provider.getBlock(blockNum)
                            const endingTimestamp = endingBlock.timestamp
                            expect(endingTimestamp).to.be.greaterThan(startingTimeStamp.add(duration).toNumber())
                            resolve()
                        } catch (e) {
                            reject(e)
                        }
                    })
                    const tx = await charityRaffle.performUpkeep("0x")
                    const txReceipt = await tx.wait(1)
                    const startingBalance = await player2.getBalance()
                    await vrfCoordinatorV2Mock.fulfillRandomWords(
                        txReceipt!.events![1].args!.requestId,
                        charityRaffle.address
                    )
                })
            })
            it("picks a charity winner without tie", async () => {
                await new Promise<void>(async (resolve, reject) => {
                    charityRaffle.once("CharityWinnerPicked", async () => {
                        console.log("CharityWinnerPicked event fired!")
                        try {
                            const charityWinner = await charityRaffle.getCharityWinner()
                            const raffleState = await charityRaffle.getRaffleState()
                            const charityWinnerBalance = await charity1.getBalance()
                            assert.equal(charityWinner.toString(), charity1.address)
                            assert.equal(raffleState, 2)
                            assert.equal(
                                charityWinnerBalance.toString(),
                                startingBalance.add(raffleEntranceFee).toString()
                            )
                            assert.equal((await charityRaffle.getHighestDonations()).toString(), "1")
                            resolve()
                        } catch (e) {
                            reject(e)
                        }
                    })
                    const tx = await charityRaffle.performUpkeep("0x")
                    const txReceipt = await tx.wait(1)
                    const startingBalance = await charity1.getBalance()
                    await vrfCoordinatorV2Mock.fulfillRandomWords(
                        txReceipt!.events![1].args!.requestId,
                        charityRaffle.address
                    )
                })
            })
        })
    })
