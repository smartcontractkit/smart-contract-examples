import fs from "fs";
import { SupportedNetworks } from "../ccip.config";

/**
 * Creates or updates a JSON configuration file with the addresses of deployed contracts.
 *
 * @param network The blockchain network where contracts are deployed (e.g., 'Avalanche Fuji', 'Ethereum Sepolia').
 * @param param1 An object containing optional senderAddress and receiverAddress to be saved.
 */
export async function createOrUpdateConfigFile(
  network: SupportedNetworks,
  {
    senderAddress,
    receiverAddress,
  }: { senderAddress?: string; receiverAddress?: string }
) {
  const deployedContracts = "./scripts/generatedData.json"; // Path to the config file.
  let config: any = {}; // Initialize an empty config object.

  // Check if the configuration file already exists.
  if (fs.existsSync(deployedContracts)) {
    // Read the existing configuration from the file.
    const configFileData = fs.readFileSync(deployedContracts, "utf-8");
    config = JSON.parse(configFileData); // Parse the JSON data into an object.

    // Ensure the network object exists in the configuration.
    config[network] = config[network] || {};
    // Update sender and receiver addresses if provided.
    if (senderAddress) config[network].sender = senderAddress;
    if (receiverAddress) config[network].receiver = receiverAddress;
  } else {
    // Create a new configuration object for the network if the file does not exist.
    // This handles adding sender or receiver independently, creating a new network config if needed.
    if (senderAddress) {
      config = {
        [network]: {
          sender: senderAddress,
        },
      };
    }
    if (receiverAddress) {
      config = {
        [network]: {
          receiver: receiverAddress,
        },
      };
    }
  }
  // Log the action to the console for visibility.
  console.log("Writing to config file:", deployedContracts, config);
  // Write the updated configuration back to the file, formatting JSON for readability.
  fs.writeFileSync(deployedContracts, JSON.stringify(config, null, 2));
}
