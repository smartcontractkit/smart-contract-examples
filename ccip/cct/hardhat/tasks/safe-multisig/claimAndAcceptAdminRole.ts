import { task, types } from "hardhat/config"; // Import required modules from Hardhat for defining tasks and specifying types
import { Chains, networks, logger } from "../../config"; // Import necessary configurations, including chains, network settings, and a logger for logging information
import {
  MetaTransactionData,
  SafeTransaction,
  TransactionResult,
} from "@safe-global/safe-core-sdk-types"; // Import types from the Safe Core SDK for defining meta-transactions, Safe transactions, and results
import Safe, { SigningMethod } from "@safe-global/protocol-kit"; // Import Safe and its signing method from the Safe Protocol Kit to interact with Safe accounts
import { HttpNetworkConfig } from "hardhat/types"; // Import Hardhat type definitions for network configuration

// Define the interface for the task arguments
interface ClaimAndAcceptAdminRoleTaskArgs {
  withccipadmin: boolean; // Flag indicating if the contract has a CCIP admin
  tokenaddress: string; // Address of the token for which the admin role will be claimed
  safeaddress: string; // Address of the Safe that will execute the transaction
}

// Define a Hardhat task for claiming and accepting the admin role using a Safe
task(
  "claimAndAcceptAdminRoleFromSafe",
  "Claims and accepts the admin role of a token via Safe"
)
  .addOptionalParam(
    "withccipadmin",
    "Does the contract have a CCIP admin?", // Optional parameter to determine if the contract has a CCIP admin function
    false, // Default value is false
    types.boolean // Type of parameter is boolean
  )
  .addParam("tokenaddress", "The address of the token") // Required parameter for the token address
  .addParam(
    "safeaddress",
    "The address of the Safe to execute the transactions"
  ) // Required parameter for the Safe address
  .setAction(async (taskArgs: ClaimAndAcceptAdminRoleTaskArgs, hre) => {
    // Destructure the task arguments
    const {
      withccipadmin: withCCIPAdmin,
      tokenaddress: tokenAddress,
      safeaddress: safeAddress,
    } = taskArgs;

    // Retrieve the current network's name from the Hardhat runtime environment
    const networkName = hre.network.name as Chains;

    // Validate the network configuration
    const networkConfig = networks[networkName];
    if (!networkConfig) {
      throw new Error(`Network ${networkName} not found in config`);
    }

    // Validate if the provided token address is a valid Ethereum address
    if (!hre.ethers.isAddress(tokenAddress)) {
      throw new Error(`Invalid token address: ${tokenAddress}`);
    }

    // Validate if the provided Safe address is a valid Ethereum address
    if (!hre.ethers.isAddress(safeAddress)) {
      throw new Error(`Invalid Safe address: ${safeAddress}`);
    }

    // Retrieve configuration for the current network
    const { tokenAdminRegistry, registryModuleOwnerCustom, confirmations } =
      networkConfig;
    if (!tokenAdminRegistry || !registryModuleOwnerCustom) {
      throw new Error(
        `tokenAdminRegistry or registryModuleOwnerCustom is not defined for ${networkName}`
      );
    }

    if (confirmations === undefined) {
      throw new Error(`confirmations is not defined for ${networkName}`);
    }

    // Ensure that both private keys are provided
    const privateKey = process.env.PRIVATE_KEY;
    const privateKey2 = process.env.PRIVATE_KEY_2;

    if (!privateKey || !privateKey2) {
      throw new Error(
        "Both PRIVATE_KEY and PRIVATE_KEY_2 environment variables must be set"
      );
    }

    // Get the RPC URL for the current network
    const networkConfigDetails = hre.config.networks[
      networkName
    ] as HttpNetworkConfig;
    const rpcUrl = networkConfigDetails.url;

    if (!rpcUrl) {
      throw new Error("RPC URL not found in network config");
    }

    // Initialize an array to store meta-transactions
    const metaTransactions: MetaTransactionData[] = [];
    let txDescription = "";

    // Claim Admin Role based on whether the contract has a CCIP admin
    if (withCCIPAdmin) {
      // Claiming with CCIP Admin
      const { BurnMintERC677WithCCIPAdmin__factory } = await import(
        "../../typechain-types"
      );
      const tokenContract = BurnMintERC677WithCCIPAdmin__factory.connect(
        tokenAddress,
        hre.ethers.provider
      );

      const tokenContractCCIPAdmin = await tokenContract.getCCIPAdmin();
      logger.info(`Current token CCIP admin: ${tokenContractCCIPAdmin}`);

      const { RegistryModuleOwnerCustom__factory } = await import(
        "../../typechain-types"
      );
      const registryContract = RegistryModuleOwnerCustom__factory.connect(
        registryModuleOwnerCustom,
        hre.ethers.provider
      );

      logger.info(
        `Claiming admin of ${tokenAddress} via getCCIPAdmin() for Safe at ${safeAddress}`
      );

      // Encode the function data to claim admin using the getCCIPAdmin method
      const encodedClaimAdminData =
        registryContract.interface.encodeFunctionData(
          "registerAdminViaGetCCIPAdmin",
          [tokenAddress]
        );

      // Add the meta-transaction to the list of meta-transactions
      metaTransactions.push({
        to: registryModuleOwnerCustom,
        data: encodedClaimAdminData,
        value: "0",
      });
      txDescription = `Claiming admin of token ${tokenAddress} via Safe`;
    } else {
      // Claiming without CCIP Admin
      const { BurnMintERC677__factory } = await import("../../typechain-types");
      const tokenContract = BurnMintERC677__factory.connect(
        tokenAddress,
        hre.ethers.provider
      );

      const tokenOwner = await tokenContract.owner();
      logger.info(`Current token owner: ${tokenOwner}`);

      const { RegistryModuleOwnerCustom__factory } = await import(
        "../../typechain-types"
      );
      const registryContract = RegistryModuleOwnerCustom__factory.connect(
        registryModuleOwnerCustom,
        hre.ethers.provider
      );

      logger.info(
        `Claiming admin of ${tokenAddress} for Safe at ${safeAddress}`
      );

      // Encode the function data to claim admin using the token owner
      const encodedClaimAdminData =
        registryContract.interface.encodeFunctionData("registerAdminViaOwner", [
          tokenAddress,
        ]);

      // Add the meta-transaction to the list of meta-transactions
      metaTransactions.push({
        to: registryModuleOwnerCustom,
        data: encodedClaimAdminData,
        value: "0",
      });
      txDescription = `Claiming admin of token ${tokenAddress} via Safe`;
    }

    // Accept Admin Role
    const { TokenAdminRegistry__factory } = await import(
      "../../typechain-types"
    );
    const tokenAdminRegistryContract = TokenAdminRegistry__factory.connect(
      tokenAdminRegistry,
      hre.ethers.provider
    );

    // Encode the function data to accept the admin role
    const encodedAcceptAdminData =
      tokenAdminRegistryContract.interface.encodeFunctionData(
        "acceptAdminRole",
        [tokenAddress]
      );

    // Add the meta-transaction to the list of meta-transactions
    metaTransactions.push({
      to: tokenAdminRegistry,
      data: encodedAcceptAdminData,
      value: "0",
    });

    logger.info(
      `Adding second MetaTransaction to accept admin role for token ${tokenAddress}`
    );

    // Create Safe signers for both owners
    const safeSigner1 = await Safe.init({
      provider: rpcUrl,
      signer: privateKey,
      safeAddress: safeAddress,
    });

    const safeSigner2 = await Safe.init({
      provider: rpcUrl,
      signer: privateKey2,
      safeAddress: safeAddress,
    });

    // Create a Safe transaction containing both meta-transactions
    let safeTransaction: SafeTransaction;
    try {
      safeTransaction = await safeSigner1.createTransaction({
        transactions: metaTransactions,
      });
      logger.info("Safe transaction with two meta transactions created");
    } catch (error) {
      logger.error("Failed to create Safe transaction", error);
      throw new Error("Failed to create Safe transaction");
    }

    // Sign the transaction by both owners
    let signedSafeTransaction: SafeTransaction;
    try {
      signedSafeTransaction = await safeSigner1.signTransaction(
        safeTransaction,
        SigningMethod.ETH_SIGN
      );
      logger.info("Safe transaction signed by owner 1");
    } catch (error) {
      logger.error("Failed to sign Safe transaction by owner 1", error);
      throw new Error("Failed to sign Safe transaction by owner 1");
    }

    try {
      signedSafeTransaction = await safeSigner2.signTransaction(
        signedSafeTransaction,
        SigningMethod.ETH_SIGN
      );
      logger.info("Safe transaction signed by owner 2");
    } catch (error) {
      logger.error("Failed to sign Safe transaction by owner 2", error);
      throw new Error("Failed to sign Safe transaction by owner 2");
    }

    // Execute the signed transaction
    logger.info(`Executing Safe transaction to claim and accept admin role...`);

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

      // Wait for the transaction to be confirmed by the specified number of blocks
      await (result.transactionResponse as any).wait(confirmations);
      logger.info(`Transaction confirmed after ${confirmations} blocks.`);
    } else {
      throw new Error("No transaction response available");
    }

    // Log the successful completion of the task
    logger.info(`${txDescription} and accepted admin role successfully.`);
  });
