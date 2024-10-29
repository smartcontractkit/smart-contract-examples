import { task, types } from "hardhat/config";
import Safe, { SafeFactory } from "@safe-global/protocol-kit";
import { HttpNetworkConfig } from "hardhat/types";
import { logger } from "../../config";

// Define the arguments for the task
interface DeploySafeTaskArgs {
  owners: string; // A comma-separated list of owner addresses
  threshold: number; // The number of required signatures to authorize a transaction
}

// Define the Hardhat task to deploy a new Safe
task("deploySafe", "Deploys a new Safe")
  .addParam(
    "owners",
    "A comma-separated list of owner addresses", // Description of the parameter
    undefined, // No default value
    types.string // The parameter type is a string
  )
  .addParam(
    "threshold",
    "The number of required signatures", // Description of the parameter
    1, // Default value is 1
    types.int // The parameter type is an integer
  )
  .setAction(async (taskArgs: DeploySafeTaskArgs, hre) => {
    const { owners, threshold } = taskArgs;

    // Split the comma-separated owners string into an array of addresses
    const ownerAddresses = owners.split(",").map((address) => address.trim());

    // Validate the owner addresses
    if (ownerAddresses.length === 0) {
      logger.error("No owner addresses provided");
      throw new Error("No owner addresses provided");
    }

    // Check if each address in the list is a valid Ethereum address
    for (const address of ownerAddresses) {
      if (!hre.ethers.isAddress(address)) {
        logger.error(`Invalid Ethereum address: ${address}`);
        throw new Error(`Invalid Ethereum address: ${address}`);
      }
    }

    // Validate the threshold
    // The threshold must be at least 1 and cannot exceed the number of owners
    if (threshold < 1 || threshold > ownerAddresses.length) {
      logger.error(
        `Invalid threshold: ${threshold} - Cannot be less than 1 or greater than the number of owners (${ownerAddresses.length})`
      );
      throw new Error(
        `Invalid threshold: ${threshold} - Cannot be less than 1 or greater than the number of owners (${ownerAddresses.length})`
      );
    }

    // Retrieve the private key from environment variables
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
      logger.error("PRIVATE_KEY environment variable not found");
      throw new Error("PRIVATE_KEY environment variable not found");
    }

    // Retrieve network configuration for the current network
    const networkConfig = hre.config.networks[
      hre.network.name
    ] as HttpNetworkConfig;

    // Get the RPC URL for the network
    const rpcUrl = networkConfig.url;

    if (!rpcUrl) {
      logger.error("RPC URL not found in network config");
      throw new Error("RPC URL not found in network config");
    }

    logger.info("Initializing Safe Protocol Kit...");

    // Initialize Safe Protocol Kit with the RPC URL and the signer's private key
    const safeFactory = await SafeFactory.init({
      provider: rpcUrl, // The blockchain provider URL to connect to
      signer: privateKey, // The signer's private key to sign transactions
    });

    // Configure the Safe account
    const safeAccountConfig = {
      owners: ownerAddresses, // List of owner addresses
      threshold: threshold, // Minimum number of required signatures
    };

    // Generate a unique salt for the deployment to avoid conflicts
    const randomBytes = hre.ethers.randomBytes(32);
    const saltNonce = BigInt(hre.ethers.hexlify(randomBytes));

    // Log the configuration details for the Safe deployment
    logger.info("Deploying Safe with the following configuration:");
    logger.info(`Owners: ${ownerAddresses.join(", ")}`);
    logger.info(`Threshold: ${threshold}`);
    logger.info(`Salt nonce: ${saltNonce}`);

    // Deploy the Safe with the provided configuration
    try {
      const protocolKit = await safeFactory.deploySafe({
        safeAccountConfig, // The Safe account configuration
        saltNonce: saltNonce.toString(), // A unique salt for this deployment
      });

      // Retrieve the address of the newly deployed Safe
      const safeAddress = await protocolKit.getAddress();
      logger.info(`Safe deployed successfully at address: ${safeAddress}`);
    } catch (error) {
      // Log an error if the deployment fails
      logger.error(`Safe deployment failed: ${error}`);
    }
  });
