import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types/hre";
import { isAddress } from "viem";
import {
  Chains,
  CCIPContractName,
  logger,
  getEVMNetworkConfig,
  configData,
} from "../config";

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
export const getCurrentRateLimits = task("getCurrentRateLimits", "Display current rate limiter states for a remote chain")
  .addOption({
    name: "pooladdress",
    description: "The token pool address",
    defaultValue: "",
  })
  .addOption({
    name: "remotechain",
    description: "The remote chain name",
    defaultValue: "",
  })
  .setAction(async () => ({
    default: async (
      {
        pooladdress,
        remotechain,
      }: {
        pooladdress: string;
        remotechain: string;
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

      // Connect to network first
      const networkConnection = await hre.network.connect();
      const { viem } = networkConnection;
      const networkName = networkConnection.networkName as Chains;

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
      if (!isAddress(pooladdress))
        throw new Error(`Invalid pool address: ${pooladdress}`);

      const remoteChainSelectorBigInt = BigInt(remoteChainSelector);

      try {
        logger.info(`📊 Fetching rate limiter states for pool ${pooladdress} on ${networkName}...`);
        logger.info(`   Remote chain: ${remotechain}`);
        logger.info(`   Remote chain selector: ${remoteChainSelector}`);

        // ✅ Connect to TokenPool contract
        const pool = await viem.getContractAt(
          CCIPContractName.TokenPool,
          pooladdress as `0x${string}`
        );

        const [outbound, inbound] = await Promise.all([
          (pool as any).read.getCurrentOutboundRateLimiterState([remoteChainSelectorBigInt]),
          (pool as any).read.getCurrentInboundRateLimiterState([remoteChainSelectorBigInt]),
        ]);

        // ✅ Log results
        logger.info(`\n=== Rate Limiter States for ${remotechain} ===`);
        logger.info(`Pool Address: ${pooladdress}`);
        logger.info(`Chain Selector: ${remoteChainSelector}`);

        logger.info(`\n📤 Outbound Rate Limiter:`);
        logger.info(`  Enabled:       ${(outbound as any).isEnabled}`);
        logger.info(`  Capacity:      ${(outbound as any).capacity.toString()}`);
        logger.info(`  Rate:          ${(outbound as any).rate.toString()}`);
        logger.info(`  Tokens:        ${(outbound as any).tokens.toString()}`);
        logger.info(`  Last Updated:  ${(outbound as any).lastUpdated.toString()}`);

        logger.info(`\n📥 Inbound Rate Limiter:`);
        logger.info(`  Enabled:       ${(inbound as any).isEnabled}`);
        logger.info(`  Capacity:      ${(inbound as any).capacity.toString()}`);
        logger.info(`  Rate:          ${(inbound as any).rate.toString()}`);
        logger.info(`  Tokens:        ${(inbound as any).tokens.toString()}`);
        logger.info(`  Last Updated:  ${(inbound as any).lastUpdated.toString()}`);

        logger.info("\n✅ Rate limiters fetched successfully");

      } catch (error) {
        logger.error(`❌ Error fetching rate limits for ${remotechain}:`, error);
        throw error;
      }
    },
  }))
  .build();
