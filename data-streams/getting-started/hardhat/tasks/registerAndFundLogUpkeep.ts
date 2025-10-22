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
  "register-upkeep",
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
      // Connect to network and get wallet client
      const { viem } = await hre.network.connect();
      const [walletClient] = await viem.getWalletClients();
      const account = walletClient.account.address;

      // Define registration parameters for the upkeep
      const name = "Prog. Streams Upkeep";
      const encryptedEmail = "0x" as `0x${string}`;
      const gasLimit = 500000;
      const triggerType = 1; // Log Trigger
      const checkData = "0x" as `0x${string}`;
      const offchainConfig = "0x" as `0x${string}`;
      const amount = parseEther("1"); // 1 LINK

      // Event signature hash and placeholder topics for the LogEmitter trigger
      const topic0 =
        "0xb8a00d6d8ca1be30bfec34d8f97e55f0f0fd9eeb7fb46e030516363d4cfe1ad6";
      const topic1 =
        "0x0000000000000000000000000000000000000000000000000000000000000000";
      const topic2 =
        "0x0000000000000000000000000000000000000000000000000000000000000000";
      const topic3 =
        "0x0000000000000000000000000000000000000000000000000000000000000000";

      // ABI-encode the trigger configuration data
      const triggerConfig = encodeAbiParameters(
        parseAbiParameters(
          "address, uint8, bytes32, bytes32, bytes32, bytes32"
        ),
        [logEmitter as `0x${string}`, 0, topic0, topic1, topic2, topic3]
      );

      // Construct the parameters for registration
      const params = {
        name,
        encryptedEmail,
        upkeepContract: streamsUpkeep as `0x${string}`,
        gasLimit,
        adminAddress: account,
        triggerType,
        checkData,
        triggerConfig,
        offchainConfig,
        amount,
      };

      const spinner = spin();
      spinner.start(
        `Registering upkeep with Chainlink Automation using account: ${account}`
      );

      // Interact with the deployed StreamsUpkeep contract to register the upkeep
      const streamsUpkeepContract = await viem.getContractAt(
        "StreamsUpkeepRegistrar",
        streamsUpkeep as `0x${string}`
      );

      try {
        await streamsUpkeepContract.write.registerAndPredictID([params]);
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
