import { ethers, network } from "hardhat";
import { SupportedNetworks, getCCIPConfig } from "../../ccip.config";
import deployedContracts from "../generatedData.json";

async function sendCCIPMessages(currentNetwork: SupportedNetworks) {
  // Get the current signer
  const [signer] = await ethers.getSigners();

  // Get the Sender contract instance
  const senderAddress = (
    deployedContracts[currentNetwork] as { sender: string }
  ).sender;
  const linkTokenAddress = getCCIPConfig(currentNetwork).linkToken;
  const sender = await ethers.getContractAt("Sender", senderAddress);
  const linkToken = await ethers.getContractAt(
    "BurnMintERC677",
    linkTokenAddress
  );

  // max approval (just for testing)
  console.log(
    `Approving ${linkTokenAddress} for ${senderAddress}. Allowance is ${ethers.MaxUint256}. Signer ${signer.address}...`
  );
  let tx = await linkToken.approve(senderAddress, ethers.MaxUint256);
  await tx.wait(5);

  const testParams = [
    { iterations: 0, gasLimit: 5685 }, // min
    { iterations: 50, gasLimit: 16190 }, // average
    { iterations: 99, gasLimit: 26485 }, // max
  ];

  const messageIds = [];

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

      for (const { iterations, gasLimit } of testParams) {
        tx = await sender.sendMessagePayLINK(
          destinationChainSelector,
          receiver,
          iterations,
          gasLimit
        );

        const receipt = await tx.wait(5); // wait for 5 blocks to confirm

        if (receipt) {
          for (const log of receipt.logs) {
            try {
              const parsedLog = sender.interface.parseLog(log);
              if (parsedLog && parsedLog.name === "MessageSent") {
                const messageId = parsedLog.args.messageId;

                messageIds.push({
                  iterations,
                  gasLimit,
                  messageId,
                });
              }
            } catch (error) {
              // This log is not part of the contract, ignore it
            }
          }
        }
      }
    }
  }

  messageIds.forEach(({ iterations, gasLimit, messageId }) => {
    console.log(
      `Number of iterations ${iterations} - Gas limit: ${gasLimit} - Message Id: ${messageId}`
    );
  });
}

sendCCIPMessages(network.name as SupportedNetworks).catch((error) => {
  console.error(error);
  process.exit(1);
});
