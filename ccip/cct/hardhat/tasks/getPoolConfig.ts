import { task } from "hardhat/config";
import {
  Chains,
  logger,
  getEVMNetworkConfig,
} from "../config";
import {
  getChainInfoBySelector,
  decodeChainAddress,
} from "../utils/chainHandlers";
import TokenPoolABI from "@chainlink/contracts-ccip/abi/TokenPool.abi.json";

/**
 * Get the configuration details of a deployed Token Pool.
 *
 * Example:
 * npx hardhat getPoolConfig --pooladdress 0xYourPool --network sepolia
 */
task(
  "getPoolConfig",
  "Fetches and displays a token pool's configuration, including chain-specific rate limits"
).setAction(<any>(async (taskArgs: { pooladdress: string }, hre: any) => {
  const { pooladdress } = taskArgs;
  const networkName = hre.network.name as Chains;

  // ✅ Ensure network configuration exists
  const networkConfig = getEVMNetworkConfig(networkName);
  if (!networkConfig)
    throw new Error(`Network ${networkName} not found in config`);

  // ✅ Validate address
  if (!hre.viem.isAddress(pooladdress))
    throw new Error(`Invalid pool address: ${pooladdress}`);

  const [wallet] = await hre.viem.getWalletClients();
  const poolContract = await hre.viem.getContractAt({
    address: pooladdress,
    abi: TokenPoolABI,
  });

  logger.info(`\nFetching pool configuration for: ${pooladdress}`);

  // ✅ Fetch core info in parallel
  const [rateLimitAdmin, allowListEnabled, router, token, remoteChains] =
    await Promise.all([
      poolContract.read.getRateLimitAdmin(),
      poolContract.read.getAllowListEnabled(),
      poolContract.read.getRouter(),
      poolContract.read.getToken(),
      poolContract.read.getSupportedChains(),
    ]);

  logger.info(`\n--- Pool Basic Information ---`);
  logger.info(`Rate Limit Admin: ${rateLimitAdmin}`);
  logger.info(`Router Address:   ${router}`);
  logger.info(`Token Address:    ${token}`);
  logger.info(`Allow List Enabled: ${allowListEnabled}`);

  if (allowListEnabled) {
    const allowList = await poolContract.read.getAllowList();
    logger.info(`Allow List (${allowList.length} addresses):`);
    allowList.forEach((address: string, i: number) => {
      logger.info(`  ${i + 1}. ${address}`);
    });
  }

  logger.info(`\nSupported Remote Chains: ${remoteChains.length}`);

  // ✅ Sequentially process each remote chain
  for (const chainSelector of remoteChains) {
    try {
      const [
        remotePools,
        remoteTokenAddressEncoded,
        outboundState,
        inboundState,
      ] = await Promise.all([
        poolContract.read.getRemotePools([chainSelector]),
        poolContract.read.getRemoteToken([chainSelector]),
        poolContract.read.getCurrentOutboundRateLimiterState([chainSelector]),
        poolContract.read.getCurrentInboundRateLimiterState([chainSelector]),
      ]);

      const chainInfo = getChainInfoBySelector(chainSelector);
      const chainDisplayName = chainInfo?.name || chainSelector.toString();

      const remotePoolAddresses = remotePools.map((encoded: string) => {
        if (!chainInfo) return "UNKNOWN_CHAIN";
        try {
          return decodeChainAddress(encoded, chainInfo.chainType, hre);
        } catch {
          return "DECODE_ERROR";
        }
      });

      let remoteTokenAddress;
      if (!chainInfo) {
        remoteTokenAddress = "UNKNOWN_CHAIN";
      } else {
        try {
          remoteTokenAddress = decodeChainAddress(
            remoteTokenAddressEncoded,
            chainInfo.chainType,
            hre
          );
        } catch {
          remoteTokenAddress = "DECODE_ERROR";
        }
      }

      logger.info(`\n--- Remote Chain: ${chainDisplayName} ---`);
      logger.info(`Remote Pool Addresses:`);
      remotePoolAddresses.forEach((addr: string, i: number) => {
        logger.info(`  ${i + 1}. ${addr}`);
      });
      logger.info(`Remote Token Address: ${remoteTokenAddress}`);

      logger.info(`Outbound Rate Limiter:`);
      logger.info(`  Enabled:  ${outboundState.isEnabled}`);
      logger.info(`  Capacity: ${outboundState.capacity.toString()}`);
      logger.info(`  Rate:     ${outboundState.rate.toString()}`);

      logger.info(`Inbound Rate Limiter:`);
      logger.info(`  Enabled:  ${inboundState.isEnabled}`);
      logger.info(`  Capacity: ${inboundState.capacity.toString()}`);
      logger.info(`  Rate:     ${inboundState.rate.toString()}`);

      // Add small delay between chains to avoid RPC throttling
      if (remoteChains.length > 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (error) {
      logger.error(
        `Error fetching configuration for chain ${chainSelector}: ${error}`
      );
    }
  }

  logger.info(`\n✅ Pool configuration fetched successfully.`);
}));
