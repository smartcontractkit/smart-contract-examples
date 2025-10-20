import hre from "hardhat";
import { verifyContract } from "@nomicfoundation/hardhat-verify/verify";
import { SupportedNetworks, getCCIPConfig } from "../../ccip.config";
import { createOrUpdateConfigFile } from "../helper";

/**
 * Deploys and verifies the Receiver contract on a specified network.
 */
async function deployAndVerifyReceiver() {
  // Connect to network first to get network connection details
  const networkConnection = await hre.network.connect();
  const { viem } = networkConnection;
  const network = networkConnection.networkName as SupportedNetworks;

  // Retrieve router address for the specified network from the CCIP configuration.
  const { router } = getCCIPConfig(network);

  console.log(`Deploying Receiver contract on ${network}...`);

  const [wallet] = await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();

  // Deploy the Receiver contract with the router address as a constructor argument.
  const constructorArgs = Array<any>([router]);
  const { contract: receiver, deploymentTransaction } = await viem.sendDeploymentTransaction(
    "Receiver",
    ...constructorArgs
  );

  console.log("Receiver contract deployed at:", receiver.address);
  console.log(`⏳ Deployment tx: ${deploymentTransaction.hash}`);

  console.log("wait for 5 blocks");
  // Wait for 5 confirmations to ensure the transaction is well-confirmed on the network.
  await publicClient.waitForTransactionReceipt({
    hash: deploymentTransaction.hash,
    confirmations: 5,
  });

  console.log(`Verifying Receiver contract on ${network}...`);
  try {
    // Attempt to verify the contract on Etherscan (or similar explorer for the specified network).
    const isVerified = await verifyContract(
      {
        address: receiver.address,
        constructorArgs: [router],
      },
      hre
    );

    if (isVerified) {
      console.log(`✅ Receiver contract verified on ${network}!`);
    } else {
      console.log("Receiver contract verification failed");
    }
  } catch (error: any) {
    if (error.message?.includes("Already Verified")) {
      console.log("Receiver contract already verified");
    } else {
      console.error("Error verifying Receiver contract:", error);
    }
  }

  // Update the configuration file with the new contract address.
  await createOrUpdateConfigFile(network, { receiverAddress: receiver.address });
}

// Start the deployment and verification process using the current network's name.
deployAndVerifyReceiver().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
