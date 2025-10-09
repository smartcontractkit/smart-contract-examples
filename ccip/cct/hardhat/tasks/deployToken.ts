import { task } from "hardhat/config";
import {
  Chains,
  TokenContractName,
  logger,
  getEVMNetworkConfig,
} from "../config";
import BurnMintERC20ABI from "@chainlink/contracts/abi/v0.8/shared/BurnMintERC20.abi.json";

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
 *   --verifycontract true \
 *   --network sepolia
 */
task("deployToken", "Deploys a BurnMintERC20 token with optional verification")
  .setAction(<any>(async (taskArgs: {
    name?: string;
    symbol?: string;
    decimals?: number;
    maxsupply?: bigint;
    premint?: bigint;
    verifycontract?: boolean;
  }, hre: any) => {
    const {
      name = "MyToken",
      symbol = "MTK",
      decimals = 18,
      maxsupply = 0n,
      premint = 0n,
      verifycontract = false,
    } = taskArgs;

    const networkName = hre.network.name as Chains;
    const evmNetworkConfig = getEVMNetworkConfig(networkName);
    if (!evmNetworkConfig)
      throw new Error(`Network ${networkName} not found in config`);

    logger.info(`🚀 Deploying ${TokenContractName.BurnMintERC20} to ${networkName}...`);
    logger.info(`   name: ${name}, symbol: ${symbol}`);

    const [wallet] = await hre.viem.getWalletClients();
    const publicClient = await hre.viem.getPublicClient();

    try {
      // ✅ Deploy contract
      const { contractAddress, txHash } = await hre.viem.deployContract(
        TokenContractName.BurnMintERC20,
        [name, symbol, decimals, maxsupply, premint]
      );

      logger.info(`⏳ Deployment tx: ${txHash}`);

      const { confirmations } = evmNetworkConfig;
      if (confirmations === undefined)
        throw new Error(`confirmations not defined for ${networkName}`);

      await publicClient.waitForTransactionReceipt({ hash: txHash });
      logger.info(`✅ Token deployed at: ${contractAddress}`);

      // ✅ Connect to token contract for post-deploy setup
      const token = await hre.viem.getContractAt({
        address: contractAddress,
        abi: BurnMintERC20ABI,
      });

      // Grant mint/burn roles to CCIP admin
      const currentAdmin = await token.read.getCCIPAdmin();
      logger.info(`Granting mint and burn roles to ${currentAdmin}...`);
      const roleTx = await token.write.grantMintAndBurnRoles([currentAdmin], {
        account: wallet.account,
      });
      await publicClient.waitForTransactionReceipt({ hash: roleTx });
      logger.info(`✅ Mint/Burn roles granted.`);

      // ✅ Verify contract if requested
      if (verifycontract) {
        logger.info("Verifying contract on Etherscan...");
        try {
          await hre.run("verify:verify", {
            address: contractAddress,
            constructorArguments: [name, symbol, decimals, maxsupply, premint],
          });
          logger.info("✅ Token contract verified successfully");
        } catch (error: any) {
          if (error.message?.includes("Already Verified")) {
            logger.warn("Token contract already verified");
          } else {
            logger.error(`Verification failed: ${error.message}`);
          }
        }
      } else {
        logger.info("Token contract deployed successfully (no verification)");
      }
    } catch (error) {
      logger.error("❌ Token deployment failed:", error);
      throw error;
    }
  }));
