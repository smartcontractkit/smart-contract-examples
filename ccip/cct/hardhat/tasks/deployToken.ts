import { task, types } from "hardhat/config";
import { Chains, networks, TokenContractName, logger } from "../config";
import type { BurnMintERC677WithCCIPAdmin } from "../typechain-types";
import type { BurnMintERC677 } from "../typechain-types";
import type { ContractFactory } from "ethers";

interface DeployTokenTaskArgs {
  withgetccipadmin: boolean;
  ccipadminaddress: string;
  name: string;
  symbol: string;
  decimals: number;
  maxsupply: bigint;
  verifycontract: boolean;
}

// Task to deploy BurnMintERC677 tokens, with optional CCIP admin settings
task("deployToken", "Deploys a token")
  .addOptionalParam(
    "withgetccipadmin", // Whether the token contract includes a getCCIPAdmin() function
    "Does the contract have a getCCIPAdmin function?",
    false,
    types.boolean
  )
  .addOptionalParam("ccipadminaddress", "The address of the CCIP admin") // CCIP admin address, required if withgetccipadmin is true
  .addParam("name", "The name of the token") // Token name
  .addParam("symbol", "The symbol of the token") // Token symbol
  .addOptionalParam("decimals", "The number of decimals", 18, types.int) // Number of decimals (default: 18)
  .addOptionalParam("maxsupply", "The maximum supply", 0, types.bigint) // If maxSupply is 0, the the supply is unlimited
  .addOptionalParam(
    "verifycontract", // Option to verify the contract on Etherscan
    "Verify the contract on Blockchain scan",
    false,
    types.boolean
  )
  .setAction(async (taskArgs: DeployTokenTaskArgs, hre) => {
    const {
      name,
      symbol,
      decimals,
      maxsupply:maxSupply,
      withgetccipadmin: withGetCCIPAdmin,
      ccipadminaddress: ccipAdminAddress,
      verifycontract: verifyContract,
    } = taskArgs;

    const networkName = hre.network.name as Chains;

    // Check if network is defined in config
    if (!networks[networkName]) {
      throw new Error(`Network ${networkName} not found in config`);
    }

    let TokenFactory: ContractFactory;
    let tokenContractName: TokenContractName;
    let ccipAdminCalculatedAddress = "";

    const signer = (await hre.ethers.getSigners())[0]; // Get the signer (deployer)
    let token: BurnMintERC677 | BurnMintERC677WithCCIPAdmin;

    // If the token includes getCCIPAdmin(), deploy the corresponding contract
    if (withGetCCIPAdmin) {
      const { BurnMintERC677WithCCIPAdmin__factory } = await import(
        "../typechain-types"
      );
      TokenFactory = new BurnMintERC677WithCCIPAdmin__factory(signer);
      tokenContractName = TokenContractName.BurnMintERC677WithCCIPAdmin;

      // Use the provided CCIP admin address or default to the deployer's address
      ccipAdminCalculatedAddress = ccipAdminAddress
        ? ccipAdminAddress
        : signer.address;

      // Validate the CCIP admin address
      if (!hre.ethers.isAddress(ccipAdminCalculatedAddress)) {
        throw new Error(
          `Invalid CCIP admin address: ${ccipAdminCalculatedAddress}`
        );
      }

      // Deploy the BurnMintERC677WithCCIPAdmin contract
      token = (await TokenFactory.deploy(
        name,
        symbol,
        decimals,
        maxSupply
      )) as BurnMintERC677WithCCIPAdmin;
    } else {
      // If no CCIP admin, deploy the BurnMintERC677 contract
      const { BurnMintERC677__factory } = await import("../typechain-types");
      TokenFactory = new BurnMintERC677__factory(signer);
      tokenContractName = TokenContractName.BurnMintERC677;

      // Deploy the token contract with name, symbol, decimals, and maximum supply
      token = (await TokenFactory.deploy(
        name,
        symbol,
        decimals,
        maxSupply
      )) as BurnMintERC677;
    }

    logger.info(`Deploying ${tokenContractName} contract to ${networkName}`);

    try {
      const numberOfConfirmations = networks[networkName]?.confirmations;
      if (numberOfConfirmations === undefined) {
        throw new Error(`confirmations is not defined for ${networkName}`);
      }

      // Wait for the deployment transaction to be confirmed
      logger.info(
        `Waiting ${numberOfConfirmations} blocks for transaction ${
          token.deploymentTransaction()?.hash
        } to be confirmed...`
      );
      await token.deploymentTransaction()?.wait(numberOfConfirmations);

      const tokenAddress = await token.getAddress();
      logger.info(`Token deployed to: ${tokenAddress}`);

      // Grant mint and burn roles to the token owner
      const currentOwner = await token.owner();
      logger.info(`Granting mint and burn roles to ${currentOwner}`);
      const tx = await token.grantMintAndBurnRoles(currentOwner);
      await tx.wait(numberOfConfirmations);

      // If using CCIP admin, set the CCIP admin on the token contract
      if (withGetCCIPAdmin) {
        const ccipToken = token as BurnMintERC677WithCCIPAdmin;
        logger.info(`Set CCIP admin to ${ccipAdminCalculatedAddress}`);
        const tx = await ccipToken.setCCIPAdmin(ccipAdminCalculatedAddress);
        await tx.wait(numberOfConfirmations);
        logger.info(`CCIP admin set to ${currentOwner}`);
      }

      // If verifycontract flag is true, verify the contract on Etherscan
      if (verifyContract) {
        logger.info("Verifying contract...");
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
    } catch (error) {
      logger.error(error);
      throw new Error("Token deployment failed");
    }
  });
