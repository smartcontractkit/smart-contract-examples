import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types/hre";
import { isAddress } from "viem";
import {
  Chains,
  CCIPContractName,
  logger,
  configData,
  getEVMNetworkConfig,
  validateNetworkName,
} from "../config";
import { CHAIN_FAMILY } from "../config/types";
import {
  validateChainAddressOrThrow,
  prepareChainAddressData,
  InvalidAddressError,
  UnsupportedChainFamilyError,
} from "../utils/chainHandlers";

/**
 * Removes a remote pool from a TokenPool contract.
 * ⚠️  WARNING: This rejects all inflight transactions from that remote pool.
 *
 * Example:
 * npx hardhat removeRemotePool \
 *   --pooladdress 0xYourLocalPool \
 *   --remotechain baseSepolia \
 *   --remotepooladdress 0xYourRemotePool \
 *   --network sepolia
 */
export const removeRemotePool = task("removeRemotePool", "Removes a remote pool for a specific chain")
  .addOption({
    name: "pooladdress",
    description: "The local token pool address",
    defaultValue: "",
  })
  .addOption({
    name: "remotechain",
    description: "The remote chain name",
    defaultValue: "",
  })
  .addOption({
    name: "remotepooladdress",
    description: "The remote pool address to remove",
    defaultValue: "",
  })
  .setAction(async () => ({
    default: async (
      {
        pooladdress,
        remotechain,
        remotepooladdress,
      }: {
        pooladdress: string;
        remotechain: string;
        remotepooladdress: string;
      },
      hre: HardhatRuntimeEnvironment
    ) => {
      // Validate required parameters
      if (!pooladdress) {
        throw new Error("Pool address is required (--pooladdress)");
      }

      if (!remotechain) {
        throw new Error("Remote chain is required (--remotechain)");
      }

      if (!remotepooladdress) {
        throw new Error("Remote pool address is required (--remotepooladdress)");
      }

      // Connect to network first
      const networkConnection = await hre.network.connect();
      const { viem } = networkConnection;
      const networkName = validateNetworkName(networkConnection.networkName);
      const networkConfig = getEVMNetworkConfig(networkName);
      if (!networkConfig) throw new Error(`Network ${networkName} not found`);
      const { confirmations } = networkConfig;
      if (confirmations === undefined)
        throw new Error(`confirmations missing for ${networkName}`);

      // ✅ Validate pool address
      if (!isAddress(pooladdress))
        throw new Error(`Invalid pool address: ${pooladdress}`);

      // ✅ Load remote chain config
      const remoteConfig = configData[remotechain as keyof typeof configData];
      if (!remoteConfig)
        throw new Error(`Remote chain ${remotechain} not found in config`);

      const remoteChainFamily = remoteConfig.chainFamily as CHAIN_FAMILY;
      const remoteChainSelector = remoteConfig.chainSelector;
      if (!remoteChainSelector)
        throw new Error(`chainSelector missing for ${remotechain}`);

      const [wallet] = await viem.getWalletClients();
      const publicClient = await viem.getPublicClient();

      try {
        logger.warn(`⚠️  Removing remote pool for ${pooladdress} on ${networkName}...`);
        logger.warn(`   WARNING: This will reject all inflight transactions from the removed pool!`);
        logger.info(`   Remote chain: ${remotechain}`);
        logger.info(`   Remote chain family: ${remoteChainFamily}`);
        logger.info(`   Remote chain selector: ${remoteChainSelector}`);
        logger.info(`   Remote pool address to remove: ${remotepooladdress}`);

        // ✅ Validate remote pool address format
        try {
          validateChainAddressOrThrow(remotepooladdress, remoteChainFamily);
          logger.info(`   ✅ Address validation successful`);
        } catch (error) {
          if (
            error instanceof InvalidAddressError ||
            error instanceof UnsupportedChainFamilyError
          ) {
            throw new Error(
              `Invalid remote pool address for ${remoteChainFamily} chain: ${remotepooladdress} — ${error.message}`
            );
          }
          throw error;
        }

        // ✅ Connect to TokenPool contract
        const pool = await viem.getContractAt(
          CCIPContractName.TokenPool,
          pooladdress as `0x${string}`
        );

        // ✅ Check if the caller is the pool owner
        const owner = await pool.read.owner();
        const callerAddress = wallet.account.address;
        
        if (callerAddress.toLowerCase() !== owner.toLowerCase()) {
          throw new Error(
            `Unauthorized: Only the pool owner can remove remote pools.\n` +
            `Caller: ${callerAddress}\n` +
            `Owner: ${owner}`
          );
        }
        
        logger.info(`   ✅ Caller is the pool owner`);

        // ✅ Check if the remote chain is supported by this pool
        const remoteChainSelectorBigInt = BigInt(remoteChainSelector);
        const isSupported = await pool.read.isSupportedChain([remoteChainSelectorBigInt]);
        if (!isSupported) {
          throw new Error(
            `Remote chain ${remotechain} (selector: ${remoteChainSelector}) is not supported by this pool.\n` +
            `Cannot remove a pool from an unsupported chain.`
          );
        }
        logger.info(`   ✅ Remote chain is supported by the pool`);

        // ✅ Prepare remote pool address data
        const preparedRemoteAddress = prepareChainAddressData(
          remotepooladdress,
          remoteChainFamily
        );

        logger.info(`   Prepared remote pool address: ${remotepooladdress} → ${preparedRemoteAddress}`);

        // ✅ Check if the remote pool exists before trying to remove it
        const existingRemotePools = await pool.read.getRemotePools([remoteChainSelectorBigInt]);
        const poolExists = existingRemotePools.some((existingPool: string) => 
          existingPool.toLowerCase() === preparedRemoteAddress.toLowerCase()
        );

        if (!poolExists) {
          throw new Error(
            `Remote pool not found for chain ${remotechain} (selector: ${remoteChainSelector}).\n` +
            `Remote pool address: ${remotepooladdress}\n` +
            `This pool is not configured for this chain, so it cannot be removed.`
          );
        }
        
        logger.info(`   ✅ Remote pool exists, proceeding with removal`);

        // ✅ Execute transaction
        const txHash = await pool.write.removeRemotePool(
          [remoteChainSelectorBigInt, preparedRemoteAddress as `0x${string}`],
          { account: wallet.account }
        );

        logger.info(`⏳ Remove remote pool tx: ${txHash}`);
        logger.info(`   Waiting for ${confirmations} confirmation(s)...`);

        await publicClient.waitForTransactionReceipt({ 
          hash: txHash,
          confirmations,
        });

        logger.info(`✅ Remote pool removed successfully`);
        logger.info(`   Transaction: ${txHash}`);

      } catch (error) {
        logger.error("❌ Remove remote pool failed:", error);
        throw error;
      }
    },
  }))
  .build();
