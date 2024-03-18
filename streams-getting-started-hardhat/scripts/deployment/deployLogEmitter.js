const { ethers } = require("hardhat")
const utils = require("../../tasks/utils")

/**
 * Deploys the LogEmitter contract.
 *
 * This script deploys the LogEmitter contract to the currently selected network.
 * It first retrieves the signer account used for deployment and then deploys the contract,
 * logging the deploying account's address and the deployed contract's address.
 */
async function deployLogEmitter() {
  // Set the log level to ignore non-error logs for cleaner output.
  ethers.utils.Logger.setLogLevel(ethers.utils.Logger.levels.ERROR)

  // Retrieve the deployer/signer account.
  const [deployer] = await ethers.getSigners()

  const spinner = utils.spin()
  spinner.start(`Deploying the LogEmitter contract with the account: ${deployer.address}`)

  // Get the contract factory for the LogEmitter contract.
  const LogEmitter = await ethers.getContractFactory("LogEmitter")

  // Deploy the LogEmitter contract.
  const logEmitter = await LogEmitter.deploy()

  // Log the address of the deployed LogEmitter contract.
  spinner.succeed(`LogEmitter deployed at: ${logEmitter.address}`)
}

// Export the deployLogEmitter function to make it available for other scripts.
module.exports = {
  deployLogEmitter,
}
