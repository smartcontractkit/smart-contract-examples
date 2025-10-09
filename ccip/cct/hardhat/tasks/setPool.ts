import { task } from "hardhat/config";
import { Chains, logger, getEVMNetworkConfig } from "../config";
import TokenAdminRegistryABI from "@chainlink/contracts-ccip/abi/TokenAdminRegistry.abi.json";

/**
 * Links a token with its corresponding pool in the TokenAdminRegistry contract.
 *
 * Example usage:
 * npx hardhat setPool \
 *   --tokenaddress 0xYourToken \
 *   --pooladdress 0xYourPool \
 *   --network sepolia
 */
task("setPool", "Links a token with its pool in the TokenAdminRegistry contract")
  .setAction(<any>(async (taskArgs: { tokenaddress: string; pooladdress: string }, hre: any) => {
    const { tokenaddress, pooladdress } = taskArgs;
    const networkName = hre.network.name as Chains;

    // ✅ Network configuration
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
    if (!hre.viem.isAddress(pooladdress))
      throw new Error(`Invalid pool address: ${pooladdress}`);

    // ✅ Wallet + client
    const [wallet] = await hre.viem.getWalletClients();
    const publicClient = await hre.viem.getPublicClient();
    logger.info(`🔹 Using signer: ${wallet.account.address}`);

    // ✅ Connect to TokenAdminRegistry
    const registry = await hre.viem.getContractAt({
      address: tokenAdminRegistry,
      abi: TokenAdminRegistryABI,
    });

    logger.info(`Fetching token configuration for ${tokenaddress} on ${networkName}...`);
    const config = await registry.read.getTokenConfig([tokenaddress]);
    const tokenAdministratorAddress = config.administrator;

    logger.info(`Token ${tokenaddress} current admin: ${tokenAdministratorAddress}`);

    // ✅ Ensure signer is token administrator
    if (tokenAdministratorAddress.toLowerCase() !== wallet.account.address.toLowerCase()) {
      throw new Error(
        `Only the token administrator (${tokenAdministratorAddress}) can set the pool. Current signer: ${wallet.account.address}`
      );
    }

    logger.info(`Setting pool for token ${tokenaddress} → ${pooladdress}...`);

    // ✅ Execute transaction
    const txHash = await registry.write.setPool(
      [tokenaddress, pooladdress],
      { account: wallet.account }
    );

    logger.info(`⏳ Transaction sent: ${txHash}`);
    await publicClient.waitForTransactionReceipt({ hash: txHash });

    logger.info(`✅ Pool successfully set for token ${tokenaddress} → ${pooladdress}`);
  }));
