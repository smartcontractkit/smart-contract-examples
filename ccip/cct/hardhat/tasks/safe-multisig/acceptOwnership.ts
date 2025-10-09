import { task } from "hardhat/config";
import { Chains, logger, getEVMNetworkConfig } from "../../config";
import {
  MetaTransactionData,
  SafeTransaction,
  TransactionResult,
} from "@safe-global/safe-core-sdk-types";
import Safe, { SigningMethod } from "@safe-global/protocol-kit";

/**
 * Accept ownership of a contract through a Gnosis Safe.
 *
 * Example:
 * npx hardhat acceptOwnershipFromSafe \
 *   --contractaddress 0xYourContract \
 *   --safeaddress 0xYourSafe \
 *   --network sepolia
 */
task("acceptOwnershipFromSafe", "Accept ownership of a contract via a Safe multisig")
  .setAction(<any>(async (taskArgs: { contractaddress: string; safeaddress: string }, hre: any) => {
    const { contractaddress, safeaddress } = taskArgs;
    const networkName = hre.network.name as Chains;

    // ✅ Validate network configuration
    const networkConfig = getEVMNetworkConfig(networkName);
    if (!networkConfig)
      throw new Error(`Network ${networkName} not found in config`);

    // ✅ Validate addresses
    if (!hre.viem.isAddress(contractaddress))
      throw new Error(`Invalid contract address: ${contractaddress}`);
    if (!hre.viem.isAddress(safeaddress))
      throw new Error(`Invalid Safe address: ${safeaddress}`);

    // ✅ Validate required environment variables
    const privateKey = process.env.PRIVATE_KEY;
    const privateKey2 = process.env.PRIVATE_KEY_2;
    if (!privateKey || !privateKey2)
      throw new Error("Both PRIVATE_KEY and PRIVATE_KEY_2 must be set");

    // ✅ Retrieve RPC URL from Hardhat config
    const netCfg = hre.config.networks[networkName] as any;
    if (!netCfg?.url)
      throw new Error(`RPC URL not found for network ${networkName}`);
    const rpcUrl = netCfg.url;

    // ✅ Encode acceptOwnership() call (no typechain)
    const iface = new hre.viem.Interface([
      {
        type: "function",
        name: "acceptOwnership",
        stateMutability: "nonpayable",
        inputs: [],
        outputs: [],
      },
    ]);
    const encodedData = iface.encodeFunctionData("acceptOwnership", []);

    // ✅ Prepare Safe meta-transaction
    const metaTx: MetaTransactionData = {
      to: contractaddress,
      data: encodedData,
      value: "0",
    };

    // ✅ Initialize Safe signers
    const safe1 = await Safe.init({
      provider: rpcUrl,
      signer: privateKey,
      safeAddress: safeaddress,
    });
    const safe2 = await Safe.init({
      provider: rpcUrl,
      signer: privateKey2,
      safeAddress: safeaddress,
    });

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
    logger.info("🚀 Executing Safe transaction to accept ownership...");
    let result: TransactionResult;
    try {
      result = await safe1.executeTransaction(safeTx);
    } catch (err) {
      logger.error("❌ Execution failed:", err);
      throw err;
    }

    logger.info("✅ Executed Safe transaction");

    // ✅ Wait for confirmations
    if (!result?.transactionResponse)
      throw new Error("No transaction response from Safe execution");

    const { confirmations } = networkConfig;
    if (confirmations === undefined)
      throw new Error(`confirmations not defined for ${networkName}`);

    logger.info(
      `⏳ Waiting ${confirmations} blocks for tx ${result.hash} to confirm...`
    );
    await (result.transactionResponse as any).wait(confirmations);

    logger.info(`✅ Ownership accepted successfully.`);
  }));
