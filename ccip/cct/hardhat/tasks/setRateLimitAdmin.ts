import { task } from "hardhat/config";
import { Chains, logger, getEVMNetworkConfig } from "../config";
import TokenPoolABI from "@chainlink/contracts-ccip/abi/TokenPool.abi.json";

/**
 * Sets the rate-limit administrator for a TokenPool contract.
 *
 * Example:
 * npx hardhat setRateLimitAdmin \
 *   --pooladdress 0xYourPool \
 *   --adminaddress 0xNewAdmin \
 *   --network sepolia
 */
task("setRateLimitAdmin", "Sets the rate-limit administrator for a token pool")
  .setAction(<any>(async (taskArgs: { pooladdress: string; adminaddress: string }, hre: any) => {
    const { pooladdress, adminaddress } = taskArgs;
    const networkName = hre.network.name as Chains;

    // ✅ Ensure network configuration exists
    const networkConfig = getEVMNetworkConfig(networkName);
    if (!networkConfig)
      throw new Error(`Network ${networkName} not found in config`);

    // ✅ Validate addresses
    if (!hre.viem.isAddress(pooladdress))
      throw new Error(`Invalid pool address: ${pooladdress}`);
    if (!hre.viem.isAddress(adminaddress))
      throw new Error(`Invalid admin address: ${adminaddress}`);

    const { confirmations } = networkConfig;
    if (confirmations === undefined)
      throw new Error(`confirmations not defined for ${networkName}`);

    // ✅ Wallet + public client
    const [wallet] = await hre.viem.getWalletClients();
    const publicClient = await hre.viem.getPublicClient();

    logger.info(
      `Setting rate-limit admin to ${adminaddress} for pool ${pooladdress} on ${networkName}`
    );

    // ✅ Connect to TokenPool contract
    const pool = await hre.viem.getContractAt({
      address: pooladdress,
      abi: TokenPoolABI,
    });

    // ✅ Send transaction
    const txHash = await pool.write.setRateLimitAdmin([adminaddress], {
      account: wallet.account,
    });

    logger.info(`⏳ Tx sent: ${txHash}`);
    logger.info(`Waiting for ${confirmations} confirmations...`);

    await publicClient.waitForTransactionReceipt({ hash: txHash });
    logger.info(`✅ Rate-limit admin updated successfully (tx: ${txHash})`);
  }));
