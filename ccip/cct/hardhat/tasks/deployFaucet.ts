import { task } from "hardhat/config";
import { Chains, logger, getEVMNetworkConfig } from "../config";

/**
 * Deploy a Faucet contract for an IBurnMintERC20 token.
 *
 * Example:
 * npx hardhat deployFaucet \
 *   --tokenaddress 0xYourTokenAddress \
 *   --initialdripamount 1000000000000000000 \
 *   --verifycontract true \
 *   --network sepolia
 */
task("deployFaucet", "Deploys the Faucet contract for a given token")
  .setAction(<any>(async (taskArgs: {
    tokenaddress: string;
    initialdripamount: string;
    verifycontract?: boolean;
  }, hre: any) => {
    const { tokenaddress, initialdripamount, verifycontract = false } = taskArgs;
    const networkName = hre.network.name as Chains;

    // ✅ Validate network configuration
    const networkConfig = getEVMNetworkConfig(networkName);
    if (!networkConfig)
      throw new Error(`Network ${networkName} not found in config`);

    // ✅ Validate token address
    if (!hre.viem.isAddress(tokenaddress))
      throw new Error(`Invalid token address: ${tokenaddress}`);

    logger.info(`🚀 Deploying Faucet on ${networkName}`);
    logger.info(`   Token Address: ${tokenaddress}`);
    logger.info(`   Initial Drip Amount: ${initialdripamount}`);

    const [wallet] = await hre.viem.getWalletClients();
    const publicClient = await hre.viem.getPublicClient();

    try {
      // ✅ Deploy Faucet contract
      const { contractAddress, txHash } = await hre.viem.deployContract("Faucet", [
        tokenaddress,
        BigInt(initialdripamount),
      ]);

      logger.info(`⏳ Deployment tx: ${txHash}`);
      const { confirmations } = networkConfig;
      if (confirmations === undefined)
        throw new Error(`confirmations not defined for ${networkName}`);

      await publicClient.waitForTransactionReceipt({ hash: txHash });
      logger.info(`✅ Faucet deployed at: ${contractAddress}`);

      // ✅ Optionally verify contract
      if (verifycontract) {
        logger.info("Verifying Faucet contract...");
        try {
          await hre.run("verify:verify", {
            address: contractAddress,
            constructorArguments: [tokenaddress, initialdripamount],
          });
          logger.info("✅ Faucet verified successfully");
        } catch (error: any) {
          if (error instanceof Error) {
            if (error.message.includes("Already Verified")) {
              logger.warn("Faucet contract already verified");
            } else {
              logger.error(`Verification failed: ${error.message}`);
              logger.warn("Ensure sufficient confirmations before verification");
            }
          } else {
            logger.error("Unknown verification error:");
            logger.error(error);
          }
        }
      } else {
        logger.info("Faucet contract deployed successfully (no verification)");
      }
    } catch (error) {
      logger.error("❌ Faucet deployment failed:", error);
      throw error;
    }
  }));
