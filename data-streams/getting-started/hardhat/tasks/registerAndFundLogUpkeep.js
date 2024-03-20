const utils = require("./utils")

/**
 * Defines a Hardhat task to register an upkeep with Chainlink Automation.
 * This task sets up the necessary parameters for upkeep registration, including
 * trigger configuration for a LogEmitter contract, and submits the registration
 * request to a specified StreamsUpkeep contract.
 */
task("registerAndFundUpkeep", "Registers and funds an upkeep with Chainlink Automation")
  .addParam("streamsUpkeep", "The address of the deployed StreamsUpkeep contract") // Address of the StreamsUpkeep contract.
  .addParam("logEmitter", "The address of the deployed LogEmitter contract") // Address of the LogEmitter contract used in the trigger.
  .setAction(async (taskArgs) => {
    const { streamsUpkeep, logEmitter } = taskArgs

    // Retrieve the deployer's (admin's) signer object to sign transactions.
    const [admin] = await ethers.getSigners()

    // Define registration parameters for the upkeep.
    // See more information on https://docs.chain.link/chainlink-automation/guides/register-upkeep-in-contract.
    const name = "Prog. Streams Upkeep" // Name of the upkeep registration.
    const encryptedEmail = "0x" // Placeholder for an encrypted email (optional).
    const gasLimit = 500000 // Maximum gas allowance for the upkeep execution.
    const triggerType = 1 // Type of trigger, where `1` represents a Log Trigger.
    const checkData = "0x" // Data passed to checkUpkeep; placeholder in this context.
    const offchainConfig = "0x" // Off-chain configuration data; placeholder in this context.
    const amount = ethers.utils.parseUnits("1", "ether") // Funding amount in LINK tokens.

    // Event signature hash and placeholder topics for the LogEmitter trigger.
    const topic0 = "0xb8a00d6d8ca1be30bfec34d8f97e55f0f0fd9eeb7fb46e030516363d4cfe1ad6" // Event signature hash.
    const topic1 = (topic2 = topic3 = "0x0000000000000000000000000000000000000000000000000000000000000000") // Placeholder topics.

    // ABI-encode the trigger configuration data.
    const triggerConfig = ethers.utils.defaultAbiCoder.encode(
      ["address", "uint8", "bytes32", "bytes32", "bytes32", "bytes32"],
      [logEmitter, 0, topic0, topic1, topic2, topic3]
    )

    // Construct the parameters for registration, combining all previously defined values.
    const params = {
      name,
      encryptedEmail,
      upkeepContract: streamsUpkeep,
      gasLimit,
      adminAddress: admin.address,
      triggerType,
      checkData,
      triggerConfig,
      offchainConfig,
      amount,
    }

    const spinner = utils.spin()
    // Interact with the deployed StreamsUpkeep contract to register the upkeep.
    spinner.start(`Registering upkeep with Chainlink Automation using account: ${admin.address}`)
    const StreamsUpkeepContract = await ethers.getContractAt("StreamsUpkeepRegistrar", streamsUpkeep, admin)

    try {
      await StreamsUpkeepContract.registerAndPredictID(params)
      spinner.succeed("Upkeep registered and funded with 1 LINK successfully.")
    } catch (error) {
      spinner.fail("Failed to register upkeep.")
      throw error
    }
  })

module.exports = {}
