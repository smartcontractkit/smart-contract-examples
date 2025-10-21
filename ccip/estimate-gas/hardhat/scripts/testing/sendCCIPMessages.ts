import hre from "hardhat";
import { maxUint256, parseEventLogs } from "viem";
import { SupportedNetworks, getCCIPConfig } from "../../ccip.config";
import deployedContracts from "../generatedData.json";

// This function is designed to send CCIP messages across networks using the deployed Sender contract.
async function sendCCIPMessages() {
  // Connect to network first to get network connection details
  const networkConnection = await hre.network.connect();
  const { viem } = networkConnection;
  const currentNetwork = networkConnection.networkName as SupportedNetworks;

  const [wallet] = await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();

  // Retrieve the Sender contract's instance using its address for the current network.
  const senderAddress = (
    deployedContracts[currentNetwork] as { sender: string }
  ).sender;
  // Retrieve the address of the LINK token for the current network.
  const linkTokenAddress = getCCIPConfig(currentNetwork).linkToken;
  // Instantiate the Sender and LINK token contracts for interaction.
  const sender = await viem.getContractAt("Sender", senderAddress as `0x${string}`);
  const linkToken = await viem.getContractAt(
    "BurnMintERC677",
    linkTokenAddress as `0x${string}`
  );

  // Approve the LINK token contract to spend tokens on behalf of the sender contract.
  console.log(
    `Approving ${linkTokenAddress} for ${senderAddress}. Allowance is max uint256. Signer ${wallet.account.address}...`
  );
  
  let txHash = await linkToken.write.approve(
    [senderAddress as `0x${string}`, maxUint256],
    { account: wallet.account }
  );
  
  // Wait for the transaction to be confirmed with 5 block confirmations.
  await publicClient.waitForTransactionReceipt({
    hash: txHash,
    confirmations: 5,
  });

  // Define parameters for the test messages to be sent.
  const testParams = [
    { iterations: 0, gasLimit: 5685 }, // Scenario with minimum iterations
    { iterations: 50, gasLimit: 16190 }, // Scenario with average iterations
    { iterations: 99, gasLimit: 26485 }, // Scenario with maximum iterations
  ];

  // Initialize an array to store the IDs of the sent messages.
  const messageIds: Array<{ iterations: number; gasLimit: number; messageId: string }> = [];

  // Loop through each network defined in the deployedContracts to send messages.
  for (const network in deployedContracts) {
    const supportedNetwork = network as SupportedNetworks;
    // Retrieve the receiver's address.
    const receiver = (
      deployedContracts[supportedNetwork] as { receiver: string }
    ).receiver;

    // Check if a receiver is defined for the current network.
    if (receiver) {
      // Retrieve the chain selector ID for the destination network.
      const destinationChainSelector =
        getCCIPConfig(supportedNetwork).chainSelector;

      // Send messages with different iterations and gas limits.
      for (const { iterations, gasLimit } of testParams) {
        txHash = await sender.write.sendMessagePayLINK(
          [
            BigInt(destinationChainSelector),
            receiver as `0x${string}`,
            BigInt(iterations),
            BigInt(gasLimit),
          ],
          { account: wallet.account }
        );
        
        // Wait for the transaction confirmation with 5 block confirmations.
        const receipt = await publicClient.waitForTransactionReceipt({
          hash: txHash,
          confirmations: 5,
        });

        // After confirmation, parse the transaction receipt logs to extract message IDs.
        if (receipt) {
          const senderContract = await viem.getContractAt("Sender", senderAddress as `0x${string}`);
          const logs = parseEventLogs({
            abi: senderContract.abi,
            logs: receipt.logs,
          });

          for (const log of logs) {
            // If the log is related to a message being sent, store its ID.
            if (log.eventName === "MessageSent") {
              const messageId = log.args.messageId;

              messageIds.push({
                iterations,
                gasLimit,
                messageId: messageId as string,
              });
            }
          }
        }
      }
    }
  }

  // Log the IDs of all messages that were successfully sent.
  messageIds.forEach(({ iterations, gasLimit, messageId }) => {
    console.log(
      `Number of iterations ${iterations} - Gas limit: ${gasLimit} - Message Id: ${messageId}`
    );
  });
}

// Execute the sendCCIPMessages function with the current network.
sendCCIPMessages().catch((error) => {
  console.error("Error occurred:", error);
  process.exit(1);
});
