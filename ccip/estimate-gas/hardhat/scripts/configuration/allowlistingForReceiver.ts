import { ethers, network } from "hardhat";
import { SupportedNetworks, getCCIPConfig } from "../../ccip.config";
import deployedContracts from "../generatedData.json";

async function allowlistingForReceiver(currentNetwork: SupportedNetworks) {
  // Get the Receiver contract instance
  const receiverAddress = (
    deployedContracts[currentNetwork] as { receiver: string }
  ).receiver;
  const receiver = await ethers.getContractAt("Receiver", receiverAddress);

  // Iterate over each supported network
  for (const network in deployedContracts) {
    const supportedNetwork = network as SupportedNetworks;
    const sender = (deployedContracts[supportedNetwork] as { sender: string })
      .sender;

    if (sender) {
      // Fetch the destination chain selector
      const sourceChainSelector = getCCIPConfig(supportedNetwork).chainSelector;

      await receiver.allowlistSourceChain(sourceChainSelector, true);
      await receiver.allowlistSender(sender, true);

      console.log(`Allowlisted: ${supportedNetwork} , ${sender}`);
    }
  }
}

allowlistingForReceiver(network.name as SupportedNetworks).catch((error) => {
  console.error(error);
  process.exit(1);
});
