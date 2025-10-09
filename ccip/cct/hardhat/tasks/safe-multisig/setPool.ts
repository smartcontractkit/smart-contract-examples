import { task } from "hardhat/config";
import { Chains, logger, getEVMNetworkConfig } from "../../config";
import {
  MetaTransactionData,
  SafeTransaction,
  TransactionResult,
} from "@safe-global/safe-core-sdk-types";
import Safe, { SigningMethod } from "@safe-global/protocol-kit";
import TokenAdminRegistryABI from "@chainlink/contracts-ccip/abi/TokenAdminRegistry.abi.json";

/**
 * Sets the pool for a token through a Safe multisig transaction.
 *
 * Example:
 * npx hardhat setPoolFromSafe \
 *   --tokenaddress 0xYourToken \
 *   --pooladdress 0xYourPool \
 *   --safeaddress 0xYourSafe \
 *   --network sepolia
 */
task("setPoolFromSafe", "Sets the pool for a token via Safe multisig")
  .setAction(<any>(async (taskArgs: {
    tokenaddress: string;
    pooladdress: string;
    safeaddress: string;
  }, hre: any) => {
    const { tokenaddress, pooladdress, safeaddress } = taskArgs;
    const networkName = hre.network.name as Chains;

    // ✅ Validate network configuration
    const networkConfig = getEVMNetworkConfig(networkName);
    if (!networkConfig)
      throw new Error(`Network ${networkName} not found in config`);

    const { tokenAdminRegistry, confirmations } = networkConfig;
    if (!tokenAdminRegistry)
      throw new Error(`tokenAdminRegistry missing for ${networkName}`);
    if (confirmations === undefined)
      throw new Error(`confirmations not defined for ${networkName}`);

    // ✅ Validate addresses
    if (!hre.viem.isAddress(tokenaddress))
      throw new Error(`Invalid token address: ${tokenaddress}`);
    if (!hre.viem.isAddress(pooladdress))
      throw new Error(`Invalid pool address: ${pooladdress}`);
    if (!hre.viem.isAddress(safeaddress))
      throw new Error(`Invalid Safe address: ${safeaddress}`);

    // ✅ Ensure required environment variables are set
    const pk1 = process.env.PRIVATE_KEY;
    const pk2 = process.env.PRIVATE_KEY_2;
    if (!pk1 || !pk2)
      throw new Error("Both PRIVATE_KEY and PRIVATE_KEY_2 must be set");

    // ✅ Get RPC URL
    const netCfg = hre.config.networks[networkName] as any;
    if (!netCfg?.url)
      throw new Error(`RPC URL not found for network ${networkName}`);
    const rpcUrl = netCfg.url;

    logger.info(
      `Connecting to TokenAdminRegistry at ${tokenAdminRegistry} on ${networkName}`
    );

    // ✅ Connect to registry contract
    const registry = await hre.viem.getContractAt({
      address: tokenAdminRegistry,
      abi: TokenAdminRegistryABI,
    });

    // ✅ Get current token config and admin
    const config = await registry.read.getTokenConfig([tokenaddress]);
    const currentAdmin = config.administrator;

    logger.info(
      `Preparing to set pool for token ${tokenaddress} → ${pooladdress}, current admin: ${currentAdmin}`
    );

    // ✅ Encode function call data
    const registryIface = new hre.viem.Interface(TokenAdminRegistryABI);
    const callData = registryIface.encodeFunctionData("setPool", [
      tokenaddress,
      pooladdress,
    ]);

    // ✅ Initialize Safe signers
    const safe1 = await Safe.init({
      provider: rpcUrl,
      signer: pk1,
      safeAddress: safeaddress,
    });
    const safe2 = await Safe.init({
      provider: rpcUrl,
      signer: pk2,
      safeAddress: safeaddress,
    });

    const metaTx: MetaTransactionData = {
      to: tokenAdminRegistry,
      data: callData,
      value: "0",
    };

    // ✅ Create Safe transaction
    let safeTx: SafeTransaction;
    try {
      safeTx = await safe1.createTransaction({ transactions: [metaTx] });
      logger.info("✅ Safe transaction created");
    } catch (err) {
      logger.error("❌ Failed to create Safe transaction", err);
      throw err;
    }

    // ✅ Sign by both owners
    try {
      safeTx = await safe1.signTransaction(safeTx, SigningMethod.ETH_SIGN);
      logger.info("✅ Signed by owner 1");
      safeTx = await safe2.signTransaction(safeTx, SigningMethod.ETH_SIGN);
      logger.info("✅ Signed by owner 2");
    } catch (err) {
      logger.error("❌ Error signing Safe transaction", err);
      throw err;
    }

    // ✅ Execute Safe transaction
    logger.info(`🚀 Executing Safe transaction to set pool for ${tokenaddress}...`);
    let result: TransactionResult;
    try {
      result = await safe1.executeTransaction(safeTx);
    } catch (err) {
      logger.error("❌ Execution failed", err);
      throw err;
    }

    if (!result?.transactionResponse)
      throw new Error("No transaction response returned");

    logger.info(
      `⏳ Waiting ${confirmations} blocks for tx ${result.hash} confirmation...`
    );
    await (result.transactionResponse as any).wait(confirmations);

    logger.info(`✅ Pool set for token ${tokenaddress} → ${pooladdress}`);
  }));
