import { task } from "hardhat/config";
import { Chains, logger, getEVMNetworkConfig, configData } from "../config";
import TokenPoolABI from "@chainlink/contracts-ccip/abi/TokenPool.abi.json";

/**
 * Updates outbound/inbound/both rate limiters for a given remote chain.
 *
 * Example:
 * npx hardhat updateRateLimiters \
 *   --pooladdress 0xYourPool \
 *   --remotechain baseSepolia \
 *   --ratelimiter both \
 *   --outboundratelimitenabled true \
 *   --outboundratelimitcapacity 1000 \
 *   --outboundratelimitrate 10 \
 *   --inboundratelimitenabled true \
 *   --inboundratelimitcapacity 500 \
 *   --inboundratelimitrate 5 \
 *   --network sepolia
 */
task("updateRateLimiters", "Update rate limiters for an existing chain")
  .setAction(<any>(async (taskArgs: {
    pooladdress: string;
    remotechain: string;
    ratelimiter?: string;
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
      ratelimiter = "both",
      outboundratelimitenabled = false,
      outboundratelimitcapacity = 0,
      outboundratelimitrate = 0,
      inboundratelimitenabled = false,
      inboundratelimitcapacity = 0,
      inboundratelimitrate = 0,
    } = taskArgs;

    const networkName = hre.network.name as Chains;
    const networkConfig = getEVMNetworkConfig(networkName);
    if (!networkConfig) throw new Error(`Network ${networkName} not found`);
    const { confirmations } = networkConfig;
    if (confirmations === undefined)
      throw new Error(`confirmations missing for ${networkName}`);

    // ✅ Load remote chain config
    const remoteNetworkConfig = configData[remotechain as keyof typeof configData];
    if (!remoteNetworkConfig)
      throw new Error(`Remote chain ${remotechain} not found in config`);
    const remoteChainSelector = remoteNetworkConfig.chainSelector;
    if (remoteChainSelector === undefined)
      throw new Error(`chainSelector missing for ${remotechain}`);

    // ✅ Wallet & public client
    const [wallet] = await hre.viem.getWalletClients();
    const publicClient = await hre.viem.getPublicClient();

    // ✅ Connect to TokenPool contract
    const pool = await hre.viem.getContractAt({
      address: pooladdress,
      abi: TokenPoolABI,
    });

    // ✅ Read current limiter states
    const [currentOutbound, currentInbound] = await Promise.all([
      pool.read.getCurrentOutboundRateLimiterState([BigInt(remoteChainSelector)]),
      pool.read.getCurrentInboundRateLimiterState([BigInt(remoteChainSelector)]),
    ]);

    logger.info(`\nCurrent Rate Limiters for pool ${pooladdress}`);
    logger.info(
      `Outbound → enabled=${currentOutbound.isEnabled}, cap=${currentOutbound.capacity.toString()}, rate=${currentOutbound.rate.toString()}`
    );
    logger.info(
      `Inbound  → enabled=${currentInbound.isEnabled}, cap=${currentInbound.capacity.toString()}, rate=${currentInbound.rate.toString()}`
    );
    logger.info("\n========== Preparing Update ==========");

    // ✅ Build updated configs
    let outboundCfg = {
      isEnabled: currentOutbound.isEnabled,
      capacity: currentOutbound.capacity,
      rate: currentOutbound.rate,
    };
    if (ratelimiter === "outbound" || ratelimiter === "both") {
      outboundCfg = {
        isEnabled: outboundratelimitenabled,
        capacity: BigInt(outboundratelimitcapacity),
        rate: BigInt(outboundratelimitrate),
      };
      logger.info(
        `New Outbound → enabled=${outboundCfg.isEnabled}, cap=${outboundCfg.capacity}, rate=${outboundCfg.rate}`
      );
    }

    let inboundCfg = {
      isEnabled: currentInbound.isEnabled,
      capacity: currentInbound.capacity,
      rate: currentInbound.rate,
    };
    if (ratelimiter === "inbound" || ratelimiter === "both") {
      inboundCfg = {
        isEnabled: inboundratelimitenabled,
        capacity: BigInt(inboundratelimitcapacity),
        rate: BigInt(inboundratelimitrate),
      };
      logger.info(
        `New Inbound  → enabled=${inboundCfg.isEnabled}, cap=${inboundCfg.capacity}, rate=${inboundCfg.rate}`
      );
    }

    // ✅ Execute update
    logger.info(
      `\nUpdating ${ratelimiter === "both" ? "both limiters" : `${ratelimiter} limiter(s)`}...`
    );

    const txHash = await pool.write.setChainRateLimiterConfig(
      [BigInt(remoteChainSelector), outboundCfg, inboundCfg],
      { account: wallet.account }
    );

    logger.info(`⏳ Tx sent: ${txHash}`);
    logger.info(`Waiting for ${confirmations} confirmations...`);
    await publicClient.waitForTransactionReceipt({ hash: txHash });

    logger.info(`✅ Rate limiters updated successfully (tx: ${txHash})`);
  }));
