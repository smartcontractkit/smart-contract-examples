import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types/hre";
import { isAddress, zeroAddress } from "viem";
import {
  Chains,
  CCIPContractName,
  logger,
  getEVMNetworkConfig,
} from "../config";

/**
 * Links a token with its corresponding pool in the TokenAdminRegistry contract.
 *
 * Example usage:
 * npx hardhat setPool \
 *   --tokenaddress 0xYourToken \
 *   --pooladdress 0xYourPool \
 *   --network sepolia
 */
export const setPool = task("setPool", "Links a token with its pool in the TokenAdminRegistry contract")
  .addOption({
    name: "tokenaddress",
    description: "The token address",
    defaultValue: "",
  })
  .addOption({
    name: "pooladdress",
    description: "The pool address",
    defaultValue: "",
  })
  .setAction(async () => ({
    default: async (
      {
        tokenaddress,
        pooladdress,
      }: {
        tokenaddress: string;
        pooladdress: string;
      },
      hre: HardhatRuntimeEnvironment
    ) => {
      // Validate required parameters
      if (!tokenaddress) {
        throw new Error("Token address is required (--tokenaddress)");
      }
      if (!pooladdress) {
        throw new Error("Pool address is required (--pooladdress)");
      }

      // Connect to network first
      const networkConnection = await hre.network.connect();
      const { viem } = networkConnection;
      const networkName = networkConnection.networkName as Chains;

      logger.info(`🔗 Setting pool for token ${tokenaddress} on ${networkName}...`);

      const networkConfig = getEVMNetworkConfig(networkName);
      if (!networkConfig)
        throw new Error(`Network ${networkName} not found in config`);

      // Validate addresses
      if (!isAddress(tokenaddress))
        throw new Error(`Invalid token address: ${tokenaddress}`);
      if (!isAddress(pooladdress))
        throw new Error(`Invalid pool address: ${pooladdress}`);

      const { tokenAdminRegistry, confirmations } = networkConfig;
      if (!tokenAdminRegistry)
        throw new Error(`tokenAdminRegistry not defined for ${networkName}`);
      if (confirmations === undefined)
        throw new Error(`confirmations not defined for ${networkName}`);

      // Validate token contract exists
      try {
        const publicClient = await viem.getPublicClient();
        const code = await publicClient.getCode({ address: tokenaddress as `0x${string}` });
        if (!code) {
          throw new Error(`No contract found at ${tokenaddress} on ${networkName}`);
        }
      } catch (error: any) {
        throw new Error(`Failed to validate token contract at ${tokenaddress}: ${error.message}`);
      }

      // Validate pool contract exists
      try {
        const publicClient = await viem.getPublicClient();
        const code = await publicClient.getCode({ address: pooladdress as `0x${string}` });
        if (!code) {
          throw new Error(`No contract found at ${pooladdress} on ${networkName}`);
        }
      } catch (error: any) {
        throw new Error(`Failed to validate pool contract at ${pooladdress}: ${error.message}`);
      }

      const [wallet] = await viem.getWalletClients();
      const publicClient = await viem.getPublicClient();

      try {
        logger.info(`🔹 Using signer: ${wallet.account.address}`);
        logger.info(`Using TokenAdminRegistry: ${tokenAdminRegistry}`);

        // Connect to TokenAdminRegistry
        const registry = await viem.getContractAt(
          CCIPContractName.TokenAdminRegistry,
          tokenAdminRegistry as `0x${string}`
        );

        // Fetch token configuration
        logger.info(`Checking token configuration for ${tokenaddress}...`);
        const config = await registry.read.getTokenConfig([tokenaddress]);
        const tokenAdministratorAddress = config.administrator;
        const pendingAdmin = config.pendingAdministrator;

        logger.info(`Token ${tokenaddress} current admin: ${tokenAdministratorAddress}`);

        // Check if admin is zero address
        if (tokenAdministratorAddress.toLowerCase() === zeroAddress.toLowerCase()) {
          // Check if pending admin is also zero address
          if (pendingAdmin.toLowerCase() === zeroAddress.toLowerCase()) {
            throw new Error(
              `Both current admin and pending admin are zero addresses.\nNo admin has been claimed yet for this token.\nYou need to:\n1. Call claimAdmin first to claim the admin role\n2. Then call acceptAdminRole to accept it`
            );
          }
          throw new Error(
            `Current admin is zero address (${tokenAdministratorAddress}).\nLooks like the claimed admin hasn't accepted the admin role yet.\nThe pending admin (${pendingAdmin}) needs to call acceptAdminRole first.`
          );
        }

        // Ensure signer is token administrator
        if (tokenAdministratorAddress.toLowerCase() !== wallet.account.address.toLowerCase()) {
          throw new Error(
            `Current wallet ${wallet.account.address} is NOT the token administrator.\nCurrent admin: ${tokenAdministratorAddress}\nOnly the token administrator can set the pool.`
          );
        }

        logger.info(`✅ Current wallet ${wallet.account.address} is the token administrator`);
        logger.info(`Setting pool ${pooladdress} for token ${tokenaddress}...`);

        // Execute transaction
        const txHash = await registry.write.setPool(
          [tokenaddress, pooladdress],
          { account: wallet.account.address }
        );

        logger.info(`📤 TX sent: ${txHash}. Waiting for ${confirmations} confirmations...`);

        await publicClient.waitForTransactionReceipt({ hash: txHash, confirmations });

        logger.info(
          `✅ Pool successfully set for token ${tokenaddress} → ${pooladdress} on ${networkName} (${confirmations} confirmations)`
        );
      } catch (error: any) {
        logger.error(`❌ Failed to set pool: ${error?.message || String(error)}`);
        throw error;
      }
    },
  }))
  .build();
