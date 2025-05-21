const utils = require("../utils")

// Define a Hardhat task named "deployDataConsumerV3" to deploy the DataConsumerV3 contract.
task("deployDataConsumerV3", "Deploys the DataConsumerV3 contract").setAction(async () => {
  const spinner = utils.spin()
  spinner.start()

  // Retrieve the signer account to interact with the blockchain.
  const [deployer] = await ethers.getSigners()

  try {
    spinner.info("Compiling contracts...")

    // Compile the contracts before deployment
    await run("compile")

    spinner.info(`Starting deployment of DataConsumerV3 with account: ${deployer.address}`)

    // Get the contract factory for the DataConsumerV3 contract.
    const DataConsumerV3 = await ethers.getContractFactory("DataConsumerV3")

    // Deploy the DataConsumerV3 contract.
    const dataConsumerV3 = await DataConsumerV3.deploy()

    // Wait for the contract to be deployed.
    await dataConsumerV3.deployed()
    spinner.succeed(`DataConsumerV3 deployed at: ${dataConsumerV3.address} on ${network.name}`)
  } catch (error) {
    spinner.fail("DataConsumerV3 deployment failed")
    throw error
  }
})

module.exports = {}
