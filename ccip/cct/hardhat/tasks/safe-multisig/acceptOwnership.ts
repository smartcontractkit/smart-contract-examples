import { task } from "hardhat/config"; // Import the "task" utility from Hardhat to define custom tasks
import { Chains, networks, logger } from "../../config"; // Import required configuration, including chains, networks, and a logger
import {
  MetaTransactionData,
  SafeTransaction,
  TransactionResult,
} from "@safe-global/safe-core-sdk-types"; // Import types related to Safe transactions
import Safe, { SigningMethod } from "@safe-global/protocol-kit"; // Import Safe SDK for creating and managing Safe transactions
import { HttpNetworkConfig } from "hardhat/types"; // Import the Hardhat type definition for network configuration

// Define the interface for the task arguments
interface AcceptOwnershipTaskArgs {
  contractaddress: string; // The address of the contract to accept ownership of
  safeaddress: string; // The address of the Safe multisig account that will accept the ownership
}

// Define a new Hardhat task called "acceptOwnershipFromSafe"
task(
  "acceptOwnershipFromSafe",
  "Accept ownership of a contract via Gnosis Safe"
)
  .addParam(
    "contractaddress",
    "The address of the contract to accept ownership of"
  ) // Add a required parameter for the contract address
  .addParam("safeaddress", "The address of the Safe that holds ownership") // Add a required parameter for the Safe address
  .setAction(async (taskArgs: AcceptOwnershipTaskArgs, hre) => {
    // Destructure task arguments for easier access
    const { contractaddress: contractAddress, safeaddress: safeAddress } =
      taskArgs;
    const networkName = hre.network.name as Chains; // Get the current network name from Hardhat runtime environment
    const signer = (await hre.ethers.getSigners())[0]; // Get the first signer from the list of available signers

    // Validate the network configuration
    if (!networks[networkName]) {
      throw new Error(`Network ${networkName} not found in config`);
    }

    // Validate if the provided contract address is a valid Ethereum address
    if (!hre.ethers.isAddress(contractAddress)) {
      throw new Error(`Invalid contract address: ${contractAddress}`);
    }

    // Validate if the provided Safe address is a valid Ethereum address
    if (!hre.ethers.isAddress(safeAddress)) {
      throw new Error(`Invalid Safe address: ${safeAddress}`);
    }

    // Retrieve the private keys from environment variables
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
      logger.error("PRIVATE_KEY environment variable not found");
      throw new Error("PRIVATE_KEY environment variable not found");
    }

    const privateKey2 = process.env.PRIVATE_KEY_2;
    if (!privateKey2) {
      logger.error("PRIVATE_KEY_2 environment variable not found");
      throw new Error("PRIVATE_KEY_2 environment variable not found");
    }

    // Retrieve network configuration details, including the RPC URL
    const networkConfig = hre.config.networks[networkName] as HttpNetworkConfig;
    const rpcUrl = networkConfig.url;

    if (!rpcUrl) {
      logger.error("RPC URL not found in network config");
      throw new Error("RPC URL not found in network config");
    }

    // Encode the "acceptOwnership" function call for the specified contract
    logger.info(
      `Encoding acceptOwnership call for contract at ${contractAddress}...`
    );
    const { OwnerIsCreator__factory } = await import("../../typechain-types");
    const OwnerIscCreatorFactory = new OwnerIsCreator__factory(signer);
    const encodedData =
      OwnerIscCreatorFactory.interface.encodeFunctionData("acceptOwnership");

    // Prepare the meta-transaction data to accept ownership
    logger.info("Setting up Safe transaction...");
    const metaTransactionData: MetaTransactionData = {
      to: contractAddress, // The address of the contract for which ownership is being accepted
      data: encodedData, // The encoded function data to call "acceptOwnership"
      value: "0", // No Ether is being transferred with this transaction
    };

    // Initialize Safe signers for the two owners
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

    // Create a Safe transaction containing the meta-transaction to accept ownership
    let safeTransaction: SafeTransaction;
    try {
      safeTransaction = await safeSigner1.createTransaction({
        transactions: [metaTransactionData],
      });
      logger.info("Safe transaction created");
    } catch (error) {
      logger.error("Failed to create Safe transaction", error);
      throw new Error("Failed to create Safe transaction");
    }

    // Sign the Safe transaction by both owners
    let signedSafeTransaction: SafeTransaction;
    try {
      signedSafeTransaction = await safeSigner1.signTransaction(
        safeTransaction,
        SigningMethod.ETH_SIGN // Use ETH_SIGN as the signing method
      );
      logger.info("Safe transaction signed by owner 1");
    } catch (error) {
      logger.error("Failed to sign Safe transaction", error);
      throw new Error("Failed to sign Safe transaction");
    }

    try {
      signedSafeTransaction = await safeSigner2.signTransaction(
        signedSafeTransaction,
        SigningMethod.ETH_SIGN // Use ETH_SIGN as the signing method for the second signer
      );
      logger.info("Safe transaction signed by owner 2");
    } catch (error) {
      logger.error("Failed to sign Safe transaction", error);
      throw new Error("Failed to sign Safe transaction");
    }

    // Execute the signed Safe transaction to accept ownership
    logger.info(`Executing Safe transaction to accept ownership...`);

    let result: TransactionResult;
    try {
      result = await safeSigner1.executeTransaction(signedSafeTransaction);
    } catch (error) {
      logger.error(error);
      throw new Error("Error executing Safe transaction");
    }

    logger.info("Executed Safe transaction");

    // Wait for the transaction to be confirmed on the blockchain
    if (result && result.transactionResponse) {
      const numberOfConfirmations = networks[networkName]?.confirmations;
      if (numberOfConfirmations === undefined) {
        throw new Error(`Confirmations are not defined for ${networkName}`);
      }

      logger.info(
        `Waiting for ${numberOfConfirmations} blocks for transaction ${result.hash} to be confirmed...`
      );

      // Wait for the transaction to be confirmed by the specified number of blocks
      await (result.transactionResponse as any).wait(numberOfConfirmations);
      logger.info(
        `Transaction confirmed after ${numberOfConfirmations} blocks.`
      );
    } else {
      throw new Error("No transaction response available");
    }
  });
