import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types/hre";
import { parseEther, encodeAbiParameters, parseAbiParameters } from "viem";
import { spin } from "./utils/index.js";

/**
 * Defines a Hardhat task to register an upkeep with Chainlink Automation.
 * This task sets up the necessary parameters for upkeep registration, including
 * trigger configuration for a LogEmitter contract, and submits the registration
 * request to a specified StreamsUpkeep contract.
 */
export const registerUpkeep = task(
  "registerAndFundUpkeep",
  "Registers and funds an upkeep with Chainlink Automation"
)
  .addOption({
    name: "streamsUpkeep",
    description: "The address of the deployed StreamsUpkeep contract",
    defaultValue: "",
  })
  .addOption({
    name: "logEmitter",
    description: "The address of the deployed LogEmitter contract",
    defaultValue: "",
  })
  .setAction(async () => ({
    default: async (
      {
        streamsUpkeep,
        logEmitter,
      }: { streamsUpkeep: string; logEmitter: string },
      hre: HardhatRuntimeEnvironment
    ) => {
      const { viem } = await hre.network.connect();
      const [walletClient] = await viem.getWalletClients();

      // Retrieve the deployer's (admin's) signer object to sign transactions.
      const admin = walletClient.account.address;

      // Define registration parameters for the upkeep.
      // See more information on https://docs.chain.link/chainlink-automation/guides/register-upkeep-in-contract.
      const name = "Prog. Streams Upkeep"; // Name of the upkeep registration.
      const encryptedEmail = "0x" as `0x${string}`; // Placeholder for an encrypted email (optional).
      const gasLimit = 500000; // Maximum gas allowance for the upkeep execution.
      const triggerType = 1; // Type of trigger, where `1` represents a Log Trigger.
      const checkData = "0x" as `0x${string}`; // Data passed to checkUpkeep; placeholder in this context.
      const offchainConfig = "0x" as `0x${string}`; // Off-chain configuration data; placeholder in this context.
      const amount = parseEther("1"); // Funding amount in LINK tokens.

      // Event signature hash and placeholder topics for the LogEmitter trigger.
      const topic0 =
        "0xb8a00d6d8ca1be30bfec34d8f97e55f0f0fd9eeb7fb46e030516363d4cfe1ad6"; // Event signature hash.
      const topic1 =
        "0x0000000000000000000000000000000000000000000000000000000000000000"; // Placeholder topics.
      const topic2 =
        "0x0000000000000000000000000000000000000000000000000000000000000000";
      const topic3 =
        "0x0000000000000000000000000000000000000000000000000000000000000000";

      // ABI-encode the trigger configuration data.
      const triggerConfig = encodeAbiParameters(
        parseAbiParameters(
          "address, uint8, bytes32, bytes32, bytes32, bytes32"
        ),
        [logEmitter as `0x${string}`, 0, topic0, topic1, topic2, topic3]
      );

      // Construct the parameters for registration, combining all previously defined values.
      const params = {
        name,
        encryptedEmail,
        upkeepContract: streamsUpkeep as `0x${string}`,
        gasLimit,
        adminAddress: admin,
        triggerType,
        checkData,
        triggerConfig,
        offchainConfig,
        amount,
      };

      const spinner = spin();
      // Interact with the deployed StreamsUpkeep contract to register the upkeep.
      spinner.start(
        `Registering upkeep with Chainlink Automation using account: ${admin}`
      );
      const StreamsUpkeepContract = await viem.getContractAt(
        "StreamsUpkeepRegistrar",
        streamsUpkeep as `0x${string}`
      );

      try {
        await StreamsUpkeepContract.write.registerAndPredictID([params]);
        spinner.succeed(
          "Upkeep registered and funded with 1 LINK successfully."
        );
      } catch (error) {
        spinner.fail("Failed to register upkeep.");
        throw error;
      }
    },
  }))
  .build();
