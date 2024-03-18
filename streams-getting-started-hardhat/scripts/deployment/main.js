const { deployStreamsUpkeepRegistrar } = require("./deployStreamsUpkeepRegistrar")
const { deployLogEmitter } = require("./deployLogEmitter")

/**
 * Main deployment script for deploying StreamsUpkeep and LogEmitter contracts.
 * This script compiles the contracts and then deploys them sequentially.
 * It is designed to be run from the command line using Hardhat's run command.
 */
async function main() {
  // Compile all contracts in the project to ensure they're up to date.
  await run("compile")

  // Deploy the StreamsUpkeep contract.
  await deployStreamsUpkeepRegistrar()

  // Deploy the LogEmitter contract.
  await deployLogEmitter()
}

// Execute the main function and catch any errors that may occur.
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
