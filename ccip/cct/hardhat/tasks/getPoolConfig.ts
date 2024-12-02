import { task } from "hardhat/config";
import { Chains, networks, logger } from "../config";

interface GetPoolConfigArgs {
  pooladdress: string;
}

// Task to get the configuration of a token pool

task("getPoolConfig", "Get pool configuration")
  .addParam("pooladdress", "The address of the pool")
  .setAction(async (taskArgs: GetPoolConfigArgs, hre) => {
    const { pooladdress: poolAddress } = taskArgs;

    const networkName = hre.network.name as Chains;

    // Ensure the network is configured
    const networkConfig = networks[networkName];
    if (!networkConfig) {
      throw new Error(`Network ${networkName} not found in config`);
    }

    // Validate the pool address
    if (!hre.ethers.isAddress(poolAddress)) {
      throw new Error(`Invalid pool address: ${poolAddress}`);
    }

    // Get the signer to interact with the pool contract
    const signer = (await hre.ethers.getSigners())[0];

    // Load the TokenPool contract factory
    const { TokenPool__factory } = await import("../typechain-types");

    // Connect to the TokenPool contract
    const poolContract = TokenPool__factory.connect(poolAddress, signer);

    // Get additional pool information
    const rateLimitAdmin = await poolContract.getRateLimitAdmin();
    const allowListEnabled = await poolContract.getAllowListEnabled();
    const allowList = await poolContract.getAllowList();
    const router = await poolContract.getRouter();
    const token = await poolContract.getToken();

    logger.info(`\nPool Basic Information:`);
    logger.info(`  Rate Limit Admin: ${rateLimitAdmin}`);
    logger.info(`  Router Address: ${router}`);
    logger.info(`  Token Address: ${token}`);
    logger.info(`  Allow List Enabled: ${allowListEnabled}`);
    if (allowListEnabled) {
      logger.info(`  Allow List Addresses:`);
      allowList.forEach((address, index) => {
        logger.info(`    ${index + 1}: ${address}`);
      });
    }

    // Fetch the list of supported chains
    const remoteChains = await poolContract.getSupportedChains();

    logger.info(`Fetching configuration for pool at address: ${poolAddress}`);

    for (const chainSelector of remoteChains) {
      // Get remote pools and token addresses
      const remotePools = await poolContract.getRemotePools(chainSelector);
      const remoteTokenAddressEncoded = await poolContract.getRemoteToken(
        chainSelector
      );

      // Decode the remote pools addresses
      const remotePoolAddresses = remotePools.map((encodedPool) => {
        try {
          return new hre.ethers.AbiCoder().decode(["address"], encodedPool)[0];
        } catch (error) {
          logger.warn(`Failed to decode remote pool address: ${encodedPool}`);
          return "DECODE_ERROR";
        }
      });

      // Decode the remote token address
      let remoteTokenAddress;
      try {
        remoteTokenAddress = new hre.ethers.AbiCoder().decode(
          ["address"],
          remoteTokenAddressEncoded
        )[0];
      } catch (error) {
        logger.warn(
          `Failed to decode remote token address: ${remoteTokenAddressEncoded}`
        );
        remoteTokenAddress = "DECODE_ERROR";
      }

      // Get rate limiter states
      const outboundRateLimiterState =
        await poolContract.getCurrentOutboundRateLimiterState(chainSelector);
      const inboundRateLimiterState =
        await poolContract.getCurrentInboundRateLimiterState(chainSelector);

      // Get human-readable chain name
      const chainName = Object.keys(networks).find(
        (key) =>
          networks[key as Chains]?.chainSelector?.toString() ===
          chainSelector.toString()
      );

      logger.info(
        `\nConfiguration for Remote Chain: ${
          chainName || chainSelector.toString()
        }`
      );
      // Since all chains in getSupportedChains() are considered allowed
      logger.info(`  Allowed: true`);

      // Log all remote pool addresses
      logger.info(`  Remote Pool Addresses:`);
      remotePoolAddresses.forEach((address, index) => {
        logger.info(`    ${index + 1}: ${address}`);
      });

      logger.info(`  Remote Token Address: ${remoteTokenAddress}`);

      // Outbound Rate Limiter
      const outboundConfig = outboundRateLimiterState;
      logger.info(`  Outbound Rate Limiter:`);
      logger.info(`    Enabled: ${outboundConfig.isEnabled}`);
      logger.info(`    Capacity: ${outboundConfig.capacity.toString()}`);
      logger.info(`    Rate: ${outboundConfig.rate.toString()}`);

      // Inbound Rate Limiter
      const inboundConfig = inboundRateLimiterState;
      logger.info(`  Inbound Rate Limiter:`);
      logger.info(`    Enabled: ${inboundConfig.isEnabled}`);
      logger.info(`    Capacity: ${inboundConfig.capacity.toString()}`);
      logger.info(`    Rate: ${inboundConfig.rate.toString()}`);
    }
  });
