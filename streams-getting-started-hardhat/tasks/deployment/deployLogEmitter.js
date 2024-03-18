const utils = require("../utils")

// Define a Hardhat task named "deployLogEmitter" to deploy the LogEmitter contract.
task("deployLogEmitter", "Deploys the LogEmitter contract").setAction(async () => {
  // Set the log level to ignore non-error logs for cleaner output.
  ethers.utils.Logger.setLogLevel(ethers.utils.Logger.levels.ERROR)

  // Retrieve the deployer/signer account.
  const [deployer] = await ethers.getSigners()

  // Initialize the spinner
  const spinner = utils.spin()
  spinner.start(`Deploying the LogEmitter contract with the account: ${deployer.address}`)

  try {
    // Get the contract factory for the LogEmitter contract.
    const LogEmitter = await ethers.getContractFactory("LogEmitter")

    // Deploy the LogEmitter contract.
    const logEmitter = await LogEmitter.deploy()

    // Wait for the contract deployment transaction to be mined.
    await logEmitter.deployed()

    // Stop the spinner with a success message, including the deployed contract address.
    spinner.succeed(`LogEmitter deployed at: ${logEmitter.address}`)
  } catch (error) {
    // In case of error, stop the spinner with a failure message.
    spinner.fail("Failed to deploy LogEmitter contract.")
    throw error
  }
})

module.exports = {}
