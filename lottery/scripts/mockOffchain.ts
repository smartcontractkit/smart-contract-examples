// @ts-ignore
import { ethers, network } from "hardhat"
import { Raffle } from "../typechain-types"
import { BigNumber } from "ethers"

async function mockKeepers() {
    const raffle: Raffle = await ethers.getContract("Raffle")
    const checkData = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(""))
    const { upkeepNeeded } = await raffle.callStatic.checkUpkeep(checkData)
    if (upkeepNeeded) {
        const tx = await raffle.performUpkeep(checkData)
        const txReceipt = await tx.wait(1)
        const requestId: BigNumber = txReceipt.events[1].args.requestId
        console.log(`Performed upkeep with RequestId: ${requestId}`)
        if (network.config.chainId == 31337) {
            await mockVrf(requestId, raffle)
        }
    } else {
        console.log("No upkeep needed!")
    }
}

async function mockVrf(requestId: BigNumber, raffle: Raffle) {
    console.log("We on a local network? Ok let's pretend...")
    const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
    await vrfCoordinatorV2Mock.fulfillRandomWords(requestId, raffle.address)
    console.log("Responded!")
    const recentWinner = await raffle.getRecentWinner()
    console.log(`The winner is: ${recentWinner}`)
}

mockKeepers()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
