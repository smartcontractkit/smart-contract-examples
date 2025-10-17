import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types/hre";
import { isAddress } from "viem";
import {
  Chains,
  CCIPContractName,
  logger,
  getEVMNetworkConfig,
} from "../config";

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
export const updateAllowList = task("updateAllowList", "Updates the allow list for a token pool (add or remove addresses)")
  .addOption({
    name: "pooladdress",
    description: "The token pool address",
    defaultValue: "",
  })
  .addOption({
    name: "addaddresses",
    description: "Comma-separated list of addresses to add to allowlist",
    defaultValue: "",
  })
  .addOption({
    name: "removeaddresses",
    description: "Comma-separated list of addresses to remove from allowlist",
    defaultValue: "",
  })
  .setAction(async () => ({
    default: async (
      {
        pooladdress,
        addaddresses = "",
        removeaddresses = "",
      }: {
        pooladdress: string;
        addaddresses?: string;
        removeaddresses?: string;
      },
      hre: HardhatRuntimeEnvironment
    ) => {
      // Validate pool address is provided
      if (!pooladdress) {
        throw new Error("Pool address is required (--pooladdress)");
      }

      // Check if at least one operation is requested
      if (!addaddresses && !removeaddresses) {
        throw new Error("At least one of --addaddresses or --removeaddresses must be provided");
      }

      // Connect to network first
      const networkConnection = await hre.network.connect();
      const { viem } = networkConnection;
      const networkName = networkConnection.networkName as Chains;

      // ✅ Retrieve network configuration
      const networkConfig = getEVMNetworkConfig(networkName);
      if (!networkConfig)
        throw new Error(`Network ${networkName} not found in config`);

      // ✅ Validate pool address
      if (!isAddress(pooladdress))
        throw new Error(`Invalid pool address: ${pooladdress}`);

      // ✅ Parse & validate address lists
      const addressesToAdd = addaddresses
        ? addaddresses.split(",").map((a) => a.trim()).filter(Boolean)
        : [];
      const addressesToRemove = removeaddresses
        ? removeaddresses.split(",").map((a) => a.trim()).filter(Boolean)
        : [];

      for (const addr of [...addressesToAdd, ...addressesToRemove]) {
        if (!isAddress(addr))
          throw new Error(`Invalid address in list: ${addr}`);
      }

      const { confirmations } = networkConfig;
      if (confirmations === undefined)
        throw new Error(`confirmations not defined for ${networkName}`);

      const [wallet] = await viem.getWalletClients();
      const publicClient = await viem.getPublicClient();

      try {
        logger.info(`🔐 Updating allow list for pool ${pooladdress} on ${networkName}...`);
        if (addressesToAdd.length)
          logger.info(`   Adding: ${addressesToAdd.join(", ")}`);
        if (addressesToRemove.length)
          logger.info(`   Removing: ${addressesToRemove.join(", ")}`);

        // ✅ Connect to TokenPool contract
        const pool = await viem.getContractAt(
          CCIPContractName.TokenPool,
          pooladdress as `0x${string}`
        );

        // ✅ Ensure allow-list feature is enabled
        const allowListEnabled = await (pool as any).read.getAllowListEnabled();
        if (!allowListEnabled)
          throw new Error("Allow list is not enabled for this pool");

        logger.info(`   Allow list is enabled`);

        // ✅ Execute transaction - cast addresses to proper type
        const addressesToAddTyped = addressesToAdd as `0x${string}`[];
        const addressesToRemoveTyped = addressesToRemove as `0x${string}`[];

        const txHash = await (pool as any).write.applyAllowListUpdates(
          [addressesToRemoveTyped, addressesToAddTyped],
          { account: wallet.account }
        );

        logger.info(`⏳ Allow list update tx: ${txHash}`);
        logger.info(`   Waiting for ${confirmations} confirmation(s)...`);
        await publicClient.waitForTransactionReceipt({ 
          hash: txHash,
          confirmations,
        });

        logger.info(`✅ Allow list updated successfully`);
        logger.info(`   Transaction: ${txHash}`);
        if (addressesToAdd.length)
          logger.info(`   Added ${addressesToAdd.length} address(es)`);
        if (addressesToRemove.length)
          logger.info(`   Removed ${addressesToRemove.length} address(es)`);

      } catch (error) {
        logger.error("❌ Allow list update failed:", error);
        throw error;
      }
    },
  }))
  .build();
