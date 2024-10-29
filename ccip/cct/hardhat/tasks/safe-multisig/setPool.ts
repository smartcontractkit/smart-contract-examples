import { task } from "hardhat/config"; // Import the "task" utility from Hardhat to define custom tasks
import { Chains, networks, logger } from "../../config"; // Import chain configurations, network settings, and a logger for logging
import {
  MetaTransactionData,
  SafeTransaction,
  TransactionResult,
} from "@safe-global/safe-core-sdk-types"; // Import types related to Safe transactions
import Safe, { SigningMethod } from "@safe-global/protocol-kit"; // Import Safe SDK and signing methods to interact with Safe multisig accounts
import { HttpNetworkConfig } from "hardhat/types"; // Import Hardhat's HttpNetworkConfig for network configuration

// Define the interface for the task arguments
interface SetPoolArgs {
  tokenaddress: string; // The address of the token to be linked to a pool
  pooladdress: string; // The address of the token pool to be set for the token
  safeaddress: string; // The Safe multisig account that will execute the transaction
}

// Define a new Hardhat task named "setPooFromSafe"
task("setPoolFromSafe", "Set the pool for a token via Safe")
  // Add parameters for the task with descriptions
  .addParam("tokenaddress", "The address of the token")
  .addParam("pooladdress", "The address of the pool")
  .addParam("safeaddress", "The Safe address to execute the transaction")
  .setAction(async (taskArgs: SetPoolArgs, hre) => {
    // Destructure task arguments for easier reference
    const {
      tokenaddress: tokenAddress,
      pooladdress: poolAddress,
      safeaddress: safeAddress,
    } = taskArgs;

    // Get the current network's name from Hardhat runtime environment
    const networkName = hre.network.name as Chains;

    // Validate that the network is configured
    const networkConfig = networks[networkName];
    if (!networkConfig) {
      throw new Error(`Network ${networkName} not found in config`);
    }

    // Validate that the provided token address is a valid Ethereum address
    if (!hre.ethers.isAddress(tokenAddress)) {
      throw new Error(`Invalid token address: ${tokenAddress}`);
    }

    // Validate that the provided pool address is a valid Ethereum address
    if (!hre.ethers.isAddress(poolAddress)) {
      throw new Error(`Invalid pool address: ${poolAddress}`);
    }

    // Validate that the provided Safe address is a valid Ethereum address
    if (!hre.ethers.isAddress(safeAddress)) {
      throw new Error(`Invalid Safe address: ${safeAddress}`);
    }

    // Retrieve the tokenAdminRegistry address and the number of confirmations from the network configuration
    const { tokenAdminRegistry, confirmations } = networkConfig;
    if (!tokenAdminRegistry) {
      throw new Error(`tokenAdminRegistry is not defined for ${networkName}`);
    }

    if (confirmations === undefined) {
      throw new Error(`Confirmations are not defined for ${networkName}`);
    }

    // Ensure both private keys are available in environment variables
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

    // Log the connection to the TokenAdminRegistry contract
    logger.info(
      `Connecting to TokenAdminRegistry contract at ${tokenAdminRegistry}...`
    );

    // Import the TokenAdminRegistry factory to interact with the contract
    const { TokenAdminRegistry__factory } = await import(
      "../../typechain-types"
    );

    // Connect to the TokenAdminRegistry contract using the provided address and the provider from Hardhat
    const tokenAdminRegistryContract = TokenAdminRegistry__factory.connect(
      tokenAdminRegistry,
      hre.ethers.provider
    );

    // Retrieve the current token configuration for the given token address
    const config = await tokenAdminRegistryContract.getTokenConfig(
      tokenAddress
    );
    const tokenAdministratorAddress = config.administrator; // Get the current administrator address for the token

    // Log the pool setting process
    logger.info(
      `Setting pool for token ${tokenAddress} to ${poolAddress} by ${tokenAdministratorAddress}`
    );

    // Encode the setPool transaction data with the token and pool addresses
    const setPoolData = tokenAdminRegistryContract.interface.encodeFunctionData(
      "setPool",
      [tokenAddress, poolAddress]
    );

    // Create Safe signers using the Safe Protocol Kit
    const safeSigner1 = await Safe.init({
      provider: rpcUrl, // The RPC URL for the network
      signer: privateKey, // Private key of the first Safe signer
      safeAddress: safeAddress, // Address of the Safe multisig account
    });

    const safeSigner2 = await Safe.init({
      provider: rpcUrl, // The RPC URL for the network
      signer: privateKey2, // Private key of the second Safe signer
      safeAddress: safeAddress, // Address of the Safe multisig account
    });

    // Create the meta-transaction data for the setPool function call
    const metaTransactionData: MetaTransactionData = {
      to: tokenAdminRegistry, // The address of the TokenAdminRegistry contract
      data: setPoolData, // The encoded function data to set the pool
      value: "0", // No Ether is being transferred with this transaction
    };

    // Create the Safe transaction containing the setPool meta-transaction
    let safeTransaction: SafeTransaction;
    try {
      safeTransaction = await safeSigner1.createTransaction({
        transactions: [metaTransactionData], // List of meta-transactions to be executed
      });
      logger.info("Safe transaction created for setting the pool");
    } catch (error) {
      logger.error("Failed to create Safe transaction", error);
      throw new Error("Failed to create Safe transaction");
    }

    // Sign the Safe transaction with the first owner
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

    // Sign the Safe transaction with the second owner
    try {
      signedSafeTransaction = await safeSigner2.signTransaction(
        signedSafeTransaction,
        SigningMethod.ETH_SIGN // Use ETH_SIGN as the signing method for the second owner
      );
      logger.info("Safe transaction signed by owner 2");
    } catch (error) {
      logger.error("Failed to sign Safe transaction by owner 2", error);
      throw new Error("Failed to sign Safe transaction by owner 2");
    }

    // Execute the signed Safe transaction to set the pool
    logger.info(
      `Executing Safe transaction to set pool for token ${tokenAddress}...`
    );

    let result: TransactionResult;
    try {
      result = await safeSigner1.executeTransaction(signedSafeTransaction);
    } catch (error) {
      logger.error("Error executing Safe transaction", error);
      throw new Error("Error executing Safe transaction");
    }

    logger.info("Executed Safe transaction");

    // Wait for the transaction to be confirmed on the blockchain
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

    // Log the successful pool setting operation
    logger.info(
      `Pool set for token ${tokenAddress} to ${poolAddress} successfully.`
    );
  });
