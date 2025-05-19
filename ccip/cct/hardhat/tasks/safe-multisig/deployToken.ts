import { task, types } from "hardhat/config";
import { Chains, networks, TokenContractName, logger } from "../../config";
import type { BurnMintERC20 } from "../../typechain-types";
import type { ContractFactory } from "ethers";

// Define the interface for the task arguments
interface DeployTokenTaskArgs {
  safeaddress: string; // The address of the Safe multisig account
  name: string; // The name of the token
  symbol: string; // The symbol of the token
  decimals: number; // The number of decimal places the token supports
  maxsupply: bigint; // The maximum supply of tokens. When maxSupply is 0, the supply is unlimited
  premint: bigint; // The initial amount of the token minted to the owner
  verifycontract: boolean; // Whether to verify the contract on a blockchain explorer
}

// Define a Hardhat task called "deployTokenWithSafe"
task("deployTokenWithSafe", "Deploys a token")
  .addParam("safeaddress", "The address of the Safe") // Adds a mandatory parameter "safeaddress" to identify the Safe
  .addParam("name", "The name of the token") // Adds a mandatory parameter "name" for the token's name
  .addParam("symbol", "The symbol of the token") // Adds a mandatory parameter "symbol" for the token's symbol
  .addOptionalParam("decimals", "The number of decimals", 18, types.int) // Adds an optional parameter "decimals" with a default value of 18
  .addOptionalParam("maxsupply", "The maximum supply", 0n, types.bigint) // Adds an optional parameter "maxSupply" with a default value of 0
  .addOptionalParam("premint", "The initial amount of the token minted to the owner", 0n, types.bigint) // If preMint is 0, then the initial mint amount is 0
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
      premint: preMint,
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
    let token: BurnMintERC20;
    
    const { BurnMintERC20__factory } = await import(
      "../../typechain-types"
    );
    TokenFactory = new BurnMintERC20__factory(signer);
    tokenContractName = TokenContractName.BurnMintERC20;

    // Deploy the BurnMintERC20 contract with the specified parameters
    token = (await TokenFactory.deploy(
      name,
      symbol,
      decimals,
      maxSupply,
      preMint
    )) as BurnMintERC20;

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
            constructorArguments: [name, symbol, decimals, maxSupply, preMint],
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
      const transferOwnershipTransaction = await token.grantRole(
        await token.DEFAULT_ADMIN_ROLE(),
        safeAddress
      );
      await transferOwnershipTransaction.wait(numberOfConfirmations);

      logger.info(`Ownership of token transferred to Safe at ${safeAddress}`);

      // Setting the Safe account as the CCIP admin
      logger.info(`Setting Safe at ${safeAddress} as the CCIP admin`);
      const settingCCIPAdminTransaction = await token.setCCIPAdmin(
        safeAddress
      );
      await settingCCIPAdminTransaction.wait(numberOfConfirmations);

      logger.info(`Safe at ${safeAddress} has been set as the CCIP admin`);

    } catch (error) {
      // Log an error if the deployment or any other process fails
      logger.error(error);
      throw new Error("Token deployment failed");
    }
  });
