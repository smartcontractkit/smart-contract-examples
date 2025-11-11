const utils = require("../utils")

// Define a Hardhat task named "getLatestAnswer" to get the latest answer from the DataConsumerV3 contract.
task("getLatestAnswer", "Fetches the latest Chainlink Data Feed answer from the DataConsumerV3 contract")
  .addParam("dataConsumerV3", "The address of the deployed DataConsumerV3 contract")
  .setAction(async (taskArgs) => {
    const { dataConsumerV3 } = taskArgs

    // Create an instance of the DataConsumerV3 contract at the specified address.
    const DataConsumerV3Contract = await ethers.getContractAt("DataConsumerV3", dataConsumerV3)

    const spinner = utils.spin()
    spinner.start("Fetching the latest Chainlink Data Feed answer...")

    try {
      // Call the getChainlinkDataFeedLatestAnswer function of the DataConsumerV3 contract to get the latest answer.
      const latestAnswer = await DataConsumerV3Contract.getChainlinkDataFeedLatestAnswer()

      spinner.succeed(`Latest BTC / USD Data Feed answer: ${latestAnswer}`)
    } catch (error) {
      spinner.fail("Failed to fetch the latest answer.")
      throw error
    }
  })

module.exports = {}
