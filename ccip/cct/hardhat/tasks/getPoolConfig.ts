import { task } from "hardhat/config";
import { Chains, networks, logger } from "../config";

// Define the interface for the task arguments
interface GetPoolConfigArgs {
  pooladdress: string; // The address of the token pool to query
}

// Task to get the complete configuration of a token pool, including chain settings and rate limits
task("getPoolConfig", "Get pool configuration")
  .addParam("pooladdress", "The address of the pool") // The token pool to query
  .setAction(async (taskArgs: GetPoolConfigArgs, hre) => {
    const { pooladdress: poolAddress } = taskArgs;
    const networkName = hre.network.name as Chains;

    // Ensure the network is configured in the network settings
    const networkConfig = networks[networkName];
    if (!networkConfig) {
      throw new Error(`Network ${networkName} not found in config`);
    }

    // Validate the provided pool address
    if (!hre.ethers.isAddress(poolAddress)) {
      throw new Error(`Invalid pool address: ${poolAddress}`);
    }

    // Get the signer to interact with the contract
    const signer = (await hre.ethers.getSigners())[0];

    // Load the TokenPool contract factory and connect to the contract
    const { TokenPool__factory } = await import("../typechain-types");
    const poolContract = TokenPool__factory.connect(poolAddress, signer);

    // Fetch all basic pool information in a single batch to optimize RPC calls
    const [
      rateLimitAdmin,
      allowListEnabled,
      router,
      token,
      remoteChains,
    ] = await Promise.all([
      poolContract.getRateLimitAdmin(), // Get the rate limit administrator address
      poolContract.getAllowListEnabled(), // Check if allowlist is enabled
      poolContract.getRouter(), // Get the router contract address
      poolContract.getToken(), // Get the token contract address
      poolContract.getSupportedChains(), // Get all supported chain selectors
    ]);

    // Display the basic pool configuration information
    logger.info(`\nPool Basic Information:`);
    logger.info(`  Rate Limit Admin: ${rateLimitAdmin}`);
    logger.info(`  Router Address: ${router}`);
    logger.info(`  Token Address: ${token}`);
    logger.info(`  Allow List Enabled: ${allowListEnabled}`);

    // If allowlist is enabled, fetch and display the allowed addresses
    if (allowListEnabled) {
      const allowList = await poolContract.getAllowList();
      logger.info(`  Allow List Addresses:`);
      allowList.forEach((address, index) => {
        logger.info(`    ${index + 1}: ${address}`);
      });
    }

    logger.info(`Fetching configuration for pool at address: ${poolAddress}`);

    // Process each chain sequentially to avoid rate limiting issues
    for (const chainSelector of remoteChains) {
      try {
        // Batch fetch all chain-specific data to minimize RPC calls
        const [
          remotePools,
          remoteTokenAddressEncoded,
          outboundState,
          inboundState,
        ] = await Promise.all([
          poolContract.getRemotePools(chainSelector), // Get all remote pool addresses
          poolContract.getRemoteToken(chainSelector), // Get remote token address
          poolContract.getCurrentOutboundRateLimiterState(chainSelector), // Get outbound rate limits
          poolContract.getCurrentInboundRateLimiterState(chainSelector), // Get inbound rate limits
        ]);

        // Try to get a human-readable chain name from the network configuration
        const chainName = Object.keys(networks).find(
          (key) =>
            networks[key as Chains]?.chainSelector?.toString() ===
            chainSelector.toString()
        );

        // Decode the remote pool addresses from their encoded form
        const remotePoolAddresses = remotePools.map((encodedPool) => {
          try {
            return new hre.ethers.AbiCoder().decode(["address"], encodedPool)[0];
          } catch (error) {
            return "DECODE_ERROR"; // Return error string if decoding fails
          }
        });

        // Decode the remote token address from its encoded form
        let remoteTokenAddress;
        try {
          remoteTokenAddress = new hre.ethers.AbiCoder().decode(
            ["address"],
            remoteTokenAddressEncoded
          )[0];
        } catch (error) {
          remoteTokenAddress = "DECODE_ERROR"; // Return error string if decoding fails
        }

        // Display the chain-specific configuration
        logger.info(
          `\nConfiguration for Remote Chain: ${
            chainName || chainSelector.toString()
          }`
        );

        // Display all remote pool addresses for this chain
        logger.info(`  Remote Pool Addresses:`);
        remotePoolAddresses.forEach((address, index) => {
          logger.info(`    ${index + 1}: ${address}`);
        });

        logger.info(`  Remote Token Address: ${remoteTokenAddress}`);

        // Display outbound rate limiter configuration
        logger.info(`  Outbound Rate Limiter:`);
        logger.info(`    Enabled: ${outboundState.isEnabled}`);
        logger.info(`    Capacity: ${outboundState.capacity.toString()}`);
        logger.info(`    Rate: ${outboundState.rate.toString()}`);

        // Display inbound rate limiter configuration
        logger.info(`  Inbound Rate Limiter:`);
        logger.info(`    Enabled: ${inboundState.isEnabled}`);
        logger.info(`    Capacity: ${inboundState.capacity.toString()}`);
        logger.info(`    Rate: ${inboundState.rate.toString()}`);

        // Add a delay between chains to avoid rate limiting when multiple chains exist
        if (remoteChains.length > 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      } catch (error) {
        // Log any errors that occur while processing a specific chain
        logger.error(
          `Error fetching configuration for chain ${chainSelector}: ${error}`
        );
      }
    }
  });
