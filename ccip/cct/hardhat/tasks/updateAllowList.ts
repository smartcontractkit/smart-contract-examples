import { task } from "hardhat/config";
import { Chains, networks, logger } from "../config";

// Define the interface for the task arguments
interface UpdateAllowListArgs {
  pooladdress: string; // The address of the token pool
  addaddresses: string; // Comma-separated list of addresses to add to the allowlist
  removeaddresses: string; // Comma-separated list of addresses to remove from the allowlist
}

// Task to update the allow list for a token pool
// The allow list controls which addresses can initiate cross-chain transfers
task("updateAllowList", "Update the allow list for a token pool")
  .addParam("pooladdress", "The address of the pool") // The token pool to configure
  .addOptionalParam(
    "addaddresses", // Addresses to be granted permission to initiate transfers
    "Comma-separated list of addresses to add to allowlist",
    ""
  )
  .addOptionalParam(
    "removeaddresses", // Addresses to have their transfer permissions revoked
    "Comma-separated list of addresses to remove from allowlist",
    ""
  )
  .setAction(async (taskArgs: UpdateAllowListArgs, hre) => {
    const {
      pooladdress: poolAddress,
      addaddresses: addAddressesStr,
      removeaddresses: removeAddressesStr,
    } = taskArgs;

    const networkName = hre.network.name as Chains;

    // Ensure the network is configured in the network settings
    const networkConfig = networks[networkName];
    if (!networkConfig) {
      throw new Error(`Network ${networkName} not found in config`);
    }

    // Validate the pool address is properly formatted
    if (!hre.ethers.isAddress(poolAddress)) {
      throw new Error(`Invalid pool address: ${poolAddress}`);
    }

    // Parse the comma-separated address strings into arrays
    const addressesToAdd = addAddressesStr
      ? addAddressesStr.split(",").map((addr) => addr.trim())
      : [];
    const addressesToRemove = removeAddressesStr
      ? removeAddressesStr.split(",").map((addr) => addr.trim())
      : [];

    // Validate all addresses in both lists are properly formatted
    [...addressesToAdd, ...addressesToRemove].forEach((address) => {
      if (!hre.ethers.isAddress(address)) {
        throw new Error(`Invalid address in list: ${address}`);
      }
    });

    // Get the signer to interact with the contract
    const signer = (await hre.ethers.getSigners())[0];
    const { TokenPool__factory } = await import("../typechain-types");
    const poolContract = TokenPool__factory.connect(poolAddress, signer);

    // Verify that the allow list feature is enabled for this pool
    const allowListEnabled = await poolContract.getAllowListEnabled();
    if (!allowListEnabled) {
      throw new Error("Allow list is not enabled for this pool");
    }

    // Log the operations being performed
    logger.info(`Updating allow list for pool at ${poolAddress}`);
    if (addressesToAdd.length > 0) {
      logger.info("Adding addresses:");
      addressesToAdd.forEach((addr) => logger.info(`  ${addr}`));
    }
    if (addressesToRemove.length > 0) {
      logger.info("Removing addresses:");
      addressesToRemove.forEach((addr) => logger.info(`  ${addr}`));
    }

    // Execute the transaction to update the allow list
    const tx = await poolContract.applyAllowListUpdates(
      addressesToRemove,
      addressesToAdd
    );

    // Get the required confirmations from network config
    const { confirmations } = networkConfig;
    if (confirmations === undefined) {
      throw new Error(`confirmations is not defined for ${networkName}`);
    }

    // Wait for the transaction to be confirmed
    await tx.wait(confirmations);
    logger.info("Allow list updated successfully");
  }); 