import { task } from "hardhat/config";
import { Chains, networks, logger } from "../config";

// Define the interface for the task arguments
interface GetCurrentRateLimitsArgs {
  pooladdress: string; // The address of the token pool to query
  remotechain: string; // The remote chain to get rate limits for
}

// Task to get the current rate limiter states for a specific chain
task("getCurrentRateLimits", "Get current rate limiter states for a chain")
  .addParam("pooladdress", "The address of the pool") // The token pool to query
  .addParam("remotechain", "The remote chain") // The remote blockchain to check rate limits for
  .setAction(async (taskArgs: GetCurrentRateLimitsArgs, hre) => {
    const { pooladdress: poolAddress, remotechain: remoteChain } = taskArgs;
    const networkName = hre.network.name as Chains;

    // Ensure the network is configured in the network settings
    const networkConfig = networks[networkName];
    if (!networkConfig) {
      throw new Error(`Network ${networkName} not found in config`);
    }

    // Get the remote chain configuration
    const remoteNetworkConfig = networks[remoteChain as Chains];
    if (!remoteNetworkConfig) {
      throw new Error(`Remote chain ${remoteChain} not found in config`);
    }

    // Get the remote chain's selector
    const remoteChainSelector = remoteNetworkConfig.chainSelector;
    if (!remoteChainSelector) {
      throw new Error(`Chain selector not found for ${remoteChain}`);
    }

    // Validate the pool address
    if (!hre.ethers.isAddress(poolAddress)) {
      throw new Error(`Invalid pool address: ${poolAddress}`);
    }

    // Get the signer to interact with the contract
    const signer = (await hre.ethers.getSigners())[0];

    // Load the TokenPool contract factory and connect to the contract
    const { TokenPool__factory } = await import("../typechain-types");
    const poolContract = TokenPool__factory.connect(poolAddress, signer);

    try {
      // Fetch both rate limiter states in parallel
      const [outboundState, inboundState] = await Promise.all([
        poolContract.getCurrentOutboundRateLimiterState(remoteChainSelector), // Get outbound rate limits
        poolContract.getCurrentInboundRateLimiterState(remoteChainSelector), // Get inbound rate limits
      ]);

      // Display the rate limiter configurations
      logger.info(`\nRate Limiter States for Chain: ${remoteChain}`);
      logger.info(`Pool Address: ${poolAddress}`);
      logger.info(`Chain Selector: ${remoteChainSelector}`);

      // Display outbound rate limiter configuration
      logger.info(`\nOutbound Rate Limiter:`);
      logger.info(`  Enabled: ${outboundState.isEnabled}`);
      logger.info(`  Capacity: ${outboundState.capacity.toString()}`);
      logger.info(`  Rate: ${outboundState.rate.toString()}`);
      logger.info(`  Tokens: ${outboundState.tokens.toString()}`);
      logger.info(`  Last Updated: ${outboundState.lastUpdated.toString()}`);

      // Display inbound rate limiter configuration
      logger.info(`\nInbound Rate Limiter:`);
      logger.info(`  Enabled: ${inboundState.isEnabled}`);
      logger.info(`  Capacity: ${inboundState.capacity.toString()}`);
      logger.info(`  Rate: ${inboundState.rate.toString()}`);
      logger.info(`  Tokens: ${inboundState.tokens.toString()}`);
      logger.info(`  Last Updated: ${inboundState.lastUpdated.toString()}`);
    } catch (error) {
      logger.error(
        `Error fetching rate limits for chain ${remoteChain}: ${error}`
      );
      throw error;
    }
  }); 