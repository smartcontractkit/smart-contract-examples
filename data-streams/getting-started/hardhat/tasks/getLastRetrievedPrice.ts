import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types/hre";
import { spin } from "./utils/index.js";

/**
 * Defines a Hardhat task to retrieve the last price updated in the StreamsUpkeep contract.
 * This task requires the address of the deployed StreamsUpkeep contract as input.
 */
export const getLastPrice = task(
  "get-last-price",
  "Gets the last retrieved price from StreamsUpkeep"
)
  .addOption({
    name: "streamsUpkeep",
    description: "The address of the deployed StreamsUpkeep contract",
    defaultValue: "",
  })
  .setAction(async () => ({
    default: async (
      { streamsUpkeep }: { streamsUpkeep: string },
      hre: HardhatRuntimeEnvironment
    ) => {
      const spinner = spin();
      spinner.start(
        `Retrieving the last price from StreamsUpkeep at ${streamsUpkeep}...`
      );

      // Retrieve an instance of the StreamsUpkeep contract using the provided address.
      // This enables interaction with the contract's functions.
      const { viem } = await hre.network.connect();
      const StreamsUpkeepContract = await viem.getContractAt(
        "StreamsUpkeepRegistrar",
        streamsUpkeep as `0x${string}`
      );

      try {
        // Call the automatically generated getter function for the lastDecodedPrice public state variable.
        const lastDecodedPrice =
          await StreamsUpkeepContract.read.lastDecodedPrice();
        spinner.succeed(`Last Retrieved Price: ${lastDecodedPrice}`);
      } catch (error) {
        spinner.fail("Failed to retrieve the last price.");
        throw error;
      }
    },
  }))
  .build();
