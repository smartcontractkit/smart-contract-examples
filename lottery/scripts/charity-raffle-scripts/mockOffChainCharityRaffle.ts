// @ts-ignore
import { ethers, network } from "hardhat"
import { CharityRaffle } from "../../typechain-types"
import { BigNumber } from "ethers"

async function mockKeepers() {
    const charityRaffle: CharityRaffle = await ethers.getContract("CharityRaffle")
    const checkData = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(""))
    const { upkeepNeeded } = await charityRaffle.callStatic.checkUpkeep(checkData)
    if (upkeepNeeded) {
        const tx = await charityRaffle.performUpkeep(checkData)
        const txReceipt = await tx.wait(1)
        const requestId: BigNumber = txReceipt.events[1].args.requestId
        console.log(`Performed upkeep with RequestId: ${requestId}`)
        if (network.config.chainId == 31337) {
            await mockVrf(requestId, charityRaffle)
        }
    } else {
        console.log("No upkeep needed!")
    }
}

async function mockVrf(requestId: BigNumber, charityRaffle: CharityRaffle) {
    console.log("We on a local network? Ok let's pretend...")
    const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
    await vrfCoordinatorV2Mock.fulfillRandomWords(requestId, charityRaffle.address)
    console.log("Responded!")
    const recentWinner = await charityRaffle.getRecentWinner()
    const recentCharityWinner = await charityRaffle.getCharityWinner()
    console.log(`The player winner is: ${recentWinner}`)
    console.log(`The charity winner is: ${recentCharityWinner}`)
}

mockKeepers()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
