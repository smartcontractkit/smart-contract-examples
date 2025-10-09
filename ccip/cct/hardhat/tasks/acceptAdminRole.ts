import { task } from "hardhat/config";
import { Chains, logger, getEVMNetworkConfig } from "../config";
import TokenAdminRegistryABI from "@chainlink/contracts-ccip/abi/TokenAdminRegistry.abi.json";

/**
 * Accepts the admin role for a token with a pending administrator.
 *
 * Example:
 * npx hardhat acceptAdminRole --tokenaddress 0x1234... --network sepolia
 */
task("acceptAdminRole", "Accepts the admin role for a token with a pending admin")
  .setAction(<any>(async (taskArgs: { tokenaddress: string }, hre: any) => {
    const { tokenaddress } = taskArgs;
    const networkName = hre.network.name as Chains;

    // ✅ Retrieve network configuration
    const networkConfig = getEVMNetworkConfig(networkName);
    if (!networkConfig) throw new Error(`Network ${networkName} not found in config`);
    if (!hre.viem.isAddress(tokenaddress))
      throw new Error(`Invalid token address: ${tokenaddress}`);

    const { tokenAdminRegistry, confirmations } = networkConfig;
    if (!tokenAdminRegistry || confirmations === undefined)
      throw new Error(`Missing registry or confirmations for ${networkName}`);

    // ✅ Wallet + public client
    const [wallet] = await hre.viem.getWalletClients();
    const publicClient = await hre.viem.getPublicClient();

    // ✅ Connect to TokenAdminRegistry contract using imported ABI
    const registry = await hre.viem.getContractAt({
      address: tokenAdminRegistry,
      abi: TokenAdminRegistryABI,
    });

    logger.info(`Checking pending admin for ${tokenaddress} on ${networkName}...`);

    // ✅ Retrieve pending admin
    const cfg = await registry.read.getTokenConfig([tokenaddress]);
    const pendingAdmin = cfg.pendingAdministrator;

    if (pendingAdmin.toLowerCase() !== wallet.account.address.toLowerCase())
      throw new Error(`Only pending admin can accept (pending ${pendingAdmin})`);

    logger.info(`Accepting admin role as ${wallet.account.address}...`);

    // ✅ Send transaction to accept admin role
    const txHash = await registry.write.acceptAdminRole(
      [tokenaddress],
      { account: wallet.account }
    );

    await publicClient.waitForTransactionReceipt({ hash: txHash });

    logger.info(`✅ Admin role accepted. Tx: ${txHash}`);
  }));
