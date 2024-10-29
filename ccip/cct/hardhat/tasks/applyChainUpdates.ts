import { task, types } from "hardhat/config";
import { Chains, networks, logger } from "../config";

interface ConfigurePoolArgs {
  pooladdress: string;
  remotechain: string;
  allowed: boolean;
  remotepooladdress: string;
  remotetokenaddress: string;
  outboundratelimitenabled: boolean;
  outboundratelimitcapacity: number;
  outboundratelimitrate: number;
  inboundratelimitenabled: boolean;
  inboundratelimitcapacity: number;
  inboundratelimitrate: number;
}

// Task to initialize a pool configuration, including setting cross-chain parameters and rate limits
task("applyChainUpdates", "Initialize a pool configuration")
  .addParam("pooladdress", "The address of the pool") // Address of the token pool
  .addParam("remotechain", "The remote chain") // The remote blockchain that the source pool will interact with
  .addOptionalParam(
    "allowed", // Whether the remote chain is allowed for cross-chain transfers
    "Whether the remote chain is allowed",
    true,
    types.boolean
  )
  .addParam("remotepooladdress", "The remote pool address") // The address of the pool on the remote chain
  .addParam("remotetokenaddress", "The remote token address") // The address of the token on the remote chain
  .addOptionalParam(
    "outboundratelimitenabled", // Enables outbound rate limits (control the flow of tokens leaving this chain)
    "Whether the outbound rate limit is enabled (Outbound)",
    false,
    types.boolean
  )
  .addOptionalParam(
    "outboundratelimitcapacity", // Maximum number of tokens allowed for outbound transfers
    "Maximum number of tokens that can be in the bucket (Outbound)",
    0,
    types.int
  )
  .addOptionalParam(
    "outboundratelimitrate", // Number of tokens per second added to the rate limit bucket for outbound transfers
    "Number of tokens per second that the bucket is refilled (Outbound)",
    0,
    types.int
  )
  .addOptionalParam(
    "inboundratelimitenabled", // Enables inbound rate limits (control the flow of tokens entering this chain)
    "Whether the inbound rate limit is enabled (Inbound)",
    false,
    types.boolean
  )
  .addOptionalParam(
    "inboundratelimitcapacity", // Maximum number of tokens allowed for inbound transfers
    "Maximum number of tokens that can be in the bucket (Inbound)",
    0,
    types.int
  )
  .addOptionalParam(
    "inboundratelimitrate", // Number of tokens per second added to the rate limit bucket for inbound transfers
    "Number of tokens per second that the bucket is refilled (Inbound)",
    0,
    types.int
  )
  .setAction(async (taskArgs: ConfigurePoolArgs, hre) => {
    const {
      pooladdress: poolAddress,
      remotechain: remoteChain,
      allowed,
      remotepooladdress: remotePoolAddress,
      remotetokenaddress: remoteTokenAddress,
      outboundratelimitenabled: outboundRateLimitEnabled,
      outboundratelimitcapacity: outboundRateLimitCapacity,
      outboundratelimitrate: outboundRateLimitRate,
      inboundratelimitenabled: inboundRateLimitEnabled,
      inboundratelimitcapacity: inboundRateLimitCapacity,
      inboundratelimitrate: inboundRateLimitRate,
    } = taskArgs;

    const networkName = hre.network.name as Chains;

    // Retrieve the network configuration for the source chain
    const networkConfig = networks[networkName];
    if (!networkConfig) {
      throw new Error(`Network ${networkName} not found in config`);
    }

    // Retrieve the network configuration for the remote chain
    const remoteNetworkConfig = networks[remoteChain as Chains];
    if (!remoteNetworkConfig) {
      throw new Error(`Remote chain ${remoteChain} not found in config`);
    }

    // Get the remote chain's selector, which is used in cross-chain transfers
    const remoteChainSelector = remoteNetworkConfig.chainSelector;
    if (remoteChainSelector === undefined) {
      throw new Error(`chainSelector is not defined for ${remoteChain}`);
    }

    // Validate the pool, remote token, and remote pool addresses
    if (!hre.ethers.isAddress(poolAddress)) {
      throw new Error(`Invalid pool address: ${poolAddress}`);
    }

    if (!hre.ethers.isAddress(remoteTokenAddress)) {
      throw new Error(`Invalid remote token address: ${remoteTokenAddress}`);
    }

    if (!hre.ethers.isAddress(remotePoolAddress)) {
      throw new Error(`Invalid remote pool address: ${remotePoolAddress}`);
    }

    // Get the signer to interact with the pool contract
    const signerAddress = (await hre.ethers.getSigners())[0];

    // Load the TokenPool contract factory
    const { TokenPool__factory } = await import("../typechain-types");

    // Connect to the TokenPool contract
    const poolContract = TokenPool__factory.connect(poolAddress, signerAddress);

    // Prepare the configuration for the chain update, including rate limits and pool connections
    const chainUpdate = {
      remoteChainSelector: BigInt(remoteChainSelector),
      allowed, // Whether the remote chain is allowed for transfers
      remotePoolAddress: new hre.ethers.AbiCoder().encode(
        ["address"],
        [remotePoolAddress]
      ), // Encode the remote pool address
      remoteTokenAddress: new hre.ethers.AbiCoder().encode(
        ["address"],
        [remoteTokenAddress]
      ), // Encode the remote token address
      outboundRateLimiterConfig: {
        isEnabled: outboundRateLimitEnabled, // Configure outbound rate limits
        capacity: BigInt(outboundRateLimitCapacity),
        rate: BigInt(outboundRateLimitRate),
      },
      inboundRateLimiterConfig: {
        isEnabled: inboundRateLimitEnabled, // Configure inbound rate limits
        capacity: BigInt(inboundRateLimitCapacity),
        rate: BigInt(inboundRateLimitRate),
      },
    };

    // Log the configuration and apply the chain update to the pool contract
    logger.info(`Applying chain update to pool at address: ${poolAddress}`);
    const tx = await poolContract.applyChainUpdates([chainUpdate]);

    // Retrieve the number of confirmations required from the network config
    const { confirmations } = networkConfig;
    if (confirmations === undefined) {
      throw new Error(`confirmations is not defined for ${networkName}`);
    }

    // Wait for the transaction to be confirmed
    await tx.wait(confirmations);
    logger.info(`Chain update applied successfully`);
  });
