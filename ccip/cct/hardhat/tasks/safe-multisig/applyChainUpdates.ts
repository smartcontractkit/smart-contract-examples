import { task, types } from "hardhat/config"; // Importing task configuration and types from Hardhat
import { Chains, networks, logger } from "../../config"; // Import configurations such as chain settings, network configurations, and logger
import {
  MetaTransactionData,
  SafeTransaction,
  TransactionResult,
} from "@safe-global/safe-core-sdk-types"; // Import types for Safe transactions
import Safe, { SigningMethod } from "@safe-global/protocol-kit"; // Import Safe protocol kit for managing transactions
import { HttpNetworkConfig } from "hardhat/types"; // Import Hardhat's HttpNetworkConfig type for network configuration

// Define the interface for the task arguments
interface ConfigurePoolArgs {
  pooladdress: string; // The address of the pool to be configured
  remotechain: string; // The identifier of the remote blockchain network
  remotepooladdresses: string; // Comma-separated list of remote pool addresses
  remotetokenaddress: string; // The address of the token on the remote chain
  outboundratelimitenabled: boolean; // Indicates if the outbound rate limiter is enabled
  outboundratelimitcapacity: number; // Maximum capacity for the outbound rate limiter
  outboundratelimitrate: number; // Rate at which tokens are refilled in the outbound bucket
  inboundratelimitenabled: boolean; // Indicates if the inbound rate limiter is enabled
  inboundratelimitcapacity: number; // Maximum capacity for the inbound rate limiter
  inboundratelimitrate: number; // Rate at which tokens are refilled in the inbound bucket
  safeaddress: string; // The address of the Safe that will execute the transaction
}

// Define a new Hardhat task named "applyChainUpdatesFromSafe"
task("applyChainUpdatesFromSafe", "Configure pool via Safe")
  // Add task parameters with descriptions and default values (if applicable)
  .addParam("pooladdress", "The address of the pool")
  .addParam("remotechain", "The remote chain")
  .addParam(
    "remotepooladdresses",
    "The remote pool addresses (comma-separated)"
  )
  .addParam("remotetokenaddress", "The remote token address")
  .addOptionalParam(
    "outboundratelimitenabled",
    "Whether the outbound rate limit is enabled (Outbound)",
    false,
    types.boolean
  )
  .addOptionalParam(
    "outboundratelimitcapacity",
    "Maximum number of tokens that can be in the bucket (Outbound)",
    0,
    types.int
  )
  .addOptionalParam(
    "outboundratelimitrate",
    "Number of tokens per second that the bucket is refilled (Outbound)",
    0,
    types.int
  )
  .addOptionalParam(
    "inboundratelimitenabled",
    "Whether the inbound rate limit is enabled (Inbound)",
    false,
    types.boolean
  )
  .addOptionalParam(
    "inboundratelimitcapacity",
    "Maximum number of tokens that can be in the bucket (Inbound)",
    0,
    types.int
  )
  .addOptionalParam(
    "inboundratelimitrate",
    "Number of tokens per second that the bucket is refilled (Inbound)",
    0,
    types.int
  )
  .addParam("safeaddress", "The Safe address to execute the transaction")
  .setAction(async (taskArgs: ConfigurePoolArgs, hre) => {
    // Destructure task arguments for easier reference
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
      safeaddress: safeAddress,
    } = taskArgs;

    const networkName = hre.network.name as Chains;

    // Validate the local network configuration
    const networkConfig = networks[networkName];
    if (!networkConfig) {
      throw new Error(`Network ${networkName} not found in config`);
    }

    // Validate the remote network configuration
    const remoteNetworkConfig = networks[remoteChain as Chains];
    if (!remoteNetworkConfig) {
      throw new Error(`Remote chain ${remoteChain} not found in config`);
    }

    // Retrieve the chain selector for the remote chain
    const remoteChainSelector = remoteNetworkConfig.chainSelector;
    if (remoteChainSelector === undefined) {
      throw new Error(`chainSelector is not defined for ${remoteChain}`);
    }

    // Validate the provided pool address
    if (!hre.ethers.isAddress(poolAddress)) {
      throw new Error(`Invalid pool address: ${poolAddress}`);
    }

    // Validate the provided remote token address
    if (!hre.ethers.isAddress(remoteTokenAddress)) {
      throw new Error(`Invalid remote token address: ${remoteTokenAddress}`);
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

    // Validate the provided Safe address
    if (!hre.ethers.isAddress(safeAddress)) {
      throw new Error(`Invalid Safe address: ${safeAddress}`);
    }

    // Ensure both private keys are provided in environment variables
    const privateKey = process.env.PRIVATE_KEY;
    const privateKey2 = process.env.PRIVATE_KEY_2;

    if (!privateKey || !privateKey2) {
      throw new Error(
        "Both PRIVATE_KEY and PRIVATE_KEY_2 environment variables must be set"
      );
    }

    // Retrieve the RPC URL from the network configuration
    const networkConfigDetails = hre.config.networks[
      networkName
    ] as HttpNetworkConfig;
    const rpcUrl = networkConfigDetails.url;

    if (!rpcUrl) {
      throw new Error("RPC URL not found in network config");
    }

    // Retrieve the number of confirmations required for the transaction
    const { confirmations } = networkConfig;
    if (confirmations === undefined) {
      throw new Error(`confirmations is not defined for ${networkName}`);
    }

    // Build the chain update object with provided rate limits and remote settings
    const chainUpdate = {
      remoteChainSelector: BigInt(remoteChainSelector), // Chain selector for the remote blockchain
      remotePoolAddresses: remotePoolAddresses.map((addr) =>
        new hre.ethers.AbiCoder().encode(["address"], [addr])
      ), // Array of encoded addresses for all pools that can handle this token
      remoteTokenAddress: new hre.ethers.AbiCoder().encode(
        ["address"],
        [remoteTokenAddress]
      ), // Encode the remote token address that these pools will handle
      outboundRateLimiterConfig: {
        isEnabled: outboundRateLimitEnabled, // Whether outbound rate limiting is enabled
        capacity: BigInt(outboundRateLimitCapacity), // Maximum tokens that can be sent at once
        rate: BigInt(outboundRateLimitRate), // Rate at which the capacity refills
      },
      inboundRateLimiterConfig: {
        isEnabled: inboundRateLimitEnabled, // Whether inbound rate limiting is enabled
        capacity: BigInt(inboundRateLimitCapacity), // Maximum tokens that can be received at once
        rate: BigInt(inboundRateLimitRate), // Rate at which the capacity refills
      },
    };

    logger.info(
      `Configuring pool at address: ${poolAddress} for remote chain ${remoteChain}`
    );
    logger.info(`Remote chain selector: ${remoteChainSelector}`);
    logger.info(`Remote pool addresses: ${remotePoolAddresses.join(", ")}`);
    logger.info(`Remote token address: ${remoteTokenAddress}`);

    // Import the TokenPool factory to interact with the token pool contract
    const { TokenPool__factory } = await import("../../typechain-types");
    const poolContract = TokenPool__factory.connect(
      poolAddress,
      hre.ethers.provider
    );

    // Encode the transaction data to apply chain updates to the token pool
    const setPoolData = poolContract.interface.encodeFunctionData(
      "applyChainUpdates",
      [[], [chainUpdate]] // Empty array for removals, array with single update
    );

    // Create Safe signers using the Safe Protocol Kit
    const safeSigner1 = await Safe.init({
      provider: rpcUrl, // The RPC URL for the network
      signer: privateKey, // Private key of the first Safe signer
      safeAddress: safeAddress, // Address of the Safe
    });

    const safeSigner2 = await Safe.init({
      provider: rpcUrl, // The RPC URL for the network
      signer: privateKey2, // Private key of the second Safe signer
      safeAddress: safeAddress, // Address of the Safe
    });

    // Create the meta-transaction data for the applyChainUpdates function call
    const metaTransactionData: MetaTransactionData = {
      to: poolAddress, // The address of the token pool contract
      data: setPoolData, // The encoded function data
      value: "0", // No Ether is being transferred
    };

    // Create the Safe transaction containing the meta-transaction
    let safeTransaction: SafeTransaction;
    try {
      safeTransaction = await safeSigner1.createTransaction({
        transactions: [metaTransactionData], // Transactions to be executed by the Safe
      });
      logger.info("Safe transaction created for configuring the pool");
    } catch (error) {
      logger.error("Failed to create Safe transaction", error);
      throw new Error("Failed to create Safe transaction");
    }

    // Sign the transaction by the first Safe owner
    let signedSafeTransaction: SafeTransaction;
    try {
      signedSafeTransaction = await safeSigner1.signTransaction(
        safeTransaction,
        SigningMethod.ETH_SIGN // Use ETH_SIGN as the signing method
      );
      logger.info("Safe transaction signed by owner 1");
    } catch (error) {
      logger.error("Failed to sign Safe transaction by owner 1", error);
      throw new Error("Failed to sign Safe transaction by owner 1");
    }

    // Sign the transaction by the second Safe owner
    try {
      signedSafeTransaction = await safeSigner2.signTransaction(
        signedSafeTransaction,
        SigningMethod.ETH_SIGN // Use ETH_SIGN as the signing method for the second signer
      );
      logger.info("Safe transaction signed by owner 2");
    } catch (error) {
      logger.error("Failed to sign Safe transaction by owner 2", error);
      throw new Error("Failed to sign Safe transaction by owner 2");
    }

    // Execute the signed Safe transaction
    logger.info(
      `Executing Safe transaction to configure pool ${poolAddress}...`
    );

    let result: TransactionResult;
    try {
      result = await safeSigner1.executeTransaction(signedSafeTransaction);
    } catch (error) {
      logger.error("Error executing Safe transaction", error);
      throw new Error("Error executing Safe transaction");
    }

    logger.info("Executed Safe transaction");

    // Wait for the transaction to be confirmed
    if (result && result.transactionResponse) {
      logger.info(
        `Waiting for ${confirmations} blocks for transaction ${result.hash} to be confirmed...`
      );

      // Wait for the specified number of block confirmations
      await (result.transactionResponse as any).wait(confirmations);
      logger.info(`Transaction confirmed after ${confirmations} blocks.`);
    } else {
      throw new Error("No transaction response available");
    }

    logger.info(`Pool configured successfully for remote chain ${remoteChain}`);
  });
