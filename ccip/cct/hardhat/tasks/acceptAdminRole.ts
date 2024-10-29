import { task } from "hardhat/config";
import { Chains, networks, logger } from "../config";

interface AcceptAdminRoleTaskArgs {
  tokenaddress: string;
}

// Task to accept the admin role for a token that has a pending admin
task("acceptAdminRole", "Accepts the admin role of a token")
  .addParam("tokenaddress", "The address of the token") // Token address
  .setAction(async (taskArgs: AcceptAdminRoleTaskArgs, hre) => {
    const { tokenaddress: tokenAddress } = taskArgs;
    const networkName = hre.network.name as Chains;

    // Retrieve the network configuration
    const networkConfig = networks[networkName];
    if (!networkConfig) {
      throw new Error(`Network ${networkName} not found in config`);
    }

    // Validate the provided token address
    if (!hre.ethers.isAddress(tokenAddress)) {
      throw new Error(`Invalid token address: ${tokenAddress}`);
    }

    // Retrieve the token admin registry and confirmations from the network config
    const { tokenAdminRegistry, confirmations } = networkConfig;
    if (!tokenAdminRegistry) {
      throw new Error(`tokenAdminRegistry is not defined for ${networkName}`);
    }

    if (confirmations === undefined) {
      throw new Error(`confirmations is not defined for ${networkName}`);
    }

    // Get the signer (pending admin)
    const [signer] = await hre.ethers.getSigners();

    // Load the TokenAdminRegistry contract factory
    const { TokenAdminRegistry__factory } = await import("../typechain-types");

    // Connect to the TokenAdminRegistry contract
    const tokenAdminRegistryContract = TokenAdminRegistry__factory.connect(
      tokenAdminRegistry,
      signer
    );

    // Retrieve the token configuration to check if the signer is the pending administrator
    const { pendingAdministrator } =
      await tokenAdminRegistryContract.getTokenConfig(tokenAddress);

    // Ensure that the signer is the pending administrator
    if (pendingAdministrator !== signer.address) {
      throw new Error(
        `Only the pending administrator can accept the admin role. Pending administrator: ${pendingAdministrator}`
      );
    }

    // Call the acceptAdminRole function to finalize the admin role
    const tx = await tokenAdminRegistryContract.acceptAdminRole(tokenAddress);

    // Wait for the transaction to be confirmed
    await tx.wait(confirmations);

    logger.info(`Accepted admin role for token ${tokenAddress} tx: ${tx.hash}`);
  });
