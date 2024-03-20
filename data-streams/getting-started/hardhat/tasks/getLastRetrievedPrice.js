const utils = require("./utils")

/**
 * Defines a Hardhat task to retrieve the last price updated in the StreamsUpkeep contract.
 * This task requires the address of the deployed StreamsUpkeep contract as input.
 */
task("getLastRetrievedPrice", "Gets the last retrieved price from StreamsUpkeep")
  .addParam("streamsUpkeep", "The address of the deployed StreamsUpkeep contract") // Define a required parameter for the task: the address of the StreamsUpkeep contract.
  .setAction(async (taskArgs, hre) => {
    const { streamsUpkeep } = taskArgs // Destructure the streamsUpkeep address from the task arguments.

    const spinner = utils.spin() // Initialize the spinner
    spinner.start(`Retrieving the last price from StreamsUpkeep at ${streamsUpkeep}...`)

    // Retrieve an instance of the StreamsUpkeep contract using the provided address.
    // This enables interaction with the contract's functions.
    const StreamsUpkeepContract = await hre.ethers.getContractAt("StreamsUpkeepRegistrar", streamsUpkeep)

    try {
      // Call the automatically generated getter function for the last_retrieved_price public state variable.
      const s_lastRetrievedPrice = await StreamsUpkeepContract.s_last_retrieved_price()
      spinner.succeed(`Last Retrieved Price: ${s_lastRetrievedPrice}`) // Display the retrieved price and stop the spinner with a success message.
    } catch (error) {
      spinner.fail("Failed to retrieve the last price.") // In case of error, stop the spinner with a failure message.
      throw error
    }
  })

module.exports = {}
