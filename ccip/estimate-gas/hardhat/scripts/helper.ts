import fs from "fs";
import { SupportedNetworks } from "../ccip.config";

export async function createOrUpdateConfigFile(
  network: SupportedNetworks,
  {
    senderAddress,
    receiverAddress,
  }: { senderAddress?: string; receiverAddress?: string }
) {
  const deployedContracts = "./scripts/generatedData.json";
  let config: any = {};
  if (fs.existsSync(deployedContracts)) {
    // Read the existing config file
    const configFileData = fs.readFileSync(deployedContracts, "utf-8");
    config = JSON.parse(configFileData);

    config[network] = config[network] || {};
    if (senderAddress) config[network].sender = senderAddress;
    if (receiverAddress) config[network].receiver = receiverAddress;
  } else {
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
  console.log("Writing to config file:", deployedContracts, config);
  fs.writeFileSync(deployedContracts, JSON.stringify(config, null, 2));
}
