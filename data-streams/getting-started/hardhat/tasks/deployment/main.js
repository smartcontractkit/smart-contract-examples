// Import the utils for spinner functionality
const utils = require("../utils")

// This script serves as the main entry point to deploy both the LogEmitter and StreamsUpkeepRegistrar contracts.
task("deployAll", "Deploys both LogEmitter and StreamsUpkeepRegistrar contracts").setAction(async (_, { run }) => {
  const spinner = utils.spin()
  spinner.start("Starting deployment of LogEmitter and StreamsUpkeepRegistrar contracts...")

  try {
    // Compile the contracts before deployment
    spinner.info("Compiling contracts...")
    await run("compile")

    // Deploy the StreamsUpkeepRegistrar contract
    spinner.info("Deploying StreamsUpkeepRegistrar contract...")
    await run("deployStreamsUpkeepRegistrar")

    // Deploy the LogEmitter contract
    spinner.info("Deploying LogEmitter contract...")
    await run("deployLogEmitter")

    // All deployments completed
    spinner.succeed("All contracts deployed successfully.")
  } catch (error) {
    spinner.fail("Deployment failed.")
    console.error(error)
    throw error // Rethrow the error to ensure the task fails properly
  }
})

module.exports = {}
