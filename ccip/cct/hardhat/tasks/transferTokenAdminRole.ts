import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types/hre";
import { isAddress, zeroAddress } from "viem";
import {
  Chains,
  CCIPContractName,
  logger,
  getEVMNetworkConfig,
  validateNetworkName,
} from "../config";

/**
 * Transfers the admin role for a token to a new address.
 * The new admin must later call `acceptAdminRole` to complete the process.
 *
 * Example:
 * npx hardhat transferTokenAdminRole \
 *   --tokenaddress 0xYourTokenAddress \
 *   --newadmin 0xNewAdminAddress \
 *   --network sepolia
 */
export const transferTokenAdminRole = task(
  "transferTokenAdminRole",
  "Transfers the token admin role to a new address (pending accept step required)"
)
  .addOption({
    name: "tokenaddress",
    description: "The token address",
    defaultValue: "",
  })
  .addOption({
    name: "newadmin",
    description: "The new admin address",
    defaultValue: "",
  })
  .setAction(async () => ({
    default: async (
      {
        tokenaddress,
        newadmin,
      }: {
        tokenaddress: string;
        newadmin: string;
      },
      hre: HardhatRuntimeEnvironment
    ) => {
      // Validate required parameters
      if (!tokenaddress) {
        throw new Error("Token address is required (--tokenaddress)");
      }
      if (!newadmin) {
        throw new Error("New admin address is required (--newadmin)");
      }

      // Connect to network first
      const networkConnection = await hre.network.connect();
      const { viem } = networkConnection;
      const networkName = validateNetworkName(networkConnection.networkName);

      logger.info(`🔄 Transferring admin role for ${tokenaddress} to ${newadmin} on ${networkName}...`);

      const networkConfig = getEVMNetworkConfig(networkName);
      if (!networkConfig)
        throw new Error(`Network ${networkName} not found in config`);

      // Validate addresses
      if (!isAddress(tokenaddress))
        throw new Error(`Invalid token address: ${tokenaddress}`);
      if (!isAddress(newadmin))
        throw new Error(`Invalid new admin address: ${newadmin}`);

      const { tokenAdminRegistry, confirmations } = networkConfig;
      if (!tokenAdminRegistry)
        throw new Error(`tokenAdminRegistry not defined for ${networkName}`);
      if (confirmations === undefined)
        throw new Error(`confirmations not defined for ${networkName}`);

      // Validate token contract exists
      try {
        const code = await viem.getPublicClient().then(client =>
          client.getBytecode({ address: tokenaddress as `0x${string}` })
        );
        if (!code) {
          throw new Error(`No contract found at ${tokenaddress} on ${networkName}`);
        }
      } catch (error: any) {
        throw new Error(`Failed to validate contract at ${tokenaddress}: ${error.message}`);
      }

      const [wallet] = await viem.getWalletClients();
      const publicClient = await viem.getPublicClient();

      try {
        logger.info(`Using TokenAdminRegistry: ${tokenAdminRegistry}`);

        // Connect to TokenAdminRegistry
        const registry = await viem.getContractAt(
          CCIPContractName.TokenAdminRegistry,
          tokenAdminRegistry as `0x${string}`
        );

        // Check if current wallet is the admin
        logger.info(`Checking if ${wallet.account.address} is the current admin...`);
        const cfg = await registry.read.getTokenConfig([tokenaddress]);
        const currentAdmin = cfg.administrator;
        const pendingAdmin = cfg.pendingAdministrator;

        // Check if admin is zero address
        if (currentAdmin.toLowerCase() === zeroAddress.toLowerCase()) {
          // Check if pending admin is also zero address
          if (pendingAdmin.toLowerCase() === zeroAddress.toLowerCase()) {
            throw new Error(
              `Both current admin and pending admin are zero addresses.\nNo admin has been claimed yet for this token.\nYou need to:\n1. Call claimAdmin first to claim the admin role\n2. Then call acceptAdminRole to accept it`
            );
          }
          throw new Error(
            `Current admin is zero address (${currentAdmin}).\nLooks like the claimed admin hasn't accepted the admin role yet.\nThe pending admin (${pendingAdmin}) needs to call acceptAdminRole first.`
          );
        }

        if (currentAdmin.toLowerCase() !== wallet.account.address.toLowerCase()) {
          throw new Error(
            `Current wallet ${wallet.account.address} is NOT the token admin.\nCurrent admin: ${currentAdmin}\nOnly the current admin can transfer the role.`
          );
        }

        logger.info(`✅ Current wallet ${wallet.account.address} is the admin`);

        // Execute transaction
        const txHash = await registry.write.transferAdminRole(
          [tokenaddress, newadmin],
          { account: wallet.account.address }
        );

        logger.info(`📤 TX sent: ${txHash}. Waiting for ${confirmations} confirmations...`);

        await publicClient.waitForTransactionReceipt({ hash: txHash, confirmations });

        logger.info(
          `✅ Admin role transfer initiated for ${tokenaddress} on ${networkName} (${confirmations} confirmations)`
        );
        logger.info(`ℹ️  New admin (${newadmin}) must call acceptAdminRole to complete the transfer.`);
      } catch (error: any) {
        logger.error(`❌ Failed to transfer admin role: ${error?.message || String(error)}`);
        throw error;
      }
    },
  }))
  .build();
