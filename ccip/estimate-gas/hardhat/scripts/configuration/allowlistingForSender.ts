import { ethers, network } from "hardhat";
import { SupportedNetworks, getCCIPConfig } from "../../ccip.config";
import deployedContracts from "../generatedData.json";

async function allowlistingForSender(currentNetwork: SupportedNetworks) {
  // Get the Sender contract instance
  const senderAddress = (
    deployedContracts[currentNetwork] as { sender: string }
  ).sender;
  const sender = await ethers.getContractAt("Sender", senderAddress);

  // Iterate over each supported network
  for (const network in deployedContracts) {
    const supportedNetwork = network as SupportedNetworks;
    const receiver = (
      deployedContracts[supportedNetwork] as { receiver: string }
    ).receiver;

    if (receiver) {
      // Fetch the destination chain selector
      const destinationChainSelector =
        getCCIPConfig(supportedNetwork).chainSelector;

      await sender.allowlistDestinationChain(destinationChainSelector, true);

      console.log(`Allowlisted: ${supportedNetwork}`);
    }
  }
}

allowlistingForSender(network.name as SupportedNetworks).catch((error) => {
  console.error(error);
  process.exit(1);
});
