// @ts-ignore
import { ethers } from "hardhat"
import { CharityRaffle } from "../../typechain-types"

async function enterCharityRaffle(): Promise<void> {
    const charityRaffle: CharityRaffle = await ethers.getContract("CharityRaffle")
    const entranceFee: number = (await charityRaffle.getEntranceFee()).toNumber()
    await charityRaffle.enterRaffle(0, { value: entranceFee + 1 })
    console.log("Entered Charity Raffle!")
}

enterCharityRaffle()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
