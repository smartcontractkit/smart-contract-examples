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
 * Mint tokens to multiple receivers through a Gnosis Safe.
 *
 * Example:
 * npx hardhat mintTokensFromSafe \
 *   --tokenaddress 0xYourToken \
 *   --amount 1000000000000000000 \
 *   --receiveraddresses 0xAddr1,0xAddr2 \
 *   --safeaddress 0xYourSafe \
 *   --network sepolia
 */
task("mintTokensFromSafe", "Mint tokens to multiple receivers via Safe multisig")
  .setAction(<any>(async (taskArgs: {
    tokenaddress: string;
    amount: string;
    receiveraddresses: string;
    safeaddress: string;
  }, hre: any) => {
    const { tokenaddress, amount, receiveraddresses, safeaddress } = taskArgs;
    const networkName = hre.network.name as Chains;

    // ✅ Validate network config
    const networkConfig = getEVMNetworkConfig(networkName);
    if (!networkConfig)
      throw new Error(`Network ${networkName} not found in config`);

    const { confirmations } = networkConfig;
    if (confirmations === undefined)
      throw new Error(`confirmations not defined for ${networkName}`);

    // ✅ Validate addresses
    if (!hre.viem.isAddress(tokenaddress))
      throw new Error(`Invalid token address: ${tokenaddress}`);
    if (!hre.viem.isAddress(safeaddress))
      throw new Error(`Invalid Safe address: ${safeaddress}`);

    // ✅ Parse and validate receivers
    const receivers = receiveraddresses
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean);

    if (receivers.length === 0)
      throw new Error("No receiver addresses provided");

    for (const r of receivers) {
      if (!hre.viem.isAddress(r))
        throw new Error(`Invalid receiver address: ${r}`);
    }

    // ✅ Environment
    const pk1 = process.env.PRIVATE_KEY;
    const pk2 = process.env.PRIVATE_KEY_2;
    if (!pk1 || !pk2)
      throw new Error("Both PRIVATE_KEY and PRIVATE_KEY_2 must be set");

    const netCfg = hre.config.networks[networkName] as any;
    if (!netCfg?.url)
      throw new Error(`RPC URL not found for ${networkName}`);
    const rpcUrl = netCfg.url;

    logger.info(`Connecting to token contract at ${tokenaddress}...`);

    // ✅ Initialize ABI interface
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
      `Preparing to mint ${amount} tokens to receivers: ${receivers.join(", ")}`
    );

    // ✅ Build meta-transactions for each receiver
    const metaTxs: MetaTransactionData[] = receivers.map((to) => ({
      to: tokenaddress,
      data: tokenIface.encodeFunctionData("mint", [to, BigInt(amount)]),
      value: "0",
    }));

    // ✅ Create Safe transaction
    let safeTx: SafeTransaction;
    try {
      safeTx = await safe1.createTransaction({ transactions: metaTxs });
      logger.info("✅ Safe transaction created");
    } catch (e) {
      logger.error("❌ Failed to create Safe transaction", e);
      throw e;
    }

    // ✅ Sign by both owners
    try {
      safeTx = await safe1.signTransaction(safeTx, SigningMethod.ETH_SIGN);
      logger.info("✅ Signed by owner 1");
      safeTx = await safe2.signTransaction(safeTx, SigningMethod.ETH_SIGN);
      logger.info("✅ Signed by owner 2");
    } catch (e) {
      logger.error("❌ Error signing Safe transaction", e);
      throw e;
    }

    // ✅ Execute via Safe
    logger.info("🚀 Executing Safe transaction to mint tokens...");
    let result: TransactionResult;
    try {
      result = await safe1.executeTransaction(safeTx);
    } catch (e) {
      logger.error("❌ Safe execution failed", e);
      throw e;
    }

    if (!result?.transactionResponse)
      throw new Error("No transaction response returned");

    logger.info(
      `⏳ Waiting ${confirmations} blocks for tx ${result.hash} confirmation...`
    );
    await (result.transactionResponse as any).wait(confirmations);

    logger.info("✅ Tokens minted successfully via Safe multisig");

    // ✅ (Optional) Display receiver balances
    try {
      const publicClient = await hre.viem.getPublicClient();
      const token = await hre.viem.getContractAt({
        address: tokenaddress,
        abi: BurnMintERC20ABI,
      });
      const symbol = await token.read.symbol();
      for (const r of receivers) {
        const balance = await token.read.balanceOf([r]);
        logger.info(`${r} → balance: ${balance.toString()} ${symbol}`);
      }
    } catch {
      logger.warn("Could not fetch balances (read error).");
    }
  }));
