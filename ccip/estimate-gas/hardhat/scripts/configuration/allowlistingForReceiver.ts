import hre from "hardhat";
import { SupportedNetworks, getCCIPConfig } from "../../ccip.config";
import deployedContracts from "../generatedData.json";

async function allowlistingForReceiver() {
  // Connect to network first to get network connection details
  const networkConnection = await hre.network.connect();
  const { viem } = networkConnection;
  const currentNetwork = networkConnection.networkName as SupportedNetworks;

  // Get the Receiver contract instance
  const receiverAddress = (
    deployedContracts[currentNetwork] as { receiver: string }
  ).receiver;
  const receiver = await viem.getContractAt("Receiver", receiverAddress as `0x${string}`);

  const [wallet] = await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();

  // Iterate over each supported network
  for (const network in deployedContracts) {
    const supportedNetwork = network as SupportedNetworks;
    const sender = (deployedContracts[supportedNetwork] as { sender: string })
      .sender;

    if (sender) {
      // Fetch the destination chain selector
      const sourceChainSelector = getCCIPConfig(supportedNetwork).chainSelector;

      console.log(`Allowlisting source chain for ${supportedNetwork}...`);
      const txHash1 = await receiver.write.allowlistSourceChain(
        [BigInt(sourceChainSelector), true],
        { account: wallet.account }
      );
      
      // Wait for first transaction to be mined
      await publicClient.waitForTransactionReceipt({
        hash: txHash1,
        confirmations: 2,
      });
      console.log(`✓ Source chain ${supportedNetwork} allowlisted`);

      console.log(`Allowlisting sender ${sender}...`);
      const txHash2 = await receiver.write.allowlistSender(
        [sender as `0x${string}`, true],
        { account: wallet.account }
      );
      
      // Wait for second transaction to be mined
      await publicClient.waitForTransactionReceipt({
        hash: txHash2,
        confirmations: 2,
      });
      console.log(`✓ Sender ${sender} allowlisted`);

      console.log(`✅ Allowlisted: ${supportedNetwork} , ${sender}`);
    }
  }
}

allowlistingForReceiver().catch((error) => {
  console.error(error);
  process.exit(1);
});
