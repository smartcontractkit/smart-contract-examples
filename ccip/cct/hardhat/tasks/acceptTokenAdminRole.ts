import { task } from "hardhat/config";
import { Chains, networks, logger } from "../config";

// Define the interface for the task arguments
interface AcceptTokenAdminRoleArgs {
  tokenaddress: string; // The address of the token to accept admin role for
}

// Task to accept the administrator role for a token
// This is the second step in the admin transfer process
task("acceptTokenAdminRole", "Accept token admin role")
  .addParam("tokenaddress", "The address of the token") // The token to accept admin for
  .setAction(async (taskArgs: AcceptTokenAdminRoleArgs, hre) => {
    const { tokenaddress: tokenAddress } = taskArgs;

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

    // Validate token address
    if (!hre.ethers.isAddress(tokenAddress)) {
      throw new Error(`Invalid token address: ${tokenAddress}`);
    }

    // Get the signer to interact with the contract
    const signer = (await hre.ethers.getSigners())[0];
    const { TokenAdminRegistry__factory } = await import("../typechain-types");
    const registryContract = TokenAdminRegistry__factory.connect(
      tokenAdminRegistry,
      signer
    );

    // Verify that the signer is the pending administrator
    const tokenConfig = await registryContract.getTokenConfig(tokenAddress);
    if (tokenConfig.pendingAdministrator !== await signer.getAddress()) {
      throw new Error("Signer is not the pending administrator for this token");
    }

    // Log the operation being performed
    logger.info(`Accepting admin role for token ${tokenAddress}`);

    // Execute the transaction to accept the admin role
    const tx = await registryContract.acceptAdminRole(tokenAddress);

    // Wait for the transaction to be confirmed
    await tx.wait(confirmations);
    logger.info("Admin role accepted successfully");
  }); 