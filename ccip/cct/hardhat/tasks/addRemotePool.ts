import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types/hre";
import { isAddress } from "viem";
import {
  Chains,
  CCIPContractName,
  logger,
  configData,
  getEVMNetworkConfig,
} from "../config";
import { CHAIN_FAMILY } from "../config/types";
import {
  validateChainAddressOrThrow,
  prepareChainAddressData,
  InvalidAddressError,
  UnsupportedChainFamilyError,
} from "../utils/chainHandlers";

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
export const addRemotePool = task("addRemotePool", "Add a remote pool for a specific chain selector")
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
    description: "The remote pool address",
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
      const networkName = networkConnection.networkName as Chains;
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
        logger.info(`⚙️  Adding remote pool for ${pooladdress} on ${networkName}...`);
        logger.info(`   Remote chain: ${remotechain}`);
        logger.info(`   Remote chain family: ${remoteChainFamily}`);
        logger.info(`   Remote chain selector: ${remoteChainSelector}`);
        logger.info(`   Remote pool address: ${remotepooladdress}`);

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
        const owner = await (pool as any).read.owner();
        const callerAddress = wallet.account.address;
        
        if (callerAddress.toLowerCase() !== owner.toLowerCase()) {
          throw new Error(
            `Unauthorized: Only the pool owner can add remote pools.\n` +
            `Caller: ${callerAddress}\n` +
            `Owner: ${owner}`
          );
        }
        
        logger.info(`   ✅ Caller is the pool owner`);

        // ✅ Check if the remote chain is supported by this pool
        const remoteChainSelectorBigInt = BigInt(remoteChainSelector);
        const isSupported = await (pool as any).read.isSupportedChain([remoteChainSelectorBigInt]);
        if (!isSupported) {
          throw new Error(
            `Remote chain ${remotechain} (selector: ${remoteChainSelector}) is not supported by this pool.\n` +
            `Please add the chain first using the applyChainUpdates task.`
          );
        }
        logger.info(`   ✅ Remote chain is supported by the pool`);

        // ✅ Prepare remote pool address data
        const preparedRemoteAddress = prepareChainAddressData(
          remotepooladdress,
          remoteChainFamily
        );

        logger.info(`   Prepared remote pool address: ${remotepooladdress} → ${preparedRemoteAddress}`);

        // ✅ Check if the remote pool is already added
        const existingRemotePools = await (pool as any).read.getRemotePools([remoteChainSelectorBigInt]);
        const isAlreadyAdded = existingRemotePools.some((existingPool: string) => 
          existingPool.toLowerCase() === preparedRemoteAddress.toLowerCase()
        );

        if (isAlreadyAdded) {
          throw new Error(
            `Remote pool already added for chain ${remotechain} (selector: ${remoteChainSelector}).\n` +
            `Remote pool address: ${remotepooladdress}\n` +
            `This pool is already configured for this chain.`
          );
        }
        
        logger.info(`   ✅ Remote pool not yet added, proceeding with addition`);

        // ✅ Execute transaction
        const txHash = await (pool as any).write.addRemotePool(
          [remoteChainSelectorBigInt, preparedRemoteAddress],
          { account: wallet.account }
        );

        logger.info(`⏳ Add remote pool tx: ${txHash}`);
        logger.info(`   Waiting for ${confirmations} confirmation(s)...`);

        await publicClient.waitForTransactionReceipt({ 
          hash: txHash,
          confirmations,
        });

        logger.info(`✅ Remote pool added successfully`);
        logger.info(`   Transaction: ${txHash}`);

      } catch (error) {
        logger.error("❌ Add remote pool failed:", error);
        throw error;
      }
    },
  }))
  .build();
