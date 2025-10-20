import hre from "hardhat";
import { verifyContract } from "@nomicfoundation/hardhat-verify/verify";
import { SupportedNetworks, getCCIPConfig } from "../../ccip.config";
import { createOrUpdateConfigFile } from "../helper";

/**
 * Deploys and verifies the Sender contract on a specified network.
 */
async function deployAndVerifySender() {
  // Connect to network first to get network connection details
  const networkConnection = await hre.network.connect();
  const { viem } = networkConnection;
  const network = networkConnection.networkName as SupportedNetworks;

  // Retrieve router and linkToken addresses for the specified network.
  const { router, linkToken } = getCCIPConfig(network);

  console.log(`Deploying Sender contract on ${network}...`);

  const [wallet] = await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();

  // Deploy the Sender contract with router and linkToken as constructor arguments.
  const constructorArgs = Array<any>([router, linkToken]);
  const { contract: sender, deploymentTransaction } = await viem.sendDeploymentTransaction(
    "Sender",
    ...constructorArgs
  );

  console.log("Sender contract deployed at:", sender.address);
  console.log(`⏳ Deployment tx: ${deploymentTransaction.hash}`);

  console.log("wait for 20 blocks");
  // Wait for 20 confirmations to ensure the transaction is well-confirmed on the network.
  await publicClient.waitForTransactionReceipt({
    hash: deploymentTransaction.hash,
    confirmations: 20,
  });

  console.log(`Verifying Sender contract on ${network}...`);
  try {
    // Attempt to verify the contract on Etherscan (or similar explorer for the specified network).
    const isVerified = await verifyContract(
      {
        address: sender.address,
        constructorArgs: [router, linkToken],
      },
      hre
    );

    if (isVerified) {
      console.log(`✅ Sender contract verified on ${network}!`);
    } else {
      console.log("Sender contract verification failed");
    }
  } catch (error: any) {
    if (error.message?.includes("Already Verified")) {
      console.log("Sender contract already verified");
    } else {
      console.error("Error verifying Sender contract:", error);
    }
  }

  // Update the configuration file with the new contract address.
  await createOrUpdateConfigFile(network, { senderAddress: sender.address });
}

// Execute the deployment and verification process for the current network.
deployAndVerifySender().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
