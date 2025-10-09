import { task } from "hardhat/config";
import {
  Chains,
  logger,
  configData,
  getEVMNetworkConfig,
} from "../config";
import { CHAIN_TYPE } from "../config/types";
import {
  validateChainAddressOrThrow,
  prepareChainAddressData,
  InvalidAddressError,
  UnsupportedChainTypeError,
} from "../utils/chainHandlers";

import TokenPoolABI from "@chainlink/contracts-ccip/abi/TokenPool.abi.json";

/**
 * Adds a remote pool address for a given chain selector.
 *
 * Example:
 * npx hardhat addRemotePool \
 *   --pooladdress 0xYourLocalPool \
 *   --remotechain baseSepolia \
 *   --remotepooladdress 0xYourRemotePool \
 *   --network sepolia
 */
task("addRemotePool", "Add a remote pool for a specific chain selector")
  .setAction(<any>(async (taskArgs: {
    pooladdress: string;
    remotechain: string;
    remotepooladdress: string;
  }, hre: any) => {
    const { pooladdress, remotechain, remotepooladdress } = taskArgs;

    logger.info("=== Adding Remote Pool ===");
    logger.info(`🔹 Local network: ${hre.network.name}`);
    logger.info(`🔹 Pool address: ${pooladdress}`);
    logger.info(`🔹 Remote chain: ${remotechain}`);
    logger.info(`🔹 Remote pool address: ${remotepooladdress}`);

    const networkName = hre.network.name as Chains;
    const networkConfig = getEVMNetworkConfig(networkName);
    if (!networkConfig)
      throw new Error(`Network ${networkName} not found in config`);

    const remoteConfig = configData[remotechain as keyof typeof configData];
    if (!remoteConfig)
      throw new Error(`Remote chain ${remotechain} not found in config`);

    const remoteChainType = remoteConfig.chainType as CHAIN_TYPE;
    const remoteChainSelector = remoteConfig.chainSelector;
    if (!remoteChainSelector)
      throw new Error(`chainSelector missing for ${remotechain}`);

    logger.info(`🔹 Remote chain type: ${remoteChainType}`);
    logger.info(`🔹 Remote chain selector: ${remoteChainSelector}`);

    if (!hre.viem.isAddress(pooladdress))
      throw new Error(`Invalid pool address: ${pooladdress}`);

    try {
      validateChainAddressOrThrow(remotepooladdress, remoteChainType, hre);
      logger.info("✅ Address validation successful");
    } catch (error) {
      if (
        error instanceof InvalidAddressError ||
        error instanceof UnsupportedChainTypeError
      ) {
        throw new Error(
          `Invalid remote pool address for ${remoteChainType} chain: ${remotepooladdress} — ${error.message}`
        );
      }
      throw error;
    }

    const [wallet] = await hre.viem.getWalletClients();
    const publicClient = await hre.viem.getPublicClient();
    logger.info(`🔹 Using signer: ${wallet.account.address}`);

    const pool = await hre.viem.getContractAt({
      address: pooladdress,
      abi: TokenPoolABI,
    });
    logger.info("✅ Connected to TokenPool contract");

    const preparedRemoteAddress = prepareChainAddressData(
      remotepooladdress,
      remoteChainType,
      hre
    );

    logger.info(
      `🔹 Prepared remote pool address: ${remotepooladdress} → ${preparedRemoteAddress}`
    );

    try {
      const txHash = await pool.write.addRemotePool(
        [BigInt(remoteChainSelector), preparedRemoteAddress],
        { account: wallet.account }
      );
      logger.info(`🔹 Tx sent: ${txHash}`);

      const { confirmations } = networkConfig;
      if (confirmations === undefined)
        throw new Error(`confirmations not defined for ${networkName}`);

      logger.info(`🔹 Waiting for ${confirmations} confirmations...`);
      await publicClient.waitForTransactionReceipt({ hash: txHash });
      logger.info("✅ Remote pool added successfully");
    } catch (error) {
      logger.error("❌ Transaction failed:");
      logger.error(error);
      throw error;
    }
  }));
