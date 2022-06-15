// @ts-ignore
import { ethers } from "hardhat"
import { BytesLike, BigNumber } from "ethers"

export interface networkConfigItem {
    name: string
    subscriptionId: BigNumber
    gasLane: BytesLike
    keepersUpdateInterval: BigNumber
    charityRaffleDuration: BigNumber
    raffleEntranceFee: BigNumber
    jackpot: BigNumber
    callbackGasLimit: BigNumber
    vrfCoordinatorV2: string
    charity1: string
    charity2: string
    charity3: string
}

export interface networkConfigInfo {
    [key: number]: networkConfigItem
}

export const networkConfig: networkConfigInfo = {
    31337: {
        name: "localhost",
        subscriptionId: ethers.BigNumber.from("588"),
        gasLane: "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc", // 30 gwei
        keepersUpdateInterval: ethers.BigNumber.from("30"),
        charityRaffleDuration: ethers.BigNumber.from("30"), // 30 seconds (just for testing)
        raffleEntranceFee: ethers.utils.parseEther("0.1"),
        jackpot: ethers.utils.parseEther("1"),
        callbackGasLimit: ethers.BigNumber.from("500000"), // 500,000 gas
        vrfCoordinatorV2: "",
        charity1: "",
        charity2: "",
        charity3: "",
    },
    4: {
        name: "rinkeby",
        subscriptionId: ethers.BigNumber.from("5864"), // your VRF subscriptionId
        gasLane: "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc", // 30 gwei
        keepersUpdateInterval: ethers.BigNumber.from("30"),
        charityRaffleDuration: ethers.BigNumber.from("30"), // 30 seconds (just for testing)
        raffleEntranceFee: ethers.utils.parseEther("0.1"),
        jackpot: ethers.utils.parseEther("0.2"),
        callbackGasLimit: ethers.BigNumber.from("500000"), // 500,000 gas
        vrfCoordinatorV2: "0x6168499c0cFfCaCD319c818142124B7A15E857ab",
        charity1: "0x8423f6c5f0895914e0C8A4eF523C0A1d5c8632f6", // use extra wallet accounts to test
        charity2: "0x70185775Ae9767751c218d9baAeffBC9b5fD5b34",
        charity3: "0xa95224aE036279f0f2A07623D94F44fDb03F1C45",
    },
}

export const developmentChains = ["hardhat", "localhost"]
export const VERIFICATION_BLOCK_CONFIRMATIONS = 6
export const frontEndContractsFile =
    "../nextjs-smartcontract-lottery-fcc/constants/contractAddresses.json"
