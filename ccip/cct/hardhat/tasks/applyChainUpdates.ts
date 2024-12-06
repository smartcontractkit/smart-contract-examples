import { task, types } from "hardhat/config";
import { Chains, networks, logger } from "../config";

interface ConfigurePoolArgs {
  pooladdress: string;
  remotechain: string;
  remotepooladdresses: string;
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
  .addParam(
    "remotepooladdresses",
    "The remote pool addresses (comma-separated)"
  )
  .addParam("remotetokenaddress", "The remote token address")
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
      remotepooladdresses: remotePoolAddressesStr,
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

    // Get the remote chain's selector
    const remoteChainSelector = remoteNetworkConfig.chainSelector;
    if (remoteChainSelector === undefined) {
      throw new Error(`chainSelector is not defined for ${remoteChain}`);
    }

    // Parse and validate the comma-separated remote pool addresses
    const remotePoolAddresses = remotePoolAddressesStr
      .split(",")
      .map((addr) => addr.trim());
    for (const addr of remotePoolAddresses) {
      if (!hre.ethers.isAddress(addr)) {
        throw new Error(`Invalid remote pool address: ${addr}`);
      }
    }

    // Validate the pool and remote token addresses
    if (!hre.ethers.isAddress(poolAddress)) {
      throw new Error(`Invalid pool address: ${poolAddress}`);
    }

    if (!hre.ethers.isAddress(remoteTokenAddress)) {
      throw new Error(`Invalid remote token address: ${remoteTokenAddress}`);
    }

    // Get the signer
    const signerAddress = (await hre.ethers.getSigners())[0];

    // Load the TokenPool contract factory
    const { TokenPool__factory } = await import("../typechain-types");

    // Connect to the TokenPool contract
    const poolContract = TokenPool__factory.connect(poolAddress, signerAddress);

    // Prepare the chain update according to the TokenPool.ChainUpdateStruct format
    const chainUpdate = {
      remoteChainSelector: BigInt(remoteChainSelector),
      remotePoolAddresses: remotePoolAddresses.map((addr) =>
        new hre.ethers.AbiCoder().encode(["address"], [addr])
      ),
      remoteTokenAddress: new hre.ethers.AbiCoder().encode(
        ["address"],
        [remoteTokenAddress]
      ),
      outboundRateLimiterConfig: {
        isEnabled: outboundRateLimitEnabled,
        capacity: BigInt(outboundRateLimitCapacity),
        rate: BigInt(outboundRateLimitRate),
      },
      inboundRateLimiterConfig: {
        isEnabled: inboundRateLimitEnabled,
        capacity: BigInt(inboundRateLimitCapacity),
        rate: BigInt(inboundRateLimitRate),
      },
    };

    // Log the configuration and apply the chain update
    logger.info(`Applying chain update to pool at address: ${poolAddress}`);
    logger.info(`Remote chain: ${remoteChain} (${remoteChainSelector})`);
    logger.info(`Remote pool addresses: ${remotePoolAddresses.join(", ")}`);
    logger.info(`Remote token address: ${remoteTokenAddress}`);

    // Call applyChainUpdates with empty array for removals and array with single update
    const tx = await poolContract.applyChainUpdates([], [chainUpdate]);

    // Wait for confirmations
    const { confirmations } = networkConfig;
    if (confirmations === undefined) {
      throw new Error(`confirmations is not defined for ${networkName}`);
    }

    await tx.wait(confirmations);
    logger.info(`Chain update applied successfully`);
  });
