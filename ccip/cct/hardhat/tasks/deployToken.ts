import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types/hre";
import { verifyContract } from "@nomicfoundation/hardhat-verify/verify";
import {
  Chains,
  TokenContractName,
  logger,
  getEVMNetworkConfig,
  validateNetworkName,
} from "../config";

/**
 * Task to deploy a BurnMintERC20 token with optional verification.
 *
 * Example:
 * npx hardhat deployToken \
 *   --name MyToken \
 *   --symbol MTK \
 *   --decimals 18 \
 *   --maxsupply 1000000 \
 *   --premint 50000 \
 *   --verifycontract \
 *   --network sepolia
 */
export const deployToken = task("deployToken", "Deploys a BurnMintERC20 token with optional verification")
  .addOption({
    name: "name",
    description: "The token name",
    defaultValue: "MyToken",
  })
  .addOption({
    name: "symbol",
    description: "The token symbol",
    defaultValue: "MTK",
  })
  .addOption({
    name: "decimals",
    description: "The number of decimals",
    defaultValue: "18", // CLI args are strings
  })
  .addOption({
    name: "maxsupply",
    description: "Maximum supply (0 for unlimited)",
    defaultValue: "0",
  })
  .addOption({
    name: "premint",
    description: "Initial premint amount",
    defaultValue: "0",
  })
  .addFlag({
    name: "verifycontract",
    description: "Verify the contract on Etherscan",
  })
  .setAction(async () => ({
    default: async (
      {
        name = "MyToken",
        symbol = "MTK",
        decimals = "18",
        maxsupply = "0",
        premint = "0",
        verifycontract = false,
      }: {
        name?: string;
        symbol?: string;
        decimals?: string;
        maxsupply?: string;
        premint?: string;
        verifycontract?: boolean;
      },
      hre: HardhatRuntimeEnvironment
    ) => {
      // Connect to network first to get network connection details
      const networkConnection = await hre.network.connect();
      const { viem } = networkConnection;
      const networkName = validateNetworkName(networkConnection.networkName);

      const evmNetworkConfig = getEVMNetworkConfig(networkName);
      if (!evmNetworkConfig)
        throw new Error(`Network ${networkName} not found in config`);

      logger.info(`🚀 Deploying ${TokenContractName.BurnMintERC20} to ${networkName}...`);
      logger.info(`   name: ${name}, symbol: ${symbol}`);
      const [wallet] = await viem.getWalletClients();
      const publicClient = await viem.getPublicClient();

      // ✅ Convert string CLI arguments to correct types
      const decimalsNum = Number(decimals);
      const maxSupplyBig = BigInt(maxsupply);
      const premintBig = BigInt(premint);

      try {
        // ✅ Deploy contract
        const constructorArgs = Array<any>([
          name,
          symbol,
          decimalsNum,
          maxSupplyBig,
          premintBig
        ]);

        const { contract, deploymentTransaction } = await viem.sendDeploymentTransaction(
          TokenContractName.BurnMintERC20,
          ...constructorArgs
        );

        logger.info(`⏳ Deployment tx: ${deploymentTransaction.hash}`);

        const { confirmations } = evmNetworkConfig;
        if (confirmations === undefined)
          throw new Error(`confirmations not defined for ${networkName}`);

        logger.info(`   Waiting for ${confirmations} confirmation(s)...`);
        await publicClient.waitForTransactionReceipt({
          hash: deploymentTransaction.hash,
          confirmations,
        });
        logger.info(`✅ Token deployed at: ${contract.address}`);

        // ✅ Connect to token contract for post-deploy setup
        const token = await viem.getContractAt(TokenContractName.BurnMintERC20, contract.address);

        // Grant mint/burn roles to CCIP admin
        const currentAdmin = await token.read.getCCIPAdmin();
        logger.info(`Granting mint and burn roles to ${currentAdmin}...`);
        const roleTx = await token.write.grantMintAndBurnRoles([currentAdmin], {
          account: wallet.account,
        });
        logger.info(`   Waiting for ${confirmations} confirmation(s)...`);
        await publicClient.waitForTransactionReceipt({
          hash: roleTx,
          confirmations,
        });
        logger.info(`✅ Mint/Burn roles granted.`);

        // ✅ Verify contract if requested
        if (verifycontract) {
          logger.info("Verifying contract...");

          try {
            const isVerified = await verifyContract(
              {
                address: contract.address,
                constructorArgs: constructorArgs.flat(),
              },
              hre,
            );

            if (isVerified) {
              logger.info("✅ Token contract verified successfully");
            } else {
              logger.warn("Token contract verification failed");
            }
          } catch (error: any) {
            if (error.message?.includes("Already Verified")) {
              logger.warn("Token contract already verified");
            } else {
              logger.error(`Verification failed: ${error.message}`);
            }
          }
        } else {
          logger.info("✅ Token contract deployed successfully (no verification)");
        }
      } catch (error) {
        logger.error("❌ Token deployment failed:", error);
        throw error;
      }
    },
  }))
  .build();
