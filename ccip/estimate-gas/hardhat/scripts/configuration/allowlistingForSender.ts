import hre from "hardhat";
import { SupportedNetworks, getCCIPConfig } from "../../ccip.config";
import deployedContracts from "../generatedData.json";

async function allowlistingForSender() {
  // Connect to network first to get network connection details
  const networkConnection = await hre.network.connect();
  const { viem } = networkConnection;
  const currentNetwork = networkConnection.networkName as SupportedNetworks;

  // Get the Sender contract instance
  const senderAddress = (
    deployedContracts[currentNetwork] as { sender: string }
  ).sender;
  const sender = await viem.getContractAt("Sender", senderAddress as `0x${string}`);

  const [wallet] = await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();

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

      console.log(`Allowlisting destination chain ${supportedNetwork}...`);
      const txHash = await sender.write.allowlistDestinationChain(
        [BigInt(destinationChainSelector), true],
        { account: wallet.account }
      );
      
      // Wait for transaction to be mined
      await publicClient.waitForTransactionReceipt({
        hash: txHash,
        confirmations: 2,
      });

      console.log(`✅ Allowlisted: ${supportedNetwork}`);
    }
  }
}

allowlistingForSender().catch((error) => {
  console.error(error);
  process.exit(1);
});
