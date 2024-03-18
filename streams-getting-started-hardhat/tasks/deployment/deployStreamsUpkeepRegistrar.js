const { networkConfig } = require("../../helper-hardhat-config")
const utils = require("../utils")

// Define a Hardhat task named "deployStreamsUpkeepRegistrar" to deploy the StreamsUpkeepRegistrar contract.
task("deployStreamsUpkeepRegistrar", "Deploys the StreamsUpkeepRegistrar contract").setAction(async () => {
  // Set the log level to ignore non-error logs for cleaner output.
  ethers.utils.Logger.setLogLevel(ethers.utils.Logger.levels.ERROR)

  // Retrieve the current network's ID to access network-specific configuration.
  const networkId = await ethers.provider.getNetwork().then((network) => network.chainId)
  const config = networkConfig[networkId]

  // Check if the configuration exists for the current network ID.
  if (!config) {
    throw new Error(`No config found for network id ${networkId}`)
  }

  // Retrieve the deployer/signer account.
  const [deployer] = await ethers.getSigners()

  // Initialize the spinner
  const spinner = utils.spin()
  spinner.start(`Deploying the StreamsUpkeepRegistrar contract with the account: ${deployer.address}`)

  try {
    // Get the contract factory for the StreamsUpkeepRegistrar contract.
    const StreamsUpkeepRegistrar = await ethers.getContractFactory("StreamsUpkeepRegistrar")

    // Deploy the StreamsUpkeepRegistrar contract using network-specific configurations.
    const streamsUpkeepRegistrar = await StreamsUpkeepRegistrar.deploy(
      config.verifierProxyAddress,
      config.linkToken,
      config.automationRegistrarAddress,
      ["0x00027bbaff688c906a3e20a34fe951715d1018d262a5b66e38eda027a674cd1b"]
      // This example reads the ID for the basic ETH/USD price report on Arbitrum Sepolia.
      // Find a complete list of IDs at https://docs.chain.link/data-streams/stream-ids
    )

    // Wait for the contract deployment transaction to be mined.
    await streamsUpkeepRegistrar.deployed()

    // Stop the spinner with a success message, including the deployed contract address.
    spinner.succeed(`StreamsUpkeepRegistrar deployed at: ${streamsUpkeepRegistrar.address}`)
  } catch (error) {
    // In case of error, stop the spinner with a failure message.
    spinner.fail("Failed to deploy StreamsUpkeepRegistrar contract.")
    throw error
  }
})

module.exports = {}
