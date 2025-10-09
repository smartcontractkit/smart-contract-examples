import { task } from "hardhat/config";
import { Chains, logger, getEVMNetworkConfig, configData } from "../config";
import TokenPoolABI from "@chainlink/contracts-ccip/abi/TokenPool.abi.json";

/**
 * Prints the current inbound and outbound rate-limiter states
 * for a specific TokenPool and remote chain.
 *
 * Example:
 * npx hardhat getCurrentRateLimits \
 *   --pooladdress 0xYourPool \
 *   --remotechain baseSepolia \
 *   --network sepolia
 */
task("getCurrentRateLimits", "Display current rate limiter states for a remote chain")
  .setAction(<any>(async (taskArgs: { pooladdress: string; remotechain: string }, hre: any) => {
    const { pooladdress, remotechain } = taskArgs;
    const networkName = hre.network.name as Chains;

    // ✅ Ensure local network config exists
    const networkConfig = getEVMNetworkConfig(networkName);
    if (!networkConfig)
      throw new Error(`Network ${networkName} not found in config`);

    // ✅ Remote chain configuration
    const remoteNetworkConfig = configData[remotechain as keyof typeof configData];
    if (!remoteNetworkConfig)
      throw new Error(`Remote chain ${remotechain} not found in config`);

    const remoteChainSelector = remoteNetworkConfig.chainSelector;
    if (!remoteChainSelector)
      throw new Error(`chainSelector missing for ${remotechain}`);

    // ✅ Validate pool address
    if (!hre.viem.isAddress(pooladdress))
      throw new Error(`Invalid pool address: ${pooladdress}`);

    const [wallet] = await hre.viem.getWalletClients();
    const publicClient = await hre.viem.getPublicClient();

    // ✅ Connect to TokenPool contract
    const pool = await hre.viem.getContractAt({
      address: pooladdress,
      abi: TokenPoolABI,
    });

    try {
      logger.info(`Fetching rate limiter states for remote chain: ${remotechain}`);
      const [outbound, inbound] = await Promise.all([
        pool.read.getCurrentOutboundRateLimiterState([BigInt(remoteChainSelector)]),
        pool.read.getCurrentInboundRateLimiterState([BigInt(remoteChainSelector)]),
      ]);

      // ✅ Log results
      logger.info(`\n=== Rate Limiter States for ${remotechain} ===`);
      logger.info(`Pool Address: ${pooladdress}`);
      logger.info(`Chain Selector: ${remoteChainSelector}`);

      logger.info(`\nOutbound Rate Limiter:`);
      logger.info(`  Enabled:       ${outbound.isEnabled}`);
      logger.info(`  Capacity:      ${outbound.capacity.toString()}`);
      logger.info(`  Rate:          ${outbound.rate.toString()}`);
      logger.info(`  Tokens:        ${outbound.tokens.toString()}`);
      logger.info(`  Last Updated:  ${outbound.lastUpdated.toString()}`);

      logger.info(`\nInbound Rate Limiter:`);
      logger.info(`  Enabled:       ${inbound.isEnabled}`);
      logger.info(`  Capacity:      ${inbound.capacity.toString()}`);
      logger.info(`  Rate:          ${inbound.rate.toString()}`);
      logger.info(`  Tokens:        ${inbound.tokens.toString()}`);
      logger.info(`  Last Updated:  ${inbound.lastUpdated.toString()}`);

      logger.info("\n✅ Rate limiters fetched successfully.");
    } catch (error) {
      logger.error(`❌ Error fetching rate limits for ${remotechain}: ${error}`);
      throw error;
    }
  }));
