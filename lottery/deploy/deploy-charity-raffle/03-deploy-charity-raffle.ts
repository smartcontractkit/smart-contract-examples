import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { DeployFunction } from "hardhat-deploy/types"
import { HardhatRuntimeEnvironment } from "hardhat/types"

import {
    networkConfig,
    developmentChains,
    VERIFICATION_BLOCK_CONFIRMATIONS,
} from "../../helper-hardhat-config"
import verify from "../../utils/verify"

const FUND_AMOUNT = "1000000000000000000000"

const deployCharityRaffle: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    // @ts-ignore
    const { deployments, getNamedAccounts, network, ethers } = hre
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()

    const chainId = network.config.chainId
    const jackpot = networkConfig[network.config.chainId!]["jackpot"]
    let vrfCoordinatorV2Address, subscriptionId, charity1, charity2, charity3

    if (chainId == 31337) {
        // get mock charity contract addresses (for actual deployments load from the hardhat-helper-config)
        // accounts[0] = deployer, accounts[1] = player1, accounts[2] = player2
        const accounts: SignerWithAddress[] = await ethers.getSigners()
        charity1 = accounts[3].address.toString()
        charity2 = accounts[4].address.toString()
        charity3 = accounts[5].address.toString()
        // create VRFV2 Subscription
        const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
        vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address
        const transactionResponse = await vrfCoordinatorV2Mock.createSubscription()
        const transactionReceipt = await transactionResponse.wait()
        subscriptionId = transactionReceipt.events[0].args.subId
        // Fund the subscription
        // Our mock makes it so we don't actually have to worry about sending fund
        await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, FUND_AMOUNT)
    } else {
        vrfCoordinatorV2Address = networkConfig[network.config.chainId!]["vrfCoordinatorV2"]
        subscriptionId = networkConfig[network.config.chainId!]["subscriptionId"]
        charity1 = networkConfig[network.config.chainId!]["charity1"]
        charity2 = networkConfig[network.config.chainId!]["charity2"]
        charity3 = networkConfig[network.config.chainId!]["charity3"]
    }
    const waitBlockConfirmations = developmentChains.includes(network.name)
        ? 1
        : VERIFICATION_BLOCK_CONFIRMATIONS

    log("----------------------------------------------------")
    const args: any[] = [
        vrfCoordinatorV2Address,
        subscriptionId,
        networkConfig[network.config.chainId!]["gasLane"],
        networkConfig[network.config.chainId!]["raffleEntranceFee"],
        jackpot,
        networkConfig[network.config.chainId!]["charityRaffleDuration"],
        networkConfig[network.config.chainId!]["callbackGasLimit"],
        charity1,
        charity2,
        charity3,
        deployer,
    ]
    const charityRaffle = await deploy("CharityRaffle", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: waitBlockConfirmations,
        value: jackpot,
    })

    // Verify the deployment
    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("Verifying...")
        await verify(charityRaffle.address, args)
    }

    log("Run Price Feed contract with command:")
    const networkName = network.name == "hardhat" ? "localhost" : network.name
    log(
        `yarn hardhat run scripts/charity-raffle-scripts/enterCharityRaffle.js --network ${networkName}`
    )
    log("----------------------------------------------------")
}
export default deployCharityRaffle
deployCharityRaffle.tags = ["all", "charity-raffle"]
