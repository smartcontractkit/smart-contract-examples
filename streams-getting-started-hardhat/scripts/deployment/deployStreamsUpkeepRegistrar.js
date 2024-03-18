const { ethers } = require("hardhat")
const { networkConfig } = require("../../helper-hardhat-config")
const utils = require("../../tasks/utils")

/**
 * Deploys the StreamsUpkeep contract to the selected network.
 * Utilizes configurations from the helper-hardhat-config.js file based on the network ID.
 * This ensures the contract is deployed with parameters specific to each network.
 */
async function deployStreamsUpkeepRegistrar() {
  // Adjust log level to only show errors to keep the output clean.
  ethers.utils.Logger.setLogLevel(ethers.utils.Logger.levels.ERROR)

  // Retrieve the current network's ID.
  const networkId = await ethers.provider.getNetwork().then((network) => network.chainId)

  // Access the network-specific configuration.
  const config = networkConfig[networkId]

  // Check if the configuration exists for the current network ID.
  if (!config) {
    throw new Error(`No config found for network id ${networkId}`)
  }

  // Retrieve the signer, which will be used to deploy the contract.
  const [deployer] = await ethers.getSigners()

  // Log the address of the deployer for verification purposes.
  const spinner = utils.spin()
  spinner.start(`Deploying the StreamsUpkeep contract with the account: ${deployer.address}`)

  // Get the contract factory for the StreamsUpkeep contract.
  const StreamsUpkeepRegistrar = await ethers.getContractFactory("StreamsUpkeepRegistrar")

  // Deploy the StreamsUpkeep contract using network-specific configurations.
  const streamsUpkeepRegistrar = await StreamsUpkeepRegistrar.deploy(
    config.verifierProxyAddress,
    config.linkToken,
    config.automationRegistrarAddress
  )

  // Log the address of the newly deployed StreamsUpkeep contract.
  spinner.succeed(`StreamsUpkeep deployed at: ${streamsUpkeepRegistrar.address}`)
}

// Export the deploy function to allow it to be run as a script or imported by other files.
module.exports = {
  deployStreamsUpkeepRegistrar,
}
