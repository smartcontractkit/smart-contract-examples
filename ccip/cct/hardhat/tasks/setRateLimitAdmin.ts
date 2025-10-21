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
 * Sets the rate-limit administrator for a TokenPool contract.
 *
 * Example:
 * npx hardhat setRateLimitAdmin \
 *   --pooladdress 0xYourPool \
 *   --adminaddress 0xNewAdmin \
 *   --network sepolia
 */
export const setRateLimitAdmin = task("setRateLimitAdmin", "Sets the rate-limit administrator for a token pool")
  .addOption({
    name: "pooladdress",
    description: "The token pool address",
    defaultValue: "",
  })
  .addOption({
    name: "adminaddress",
    description: "The new rate limit admin address",
    defaultValue: "",
  })
  .setAction(async () => ({
    default: async (
      {
        pooladdress,
        adminaddress,
      }: {
        pooladdress: string;
        adminaddress: string;
      },
      hre: HardhatRuntimeEnvironment
    ) => {
      // Validate required parameters
      if (!pooladdress) {
        throw new Error("Pool address is required (--pooladdress)");
      }

      if (!adminaddress) {
        throw new Error("Admin address is required (--adminaddress)");
      }

      // Connect to network first
      const networkConnection = await hre.network.connect();
      const { viem } = networkConnection;
      const networkName = networkConnection.networkName as Chains;
      const networkConfig = getEVMNetworkConfig(networkName);
      if (!networkConfig) throw new Error(`Network ${networkName} not found`);
      const { confirmations } = networkConfig;
      if (confirmations === undefined)
        throw new Error(`confirmations missing for ${networkName}`);

      // ✅ Validate addresses
      if (!isAddress(pooladdress))
        throw new Error(`Invalid pool address: ${pooladdress}`);
      if (!isAddress(adminaddress))
        throw new Error(`Invalid admin address: ${adminaddress}`);

      const [wallet] = await viem.getWalletClients();
      const publicClient = await viem.getPublicClient();

      try {
        logger.info(`⚙️  Setting rate-limit admin for pool ${pooladdress} on ${networkName}...`);
        logger.info(`   New admin address: ${adminaddress}`);

        // ✅ Connect to TokenPool contract
        const pool = await viem.getContractAt(
          CCIPContractName.TokenPool,
          pooladdress as `0x${string}`
        );

        // ✅ Check if the caller is the pool owner
        const owner = await pool.read.owner();
        const callerAddress = wallet.account.address;
        
        if (callerAddress.toLowerCase() !== owner.toLowerCase()) {
          throw new Error(
            `Unauthorized: Only the pool owner can set the rate limit admin.\n` +
            `Caller: ${callerAddress}\n` +
            `Owner: ${owner}`
          );
        }
        
        logger.info(`   ✅ Caller is the pool owner`);

        // ✅ Send transaction
        const txHash = await pool.write.setRateLimitAdmin(
          [adminaddress as `0x${string}`],
          { account: wallet.account }
        );

        logger.info(`⏳ Rate limit admin update tx: ${txHash}`);
        logger.info(`   Waiting for ${confirmations} confirmation(s)...`);

        await publicClient.waitForTransactionReceipt({ 
          hash: txHash,
          confirmations,
        });

        logger.info(`✅ Rate-limit admin updated successfully`);
        logger.info(`   Transaction: ${txHash}`);

      } catch (error) {
        logger.error("❌ Rate limit admin update failed:", error);
        throw error;
      }
    },
  }))
  .build();
