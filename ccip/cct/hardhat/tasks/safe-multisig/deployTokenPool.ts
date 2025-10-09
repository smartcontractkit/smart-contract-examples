import { task } from "hardhat/config";
import { Chains, logger, getEVMNetworkConfig } from "../../config";
import BurnMintTokenPoolABI from "@chainlink/contracts-ccip/abi/BurnMintTokenPool.abi.json";

/**
 * Deploys a BurnMintTokenPool contract and transfers ownership to a Safe multisig.
 *
 * Example:
 * npx hardhat deployTokenPoolWithSafe \
 *   --tokenaddress 0xYourToken \
 *   --safeaddress 0xYourSafe \
 *   --localtokendecimals 18 \
 *   --verifycontract true \
 *   --network sepolia
 */
task(
  "deployTokenPoolWithSafe",
  "Deploy a BurnMintTokenPool and transfer ownership to a Safe"
).setAction(<any>(async (taskArgs: {
  tokenaddress: string;
  safeaddress: string;
  verifycontract?: boolean;
  localtokendecimals?: number;
}, hre: any) => {
  const {
    tokenaddress,
    safeaddress,
    verifycontract = false,
    localtokendecimals = 18,
  } = taskArgs;

  const networkName = hre.network.name as Chains;

  // ✅ Validate network config
  const networkConfig = getEVMNetworkConfig(networkName);
  if (!networkConfig)
    throw new Error(`Network ${networkName} not found in config`);

  // ✅ Validate addresses
  if (!hre.viem.isAddress(tokenaddress))
    throw new Error(`Invalid token address: ${tokenaddress}`);
  if (!hre.viem.isAddress(safeaddress))
    throw new Error(`Invalid Safe address: ${safeaddress}`);

  const { router, rmnProxy, confirmations } = networkConfig;
  if (!router || !rmnProxy)
    throw new Error(`Router or RMN Proxy not defined for ${networkName}`);
  if (confirmations === undefined)
    throw new Error(`confirmations not defined for ${networkName}`);

  const [wallet] = await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();

  logger.info(`🚀 Deploying BurnMintTokenPool on ${networkName}`);
  logger.info(`Token: ${tokenaddress}`);
  logger.info(`Safe:  ${safeaddress}`);
  logger.info(`Decimals: ${localtokendecimals}`);

  try {
    // ✅ Deploy contract
    const { contractAddress, txHash } = await hre.viem.deployContract(
      "BurnMintTokenPool",
      [tokenaddress, localtokendecimals, [], rmnProxy, router]
    );

    logger.info(`⏳ Deployment tx: ${txHash}`);
    await publicClient.waitForTransactionReceipt({ hash: txHash });
    logger.info(`✅ TokenPool deployed at: ${contractAddress}`);

    // ✅ Optional verification
    if (verifycontract) {
      logger.info("Verifying contract on Etherscan...");
      try {
        await hre.run("verify:verify", {
          address: contractAddress,
          constructorArguments: [
            tokenaddress,
            localtokendecimals,
            [],
            rmnProxy,
            router,
          ],
        });
        logger.info("✅ TokenPool contract verified successfully");
      } catch (err: any) {
        if (err.message?.includes("Already Verified")) {
          logger.warn("Already verified on Etherscan");
        } else {
          logger.error(`Verification failed: ${err.message}`);
        }
      }
    }

    // ✅ Transfer ownership to Safe
    logger.info(`Transferring ownership to Safe: ${safeaddress}`);
    const pool = await hre.viem.getContractAt({
      address: contractAddress,
      abi: BurnMintTokenPoolABI,
    });

    const transferTx = await pool.write.transferOwnership(
      [safeaddress],
      { account: wallet.account }
    );
    await publicClient.waitForTransactionReceipt({ hash: transferTx });

    logger.info(`✅ Ownership transferred to Safe at ${safeaddress}`);
  } catch (error) {
    logger.error("❌ TokenPool deployment failed:", error);
    throw error;
  }
}));
