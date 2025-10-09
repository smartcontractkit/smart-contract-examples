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
 * Initializes or updates a TokenPool’s cross-chain configuration.
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
task(
  "applyChainUpdates",
  "Initializes or updates pool configuration with cross-chain and rate-limit settings"
).setAction(<any>(async (taskArgs: {
  pooladdress: string;
  remotechain: string;
  remotepooladdresses: string;
  remotetokenaddress: string;
  outboundratelimitenabled?: boolean;
  outboundratelimitcapacity?: number;
  outboundratelimitrate?: number;
  inboundratelimitenabled?: boolean;
  inboundratelimitcapacity?: number;
  inboundratelimitrate?: number;
}, hre: any) => {
  const {
    pooladdress,
    remotechain,
    remotepooladdresses,
    remotetokenaddress,
    outboundratelimitenabled = false,
    outboundratelimitcapacity = 0,
    outboundratelimitrate = 0,
    inboundratelimitenabled = false,
    inboundratelimitcapacity = 0,
    inboundratelimitrate = 0,
  } = taskArgs;

  logger.info("=== Starting Chain Update Configuration ===");
  const networkName = hre.network.name as Chains;
  logger.info(`🔹 Local network: ${networkName}`);
  logger.info(`🔹 Pool address: ${pooladdress}`);
  logger.info(`🔹 Remote chain: ${remotechain}`);

  // ✅ Load configs
  const networkConfig = getEVMNetworkConfig(networkName);
  if (!networkConfig)
    throw new Error(`Network ${networkName} not found in config`);

  const remoteNetworkConfig = configData[remotechain as keyof typeof configData];
  if (!remoteNetworkConfig)
    throw new Error(`Remote chain ${remotechain} not found in config`);

  const remoteChainType = remoteNetworkConfig.chainType as CHAIN_TYPE;
  const remoteChainSelector = remoteNetworkConfig.chainSelector;
  if (!remoteChainSelector)
    throw new Error(`chainSelector is not defined for ${remotechain}`);

  logger.info(`🔹 Remote chain type: ${remoteChainType}`);
  logger.info(`🔹 Remote chain selector: ${remoteChainSelector}`);

  // ✅ Parse & validate addresses
  const remotePoolAddresses = remotepooladdresses
    .split(",")
    .map((addr) => addr.trim());

  try {
    for (const addr of remotePoolAddresses)
      validateChainAddressOrThrow(addr, remoteChainType, hre);

    if (!hre.viem.isAddress(pooladdress))
      throw new Error(`Invalid pool address: ${pooladdress}`);

    validateChainAddressOrThrow(remotetokenaddress, remoteChainType, hre);
    logger.info("✅ All addresses validated successfully");
  } catch (err) {
    if (err instanceof InvalidAddressError || err instanceof UnsupportedChainTypeError)
      throw new Error(`Address validation failed: ${err.message}`);
    throw err;
  }

  // ✅ Wallet + public client
  const [wallet] = await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();
  logger.info(`✅ Using signer: ${wallet.account.address}`);

  // ✅ Connect to TokenPool contract
  const poolContract = await hre.viem.getContractAt({
    address: pooladdress,
    abi: TokenPoolABI,
  });
  logger.info("✅ Connected to TokenPool contract");

  // ✅ Prepare encoded addresses
  const preparedRemotePools = remotePoolAddresses.map((addr, i) => {
    const prepared = prepareChainAddressData(addr, remoteChainType, hre);
    logger.info(`  Remote pool ${i + 1}: ${addr} → ${prepared}`);
    return prepared;
  });

  const preparedRemoteToken = prepareChainAddressData(
    remotetokenaddress,
    remoteChainType,
    hre
  );

  // ✅ Log rate limiter setup
  logger.info("=== Rate Limiter Configuration ===");
  logger.info(`Outbound enabled: ${outboundratelimitenabled}`);
  if (outboundratelimitenabled) {
    logger.info(`  capacity: ${outboundratelimitcapacity}`);
    logger.info(`  rate: ${outboundratelimitrate}`);
  }
  logger.info(`Inbound enabled: ${inboundratelimitenabled}`);
  if (inboundratelimitenabled) {
    logger.info(`  capacity: ${inboundratelimitcapacity}`);
    logger.info(`  rate: ${inboundratelimitrate}`);
  }

  // ✅ Build chainUpdate struct
  const chainUpdate = {
    remoteChainSelector: BigInt(remoteChainSelector),
    remotePoolAddresses: preparedRemotePools,
    remoteTokenAddress: preparedRemoteToken,
    outboundRateLimiterConfig: {
      isEnabled: outboundratelimitenabled,
      capacity: BigInt(outboundratelimitcapacity),
      rate: BigInt(outboundratelimitrate),
    },
    inboundRateLimiterConfig: {
      isEnabled: inboundratelimitenabled,
      capacity: BigInt(inboundratelimitcapacity),
      rate: BigInt(inboundratelimitrate),
    },
  };

  // ✅ Execute transaction
  logger.info("=== Executing applyChainUpdates() ===");
  try {
    const txHash = await poolContract.write.applyChainUpdates(
      [[], [chainUpdate]],
      { account: wallet.account }
    );
    logger.info(`🔹 Tx sent: ${txHash}`);

    const { confirmations } = networkConfig;
    if (confirmations === undefined)
      throw new Error(`confirmations is not defined for ${networkName}`);

    logger.info(`🔹 Waiting for ${confirmations} confirmations...`);
    await publicClient.waitForTransactionReceipt({ hash: txHash });
    logger.info("✅ Chain update applied successfully!");
  } catch (error) {
    logger.error("❌ Transaction failed:");
    logger.error(error);
    throw error;
  }
}));
