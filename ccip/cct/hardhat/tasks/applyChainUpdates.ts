import { task, types } from "hardhat/config";
import { Chains, networks, logger, configData } from "../config";
import { CHAIN_TYPE } from "../config/types";
import bs58 from "bs58";

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

/**
 * Converts a Solana address from base58 to hex format
 * 
 * @param address - The Solana address in base58 format
 * @returns The address as a hex string prefixed with 0x
 */
function convertSolanaAddressToHex(address: string): string {
  const bytes = bs58.decode(address);
  return "0x" + Buffer.from(bytes).toString("hex");
}

/**
 * Prepares address data for the contract based on chain type
 * For EVM chains: encodes as an EVM address
 * For Solana chains: directly converts to hex representation
 * 
 * @param address - The address to prepare
 * @param chainType - The chain type (evm or svm)
 * @param hre - Hardhat runtime environment
 * @returns Prepared address data
 */
function prepareAddressData(address: string, chainType: CHAIN_TYPE, hre: any): string {
  logger.debug(`Preparing address: ${address} for chain type: ${chainType}`);
  
  if (chainType === "svm") {
    // For Solana, convert directly to hex and return the string (don't use ABI encoding)
    const hexAddress = convertSolanaAddressToHex(address);
    logger.debug(`Converted Solana address to hex: ${hexAddress}`);
    return hexAddress;
  }
  
  // For EVM chains, encode as an Ethereum address
  const encodedAddress = new hre.ethers.AbiCoder().encode(["address"], [address]);
  logger.debug(`Encoded EVM address: ${encodedAddress}`);
  return encodedAddress;
}

/**
 * Validates an address based on the chain type
 * Different chains have different address validation rules
 * 
 * @param address - The address to validate
 * @param chainType - The chain type the address belongs to
 * @param hre - Hardhat runtime environment
 * @returns boolean indicating if the address is valid
 */
function isValidAddress(address: string, chainType: CHAIN_TYPE, hre: any): boolean {
  if (chainType === "svm") {
    try {
      // Validate Solana address format (should be base58 encoded and proper length)
      const decoded = bs58.decode(address);
      return decoded.length === 32; // Solana addresses are 32 bytes
    } catch (error) {
      logger.error(`Invalid Solana address format: ${address}`);
      return false;
    }
  }
  
  // Default to EVM address validation
  return hre.ethers.isAddress(address);
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

    logger.info("=== Starting Chain Update Configuration ===");
    logger.info(`🔹 Local network: ${hre.network.name}`);
    logger.info(`🔹 Pool address: ${poolAddress}`);
    logger.info(`🔹 Remote chain: ${remoteChain}`);

    const networkName = hre.network.name as Chains;

    // Retrieve the network configuration for the source chain
    const networkConfig = networks[networkName];
    if (!networkConfig) {
      throw new Error(`Network ${networkName} not found in config`);
    }

    // Retrieve the network configuration for the remote chain
    const remoteNetworkConfig =
      configData[remoteChain as keyof typeof configData];
    if (!remoteNetworkConfig) {
      throw new Error(`Remote chain ${remoteChain} not found in config`);
    }

    const remoteChainType = remoteNetworkConfig.chainType as CHAIN_TYPE;
    logger.info(`🔹 Remote chain type detected: ${remoteChainType}`);

    // Get the remote chain's selector
    const remoteChainSelector = remoteNetworkConfig.chainSelector;
    if (remoteChainSelector === undefined) {
      throw new Error(`chainSelector is not defined for ${remoteChain}`);
    }
    
    logger.info(`🔹 Remote chain selector: ${remoteChainSelector}`);

    // Parse the comma-separated remote pool addresses
    const remotePoolAddresses = remotePoolAddressesStr
      .split(",")
      .map((addr) => addr.trim());
      
    logger.info(`🔹 Parsed ${remotePoolAddresses.length} remote pool addresses`);
    
    // Validate addresses according to the remote chain type
    for (const addr of remotePoolAddresses) {
      if (!isValidAddress(addr, remoteChainType, hre)) {
        throw new Error(`Invalid remote pool address for ${remoteChainType} chain: ${addr}`);
      }
    }

    // Validate the local pool address (always EVM)
    if (!hre.ethers.isAddress(poolAddress)) {
      throw new Error(`Invalid pool address: ${poolAddress}`);
    }

    // Validate the remote token address according to chain type
    if (!isValidAddress(remoteTokenAddress, remoteChainType, hre)) {
      throw new Error(`Invalid remote token address for ${remoteChainType} chain: ${remoteTokenAddress}`);
    }

    logger.info("✅ All addresses validated successfully");

    // Get the signer
    const signerAddress = (await hre.ethers.getSigners())[0];
    logger.info(`🔹 Using signer: ${await signerAddress.getAddress()}`);

    // Load the TokenPool contract factory
    const { TokenPool__factory } = await import("../typechain-types");

    // Connect to the TokenPool contract
    const poolContract = TokenPool__factory.connect(poolAddress, signerAddress);
    logger.info("✅ Connected to pool contract");

    // Prepare the remote pool addresses based on chain type
    const preparedRemotePoolAddresses = remotePoolAddresses.map((addr, idx) => {
      const prepared = prepareAddressData(addr, remoteChainType, hre);
      logger.info(`🔹 Remote pool address ${idx+1}: ${addr} → ${prepared}`);
      return prepared;
    });

    // Prepare the remote token address based on chain type
    const preparedRemoteTokenAddress = prepareAddressData(remoteTokenAddress, remoteChainType, hre);
    logger.info(`🔹 Remote token address: ${remoteTokenAddress} → ${preparedRemoteTokenAddress}`);

    // Log rate limiter settings
    logger.info("=== Rate Limiter Configuration ===");
    logger.info(`🔹 Outbound enabled: ${outboundRateLimitEnabled}`);
    if (outboundRateLimitEnabled) {
      logger.info(`🔹 Outbound capacity: ${outboundRateLimitCapacity}`);
      logger.info(`🔹 Outbound rate: ${outboundRateLimitRate}`);
    }
    
    logger.info(`🔹 Inbound enabled: ${inboundRateLimitEnabled}`);
    if (inboundRateLimitEnabled) {
      logger.info(`🔹 Inbound capacity: ${inboundRateLimitCapacity}`);
      logger.info(`🔹 Inbound rate: ${inboundRateLimitRate}`);
    }

    // Prepare the chain update according to the TokenPool.ChainUpdateStruct format
    const chainUpdate = {
      remoteChainSelector: BigInt(remoteChainSelector),
      remotePoolAddresses: preparedRemotePoolAddresses,
      remoteTokenAddress: preparedRemoteTokenAddress,
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

    logger.info("=== Executing Transaction ===");
    logger.info("🔹 Sending applyChainUpdates transaction...");

    // Call applyChainUpdates with empty array for removals and array with single update
    try {
      const tx = await poolContract.applyChainUpdates([], [chainUpdate]);
      logger.info(`🔹 Transaction sent: ${tx.hash}`);
  
      // Wait for confirmations
      const { confirmations } = networkConfig;
      if (confirmations === undefined) {
        throw new Error(`confirmations is not defined for ${networkName}`);
      }
  
      logger.info(`🔹 Waiting for ${confirmations} confirmations...`);
      await tx.wait(confirmations);
      logger.info("✅ Chain update applied successfully!");
    } catch (error) {
      logger.error("❌ Transaction failed:");
      logger.error(error);
      throw error;
    }
  });
