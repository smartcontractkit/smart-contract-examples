import { task, types } from "hardhat/config";
import { Chains, networks, logger } from "../config";
import { RateLimiter } from "../typechain-types";

interface UpdateRateLimitersArgs {
  pooladdress: string;
  remotechain: string;
  ratelimiter: string;
  outboundratelimitenabled: boolean;
  outboundratelimitcapacity: number;
  outboundratelimitrate: number;
  inboundratelimitenabled: boolean;
  inboundratelimitcapacity: number;
  inboundratelimitrate: number;
}

task("updateRateLimiters", "Update rate limiters for an existing chain")
  .addParam("pooladdress", "The address of the pool")
  .addParam("remotechain", "The remote chain") // Use the chain name to look up the chain selector
  .addParam(
    "ratelimiter",
    "Specify whether to update 'inbound', 'outbound', or 'both' rate limiters",
    "both", // Default value is both
    types.string
  )
  .addOptionalParam(
    "outboundratelimitenabled",
    "Whether the outbound rate limit is enabled (Outbound)",
    false, // Default value is false
    types.boolean
  )
  .addOptionalParam(
    "outboundratelimitcapacity",
    "Maximum number of tokens that can be in the bucket (Outbound)",
    0, // Default value is 0
    types.int
  )
  .addOptionalParam(
    "outboundratelimitrate",
    "Number of tokens per second that the bucket is refilled (Outbound)",
    0, // Default value is 0
    types.int
  )
  .addOptionalParam(
    "inboundratelimitenabled",
    "Whether the inbound rate limit is enabled (Inbound)",
    false, // Default value is false
    types.boolean
  )
  .addOptionalParam(
    "inboundratelimitcapacity",
    "Maximum number of tokens that can be in the bucket (Inbound)",
    0, // Default value is 0
    types.int
  )
  .addOptionalParam(
    "inboundratelimitrate",
    "Number of tokens per second that the bucket is refilled (Inbound)",
    0, // Default value is 0
    types.int
  )
  .setAction(async (taskArgs: UpdateRateLimitersArgs, hre) => {
    const {
      pooladdress: poolAddress,
      remotechain: remoteChain,
      ratelimiter: rateLimiterToUpdate,
      outboundratelimitenabled: outboundRateLimitEnabled,
      outboundratelimitcapacity: outboundRateLimitCapacity,
      outboundratelimitrate: outboundRateLimitRate,
      inboundratelimitenabled: inboundRateLimitEnabled,
      inboundratelimitcapacity: inboundRateLimitCapacity,
      inboundratelimitrate: inboundRateLimitRate,
    } = taskArgs;

    // Get the name of the current network (source chain)
    const networkName = hre.network.name as Chains;

    // Retrieve the network configuration for the source chain
    const networkConfig = networks[networkName];
    if (!networkConfig) {
      throw new Error(`Network ${networkName} not found in config`);
    }

    const { confirmations } = networkConfig;
    if (confirmations === undefined) {
      throw new Error(`Confirmations are not defined for ${networkName}`);
    }

    // Retrieve the network configuration for the remote chain
    const remoteNetworkConfig = networks[remoteChain as Chains];
    if (!remoteNetworkConfig) {
      throw new Error(`Remote chain ${remoteChain} not found in config`);
    }

    // Get the remote chain's selector, which is required for cross-chain operations
    const remoteChainSelector = remoteNetworkConfig.chainSelector;
    if (remoteChainSelector === undefined) {
      throw new Error(`chainSelector is not defined for ${remoteChain}`);
    }

    // Retrieve the signer (wallet) to interact with the smart contract
    const signerAddress = (await hre.ethers.getSigners())[0];

    // Load the TokenPool contract factory and connect to the deployed contract using its address
    const { TokenPool__factory } = await import("../typechain-types");
    const poolContract = TokenPool__factory.connect(poolAddress, signerAddress);

    // Get the current rate limiter states
    const currentOutboundRateLimiterState =
      await poolContract.getCurrentOutboundRateLimiterState(
        remoteChainSelector
      );
    const currentInboundRateLimiterState =
      await poolContract.getCurrentInboundRateLimiterState(remoteChainSelector);

    // Log the current configurations
    logger.info(`Current Rate Limiters for token pool: ${poolAddress}`);

    // Outbound Rate Limiter
    logger.info(`  Outbound Rate Limiter:`);
    logger.info(`    Enabled: ${currentOutboundRateLimiterState.isEnabled}`);
    logger.info(
      `    Capacity: ${currentOutboundRateLimiterState.capacity.toString()}`
    );
    logger.info(`    Rate: ${currentOutboundRateLimiterState.rate.toString()}`);

    // Inbound Rate Limiter
    logger.info(`  Inbound Rate Limiter:`);
    logger.info(`    Enabled: ${currentInboundRateLimiterState.isEnabled}`);
    logger.info(
      `    Capacity: ${currentInboundRateLimiterState.capacity.toString()}`
    );
    logger.info(`    Rate: ${currentInboundRateLimiterState.rate.toString()}`);

    // Add a blank line and separator
    logger.info("");
    logger.info(`========== Updating Rate Limiters ==========`);

    // Prepare the rate limiter configurations only if specified
    let outboundRateLimiterConfig: RateLimiter.ConfigStruct = {
      isEnabled: currentOutboundRateLimiterState.isEnabled,
      capacity: currentOutboundRateLimiterState.capacity,
      rate: currentOutboundRateLimiterState.rate,
    };
    if (rateLimiterToUpdate === "outbound" || rateLimiterToUpdate === "both") {
      outboundRateLimiterConfig = {
        isEnabled: outboundRateLimitEnabled,
        capacity: BigInt(outboundRateLimitCapacity),
        rate: BigInt(outboundRateLimitRate),
      };
      logger.info(`New Outbound Rate Limiter:`);
      logger.info(`  Enabled: ${outboundRateLimiterConfig.isEnabled}`);
      logger.info(
        `  Capacity: ${outboundRateLimiterConfig.capacity.toString()}`
      );
      logger.info(`  Rate: ${outboundRateLimiterConfig.rate.toString()}`);
    }

    let inboundRateLimiterConfig: RateLimiter.ConfigStruct = {
      isEnabled: currentInboundRateLimiterState.isEnabled,
      capacity: currentInboundRateLimiterState.capacity,
      rate: currentInboundRateLimiterState.rate,
    };
    if (rateLimiterToUpdate === "inbound" || rateLimiterToUpdate === "both") {
      inboundRateLimiterConfig = {
        isEnabled: inboundRateLimitEnabled,
        capacity: BigInt(inboundRateLimitCapacity),
        rate: BigInt(inboundRateLimitRate),
      };
      logger.info(`New Inbound Rate Limiter:`);
      logger.info(`  Enabled: ${inboundRateLimiterConfig.isEnabled}`);
      logger.info(
        `  Capacity: ${inboundRateLimiterConfig.capacity.toString()}`
      );
      logger.info(`  Rate: ${inboundRateLimiterConfig.rate.toString()}`);
    }

    if (rateLimiterToUpdate === "outbound") {
      logger.info(`Updating outbound rate limiter...`);
    } else if (rateLimiterToUpdate === "inbound") {
      logger.info(`Updating inbound rate limiter...`);
    } else if (rateLimiterToUpdate === "both") {
      logger.info(`Updating both rate limiters...`);
    }

    const tx = await poolContract.setChainRateLimiterConfig(
      BigInt(remoteChainSelector),
      outboundRateLimiterConfig,
      inboundRateLimiterConfig
    );

    await tx.wait(confirmations);
    logger.info(`Transaction hash: ${tx.hash}`);

    // Log a success message
    logger.info(`Rate limiters updated successfully`);
  });
