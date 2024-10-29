import { task } from "hardhat/config"; // Importing the task utility from Hardhat to define a new task
import { Chains, networks, logger } from "../../config"; // Importing necessary configurations such as Chains, network settings, and logger
import {
  MetaTransactionData,
  SafeTransaction,
  TransactionResult,
} from "@safe-global/safe-core-sdk-types"; // Importing Safe transaction types from the Safe Core SDK
import Safe, { SigningMethod } from "@safe-global/protocol-kit"; // Importing Safe SDK and SigningMethod for interacting with Safe accounts
import { HttpNetworkConfig } from "hardhat/types"; // Importing Hardhat's HttpNetworkConfig for network configuration

// Define the interface for the task arguments
interface GrantMintBurnTaskArgs {
  tokenaddress: string; // The address of the deployed token contract
  burnerminters: string; // Comma-separated list of addresses to grant mint and burn roles
  safeaddress: string; // The Safe multisig account that will execute the transaction
}

// Define a Hardhat task called "grantMintBurnRoleFromSafe"
task(
  "grantMintBurnRoleFromSafe",
  "Grants mint and burn roles to multiple addresses via Safe"
)
  // Add parameters for the task with descriptions
  .addParam("tokenaddress", "The address of the deployed token contract")
  .addParam(
    "burnerminters",
    "Comma-separated list of addresses to grant mint and burn roles"
  )
  .addParam("safeaddress", "The Safe address to execute the transaction")
  .setAction(async (taskArgs: GrantMintBurnTaskArgs, hre) => {
    // Destructure the task arguments for easy reference
    const {
      tokenaddress: tokenAddress,
      burnerminters: burnerMinters,
      safeaddress: safeAddress,
    } = taskArgs;

    // Get the current network's name from the Hardhat runtime environment
    const networkName = hre.network.name as Chains;

    // Validate that the network is configured
    if (!networks[networkName]) {
      throw new Error(`Network ${networkName} not found in config`);
    }

    // Validate the token address to ensure it is a valid Ethereum address
    if (!hre.ethers.isAddress(tokenAddress)) {
      throw new Error(`Invalid token address: ${tokenAddress}`);
    }

    // Validate the Safe address to ensure it is a valid Ethereum address
    if (!hre.ethers.isAddress(safeAddress)) {
      throw new Error(`Invalid Safe address: ${safeAddress}`);
    }

    // Split the burnerMinters string into an array and trim any extra spaces
    const burnerMinterAddresses = burnerMinters
      .split(",")
      .map((address) => address.trim());

    // Ensure at least one burner minter address is provided
    if (burnerMinterAddresses.length === 0) {
      throw new Error("No burner minter addresses provided");
    }

    // Validate each burner minter address to ensure it is a valid Ethereum address
    for (const address of burnerMinterAddresses) {
      if (!hre.ethers.isAddress(address)) {
        throw new Error(`Invalid burner minter address: ${address}`);
      }
    }

    // Ensure both PRIVATE_KEY and PRIVATE_KEY_2 environment variables are set
    const privateKey = process.env.PRIVATE_KEY;
    const privateKey2 = process.env.PRIVATE_KEY_2;

    if (!privateKey || !privateKey2) {
      throw new Error(
        "Both PRIVATE_KEY and PRIVATE_KEY_2 environment variables must be set"
      );
    }

    // Retrieve network configuration details and RPC URL
    const networkConfig = hre.config.networks[networkName] as HttpNetworkConfig;
    const rpcUrl = networkConfig.url;

    if (!rpcUrl) {
      throw new Error("RPC URL not found in network config");
    }

    // Retrieve the number of confirmations required for the transaction
    const numberOfConfirmations = networks[networkName]?.confirmations;
    if (numberOfConfirmations === undefined) {
      throw new Error(`Confirmations are not defined for ${networkName}`);
    }

    // Log the connection to the token contract
    logger.info(`Connecting to token contract at ${tokenAddress}...`);
    const signer = (await hre.ethers.getSigners())[0];
    const { BurnMintERC677__factory } = await import("../../typechain-types");
    const tokenContract = BurnMintERC677__factory.connect(tokenAddress, signer);

    // Initialize Safe signers for two owners using Safe Protocol Kit
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

    // Log the process of setting up Safe transactions
    logger.info(
      `Setting up Safe transactions to grant mint and burn roles to: ${burnerMinterAddresses.join(
        ", "
      )}`
    );

    // Create MetaTransactionData objects for each burner minter address
    const metaTransactions: MetaTransactionData[] = burnerMinterAddresses.map(
      (burnerMinter) => ({
        to: tokenAddress, // The token contract address
        data: tokenContract.interface.encodeFunctionData(
          "grantMintAndBurnRoles", // The function to call
          [burnerMinter] // The address to grant roles to
        ),
        value: "0", // No Ether is being transferred with this transaction
      })
    );

    // Create a Safe transaction containing all meta-transactions
    let safeTransaction: SafeTransaction;
    try {
      safeTransaction = await safeSigner1.createTransaction({
        transactions: metaTransactions, // The list of meta-transactions to execute
      });
      logger.info("Safe transaction created");
    } catch (error) {
      logger.error("Failed to create Safe transaction", error);
      throw new Error("Failed to create Safe transaction");
    }

    // Sign the Safe transaction with the first Safe owner
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

    // Sign the Safe transaction with the second Safe owner
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
    logger.info(`Executing Safe transaction to grant mint and burn roles...`);

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
        `Waiting for ${numberOfConfirmations} blocks for transaction ${result.hash} to be confirmed...`
      );

      // Wait for the specified number of block confirmations
      await (result.transactionResponse as any).wait(numberOfConfirmations);
      logger.info(
        `Transaction confirmed after ${numberOfConfirmations} blocks.`
      );
    } else {
      throw new Error("No transaction response available");
    }

    // Log that mint and burn roles have been successfully granted
    logger.info(
      `Mint and burn roles granted to ${burnerMinterAddresses.join(", ")}`
    );
  });
