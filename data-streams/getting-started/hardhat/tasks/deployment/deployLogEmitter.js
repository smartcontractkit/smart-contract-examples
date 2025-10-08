import { task } from "hardhat/config"
import * as utils from "../utils/index.js"

// Define a Hardhat task named "deployLogEmitter" to deploy the LogEmitter contract.
task("deployLogEmitter", "Deploys the LogEmitter contract").setAction(async (taskArgs, hre) => {
  // Retrieve the deployer/signer account.
  const [deployer] = await hre.ethers.getSigners()

  // Initialize the spinner
  const spinner = utils.spin()
  spinner.start(`Deploying the LogEmitter contract with the account: ${deployer.address}`)

  try {
    // Get the contract factory for the LogEmitter contract.
    const LogEmitter = await hre.ethers.getContractFactory("LogEmitter")

    // Deploy the LogEmitter contract.
    const logEmitter = await LogEmitter.deploy()

    // Wait for the contract deployment transaction to be mined.
    await logEmitter.waitForDeployment()

    // Get the deployed contract address
    const address = await logEmitter.getAddress()

    // Stop the spinner with a success message, including the deployed contract address.
    spinner.succeed(`LogEmitter deployed at: ${address}`)
  } catch (error) {
    // In case of error, stop the spinner with a failure message.
    spinner.fail("Failed to deploy LogEmitter contract.")
    throw error
  }
})
