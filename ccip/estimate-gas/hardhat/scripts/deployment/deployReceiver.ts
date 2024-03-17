import { ethers, run, network } from "hardhat";
import { SupportedNetworks, getCCIPConfig } from "../../ccip.config";
import { createOrUpdateConfigFile } from "../helper";

/**
 * Deploys and verifies the Receiver contract on a specified network.
 * @param network The network where the Receiver contract will be deployed.
 */
async function deployAndVerifyReceiver(network: SupportedNetworks) {
  // Retrieve router address for the specified network from the CCIP configuration.
  const { router } = getCCIPConfig(network);

  console.log(`Deploying Receiver contract on ${network}...`);

  // Get the contract factory for the "Receiver" contract.
  const Receiver = await ethers.getContractFactory("Receiver");

  // Deploy the Receiver contract with the router address as a constructor argument.
  const receiver = await Receiver.deploy(router);

  // Wait for the contract deployment transaction to be mined.
  await receiver.waitForDeployment();

  // Retrieve the transaction used for deploying the contract.
  const tx = receiver.deploymentTransaction();
  if (tx) {
    console.log("wait for 5 blocks");

    // Wait for 5 confirmations to ensure the transaction is well-confirmed on the network.
    await tx.wait(5);

    // Get the deployed contract address.
    const receiverAddress = await receiver.getAddress();
    console.log("Receiver contract deployed at:", receiverAddress);

    console.log(`Verifying Receiver contract on ${network}...`);
    try {
      // Attempt to verify the contract on Etherscan (or similar explorer for the specified network).
      await run("verify:verify", {
        address: receiverAddress,
        constructorArguments: [router],
      });
      console.log(`Receiver contract verified on ${network}!`);
    } catch (error) {
      console.error("Error verifying Receiver contract:", error);
    }

    // Update the configuration file with the new contract address.
    await createOrUpdateConfigFile(network, { receiverAddress });
  }
}

// Start the deployment and verification process using the current network's name.
deployAndVerifyReceiver(network.name as SupportedNetworks).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
