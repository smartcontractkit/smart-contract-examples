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
      // Connect to network and get the contract instance
      const { viem } = await hre.network.connect();
      const publicClient = await viem.getPublicClient();
      const logEmitterContract = await viem.getContractAt(
        "LogEmitter",
        logEmitter as `0x${string}`
      );

      const spinner = spin();
      spinner.start("Emitting a log...");

      try {
        // Call the emitLog function of the LogEmitter contract
        const hash = await logEmitterContract.write.emitLog();

        // Wait for the transaction to be mined
        await publicClient.waitForTransactionReceipt({ hash });

        spinner.succeed(`Log emitted successfully in transaction: ${hash}`);
      } catch (error) {
        spinner.fail("Failed to emit log.");
        throw error;
      }
    },
  }))
  .build();
