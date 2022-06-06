// @ts-ignore
import { ethers } from "hardhat"
import { Raffle } from '../typechain-types'

async function enterRaffle():Promise<void> {
    const raffle: Raffle = await ethers.getContract("Raffle")
    const entranceFee: number = (await raffle.getEntranceFee()).toNumber()
    await raffle.enterRaffle({ value: entranceFee + 1 })
    console.log("Entered!")
}

enterRaffle()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
