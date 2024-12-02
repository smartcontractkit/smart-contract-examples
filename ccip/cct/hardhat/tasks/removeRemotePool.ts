import { task } from "hardhat/config";
import { Chains, networks, logger } from "../config";

// Define the interface for the task arguments
interface RemoveRemotePoolArgs {
  pooladdress: string; // The address of the token pool to configure
  remotechain: string; // The remote chain identifier
  remotepooladdress: string; // The address of the pool to remove on the remote chain
}

// Task to remove a remote pool for a specific chain selector
// WARNING: All inflight transactions from the removed pool will be rejected
// Ensure there are no inflight transactions before removing a pool
task("removeRemotePool", "Remove a remote pool for a specific chain")
  .addParam("pooladdress", "The address of the pool") // The token pool to configure
  .addParam("remotechain", "The remote chain") // The remote blockchain containing the pool to remove
  .addParam("remotepooladdress", "The address of the remote pool") // The pool address to remove
  .setAction(async (taskArgs: RemoveRemotePoolArgs, hre) => {
    const {
      pooladdress: poolAddress,
      remotechain: remoteChain,
      remotepooladdress: remotePoolAddress,
    } = taskArgs;

    const networkName = hre.network.name as Chains;

    // Ensure the network is configured in the network settings
    const networkConfig = networks[networkName];
    if (!networkConfig) {
      throw new Error(`Network ${networkName} not found in config`);
    }

    // Get the remote chain configuration
    const remoteNetworkConfig = networks[remoteChain as Chains];
    if (!remoteNetworkConfig) {
      throw new Error(`Remote chain ${remoteChain} not found in config`);
    }

    // Get the remote chain's selector
    const remoteChainSelector = remoteNetworkConfig.chainSelector;
    if (!remoteChainSelector) {
      throw new Error(`Chain selector not found for ${remoteChain}`);
    }

    // Validate the pool address
    if (!hre.ethers.isAddress(poolAddress)) {
      throw new Error(`Invalid pool address: ${poolAddress}`);
    }

    // Validate the remote pool address
    if (!hre.ethers.isAddress(remotePoolAddress)) {
      throw new Error(`Invalid remote pool address: ${remotePoolAddress}`);
    }

    // Get the signer to interact with the contract
    const signer = (await hre.ethers.getSigners())[0];
    const { TokenPool__factory } = await import("../typechain-types");
    const poolContract = TokenPool__factory.connect(poolAddress, signer);

    // Encode the remote pool address as required by the contract
    const encodedRemotePoolAddress = new hre.ethers.AbiCoder().encode(
      ["address"],
      [remotePoolAddress]
    );

    // Log the operation being performed with a warning
    logger.warn(
      "WARNING: Removing a remote pool will reject all inflight transactions from that pool"
    );
    logger.info(
      `Removing remote pool ${remotePoolAddress} for chain ${remoteChain} (${remoteChainSelector}) from pool ${poolAddress}`
    );

    // Execute the transaction to remove the remote pool
    const tx = await poolContract.removeRemotePool(
      remoteChainSelector,
      encodedRemotePoolAddress
    );

    // Get the required confirmations from network config
    const { confirmations } = networkConfig;
    if (confirmations === undefined) {
      throw new Error(`confirmations is not defined for ${networkName}`);
    }

    // Wait for the transaction to be confirmed
    await tx.wait(confirmations);
    logger.info("Remote pool removed successfully");
  }); 