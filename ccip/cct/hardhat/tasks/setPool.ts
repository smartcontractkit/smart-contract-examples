import { task } from "hardhat/config";
import { Chains, networks, logger } from "../config";

interface SetPoolArgs {
  tokenaddress: string;
  pooladdress: string;
}

// Task to link a token with its respective pool in the TokenAdminRegistry contract
task("setPool", "Set the pool for a token")
  .addParam("tokenaddress", "The address of the token") // Address of the token
  .addParam("pooladdress", "The address of the pool") // Address of the token pool
  .setAction(async (taskArgs: SetPoolArgs, hre) => {
    const { tokenaddress: tokenAddress, pooladdress: poolAddress } = taskArgs;
    const networkName = hre.network.name as Chains;

    // Retrieve the network configuration
    const networkConfig = networks[networkName];
    if (!networkConfig) {
      throw new Error(`Network ${networkName} not found in config`);
    }

    // Validate the provided token and pool addresses
    if (!hre.ethers.isAddress(tokenAddress)) {
      throw new Error(`Invalid token address: ${tokenAddress}`);
    }

    if (!hre.ethers.isAddress(poolAddress)) {
      throw new Error(`Invalid pool address: ${poolAddress}`);
    }

    // Retrieve the token admin registry and confirmations from the network config
    const { tokenAdminRegistry, confirmations } = networkConfig;
    if (!tokenAdminRegistry) {
      throw new Error(`tokenAdminRegistry is not defined for ${networkName}`);
    }

    if (confirmations === undefined) {
      throw new Error(`confirmations is not defined for ${networkName}`);
    }

    // Get the signer (token administrator)
    const signerAddress = (await hre.ethers.getSigners())[0];

    // Load the TokenAdminRegistry contract factory
    const { TokenAdminRegistry__factory } = await import("../typechain-types");

    // Connect to the TokenAdminRegistry contract
    const tokenAdminRegistryContract = TokenAdminRegistry__factory.connect(
      tokenAdminRegistry,
      signerAddress
    );

    // Retrieve the token configuration to find the current administrator
    const config = await tokenAdminRegistryContract.getTokenConfig(
      tokenAddress
    );
    const tokenAdministratorAddress = config.administrator;

    logger.info(
      `Setting pool for token ${tokenAddress} to ${poolAddress} by ${tokenAdministratorAddress}`
    );

    // Ensure the action is being performed by the token administrator
    const tokenAdministrator = await hre.ethers.getSigner(
      tokenAdministratorAddress
    );

    // Call the setPool function to link the token with the pool
    const tx = await tokenAdminRegistryContract
      .connect(tokenAdministrator)
      .setPool(tokenAddress, poolAddress);

    // Wait for transaction confirmation
    await tx.wait(confirmations);
    logger.info(`Pool set for token ${tokenAddress} to ${poolAddress}`);
  });
