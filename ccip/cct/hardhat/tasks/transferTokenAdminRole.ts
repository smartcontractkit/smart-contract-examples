import { task } from "hardhat/config";
import { Chains, networks, logger } from "../config";

// Define the interface for the task arguments
interface TransferTokenAdminRoleArgs {
  tokenaddress: string; // The address of the token to transfer admin role for
  newadmin: string; // The address of the new administrator
}

// Task to transfer the administrator role for a token to a new address
// This is a two-step process where the new admin must accept the role
task("transferTokenAdminRole", "Transfer token admin role to a new address")
  .addParam("tokenaddress", "The address of the token") // The token to transfer admin for
  .addParam("newadmin", "The address of the new admin") // The new administrator address
  .setAction(async (taskArgs: TransferTokenAdminRoleArgs, hre) => {
    const { tokenaddress: tokenAddress, newadmin: newAdmin } = taskArgs;

    const networkName = hre.network.name as Chains;

    // Ensure the network is configured in the network settings
    const networkConfig = networks[networkName];
    if (!networkConfig) {
      throw new Error(`Network ${networkName} not found in config`);
    }

    // Retrieve the TokenAdminRegistry contract address and confirmations
    const { tokenAdminRegistry, confirmations } = networkConfig;
    if (!tokenAdminRegistry) {
      throw new Error(`tokenAdminRegistry is not defined for ${networkName}`);
    }

    if (confirmations === undefined) {
      throw new Error(`confirmations is not defined for ${networkName}`);
    }

    // Validate addresses
    if (!hre.ethers.isAddress(tokenAddress)) {
      throw new Error(`Invalid token address: ${tokenAddress}`);
    }
    if (!hre.ethers.isAddress(newAdmin)) {
      throw new Error(`Invalid new admin address: ${newAdmin}`);
    }

    // Get the signer to interact with the contract
    const signer = (await hre.ethers.getSigners())[0];
    const { TokenAdminRegistry__factory } = await import("../typechain-types");
    const registryContract = TokenAdminRegistry__factory.connect(
      tokenAdminRegistry,
      signer
    );

    // Log the operation being performed
    logger.info(
      `Transferring admin role for token ${tokenAddress} to ${newAdmin}`
    );

    // Execute the transaction to transfer the admin role
    const tx = await registryContract.transferAdminRole(tokenAddress, newAdmin);

    // Wait for the transaction to be confirmed
    await tx.wait(confirmations);
    logger.info("Admin role transfer initiated successfully");
    logger.info(
      `New admin ${newAdmin} must call acceptTokenAdminRole to complete the transfer`
    );
  }); 