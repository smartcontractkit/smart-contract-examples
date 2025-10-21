import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types/hre";
import { Chains, logger, getEVMNetworkConfig } from "../../config";
import {
  MetaTransactionData,
  SafeTransaction,
  TransactionResult,
} from "@safe-global/safe-core-sdk-types";
import SafeDefault from "@safe-global/protocol-kit";
import { isAddress, encodeFunctionData } from "viem";
import { TokenContractName } from "../../config/types";

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
export const mintTokensFromSafe = task("mintTokensFromSafe", "Mint tokens to multiple receivers via Safe multisig")
  .addOption({
    name: "tokenaddress",
    description: "The address of the token contract",
    defaultValue: "",
  })
  .addOption({
    name: "amount",
    description: "The amount of tokens to mint per receiver (in wei)",
    defaultValue: "",
  })
  .addOption({
    name: "receiveraddresses",
    description: "Comma-separated list of receiver addresses",
    defaultValue: "",
  })
  .addOption({
    name: "safeaddress",
    description: "The address of the Safe multisig",
    defaultValue: "",
  })
  .setAction(async () => ({
    default: async (
      {
        tokenaddress,
        amount,
        receiveraddresses,
        safeaddress,
      }: {
        tokenaddress: string;
        amount: string;
        receiveraddresses: string;
        safeaddress: string;
      },
      hre: HardhatRuntimeEnvironment
    ) => {
      // ⚙️ Validate required parameters
      if (!tokenaddress) throw new Error("❌ --tokenaddress is required");
      if (!amount) throw new Error("❌ --amount is required");
      if (!receiveraddresses) throw new Error("❌ --receiveraddresses is required");
      if (!safeaddress) throw new Error("❌ --safeaddress is required");


      // ⚙️ Connect to network and get viem client
      const networkConnection = await hre.network.connect();
      const { viem } = networkConnection;
      const networkName = networkConnection.networkName as Chains;
      const publicClient = await viem.getPublicClient();

      // ⚙️ Validate network config
      const networkConfig = getEVMNetworkConfig(networkName);
      if (!networkConfig)
        throw new Error(`❌ Network ${networkName} not found in config`);

      const { confirmations } = networkConfig;
      if (confirmations === undefined)
        throw new Error(`❌ confirmations not defined for ${networkName}`);

      // ⚙️ Validate addresses
      if (!isAddress(tokenaddress))
        throw new Error(`❌ Invalid token address: ${tokenaddress}`);
      if (!isAddress(safeaddress))
        throw new Error(`❌ Invalid Safe address: ${safeaddress}`);

      // ⚙️ Parse and validate receivers
      const receivers = receiveraddresses
        .split(",")
        .map((a: string) => a.trim())
        .filter(Boolean);

      if (receivers.length === 0)
        throw new Error("❌ No receiver addresses provided");

      for (const r of receivers) {
        if (!isAddress(r))
          throw new Error(`❌ Invalid receiver address: ${r}`);
      }

        // ⚙️ Environment variables for Safe signers
      const pk1 = process.env.PRIVATE_KEY;
      const pk2 = process.env.PRIVATE_KEY_2;
      if (!pk1 || !pk2)
        throw new Error("❌ Both PRIVATE_KEY and PRIVATE_KEY_2 must be set");

      // ⚙️ Extract RPC URL for Safe Protocol Kit
      const rpcUrl = publicClient.chain.rpcUrls.default.http[0];
      if (!rpcUrl)
        throw new Error(`❌ RPC URL not found for ${networkName}`);

      logger.info(`⚙️ Connecting to token contract at ${tokenaddress}...`);

      // ⚙️ Get token contract interface
      const token = await viem.getContractAt(
        TokenContractName.BurnMintERC20,
        tokenaddress as `0x${string}`
      );

      // ⚙️ Verify Safe has MINTER_ROLE (required for minting)
      try {
        const minterRole = await token.read.MINTER_ROLE();
        const hasMinterRole = await token.read.hasRole([minterRole, safeaddress as `0x${string}`]);

        logger.info(`⚙️ Checking if Safe has MINTER_ROLE...`);
        
        if (!hasMinterRole) {
          throw new Error(
            `❌ Safe (${safeaddress}) does not have MINTER_ROLE on token (${tokenaddress}).\n` +
            `   Please grant MINTER_ROLE to the Safe before attempting to mint.\n` +
            `   \n` +
            `   Run the following command to grant the role:\n` +
            `   npx hardhat grantMintBurnRoleFromSafe --tokenaddress ${tokenaddress} --burnerminters ${safeaddress} --safeaddress ${safeaddress} --network ${networkName}`
          );
        }
        
        logger.info(`✅ Safe has MINTER_ROLE - proceeding with mint transaction`);
      } catch (e: any) {
        // If it's our custom error, re-throw it
        if (e.message?.includes("does not have MINTER_ROLE")) {
          throw e;
        }
        // Otherwise, it might be a contract call error
        throw new Error(
          `❌ Failed to verify MINTER_ROLE on token contract.\n` +
          `   Error: ${e.message}\n` +
          `   Ensure the token contract at ${tokenaddress} is a valid BurnMintERC20 contract.`
        );
      }

      // ⚙️ Initialize Safe instances for both signers
      logger.info(`⚙️ Initializing Safe Protocol Kit for multisig transaction...`);
      
      const safe1 = await SafeDefault.init({
        provider: rpcUrl,
        signer: pk1,
        safeAddress: safeaddress,
      });
      const safe2 = await SafeDefault.init({
        provider: rpcUrl,
        signer: pk2,
        safeAddress: safeaddress,
      });

      logger.info(
        `⚙️ Preparing to mint ${amount} tokens to receivers: ${receivers.join(", ")}`
      );

      // ⚙️ Build meta-transactions for each receiver
      const metaTxs: MetaTransactionData[] = receivers.map((to: string) => ({
        to: tokenaddress,
        data: encodeFunctionData({
          abi: token.abi,
          functionName: "mint",
          args: [to as `0x${string}`, BigInt(amount)],
        }),
        value: "0",
      }));

      // ⚙️ Create Safe transaction
      let safeTx: SafeTransaction;
      try {
        safeTx = await safe1.createTransaction({ transactions: metaTxs });
        logger.info("✅ Safe transaction created");
      } catch (e) {
        logger.error("❌ Failed to create Safe transaction", e);
        throw e;
      }

      // ⚙️ Sign by both owners
      try {
        // Sign with both owners - signatures will be collected in the transaction
        safeTx = await safe1.signTransaction(safeTx);
        logger.info("✅ Signed by owner 1");
        
        safeTx = await safe2.signTransaction(safeTx);
        logger.info("✅ Signed by owner 2");
        
        logger.info(`✅ Transaction has ${safeTx.signatures.size} signature(s)`);
      } catch (e) {
        logger.error("❌ Error signing Safe transaction", e);
        throw e;
      }

      // ⚙️ Execute via Safe
      logger.info("🚀 Executing Safe transaction to mint tokens...");
      let result: any;
      try {
        result = await safe1.executeTransaction(safeTx);
      } catch (e) {
        logger.error("❌ Safe execution failed", e);
        throw e;
      }

      if (!result?.transactionResponse)
        throw new Error("❌ No transaction response returned");

      logger.info(
        `⏳ Waiting ${confirmations} blocks for tx ${result.hash} confirmation...`
      );
      await result.transactionResponse.wait(confirmations);

      logger.info("✅ Tokens minted successfully via Safe multisig");

      // ℹ️ Display receiver balances
      try {
        const symbol = await token.read.symbol();
        for (const r of receivers) {
          const balance = await token.read.balanceOf([r as `0x${string}`]);
          logger.info(`ℹ️ ${r} → balance: ${balance.toString()} ${symbol}`);
        }
      } catch {
        logger.warn("⚠️ Could not fetch balances (read error).");
      }
    },
  }))
  .build();
