import { task } from "hardhat/config";
import { Chains, logger, getEVMNetworkConfig, configData } from "../../config";
import {
  MetaTransactionData,
  SafeTransaction,
  TransactionResult,
} from "@safe-global/safe-core-sdk-types";
import Safe, { SigningMethod } from "@safe-global/protocol-kit";
import TokenPoolABI from "@chainlink/contracts-ccip/abi/TokenPool.abi.json";

/**
 * Applies pool configuration updates through a Gnosis Safe.
 *
 * Example:
 * npx hardhat applyChainUpdatesFromSafe \
 *   --pooladdress 0xYourPool \
 *   --remotechain baseSepolia \
 *   --remotepooladdresses 0xRemotePool1,0xRemotePool2 \
 *   --remotetokenaddress 0xRemoteToken \
 *   --outboundratelimitenabled true \
 *   --outboundratelimitcapacity 1000 \
 *   --outboundratelimitrate 10 \
 *   --inboundratelimitenabled true \
 *   --inboundratelimitcapacity 500 \
 *   --inboundratelimitrate 5 \
 *   --safeaddress 0xYourSafe \
 *   --network sepolia
 */
task("applyChainUpdatesFromSafe", "Configure a token pool via Safe multisig")
  .setAction(<any>(async (taskArgs: {
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
    safeaddress: string;
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
      safeaddress,
    } = taskArgs;

    const networkName = hre.network.name as Chains;

    // ✅ Network configuration checks
    const networkConfig = getEVMNetworkConfig(networkName);
    if (!networkConfig)
      throw new Error(`Network ${networkName} not found in config`);

    const remoteConfig = configData[remotechain as keyof typeof configData];
    if (!remoteConfig)
      throw new Error(`Remote chain ${remotechain} not found in config`);

    const remoteSelector = remoteConfig.chainSelector;
    if (!remoteSelector)
      throw new Error(`chainSelector missing for ${remotechain}`);

    // ✅ Validate addresses
    if (!hre.viem.isAddress(pooladdress))
      throw new Error(`Invalid pool address: ${pooladdress}`);
    if (!hre.viem.isAddress(remotetokenaddress))
      throw new Error(`Invalid remote token address: ${remotetokenaddress}`);
    if (!hre.viem.isAddress(safeaddress))
      throw new Error(`Invalid Safe address: ${safeaddress}`);

    const remotePools = remotepooladdresses
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean);
    for (const addr of remotePools) {
      if (!hre.viem.isAddress(addr))
        throw new Error(`Invalid remote pool address: ${addr}`);
    }

    // ✅ Env keys and RPC
    const pk1 = process.env.PRIVATE_KEY;
    const pk2 = process.env.PRIVATE_KEY_2;
    if (!pk1 || !pk2)
      throw new Error("Both PRIVATE_KEY and PRIVATE_KEY_2 must be set");

    const netCfg = hre.config.networks[networkName] as any;
    if (!netCfg?.url)
      throw new Error(`RPC URL not found for ${networkName}`);
    const rpcUrl = netCfg.url;

    const { confirmations } = networkConfig;
    if (confirmations === undefined)
      throw new Error(`confirmations not defined for ${networkName}`);

    // ✅ Build ChainUpdate struct
    const abiCoder = hre.viem.abi;
    const chainUpdate = {
      remoteChainSelector: BigInt(remoteSelector),
      remotePoolAddresses: remotePools.map((a) =>
        abiCoder.encode(["address"], [a])
      ),
      remoteTokenAddress: abiCoder.encode(["address"], [remotetokenaddress]),
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

    logger.info(
      `Applying chain updates for pool ${pooladdress} → remote chain ${remotechain}`
    );

    // ✅ Encode applyChainUpdates() call
    const poolIface = new hre.viem.Interface(TokenPoolABI);
    const encodedData = poolIface.encodeFunctionData("applyChainUpdates", [
      [],
      [chainUpdate],
    ]);

    // ✅ Create Safe signers
    const safe1 = await Safe.init({
      provider: rpcUrl,
      signer: pk1,
      safeAddress: safeaddress,
    });
    const safe2 = await Safe.init({
      provider: rpcUrl,
      signer: pk2,
      safeAddress: safeaddress,
    });

    const metaTx: MetaTransactionData = {
      to: pooladdress,
      data: encodedData,
      value: "0",
    };

    // ✅ Build and sign Safe tx
    let safeTx: SafeTransaction;
    try {
      safeTx = await safe1.createTransaction({ transactions: [metaTx] });
      logger.info("✅ Safe transaction created");
    } catch (e) {
      logger.error("❌ Failed to create Safe transaction", e);
      throw e;
    }

    try {
      safeTx = await safe1.signTransaction(safeTx, SigningMethod.ETH_SIGN);
      logger.info("✅ Signed by owner 1");
      safeTx = await safe2.signTransaction(safeTx, SigningMethod.ETH_SIGN);
      logger.info("✅ Signed by owner 2");
    } catch (e) {
      logger.error("❌ Error signing Safe transaction", e);
      throw e;
    }

    // ✅ Execute via Safe
    logger.info(`🚀 Executing Safe transaction for pool ${pooladdress}...`);
    let result: TransactionResult;
    try {
      result = await safe1.executeTransaction(safeTx);
    } catch (e) {
      logger.error("❌ Safe execution failed", e);
      throw e;
    }

    if (!result?.transactionResponse)
      throw new Error("No transaction response available");

    logger.info(
      `⏳ Waiting ${confirmations} blocks for tx ${result.hash} confirmation...`
    );
    await (result.transactionResponse as any).wait(confirmations);

    logger.info(`✅ Pool configured successfully for ${remotechain}`);
  }));
