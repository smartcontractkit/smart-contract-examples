import { task } from "hardhat/config"; // Import the "task" utility from Hardhat to define custom tasks
import { Chains, networks, logger } from "../../config"; // Import configurations for chains, networks, and a logger for logging messages
import {
  MetaTransactionData,
  SafeTransaction,
  TransactionResult,
} from "@safe-global/safe-core-sdk-types"; // Import Safe transaction-related types
import Safe, { SigningMethod } from "@safe-global/protocol-kit"; // Import Safe SDK and signing methods to interact with Safe multisig accounts

// Define the interface for the task arguments
interface MintTokensArgs {
  tokenaddress: string; // The address of the token contract
  amount: string; // The amount of tokens to mint to each recipient
  receiveraddresses: string; // Comma-separated list of addresses to receive the minted tokens
  safeaddress: string; // The Safe multisig account address that will execute the transaction
}

// Define a new Hardhat task named "mintTokensFromSafe"
task("mintTokensFromSafe", "Mint tokens to multiple receivers via Safe")
  // Add parameters for the task with descriptions
  .addParam("tokenaddress", "The address of the token")
  .addParam("amount", "The amount to mint for each address")
  .addParam(
    "receiveraddresses",
    "Comma-separated list of addresses to receive the minted tokens"
  )
  .addParam("safeaddress", "The Safe address to execute the transaction")
  .setAction(async (taskArgs: MintTokensArgs, hre) => {
    // Destructure task arguments for easier reference
    const {
      tokenaddress: tokenAddress,
      amount,
      receiveraddresses: receiverAddresses,
      safeaddress: safeAddress,
    } = taskArgs;

    // Get the current network's name from Hardhat runtime environment
    const networkName = hre.network.name as Chains;

    // Validate that the network is configured
    const networkConfig = networks[networkName];
    if (!networkConfig) {
      throw new Error(`Network ${networkName} not found in config`);
    }

    // Get the signer from the list of available signers
    const signer = (await hre.ethers.getSigners())[0];

    // Split and validate receiver addresses
    const receivers = receiverAddresses
      .split(",")
      .map((address) => address.trim());

    // Ensure there is at least one receiver address
    if (receivers.length === 0) {
      throw new Error("No receiver addresses provided");
    }

    // Validate each receiver address
    for (const address of receivers) {
      if (!hre.ethers.isAddress(address)) {
        throw new Error(`Invalid receiver address: ${address}`);
      }
    }

    // Validate the token address
    if (!hre.ethers.isAddress(tokenAddress)) {
      throw new Error(`Invalid token address: ${tokenAddress}`);
    }

    // Validate the Safe address
    if (!hre.ethers.isAddress(safeAddress)) {
      throw new Error(`Invalid Safe address: ${safeAddress}`);
    }

    // Ensure both PRIVATE_KEY and PRIVATE_KEY_2 environment variables are set
    const privateKey = process.env.PRIVATE_KEY;
    const privateKey2 = process.env.PRIVATE_KEY_2;

    if (!privateKey || !privateKey2) {
      throw new Error(
        "Both PRIVATE_KEY and PRIVATE_KEY_2 environment variables must be set"
      );
    }

    // Retrieve network configuration details, including the RPC URL
    const rpcUrl = networkConfig.url;
    if (!rpcUrl) {
      throw new Error("RPC URL not found in network config");
    }

    // Retrieve the number of confirmations required for the transaction
    const { confirmations } = networkConfig;
    if (confirmations === undefined) {
      throw new Error(`Confirmations are not defined for ${networkName}`);
    }

    // Log connection to the token contract and initialize it
    logger.info(`Connecting to token contract at ${tokenAddress}...`);
    const { BurnMintERC677__factory } = await import("../../typechain-types");
    const tokenContract = BurnMintERC677__factory.connect(tokenAddress, signer);

    // Log the minting process
    logger.info(
      `Minting ${amount} of ${await tokenContract.symbol()} tokens to multiple addresses: ${receivers.join(
        ", "
      )}`
    );

    // Create meta-transaction data for each receiver
    const metaTransactions: MetaTransactionData[] = receivers.map(
      (receiver) => ({
        to: tokenAddress, // Address of the token contract
        data: tokenContract.interface.encodeFunctionData("mint", [
          receiver,
          amount,
        ]), // Encoded function data to mint tokens to each receiver
        value: "0", // No Ether is being transferred with the mint transaction
      })
    );

    // Initialize Safe signers using the Safe Protocol Kit for both owners
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

    // Create the Safe transaction containing all mint meta-transactions
    let safeTransaction: SafeTransaction;
    try {
      safeTransaction = await safeSigner1.createTransaction({
        transactions: metaTransactions, // Transactions to mint tokens to each receiver
      });
      logger.info("Safe transaction created");
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

    // Execute the signed Safe transaction
    logger.info(
      `Executing Safe transaction to mint tokens to multiple addresses...`
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

    // Log details for each receiver to confirm successful minting
    for (const receiver of receivers) {
      logger.info(
        `Minted ${amount} of ${await tokenContract.symbol()} tokens to ${receiver}`
      );
      logger.info(
        `Current balance of ${receiver} is ${await tokenContract.balanceOf(
          receiver
        )} ${await tokenContract.symbol()}`
      );
    }
  });
