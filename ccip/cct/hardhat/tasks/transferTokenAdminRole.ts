import { task } from "hardhat/config";
import { Chains, logger, getEVMNetworkConfig } from "../config";
import TokenAdminRegistryABI from "@chainlink/contracts-ccip/abi/TokenAdminRegistry.abi.json";

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
task(
  "transferTokenAdminRole",
  "Transfers the token admin role to a new address (pending accept step required)"
).setAction(<any>(async (taskArgs: { tokenaddress: string; newadmin: string }, hre: any) => {
  const { tokenaddress, newadmin } = taskArgs;
  const networkName = hre.network.name as Chains;

  // ✅ Get network configuration
  const networkConfig = getEVMNetworkConfig(networkName);
  if (!networkConfig)
    throw new Error(`Network ${networkName} not found in config`);

  const { tokenAdminRegistry, confirmations } = networkConfig;
  if (!tokenAdminRegistry)
    throw new Error(`tokenAdminRegistry not defined for ${networkName}`);
  if (confirmations === undefined)
    throw new Error(`confirmations not defined for ${networkName}`);

  // ✅ Validate addresses
  if (!hre.viem.isAddress(tokenaddress))
    throw new Error(`Invalid token address: ${tokenaddress}`);
  if (!hre.viem.isAddress(newadmin))
    throw new Error(`Invalid new admin address: ${newadmin}`);

  // ✅ Wallet + public client
  const [wallet] = await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();

  logger.info(`Transferring admin role for token ${tokenaddress} to ${newadmin}`);
  logger.info(`Using registry: ${tokenAdminRegistry}`);

  // ✅ Connect to TokenAdminRegistry
  const registry = await hre.viem.getContractAt({
    address: tokenAdminRegistry,
    abi: TokenAdminRegistryABI,
  });

  // ✅ Execute transaction
  const txHash = await registry.write.transferAdminRole(
    [tokenaddress, newadmin],
    { account: wallet.account }
  );

  logger.info(`⏳ Transaction sent: ${txHash}`);
  logger.info(`Waiting for ${confirmations} confirmations...`);

  await publicClient.waitForTransactionReceipt({ hash: txHash });

  logger.info("✅ Admin role transfer initiated successfully.");
  logger.info(`ℹ️  New admin (${newadmin}) must call acceptAdminRole to complete the transfer.`);
}));
