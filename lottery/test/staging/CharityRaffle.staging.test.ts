const { assert, expect } = require("chai")
const { getNamedAccounts, ethers, network } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")
import { BigNumber } from "ethers"
import { CharityRaffle } from "../../typechain-types"

developmentChains.includes(network.name)
    ? describe.skip
    : describe("CharityRaffle Staging Tests", function () {
          let charityRaffle: CharityRaffle
          let raffleEntranceFee: BigNumber
          let deployer: string
          let duration: number

          beforeEach(async function () {
              deployer = (await getNamedAccounts()).deployer
              charityRaffle = await ethers.getContract("CharityRaffle", deployer)
              raffleEntranceFee = await charityRaffle.getEntranceFee()
              duration = (await charityRaffle.getDuration()).toNumber()
          })

          describe("fulfillRandomWords", function () {
              it("works with live Chainlink Keepers and Chainlink VRF, we get a random winner", async function () {
                  // enter the raffle
                  console.log("Setting up test...")
                  const startingTimeStamp = await charityRaffle.getStartTime()
                  const accounts = await ethers.getSigners()

                  console.log("Setting up Listener...")
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
                              assert.equal(raffleState, 0)
                              assert.equal(
                                  winnerEndingBalance.toString(),
                                  winnerStartingBalance.add(raffleEntranceFee).toString()
                              )
                              resolve()
                          } catch (error) {
                              console.log(error)
                              reject(error)
                          }
                      })
                      // Then entering the raffle
                      console.log("Entering Raffle...")
                      await charityRaffle.enterRaffle(1, { value: raffleEntranceFee })
                      console.log("Ok, time to wait...")
                      const winnerStartingBalance = await accounts[0].getBalance()

                      // and this code WONT complete until our listener has finished listening!
                  })
              })
          })
      })
