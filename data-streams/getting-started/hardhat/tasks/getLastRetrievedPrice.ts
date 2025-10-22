import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types/hre";
import { isAddress } from "viem";
import { spin } from "./utils/index.js";

/**
 * Task to retrieve the last price from the StreamsUpkeepRegistrar contract using Viem.
 *
 * Usage: npx hardhat get-last-price --streams-upkeep 0xYourAddress --network arbitrumSepolia
 */
export const getLastPrice = task(
  "get-last-price",
  "Retrieves the last price from the StreamsUpkeepRegistrar contract"
)
  .addOption({
    name: "streamsUpkeep",
    description: "The address of the deployed StreamsUpkeepRegistrar contract",
    defaultValue: "",
  })
  .setAction(async () => ({
    default: async (
      { streamsUpkeep }: { streamsUpkeep: string },
      hre: HardhatRuntimeEnvironment
    ) => {
      if (!streamsUpkeep) {
        throw new Error("StreamsUpkeep address is required (--streams-upkeep)");
      }

      if (!isAddress(streamsUpkeep)) {
        throw new Error(`Invalid StreamsUpkeep address: ${streamsUpkeep}`);
      }

      const spinner = spin();

      try {
        // Connect to network and get public client (read-only, no wallet needed)
        const networkConnection = await hre.network.connect();
        const { viem, networkName } = networkConnection;

        const publicClient = await viem.getPublicClient();

        spinner.start(
          `Retrieving the last price from StreamsUpkeep at ${streamsUpkeep}...`
        );

        // Get the contract instance using Hardhat's helper (read-only)
        const contract = await viem.getContractAt(
          "StreamsUpkeepRegistrar",
          streamsUpkeep,
          { client: { public: publicClient } }
        );

        // Call the read function
        const lastDecodedPrice = await contract.read.lastDecodedPrice();

        spinner.succeed(
          `Last Retrieved Price: ${lastDecodedPrice}\n` +
            `  Contract: ${streamsUpkeep}\n` +
            `  Network: ${networkName}`
        );
      } catch (error) {
        spinner.fail("Failed to retrieve the last price");
        console.error(error);
        throw error;
      }
    },
  }))
  .build();
