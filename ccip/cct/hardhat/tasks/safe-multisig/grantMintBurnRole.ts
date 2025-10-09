import { task } from "hardhat/config";
import { Chains, logger, getEVMNetworkConfig } from "../../config";
import {
  MetaTransactionData,
  SafeTransaction,
  TransactionResult,
} from "@safe-global/safe-core-sdk-types";
import Safe, { SigningMethod } from "@safe-global/protocol-kit";
import BurnMintERC20ABI from "@chainlink/contracts/abi/v0.8/shared/BurnMintERC20.abi.json";

/**
 * Grants mint and burn roles to multiple addresses via a Safe multisig.
 *
 * Example:
 * npx hardhat grantMintBurnRoleFromSafe \
 *   --tokenaddress 0xYourToken \
 *   --burnerminters 0xAddr1,0xAddr2 \
 *   --safeaddress 0xYourSafe \
 *   --network sepolia
 */
task("grantMintBurnRoleFromSafe", "Grants mint and burn roles to multiple addresses via Safe")
  .setAction(<any>(async (taskArgs: {
    tokenaddress: string;
    burnerminters: string;
    safeaddress: string;
  }, hre: any) => {
    const { tokenaddress, burnerminters, safeaddress } = taskArgs;
    const networkName = hre.network.name as Chains;

    // ✅ Validate network
    const networkConfig = getEVMNetworkConfig(networkName);
    if (!networkConfig)
      throw new Error(`Network ${networkName} not found in config`);

    // ✅ Validate addresses
    if (!hre.viem.isAddress(tokenaddress))
      throw new Error(`Invalid token address: ${tokenaddress}`);
    if (!hre.viem.isAddress(safeaddress))
      throw new Error(`Invalid Safe address: ${safeaddress}`);

    const burnerMinterAddresses = burnerminters
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean);

    if (burnerMinterAddresses.length === 0)
      throw new Error("No burner/minter addresses provided");

    for (const addr of burnerMinterAddresses) {
      if (!hre.viem.isAddress(addr))
        throw new Error(`Invalid burner/minter address: ${addr}`);
    }

    // ✅ Environment & RPC checks
    const pk1 = process.env.PRIVATE_KEY;
    const pk2 = process.env.PRIVATE_KEY_2;
    if (!pk1 || !pk2)
      throw new Error("Both PRIVATE_KEY and PRIVATE_KEY_2 must be set");

    const netCfg = hre.config.networks[networkName] as any;
    if (!netCfg?.url)
      throw new Error(`RPC URL not found for network ${networkName}`);
    const rpcUrl = netCfg.url;

    const { confirmations } = networkConfig;
    if (confirmations === undefined)
      throw new Error(`confirmations not defined for ${networkName}`);

    logger.info(`Connecting to token contract at ${tokenaddress}...`);

    // ✅ Create an Interface for encoding
    const tokenIface = new hre.viem.Interface(BurnMintERC20ABI);

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

    logger.info(
      `Setting up Safe transaction to grant roles to: ${burnerMinterAddresses.join(", ")}`
    );

    // ✅ Create meta-transactions for each address
    const metaTxs: MetaTransactionData[] = burnerMinterAddresses.map((addr) => ({
      to: tokenaddress,
      data: tokenIface.encodeFunctionData("grantMintAndBurnRoles", [addr]),
      value: "0",
    }));

    // ✅ Build and sign Safe transaction
    let safeTx: SafeTransaction;
    try {
      safeTx = await safe1.createTransaction({ transactions: metaTxs });
      logger.info("✅ Safe transaction created");
    } catch (err) {
      logger.error("❌ Failed to create Safe transaction", err);
      throw err;
    }

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
    logger.info("🚀 Executing Safe transaction to grant roles...");
    let result: TransactionResult;
    try {
      result = await safe1.executeTransaction(safeTx);
    } catch (err) {
      logger.error("❌ Error executing Safe transaction", err);
      throw err;
    }

    if (!result?.transactionResponse)
      throw new Error("No transaction response returned");

    logger.info(
      `⏳ Waiting ${confirmations} blocks for tx ${result.hash} confirmation...`
    );
    await (result.transactionResponse as any).wait(confirmations);
    logger.info("✅ Mint and burn roles granted successfully");
  }));
