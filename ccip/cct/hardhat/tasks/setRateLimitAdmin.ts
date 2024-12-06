import { task } from "hardhat/config";
import { Chains, networks, logger } from "../config";

// Define the interface for the task arguments
interface SetRateLimitAdminArgs {
  pooladdress: string; // The address of the token pool
  adminaddress: string; // The address of the new rate limit administrator
}

// Task to set the rate limit administrator for a token pool
// The rate limit admin can update rate limits without being the pool owner
task("setRateLimitAdmin", "Set the rate limit admin for a token pool")
  .addParam("pooladdress", "The address of the pool") // The token pool to configure
  .addParam("adminaddress", "The address of the new rate limit admin") // The address that will have rate limit admin rights
  .setAction(async (taskArgs: SetRateLimitAdminArgs, hre) => {
    const { pooladdress: poolAddress, adminaddress: adminAddress } = taskArgs;
    const networkName = hre.network.name as Chains;

    // Ensure the network is configured in the network settings
    const networkConfig = networks[networkName];
    if (!networkConfig) {
      throw new Error(`Network ${networkName} not found in config`);
    }

    // Validate the provided addresses are properly formatted
    if (!hre.ethers.isAddress(poolAddress)) {
      throw new Error(`Invalid pool address: ${poolAddress}`);
    }

    if (!hre.ethers.isAddress(adminAddress)) {
      throw new Error(`Invalid admin address: ${adminAddress}`);
    }

    // Get the signer to interact with the contract
    const signer = (await hre.ethers.getSigners())[0];
    const { TokenPool__factory } = await import("../typechain-types");
    const poolContract = TokenPool__factory.connect(poolAddress, signer);

    // Log the operation being performed
    logger.info(`Setting rate limit admin to ${adminAddress} for pool at ${poolAddress}`);

    // Execute the transaction to set the new rate limit admin
    const tx = await poolContract.setRateLimitAdmin(adminAddress);

    // Get the required confirmations from network config
    const { confirmations } = networkConfig;
    if (confirmations === undefined) {
      throw new Error(`confirmations is not defined for ${networkName}`);
    }

    // Wait for the transaction to be confirmed
    await tx.wait(confirmations);
    logger.info("Rate limit admin updated successfully");
  }); 