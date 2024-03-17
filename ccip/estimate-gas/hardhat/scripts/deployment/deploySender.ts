import { ethers, run, network } from "hardhat";
import { SupportedNetworks, getCCIPConfig } from "../../ccip.config";
import { createOrUpdateConfigFile } from "../helper";

/**
 * Deploys and verifies the Sender contract on a specified network.
 * @param network The network where the Sender contract will be deployed.
 */
async function deployAndVerifySender(network: SupportedNetworks) {
  // Retrieve router and linkToken addresses for the specified network.
  const { router, linkToken } = getCCIPConfig(network);

  console.log(`Deploying Sender contract on ${network}...`);
  // Create a contract factory for the "Sender" contract.
  const Sender = await ethers.getContractFactory("Sender");
  // Deploy the Sender contract with router and linkToken as constructor arguments.
  const sender = await Sender.deploy(router, linkToken);

  // Wait for the contract deployment transaction to be mined.
  await sender.waitForDeployment();
  // Retrieve the transaction used for deploying the contract.
  const tx = sender.deploymentTransaction();
  if (tx) {
    console.log("wait for 20 blocks");
    // Wait for 20 confirmations to ensure the transaction is well-confirmed on the network.
    await tx.wait(20);

    // Get the deployed contract address.
    const senderAddress = await sender.getAddress();
    console.log("Sender contract deployed at:", senderAddress);

    console.log(`Verifying Sender contract on ${network}...`);
    try {
      // Attempt to verify the contract on Etherscan (or similar explorer for the specified network).
      await run("verify:verify", {
        address: senderAddress,
        constructorArguments: [router, linkToken],
      });
      console.log(`Sender contract verified on ${network}!`);
    } catch (error) {
      console.error("Error verifying Sender contract:", error);
    }

    // Update the configuration file with the new contract address.
    await createOrUpdateConfigFile(network, { senderAddress });
  }
}

// Execute the deployment and verification process for the current network.
deployAndVerifySender(network.name as SupportedNetworks).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
