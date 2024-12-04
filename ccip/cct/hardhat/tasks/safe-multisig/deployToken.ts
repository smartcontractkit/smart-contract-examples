import { task, types } from "hardhat/config";
import { Chains, networks, TokenContractName, logger } from "../../config";
import type { BurnMintERC677WithCCIPAdmin } from "../../typechain-types";
import type { BurnMintERC677 } from "../../typechain-types";
import type { ContractFactory } from "ethers";

// Define the interface for the task arguments
interface DeployTokenTaskArgs {
  withgetccipadmin: boolean; // Determines if the contract has a getCCIPAdmin function
  ccipadminaddress: string; // The address of the CCIP admin, optional
  safeaddress: string; // The address of the Safe multisig account
  name: string; // The name of the token
  symbol: string; // The symbol of the token
  decimals: number; // The number of decimal places the token supports
  maxsupply: bigint; // The maximum supply of tokens. When maxSupply is 0, the supply is unlimited
  verifycontract: boolean; // Whether to verify the contract on a blockchain explorer
}

// Define a Hardhat task called "deployTokenWithSafe"
task("deployTokenWithSafe", "Deploys a token")
  .addParam("safeaddress", "The address of the Safe") // Adds a mandatory parameter "safeaddress" to identify the Safe
  .addOptionalParam(
    "withgetccipadmin",
    "Does the contract have a getCCIPAdmin function?",
    false, // Default value is false
    types.boolean // Type of parameter is boolean
  )
  .addOptionalParam("ccipadminaddress", "The address of the CCIP admin") // Adds an optional parameter for the CCIP admin address
  .addParam("name", "The name of the token") // Adds a mandatory parameter "name" for the token's name
  .addParam("symbol", "The symbol of the token") // Adds a mandatory parameter "symbol" for the token's symbol
  .addOptionalParam("decimals", "The number of decimals", 18, types.int) // Adds an optional parameter "decimals" with a default value of 18
  .addOptionalParam("maxsupply", "The maximum supply", 0, types.bigint) // Adds an optional parameter "maxSupply" with a default value of 0
  .addOptionalParam(
    "verifycontract",
    "Verify the contract on Blockchain scan",
    false,
    types.boolean
  )
  .setAction(async (taskArgs: DeployTokenTaskArgs, hre) => {
    // Extract task arguments
    const {
      safeaddress: safeAddress,
      name,
      symbol,
      decimals,
      maxsupply: maxSupply,
      withgetccipadmin: withGetCCIPAdmin,
      ccipadminaddress: ccipAdminAddress,
      verifycontract: verifyContract,
    } = taskArgs;

    // Get the current network's name from the Hardhat runtime environment
    const networkName = hre.network.name as Chains;

    // Validate if the network is configured
    if (!networks[networkName]) {
      throw new Error(`Network ${networkName} not found in config`);
    }

    // Initialize variables to hold the token factory, contract name, and CCIP admin address
    let TokenFactory: ContractFactory;
    let tokenContractName: TokenContractName;
    let ccipAdminCalculatedAddress = "";

    // Validate if the Safe address is a valid Ethereum address
    if (!hre.ethers.isAddress(safeAddress)) {
      throw new Error(`Invalid Safe address: ${safeAddress}`);
    }

    // Get the first signer available in the Hardhat environment
    const signer = (await hre.ethers.getSigners())[0];
    let token: BurnMintERC677 | BurnMintERC677WithCCIPAdmin;

    // Deploy the token contract based on the presence of the getCCIPAdmin function
    if (withGetCCIPAdmin) {
      // If withGetCCIPAdmin is true, deploy the contract with CCIP admin functionality
      const { BurnMintERC677WithCCIPAdmin__factory } = await import(
        "../../typechain-types"
      );
      TokenFactory = new BurnMintERC677WithCCIPAdmin__factory(signer);
      tokenContractName = TokenContractName.BurnMintERC677WithCCIPAdmin;

      // Determine the CCIP admin address
      ccipAdminCalculatedAddress = ccipAdminAddress
        ? ccipAdminAddress
        : signer.address;

      // Validate if the calculated CCIP admin address is a valid Ethereum address
      if (!hre.ethers.isAddress(ccipAdminCalculatedAddress)) {
        throw new Error(
          `Invalid CCIP admin address: ${ccipAdminCalculatedAddress}`
        );
      }

      // Deploy the token contract with the specified parameters
      token = (await TokenFactory.deploy(
        name,
        symbol,
        decimals,
        maxSupply
      )) as BurnMintERC677WithCCIPAdmin;
    } else {
      // If withGetCCIPAdmin is false, deploy the basic BurnMintERC677 contract with owner() function
      const { BurnMintERC677__factory } = await import("../../typechain-types");
      TokenFactory = new BurnMintERC677__factory(signer);
      tokenContractName = TokenContractName.BurnMintERC677;

      // Deploy the token contract with the specified parameters
      token = (await TokenFactory.deploy(
        name,
        symbol,
        decimals,
        maxSupply
      )) as BurnMintERC677;
    }

    logger.info(`Deploying ${tokenContractName} contract to ${networkName}`);

    try {
      // Get the number of confirmations required for the deployment
      const numberOfConfirmations = networks[networkName]?.confirmations;
      if (numberOfConfirmations === undefined) {
        throw new Error(`confirmations is not defined for ${networkName}`);
      }

      // Log the deployment process and wait for the transaction to be confirmed
      logger.info(
        `Waiting ${numberOfConfirmations} blocks for transaction ${
          token.deploymentTransaction()?.hash
        } to be confirmed...`
      );
      await token.deploymentTransaction()?.wait(numberOfConfirmations);

      // Get the deployed token contract address
      const tokenAddress = await token.getAddress();
      logger.info(`Token deployed to: ${tokenAddress}`);

      // Verify the contract on a blockchain explorer if requested
      if (verifyContract) {
        logger.info("Verifying contract on Etherscan...");
        try {
          await hre.run("verify:verify", {
            address: tokenAddress,
            constructorArguments: [name, symbol, decimals, maxSupply],
          });
          logger.info("Token contract deployed and verified");
        } catch (error) {
          if (error instanceof Error) {
            if (!error.message.includes("Already Verified")) {
              logger.error(error.message);
              logger.warn(
                "Token contract deployed but not verified. Ensure you are waiting for enough confirmation blocks"
              );
            } else {
              logger.warn("Token contract deployed but already verified");
            }
          } else {
            logger.error(
              "Token contract deployed but there was an unknown error while verifying"
            );
            logger.error(error);
          }
        }
      } else {
        logger.info("Token contract deployed successfully");
      }

      // Transfer ownership of the token to the Safe account
      logger.info(`Transferring ownership of token to Safe at ${safeAddress}`);
      const transferOwnershipTransaction = await token.transferOwnership(
        safeAddress
      );
      await transferOwnershipTransaction.wait(numberOfConfirmations);

      logger.info(`Ownership of token transferred to Safe at ${safeAddress}`);
    } catch (error) {
      // Log an error if the deployment or any other process fails
      logger.error(error);
      throw new Error("Token deployment failed");
    }
  });
