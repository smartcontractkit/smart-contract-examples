import { task, types } from "hardhat/config"; // Importing required modules from Hardhat for defining tasks and specifying types
import { Chains, networks, logger } from "../../config"; // Importing necessary configuration for chains, networks, and a logger for logging information

// Define the interface for the task arguments
interface DeployTokenPoolTaskArgs {
  verifycontract: boolean; // Boolean flag indicating if the contract should be verified on a blockchain explorer
  tokenaddress: string; // The address of the token that the pool will manage
  safeaddress: string; // The address of the Safe multisig account that will own the token pool
  localtokendecimals?: number; // Optional parameter for token decimals, defaults to 18
}

// Define the Hardhat task for deploying a token pool and transferring ownership to a Safe account
task(
  "deployTokenPoolWithSafe",
  "Deploys a token pool and transfers ownership to a Safe"
)
  .addParam("tokenaddress", "The address of the token") // Add a required parameter for the token address
  .addParam("safeaddress", "The address of the Safe to transfer ownership") // Add a required parameter for the Safe account address
  .addOptionalParam(
    "verifycontract",
    "Verify the contract on Blockchain scan", // Optional parameter to verify the contract
    false, // Default value is false, indicating that verification is not mandatory
    types.boolean // Type of parameter is boolean
  )
  .addOptionalParam(
    "localtokendecimals",
    "Local token decimals (defaults to 18)", // Optional parameter for token decimals
    18,
    types.int
  )
  .setAction(async (taskArgs: DeployTokenPoolTaskArgs, hre) => {
    // Destructuring task arguments
    const {
      verifycontract: verifyContract,
      tokenaddress: tokenAddress,
      safeaddress: safeAddress,
      localtokendecimals: localTokenDecimals = 18, // Default to 18 if not provided
    } = taskArgs;

    // Retrieve the current network name from the Hardhat runtime environment
    const networkName = hre.network.name as Chains;

    // Retrieve the network configuration for the specified network
    const networkConfig = networks[networkName];
    if (!networkConfig) {
      throw new Error(`Network ${networkName} not found in config`);
    }

    // Get the contract factory for the "BurnMintTokenPool"
    const TokenPool = await hre.ethers.getContractFactory("BurnMintTokenPool");

    // Validate the provided token address
    if (!tokenAddress || hre.ethers.isAddress(tokenAddress) === false) {
      throw new Error(`Invalid token address: ${tokenAddress}`);
    }

    // Validate the provided Safe address
    if (!hre.ethers.isAddress(safeAddress)) {
      throw new Error(`Invalid Safe address: ${safeAddress}`);
    }

    // Retrieve necessary configuration for the network, including router, proxy, and confirmation details
    const { router, rmnProxy, confirmations } = networkConfig;
    if (!router || !rmnProxy) {
      throw new Error(`Router or RMN Proxy not defined for ${networkName}`);
    }

    try {
      // Deploy the Token Pool contract with localTokenDecimals
      const tokenPool = await TokenPool.deploy(
        tokenAddress, // Address of the token managed by the pool
        localTokenDecimals, // Number of decimals for the token
        [], // Empty array for additional parameters (in this case, no extra addresses)
        rmnProxy, // Address of the RMN Proxy contract
        router // Address of the Router contract
      );

      // Validate if the confirmation parameter is defined
      if (confirmations === undefined) {
        throw new Error(`confirmations is not defined for ${networkName}`);
      }

      // Log the transaction hash and wait for the specified number of confirmations
      logger.info(
        `Waiting ${confirmations} blocks for transaction ${
          tokenPool.deploymentTransaction()?.hash
        } to be confirmed...`
      );
      await tokenPool.deploymentTransaction()?.wait(confirmations);

      // Retrieve the address of the deployed token pool
      const tokenPoolAddress = await tokenPool.getAddress();
      logger.info(`Token pool deployed to: ${tokenPoolAddress}`);

      // If requested, verify the contract on a blockchain explorer
      if (verifyContract) {
        logger.info("Verifying contract on Etherscan...");
        try {
          await hre.run("verify:verify", {
            address: tokenPoolAddress,
            constructorArguments: [
              tokenAddress,
              localTokenDecimals,
              [],
              rmnProxy,
              router,
            ],
          });
          logger.info("Token pool contract deployed and verified");
        } catch (error) {
          if (error instanceof Error) {
            if (!error.message.includes("Already Verified")) {
              // Log an error message if verification fails and the reason is not "Already Verified"
              logger.error(error.message);
              logger.warn(
                "Token pool contract deployed but not verified. Ensure you are waiting for enough confirmation blocks"
              );
            } else {
              // Log a warning if the contract is already verified
              logger.warn("Token pool contract deployed but already verified");
            }
          } else {
            // Log an error if there was an unknown error during verification
            logger.error(
              "Token pool contract deployed but there was an unknown error while verifying"
            );
            logger.error(error);
          }
        }
      } else {
        logger.info("Token pool contract deployed successfully");
      }

      // Transfer ownership of the Token Pool to the Safe multisig account
      logger.info(
        `Transferring ownership of Token Pool to Safe at ${safeAddress}`
      );
      const transferOwnershipTransaction = await tokenPool.transferOwnership(
        safeAddress // Address of the Safe to transfer ownership to
      );
      await transferOwnershipTransaction.wait(confirmations);

      // Log the successful ownership transfer
      logger.info(
        `Ownership of Token Pool transferred to Safe at ${safeAddress}`
      );
    } catch (error) {
      // Log the error if deployment or ownership transfer fails
      logger.error(error);
      throw new Error("Token pool deployment failed");
    }
  });
