import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types/hre";
import {
  isAddress,
  parseEther,
  encodeAbiParameters,
  parseAbiParameters,
} from "viem";
import { spin } from "./utils/index.js";

/**
 * Task to register and fund a log-triggered upkeep with Chainlink Automation using Viem.
 *
 * Usage: npx hardhat register-upkeep --streams-upkeep 0xAddress --log-emitter 0xAddress --network arbitrumSepolia
 */
export const registerUpkeep = task(
  "register-upkeep",
  "Registers and funds a log-triggered upkeep with Chainlink Automation"
)
  .addOption({
    name: "streamsUpkeep",
    description: "The address of the deployed StreamsUpkeepRegistrar contract",
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
      if (!streamsUpkeep) {
        throw new Error("StreamsUpkeep address is required (--streams-upkeep)");
      }

      if (!logEmitter) {
        throw new Error("LogEmitter address is required (--log-emitter)");
      }

      if (!isAddress(streamsUpkeep)) {
        throw new Error(`Invalid StreamsUpkeep address: ${streamsUpkeep}`);
      }

      if (!isAddress(logEmitter)) {
        throw new Error(`Invalid LogEmitter address: ${logEmitter}`);
      }

      const spinner = spin();

      try {
        // Connect to network and get viem clients
        const networkConnection = await hre.network.connect();
        const { viem } = networkConnection;

        const publicClient = await viem.getPublicClient();
        const [walletClient] = await viem.getWalletClients();

        const account = walletClient.account.address;

        spinner.start(
          `Registering upkeep with Chainlink Automation using account: ${account}`
        );

        // Get the contract instance using Hardhat's helper
        const streamsUpkeepContract = await viem.getContractAt(
          "StreamsUpkeepRegistrar",
          streamsUpkeep
        );

        // Define registration parameters
        const name = "Prog. Streams Upkeep";
        const encryptedEmail = "0x" as `0x${string}`;
        const gasLimit = 500000;
        const triggerType = 1; // Log Trigger
        const checkData = "0x" as `0x${string}`;
        const offchainConfig = "0x" as `0x${string}`;
        const amount = parseEther("1"); // 1 LINK in wei

        // Event signature hash for the LogEmitter event
        const topic0 =
          "0xb8a00d6d8ca1be30bfec34d8f97e55f0f0fd9eeb7fb46e030516363d4cfe1ad6";
        const topic1 =
          "0x0000000000000000000000000000000000000000000000000000000000000000";
        const topic2 =
          "0x0000000000000000000000000000000000000000000000000000000000000000";
        const topic3 =
          "0x0000000000000000000000000000000000000000000000000000000000000000";

        // ABI-encode the trigger config
        const triggerConfig = encodeAbiParameters(
          parseAbiParameters(
            "address, uint8, bytes32, bytes32, bytes32, bytes32"
          ),
          [logEmitter, 0, topic0, topic1, topic2, topic3]
        );

        // Construct the registration parameters struct
        const params = {
          name,
          encryptedEmail,
          upkeepContract: streamsUpkeep,
          gasLimit,
          adminAddress: account,
          triggerType,
          checkData,
          triggerConfig,
          offchainConfig,
          amount,
        };

        spinner.info("Trigger configuration encoded successfully");
        spinner.start("Submitting registration transaction...");

        // Call registerAndPredictID with the params struct
        const hash = await streamsUpkeepContract.write.registerAndPredictID([
          params,
        ]);

        spinner.info(`Transaction submitted: ${hash}`);
        spinner.start("Waiting for transaction confirmation...");

        // Wait for transaction to be mined
        const receipt = await publicClient.waitForTransactionReceipt({ hash });

        spinner.succeed(
          `Upkeep registered and funded with 1 LINK successfully!\n` +
            `  Transaction Hash: ${receipt.transactionHash}\n` +
            `  Block Number: ${receipt.blockNumber}\n` +
            `  Gas Used: ${receipt.gasUsed}\n` +
            `  Upkeep Name: ${name}\n` +
            `  Trigger Type: Log Trigger (${triggerType})\n` +
            `  Gas Limit: ${gasLimit}`
        );
      } catch (error) {
        spinner.fail("Failed to register upkeep");
        console.error(error);
        throw error;
      }
    },
  }))
  .build();
