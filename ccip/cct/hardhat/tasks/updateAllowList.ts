import { task } from "hardhat/config";
import { Chains, logger, getEVMNetworkConfig } from "../config";
import TokenPoolABI from "@chainlink/contracts-ccip/abi/TokenPool.abi.json";

/**
 * Updates the allow list for a TokenPool contract.
 *
 * Example:
 * npx hardhat updateAllowList \
 *   --pooladdress 0xYourPoolAddress \
 *   --addaddresses 0x1111...,0x2222... \
 *   --removeaddresses 0x3333...,0x4444... \
 *   --network sepolia
 */
task("updateAllowList", "Updates the allow list for a token pool (add or remove addresses)")
  .setAction(<any>(async (taskArgs: {
    pooladdress: string;
    addaddresses?: string;
    removeaddresses?: string;
  }, hre: any) => {
    const { pooladdress, addaddresses = "", removeaddresses = "" } = taskArgs;
    const networkName = hre.network.name as Chains;

    // ✅ Retrieve network configuration
    const networkConfig = getEVMNetworkConfig(networkName);
    if (!networkConfig)
      throw new Error(`Network ${networkName} not found in config`);

    // ✅ Validate pool address
    if (!hre.viem.isAddress(pooladdress))
      throw new Error(`Invalid pool address: ${pooladdress}`);

    // ✅ Parse & validate address lists
    const addressesToAdd = addaddresses
      ? addaddresses.split(",").map((a) => a.trim()).filter(Boolean)
      : [];
    const addressesToRemove = removeaddresses
      ? removeaddresses.split(",").map((a) => a.trim()).filter(Boolean)
      : [];

    for (const addr of [...addressesToAdd, ...addressesToRemove]) {
      if (!hre.viem.isAddress(addr))
        throw new Error(`Invalid address in list: ${addr}`);
    }

    // ✅ Wallet & client
    const [wallet] = await hre.viem.getWalletClients();
    const publicClient = await hre.viem.getPublicClient();

    // ✅ Connect to TokenPool contract
    const pool = await hre.viem.getContractAt({
      address: pooladdress,
      abi: TokenPoolABI,
    });

    // ✅ Ensure allow-list feature is enabled
    const allowListEnabled = await pool.read.getAllowListEnabled();
    if (!allowListEnabled)
      throw new Error("Allow list is not enabled for this pool");

    // ✅ Log intended operations
    logger.info(`Updating allow list for pool ${pooladdress}`);
    if (addressesToAdd.length)
      logger.info(`Adding: ${addressesToAdd.join(", ")}`);
    if (addressesToRemove.length)
      logger.info(`Removing: ${addressesToRemove.join(", ")}`);

    // ✅ Execute transaction
    const txHash = await pool.write.applyAllowListUpdates(
      [addressesToRemove, addressesToAdd],
      { account: wallet.account }
    );

    const { confirmations } = networkConfig;
    if (confirmations === undefined)
      throw new Error(`confirmations not defined for ${networkName}`);

    logger.info(`⏳ Tx sent: ${txHash}`);
    logger.info(`Waiting for ${confirmations} confirmations...`);
    await publicClient.waitForTransactionReceipt({ hash: txHash });

    logger.info(`✅ Allow list updated successfully (tx: ${txHash})`);
  }));
