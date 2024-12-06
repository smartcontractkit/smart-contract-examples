import { task, types } from "hardhat/config";
import {
  Chains,
  networks,
  logger,
  TokenPoolContractName,
  PoolType,
} from "../config";

interface DeployTokenPoolTaskArgs {
  verifycontract: boolean;
  tokenaddress: string;
  pooltype: string; // 'burnMint' or 'lockRelease'
  acceptliquidity?: boolean; // Optional, defaults to false
  localtokendecimals?: number; // Optional, defaults to 18
}

// Task to deploy a Token Pool (BurnMintTokenPool or LockReleaseTokenPool)
task("deployTokenPool", "Deploys a token pool")
  .addParam("tokenaddress", "The address of the token")
  .addOptionalParam(
    "verifycontract",
    "Verify the contract on Blockchain scan",
    false,
    types.boolean
  )
  .addOptionalParam(
    "pooltype",
    "Type of the pool (burnMint or lockRelease)",
    "burnMint",
    types.string
  )
  .addOptionalParam(
    "acceptliquidity",
    "Accept liquidity (only for lockRelease pool)",
    false,
    types.boolean
  )
  .addOptionalParam(
    "localtokendecimals",
    "Local token decimals (defaults to 18)",
    18,
    types.int
  )
  .setAction(async (taskArgs: DeployTokenPoolTaskArgs, hre) => {
    const {
      verifycontract: verifyContract,
      tokenaddress: tokenAddress,
      pooltype: poolType,
      acceptliquidity: acceptLiquidity,
      localtokendecimals: localTokenDecimals = 18, // Default to 18 if not provided
    } = taskArgs;
    const networkName = hre.network.name as Chains;

    // Ensure the network is configured
    const networkConfig = networks[networkName];
    if (!networkConfig) {
      throw new Error(`Network ${networkName} not found in config`);
    }

    // Validate the token address
    if (!tokenAddress || !hre.ethers.isAddress(tokenAddress)) {
      throw new Error(`Invalid token address: ${tokenAddress}`);
    }

    // Extract router and RMN proxy from the network config
    const { router, rmnProxy, confirmations } = networkConfig;
    if (!router || !rmnProxy) {
      throw new Error(`Router or RMN Proxy not defined for ${networkName}`);
    }

    try {
      let tokenPool;
      let tokenPoolAddress: string;
      const constructorArgs: any[] = [];

      if (poolType === PoolType.burnMint) {
        // Load the contract factory for BurnMintTokenPool
        const TokenPoolFactory = await hre.ethers.getContractFactory(
          TokenPoolContractName.BurnMintTokenPool
        );

        // Deploy BurnMintTokenPool with localTokenDecimals
        tokenPool = await TokenPoolFactory.deploy(
          tokenAddress,
          localTokenDecimals,
          [], // Allowlist (empty array)
          rmnProxy,
          router
        );
        constructorArgs.push(
          tokenAddress,
          localTokenDecimals,
          [],
          rmnProxy,
          router
        );
      } else if (poolType === PoolType.lockRelease) {
        // Load the contract factory for LockReleaseTokenPool
        const TokenPoolFactory = await hre.ethers.getContractFactory(
          TokenPoolContractName.LockReleaseTokenPool
        );

        // Set default acceptLiquidity to false if not provided
        const acceptLiquidityValue = acceptLiquidity ?? false;

        // Deploy LockReleaseTokenPool with localTokenDecimals
        tokenPool = await TokenPoolFactory.deploy(
          tokenAddress,
          localTokenDecimals,
          [], // Allowlist (empty array)
          rmnProxy,
          acceptLiquidityValue,
          router
        );
        constructorArgs.push(
          tokenAddress,
          localTokenDecimals,
          [],
          rmnProxy,
          acceptLiquidityValue,
          router
        );
      } else {
        throw new Error(`Invalid poolType: ${poolType}`);
      }

      if (confirmations === undefined) {
        throw new Error(`confirmations is not defined for ${networkName}`);
      }

      // Wait for transaction confirmation
      logger.info(
        `Waiting ${confirmations} blocks for transaction ${
          tokenPool.deploymentTransaction()?.hash
        } to be confirmed...`
      );
      await tokenPool.deploymentTransaction()?.wait(confirmations);

      // Retrieve and log the deployed token pool address
      tokenPoolAddress = await tokenPool.getAddress();
      logger.info(`Token pool deployed to: ${tokenPoolAddress}`);

      if (poolType === PoolType.burnMint) {
        // Grant mint and burn roles to the token pool
        logger.info(
          `Granting mint and burn roles to ${tokenPoolAddress} on token ${tokenAddress}`
        );

        const { BurnMintERC677__factory } = await import("../typechain-types");
        const signer = (await hre.ethers.getSigners())[0];

        // Grant roles on the token contract for the token pool
        const tx = await BurnMintERC677__factory.connect(
          tokenAddress,
          signer
        ).grantMintAndBurnRoles(tokenPoolAddress);
        await tx.wait(confirmations);
      }
      // If the verifyContract option is set, verify the contract on Etherscan
      if (verifyContract) {
        logger.info("Verifying contract...");
        try {
          await hre.run("verify:verify", {
            address: tokenPoolAddress,
            constructorArguments: constructorArgs,
          });
          logger.info("Token pool contract deployed and verified");
        } catch (error) {
          if (error instanceof Error) {
            if (!error.message.includes("Already Verified")) {
              logger.error(error.message);
              logger.warn(
                "Token pool contract deployed but not verified. Ensure you are waiting for enough confirmation blocks"
              );
            } else {
              logger.warn("Token pool contract deployed but already verified");
            }
          } else {
            logger.error(
              "Token pool contract deployed but there was an unknown error while verifying"
            );
            logger.error(error);
          }
        }
      } else {
        logger.info("Token pool contract deployed successfully");
      }
    } catch (error) {
      logger.error(error);
      throw new Error("Token pool deployment failed");
    }
  });
