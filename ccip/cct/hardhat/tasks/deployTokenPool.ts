import { task } from "hardhat/config";
import {
  Chains,
  logger,
  TokenPoolContractName,
  PoolType,
  getEVMNetworkConfig,
} from "../config";
import BurnMintERC20ABI from "@chainlink/contracts/abi/v0.8/shared/BurnMintERC20.abi.json";
import BurnMintTokenPoolABI from "@chainlink/contracts-ccip/abi/BurnMintTokenPool.abi.json";
import LockReleaseTokenPoolABI from "@chainlink/contracts-ccip/abi/LockReleaseTokenPool.abi.json";

/**
 * Deploy a token pool (BurnMintTokenPool or LockReleaseTokenPool)
 *
 * Example:
 * npx hardhat deployTokenPool \
 *   --tokenaddress 0xYourToken \
 *   --pooltype burnMint \
 *   --localtokendecimals 18 \
 *   --verifycontract true \
 *   --network sepolia
 */
task("deployTokenPool", "Deploys a token pool (burnMint or lockRelease)")
  .setAction(<any>(async (taskArgs: {
    verifycontract?: boolean;
    tokenaddress: string;
    pooltype?: string;
    localtokendecimals?: number;
  }, hre: any) => {
    const {
      verifycontract = false,
      tokenaddress,
      pooltype = PoolType.burnMint,
      localtokendecimals = 18,
    } = taskArgs;

    const networkName = hre.network.name as Chains;
    const networkConfig = getEVMNetworkConfig(networkName);
    if (!networkConfig)
      throw new Error(`Network ${networkName} not found in config`);

    // ✅ Validate token address
    if (!hre.viem.isAddress(tokenaddress))
      throw new Error(`Invalid token address: ${tokenaddress}`);

    const { router, rmnProxy, confirmations } = networkConfig;
    if (!router || !rmnProxy)
      throw new Error(`Router or RMN Proxy not defined for ${networkName}`);
    if (confirmations === undefined)
      throw new Error(`confirmations is not defined for ${networkName}`);

    logger.info(`🚀 Deploying ${pooltype} pool on ${networkName}`);
    logger.info(`   Token: ${tokenaddress}`);
    logger.info(`   Decimals: ${localtokendecimals}`);

    const [wallet] = await hre.viem.getWalletClients();
    const publicClient = await hre.viem.getPublicClient();

    const constructorArgs = [
      tokenaddress,
      localtokendecimals,
      [], // allowlist (empty)
      rmnProxy,
      router,
    ];

    try {
      // ✅ Deploy selected pool type
      let contractName: string;
      let abi: any;

      if (pooltype === PoolType.burnMint) {
        contractName = TokenPoolContractName.BurnMintTokenPool;
        abi = BurnMintTokenPoolABI;
      } else if (pooltype === PoolType.lockRelease) {
        contractName = TokenPoolContractName.LockReleaseTokenPool;
        abi = LockReleaseTokenPoolABI;
      } else {
        throw new Error(`Invalid pool type: ${pooltype}`);
      }

      const { contractAddress, txHash } = await hre.viem.deployContract(
        contractName,
        constructorArgs
      );

      logger.info(`⏳ Deployment tx: ${txHash}`);
      await publicClient.waitForTransactionReceipt({ hash: txHash });
      logger.info(`✅ Token pool deployed at: ${contractAddress}`);

      // ✅ Grant mint/burn roles if BurnMint pool
      if (pooltype === PoolType.burnMint) {
        logger.info(
          `Granting mint and burn roles to ${contractAddress} on token ${tokenaddress}`
        );
        const token = await hre.viem.getContractAt({
          address: tokenaddress,
          abi: BurnMintERC20ABI,
        });
        const grantTx = await token.write.grantMintAndBurnRoles(
          [contractAddress],
          { account: wallet.account }
        );
        await publicClient.waitForTransactionReceipt({ hash: grantTx });
        logger.info(`✅ Mint/Burn roles granted`);
      }

      // ✅ Verify contract (optional)
      if (verifycontract) {
        logger.info("Verifying contract...");
        try {
          await hre.run("verify:verify", {
            address: contractAddress,
            constructorArguments: constructorArgs,
          });
          logger.info("✅ Token pool contract deployed and verified");
        } catch (error: any) {
          if (error.message?.includes("Already Verified")) {
            logger.warn("Token pool contract already verified");
          } else {
            logger.error(`Verification failed: ${error.message}`);
          }
        }
      } else {
        logger.info("Token pool contract deployed successfully (no verification)");
      }
    } catch (error) {
      logger.error("❌ Token pool deployment failed:", error);
      throw error;
    }
  }));
