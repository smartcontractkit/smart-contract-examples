import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types/hre";
import { spin } from "./utils/index.js";

// Define a Hardhat task named "emit-log" to trigger log emission from the LogEmitter contract.
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
      const { viem } = await hre.network.connect();
      const publicClient = await viem.getPublicClient();

      // Create an instance of the LogEmitter contract at the specified address.
      const LogEmitterContract = await viem.getContractAt(
        "LogEmitter",
        logEmitter as `0x${string}`
      );

      const spinner = spin();
      spinner.start("Emitting a log...");

      try {
        // Call the emitLog function of the LogEmitter contract to emit a log event.
        const tx = await LogEmitterContract.write.emitLog();

        // Wait for the transaction to be mined to ensure the log has been emitted.
        await publicClient.waitForTransactionReceipt({ hash: tx });

        // Stop the spinner with a success message, including the transaction hash.
        spinner.succeed(`Log emitted successfully in transaction: ${tx}`);
      } catch (error) {
        // In case of error, stop the spinner with a failure message.
        spinner.fail("Failed to emit log.");
        throw error;
      }
    },
  }))
  .build();
