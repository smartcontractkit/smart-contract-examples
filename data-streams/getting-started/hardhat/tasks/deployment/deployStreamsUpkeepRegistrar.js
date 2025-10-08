import { task } from "hardhat/config"
import { networkConfig } from "../../helper-hardhat-config.js"
import * as utils from "../utils/index.js"

// Define a Hardhat task named "deployStreamsUpkeepRegistrar" to deploy the StreamsUpkeepRegistrar contract.
task("deployStreamsUpkeepRegistrar", "Deploys the StreamsUpkeepRegistrar contract").setAction(async (taskArgs, hre) => {
  // Retrieve the current network's ID to access network-specific configuration.
  const networkId = (await hre.ethers.provider.getNetwork()).chainId
  const config = networkConfig[networkId]

  // Check if the configuration exists for the current network ID.
  if (!config) {
    throw new Error(`No config found for network id ${networkId}`)
  }

  // Retrieve the deployer/signer account.
  const [deployer] = await hre.ethers.getSigners()

  // Initialize the spinner
  const spinner = utils.spin()
  spinner.start(`Deploying the StreamsUpkeepRegistrar contract with the account: ${deployer.address}`)

  try {
    // Get the contract factory for the StreamsUpkeepRegistrar contract.
    const StreamsUpkeepRegistrar = await hre.ethers.getContractFactory("StreamsUpkeepRegistrar")

    // Deploy the StreamsUpkeepRegistrar contract using network-specific configurations.
    const streamsUpkeepRegistrar = await StreamsUpkeepRegistrar.deploy(
      config.verifierProxyAddress,
      config.linkToken,
      config.automationRegistrarAddress,
      ["0x000359843a543ee2fe414dc14c7e7920ef10f4372990b79d6361cdc0dd1ba782"]
      // This example reads the ID for the ETH/USD price report on Arbitrum Sepolia.
      // Find a complete list of IDs at https://docs.chain.link/data-streams/stream-ids
    )

    // Wait for the contract deployment transaction to be mined.
    await streamsUpkeepRegistrar.waitForDeployment()

    // Get the deployed contract address
    const address = await streamsUpkeepRegistrar.getAddress()

    // Stop the spinner with a success message, including the deployed contract address.
    spinner.succeed(`StreamsUpkeepRegistrar deployed at: ${address}`)
  } catch (error) {
    // In case of error, stop the spinner with a failure message.
    spinner.fail("Failed to deploy StreamsUpkeepRegistrar contract.")
    throw error
  }
})
