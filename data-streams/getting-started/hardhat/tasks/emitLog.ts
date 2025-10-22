import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types/hre";
import { isAddress } from "viem";
import { spin } from "./utils/index.js";

/**
 * Task to emit a log from the LogEmitter contract using Viem.
 *
 * Usage: npx hardhat emit-log --log-emitter 0xYourAddress --network arbitrumSepolia
 */
export const emitLog = task(
  "emit-log",
  "Emits a log from the LogEmitter contract"
)
  .addOption({
    name: "logEmitter",
    description: "The address of the deployed LogEmitter contract",
    defaultValue: "",
  })
  .setAction(async () => ({
    default: async (
      { logEmitter }: { logEmitter: string },
      hre: HardhatRuntimeEnvironment
    ) => {
      if (!logEmitter) {
        throw new Error("LogEmitter address is required (--log-emitter)");
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

        spinner.start(`Emitting a log from LogEmitter at ${logEmitter}...`);

        // Get the contract instance using Hardhat's helper
        const logEmitterContract = await viem.getContractAt(
          "LogEmitter",
          logEmitter
        );

        // Call the emitLog function on the contract
        const hash = await logEmitterContract.write.emitLog();

        spinner.info(`Transaction submitted: ${hash}`);
        spinner.start("Waiting for transaction confirmation...");

        // Wait for the transaction to be mined
        const receipt = await publicClient.waitForTransactionReceipt({ hash });

        spinner.succeed(
          `Log emitted successfully!\n` +
            `  Transaction Hash: ${receipt.transactionHash}\n` +
            `  Block Number: ${receipt.blockNumber}\n` +
            `  Gas Used: ${receipt.gasUsed}`
        );
      } catch (error) {
        spinner.fail("Failed to emit log");
        console.error(error);
        throw error;
      }
    },
  }))
  .build();
