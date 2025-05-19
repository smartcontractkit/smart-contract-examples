import { task, types } from "hardhat/config";
import { Chains, networks, TokenContractName, logger } from "../config";
import type { BurnMintERC20 } from "../typechain-types";
import type { ContractFactory } from "ethers";

interface DeployTokenTaskArgs {
  name: string;
  symbol: string;
  decimals: number;
  maxsupply: bigint;
  premint: bigint;
  verifycontract: boolean;
}

// Task to deploy BurnMintERC20 tokens, with optional CCIP admin settings
task("deployToken", "Deploys a token")
  .addParam("name", "The name of the token") // Token name
  .addParam("symbol", "The symbol of the token") // Token symbol
  .addOptionalParam("decimals", "The number of decimals", 18, types.int) // Number of decimals (default: 18)
  .addOptionalParam("maxsupply", "The maximum supply", 0n, types.bigint) // If maxSupply is 0, then the supply is unlimited
  .addOptionalParam("premint", "The initial amount of the token minted to the owner", 0n, types.bigint) // If preMint is 0, then the initial mint amount is 0
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
      maxsupply: maxSupply,
      premint: preMint,
      verifycontract: verifyContract,
    } = taskArgs;

    const networkName = hre.network.name as Chains;

    // Check if network is defined in config
    if (!networks[networkName]) {
      throw new Error(`Network ${networkName} not found in config`);
    }

    let TokenFactory: ContractFactory;
    let tokenContractName: TokenContractName;

    const signer = (await hre.ethers.getSigners())[0]; // Get the signer (deployer)
    let token: BurnMintERC20;

    const { BurnMintERC20__factory } = await import(
      "../typechain-types"
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

      // Grant mint and burn roles to the token owner or the default CCIP admin
      const currentOwner = await token.getCCIPAdmin();
     
      logger.info(`Granting mint and burn roles to ${currentOwner}`);
      const tx = await token.grantMintAndBurnRoles(currentOwner);
      await tx.wait(numberOfConfirmations);

      // If verifycontract flag is true, verify the contract on Etherscan
      if (verifyContract) {
        logger.info("Verifying contract...");
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
    } catch (error) {
      logger.error(error);
      throw new Error("Token deployment failed");
    }
  });
