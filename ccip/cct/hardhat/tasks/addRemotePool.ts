import { task } from "hardhat/config";
import { Chains, networks, logger, configData } from "../config";
import { CHAIN_TYPE } from "../config/types";
import {
  validateChainAddressOrThrow,
  prepareChainAddressData,
  InvalidAddressError,
  UnsupportedChainTypeError,
} from "../utils/chainHandlers";

// Define the interface for the task arguments
interface AddRemotePoolArgs {
  pooladdress: string; // The address of the token pool to configure
  remotechain: string; // The remote chain identifier
  remotepooladdress: string; // The address of the pool on the remote chain
}

// Task to add a remote pool for a specific chain selector
// This is useful when a pool is upgraded on the remote chain and we need to add the new pool address
// Multiple pools can be configured for the same chain selector to handle inflight messages
task("addRemotePool", "Add a remote pool for a specific chain")
  .addParam("pooladdress", "The address of the pool") // The token pool to configure
  .addParam("remotechain", "The remote chain") // The remote blockchain that the pool will interact with
  .addParam("remotepooladdress", "The address of the remote pool") // The pool address on the remote chain
  .setAction(async (taskArgs: AddRemotePoolArgs, hre) => {
    const {
      pooladdress: poolAddress,
      remotechain: remoteChain,
      remotepooladdress: remotePoolAddress,
    } = taskArgs;

    logger.info("=== Adding Remote Pool ===");
    logger.info(`🔹 Local network: ${hre.network.name}`);
    logger.info(`🔹 Pool address: ${poolAddress}`);
    logger.info(`🔹 Remote chain: ${remoteChain}`);
    logger.info(`🔹 Remote pool address: ${remotePoolAddress}`);

    const networkName = hre.network.name as Chains;

    // Ensure the network is configured in the network settings
    const networkConfig = networks[networkName];
    if (!networkConfig) {
      throw new Error(`Network ${networkName} not found in config`);
    }

    // Get the remote chain configuration
    const remoteNetworkConfig =
      configData[remoteChain as keyof typeof configData];
    if (!remoteNetworkConfig) {
      throw new Error(`Remote chain ${remoteChain} not found in config`);
    }

    // Determine the remote chain type
    const remoteChainType = remoteNetworkConfig.chainType as CHAIN_TYPE;
    logger.info(`🔹 Remote chain type detected: ${remoteChainType}`);

    // Get the remote chain's selector
    const remoteChainSelector = remoteNetworkConfig.chainSelector;
    if (remoteChainSelector === undefined) {
      throw new Error(`Chain selector not found for ${remoteChain}`);
    }
    logger.info(`🔹 Remote chain selector: ${remoteChainSelector}`);

    // Validate the pool address (always EVM)
    if (!hre.ethers.isAddress(poolAddress)) {
      throw new Error(`Invalid pool address: ${poolAddress}`);
    }

    // Validate the remote pool address according to chain type
    try {
      validateChainAddressOrThrow(remotePoolAddress, remoteChainType, hre);
      logger.info("✅ All addresses validated successfully");
    } catch (error) {
      if (
        error instanceof InvalidAddressError ||
        error instanceof UnsupportedChainTypeError
      ) {
        throw new Error(
          `Invalid remote pool address for ${remoteChainType} chain: ${remotePoolAddress} - ${error.message}`
        );
      }
      throw error;
    }

    // Get the signer to interact with the contract
    const signer = (await hre.ethers.getSigners())[0];
    logger.info(`🔹 Using signer: ${await signer.getAddress()}`);

    const { TokenPool__factory } = await import("../typechain-types");
    const poolContract = TokenPool__factory.connect(poolAddress, signer);
    logger.info("✅ Connected to pool contract");

    // Prepare the remote pool address based on chain type
    const preparedRemotePoolAddress = prepareChainAddressData(
      remotePoolAddress,
      remoteChainType,
      hre
    );
    logger.info(
      `🔹 Prepared remote pool address: ${remotePoolAddress} → ${preparedRemotePoolAddress}`
    );

    logger.info("=== Executing Transaction ===");
    logger.info("🔹 Sending addRemotePool transaction...");

    // Execute the transaction to add the remote pool
    try {
      const tx = await poolContract.addRemotePool(
        remoteChainSelector,
        preparedRemotePoolAddress
      );
      logger.info(`🔹 Transaction sent: ${tx.hash}`);

      // Get the required confirmations from network config
      const { confirmations } = networkConfig;
      if (confirmations === undefined) {
        throw new Error(`confirmations is not defined for ${networkName}`);
      }

      logger.info(`🔹 Waiting for ${confirmations} confirmations...`);
      // Wait for the transaction to be confirmed
      await tx.wait(confirmations);
      logger.info("✅ Remote pool added successfully");
    } catch (error) {
      logger.error("❌ Transaction failed:");
      logger.error(error);
      throw error;
    }
  });
