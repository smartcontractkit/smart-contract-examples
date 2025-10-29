import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types/hre";
import { isAddress } from "viem";
import {
  Chains,
  logger,
  configData,
  getEVMNetworkConfig,
  validateNetworkName,
  CCIPContractName
} from "../config";
import { CHAIN_FAMILY } from "../config/types";
import {
  validateChainAddressOrThrow,
  prepareChainAddressData,
  InvalidAddressError,
  UnsupportedChainFamilyError,
} from "../utils/chainHandlers";

/**
 * Initializes or updates a TokenPool's cross-chain configuration.
 *
 * Example:
 * npx hardhat applyChainUpdates \
 *   --pooladdress 0xLocalPool \
 *   --remotechain solanaDevnet \
 *   --remotepooladdresses addr1,addr2 \
 *   --remotetokenaddress tokenAddr \
 *   --outboundratelimitenabled true \
 *   --outboundratelimitcapacity 1000 \
 *   --outboundratelimitrate 10 \
 *   --inboundratelimitenabled true \
 *   --inboundratelimitcapacity 500 \
 *   --inboundratelimitrate 5 \
 *   --network sepolia
 */
export const applyChainUpdates = task(
  "applyChainUpdates",
  "Initializes or updates pool configuration with cross-chain and rate-limit settings"
)
  .addOption({
    name: "pooladdress",
    description: "The local pool address",
    defaultValue: "",
  })
  .addOption({
    name: "remotechain",
    description: "The remote chain name",
    defaultValue: "",
  })
  .addOption({
    name: "remotepooladdresses",
    description: "Comma-separated list of remote pool addresses",
    defaultValue: "",
  })
  .addOption({
    name: "remotetokenaddress",
    description: "The remote token address",
    defaultValue: "",
  })
  .addOption({
    name: "outboundratelimitenabled",
    description: "Enable outbound rate limiter (true/false)",
    defaultValue: "false",
  })
  .addOption({
    name: "outboundratelimitcapacity",
    description: "Outbound rate limiter capacity",
    defaultValue: "0",
  })
  .addOption({
    name: "outboundratelimitrate",
    description: "Outbound rate limiter rate",
    defaultValue: "0",
  })
  .addOption({
    name: "inboundratelimitenabled",
    description: "Enable inbound rate limiter (true/false)",
    defaultValue: "false",
  })
  .addOption({
    name: "inboundratelimitcapacity",
    description: "Inbound rate limiter capacity",
    defaultValue: "0",
  })
  .addOption({
    name: "inboundratelimitrate",
    description: "Inbound rate limiter rate",
    defaultValue: "0",
  })
  .setAction(async () => ({
    default: async (
      {
        pooladdress,
        remotechain,
        remotepooladdresses,
        remotetokenaddress,
        outboundratelimitenabled = "false",
        outboundratelimitcapacity = "0",
        outboundratelimitrate = "0",
        inboundratelimitenabled = "false",
        inboundratelimitcapacity = "0",
        inboundratelimitrate = "0",
      }: {
        pooladdress: string;
        remotechain: string;
        remotepooladdresses: string;
        remotetokenaddress: string;
        outboundratelimitenabled?: string;
        outboundratelimitcapacity?: string;
        outboundratelimitrate?: string;
        inboundratelimitenabled?: string;
        inboundratelimitcapacity?: string;
        inboundratelimitrate?: string;
      },
      hre: HardhatRuntimeEnvironment
    ) => {
      // Parse boolean and number values from strings
      const outboundEnabled = outboundratelimitenabled === "true";
      const outboundCapacity = Number(outboundratelimitcapacity);
      const outboundRate = Number(outboundratelimitrate);
      const inboundEnabled = inboundratelimitenabled === "true";
      const inboundCapacity = Number(inboundratelimitcapacity);
      const inboundRate = Number(inboundratelimitrate);
      // Validate required parameters
      if (!pooladdress) {
        throw new Error("Pool address is required (--pooladdress)");
      }
      if (!remotechain) {
        throw new Error("Remote chain is required (--remotechain)");
      }
      if (!remotepooladdresses) {
        throw new Error("Remote pool addresses are required (--remotepooladdresses)");
      }
      if (!remotetokenaddress) {
        throw new Error("Remote token address is required (--remotetokenaddress)");
      }

      // Connect to network first
      const networkConnection = await hre.network.connect();
      const { viem } = networkConnection;
      const networkName = validateNetworkName(networkConnection.networkName);

      logger.info("=== Starting Chain Update Configuration ===");
      logger.info(`🔹 Local network: ${networkName}`);
      logger.info(`🔹 Pool address: ${pooladdress}`);
      logger.info(`🔹 Remote chain: ${remotechain}`);

      // Load configs
      const networkConfig = getEVMNetworkConfig(networkName);
  if (!networkConfig)
    throw new Error(`Network ${networkName} not found in config`);

  const remoteNetworkConfig = configData[remotechain as keyof typeof configData];
  if (!remoteNetworkConfig)
    throw new Error(`Remote chain ${remotechain} not found in config`);

      const remoteChainFamily = remoteNetworkConfig.chainFamily as CHAIN_FAMILY;
      const remoteChainSelector = remoteNetworkConfig.chainSelector;
      if (!remoteChainSelector)
        throw new Error(`chainSelector is not defined for ${remotechain}`);

      logger.info(`🔹 Remote chain family: ${remoteChainFamily}`);
      logger.info(`🔹 Remote chain selector: ${remoteChainSelector}`);

      // Validate pool address format (EVM)
      if (!isAddress(pooladdress))
        throw new Error(`Invalid pool address: ${pooladdress}`);

      // Validate pool contract exists
      try {
        const publicClient = await viem.getPublicClient();
        const code = await publicClient.getCode({ address: pooladdress as `0x${string}` });
        if (!code) {
          throw new Error(`No contract found at ${pooladdress} on ${networkName}`);
        }
      } catch (error: any) {
        throw new Error(`Failed to validate pool contract at ${pooladdress}: ${error.message}`);
      }

      // Parse & validate addresses
      const remotePoolAddresses = remotepooladdresses
        .split(",")
        .map((addr) => addr.trim());

      try {
        for (const addr of remotePoolAddresses) {
          validateChainAddressOrThrow(addr, remoteChainFamily);
        }

        validateChainAddressOrThrow(remotetokenaddress, remoteChainFamily);
        logger.info("✅ All addresses validated successfully");
      } catch (err) {
        if (err instanceof InvalidAddressError || err instanceof UnsupportedChainFamilyError) {
          throw new Error(`Address validation failed: ${err.message}`);
        }
        throw err;
      }

      const [wallet] = await viem.getWalletClients();
      const publicClient = await viem.getPublicClient();

      try {
        logger.info(`✅ Using signer: ${wallet.account.address}`);

        // Connect to TokenPool contract
        const poolContract = await viem.getContractAt(
          CCIPContractName.TokenPool,
          pooladdress as `0x${string}`
        );
        logger.info("✅ Connected to TokenPool contract");

        // Prepare encoded addresses
        const preparedRemotePools = remotePoolAddresses.map((addr, i) => {
          const prepared = prepareChainAddressData(addr, remoteChainFamily);
          logger.info(`  Remote pool ${i + 1}: ${addr} → ${prepared}`);
          return prepared as `0x${string}`;
        });

        const preparedRemoteToken = prepareChainAddressData(
          remotetokenaddress,
          remoteChainFamily
        );

        // Log rate limiter setup
        logger.info("=== Rate Limiter Configuration ===");
        logger.info(`Outbound enabled: ${outboundEnabled}`);
        if (outboundEnabled) {
          logger.info(`  capacity: ${outboundCapacity}`);
          logger.info(`  rate: ${outboundRate}`);
        }
        logger.info(`Inbound enabled: ${inboundEnabled}`);
        if (inboundEnabled) {
          logger.info(`  capacity: ${inboundCapacity}`);
          logger.info(`  rate: ${inboundRate}`);
        }

        // Build chainUpdate struct
        const chainUpdate = {
          remoteChainSelector: BigInt(remoteChainSelector),
          remotePoolAddresses: preparedRemotePools,
          remoteTokenAddress: preparedRemoteToken as `0x${string}`,
          outboundRateLimiterConfig: {
            isEnabled: outboundEnabled,
            capacity: BigInt(outboundCapacity),
            rate: BigInt(outboundRate),
          },
          inboundRateLimiterConfig: {
            isEnabled: inboundEnabled,
            capacity: BigInt(inboundCapacity),
            rate: BigInt(inboundRate),
          },
        };

        // Execute transaction
        logger.info("=== Executing applyChainUpdates() ===");
        const txHash = await poolContract.write.applyChainUpdates(
          [[], [chainUpdate]],
          { account: wallet.account.address }
        );
        logger.info(`📤 TX sent: ${txHash}`);

        const { confirmations } = networkConfig;
        if (confirmations === undefined)
          throw new Error(`confirmations is not defined for ${networkName}`);

        logger.info(`Waiting for ${confirmations} confirmations...`);
        await publicClient.waitForTransactionReceipt({ hash: txHash, confirmations });
        logger.info(
          `✅ Chain update applied successfully on ${networkName} (${confirmations} confirmations)!`
        );
      } catch (error: any) {
        logger.error(`❌ Failed to apply chain updates: ${error?.message || String(error)}`);
        throw error;
      }
    },
  }))
  .build();
