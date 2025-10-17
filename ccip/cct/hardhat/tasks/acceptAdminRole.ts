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
 * Accepts the admin role for a token with a pending administrator.
 *
 * Example:
 * npx hardhat acceptAdminRole --tokenaddress 0x1234... --network sepolia
 */
export const acceptAdminRole = task("acceptAdminRole", "Accepts the admin role for a token with a pending admin")
  .addOption({
    name: "tokenaddress",
    description: "The token address",
    defaultValue: "",
  })
  .setAction(async () => ({
    default: async (
      {
        tokenaddress,
      }: {
        tokenaddress: string;
      },
      hre: HardhatRuntimeEnvironment
    ) => {
      // Validate token address is provided
      if (!tokenaddress) {
        throw new Error("Token address is required (--tokenaddress)");
      }

      // Connect to network first
      const networkConnection = await hre.network.connect();
      const { viem } = networkConnection;
      const networkName = networkConnection.networkName as Chains;

      logger.info(`🔄 Accepting admin role for ${tokenaddress} on ${networkName}...`);

      const networkConfig = getEVMNetworkConfig(networkName);
      if (!networkConfig)
        throw new Error(`Network ${networkName} not found in config`);

      // Validate token address format
      if (!isAddress(tokenaddress))
        throw new Error(`Invalid token address: ${tokenaddress}`);

      const { tokenAdminRegistry, confirmations } = networkConfig;
      if (!tokenAdminRegistry)
        throw new Error(`tokenAdminRegistry missing for ${networkName}`);
      if (confirmations === undefined)
        throw new Error(`confirmations not defined for ${networkName}`);

      // Validate contract exists
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
        // Connect to TokenAdminRegistry contract
        const registry = await viem.getContractAt(
          CCIPContractName.TokenAdminRegistry,
          tokenAdminRegistry as `0x${string}`
        );

        logger.info(`Checking pending admin for ${tokenaddress}...`);

        // Retrieve pending admin
        const cfg = await (registry as any).read.getTokenConfig([tokenaddress]);
        const pendingAdmin = cfg.pendingAdministrator;

        if (pendingAdmin.toLowerCase() !== wallet.account.address.toLowerCase()) {
          throw new Error(
            `Only pending admin can accept.\nPending admin: ${pendingAdmin}\nCurrent wallet: ${wallet.account.address}`
          );
        }

        logger.info(`✅ Current wallet ${wallet.account.address} is the pending admin`);
        logger.info(`Accepting admin role...`);

        // Send transaction to accept admin role
        const txHash = await (registry as any).write.acceptAdminRole(
          [tokenaddress],
          { account: wallet.account.address }
        );

        logger.info(`📤 TX sent: ${txHash}. Waiting for ${confirmations} confirmations...`);

        await publicClient.waitForTransactionReceipt({ hash: txHash, confirmations });

        logger.info(
          `✅ Admin role accepted for ${tokenaddress} on ${networkName} (${confirmations} confirmations)`
        );
      } catch (error: any) {
        logger.error(`❌ Failed to accept admin role: ${error?.message || String(error)}`);
        throw error;
      }
    },
  }))
  .build();
