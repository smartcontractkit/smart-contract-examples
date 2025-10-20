import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types/hre";
import { Chains, CCIPContractName, logger, getEVMNetworkConfig } from "../../config";
import {
  MetaTransactionData,
  SafeTransaction,
} from "@safe-global/safe-core-sdk-types";
import SafeDefault from "@safe-global/protocol-kit";
import { isAddress, encodeFunctionData } from "viem";

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
export const setPoolFromSafe = task(
  "setPoolFromSafe",
  "Sets the pool for a token via Safe multisig"
)
  .addOption({
    name: "tokenaddress",
    description: "Address of the token contract",
    defaultValue: "",
  })
  .addOption({
    name: "pooladdress",
    description: "Address of the pool contract",
    defaultValue: "",
  })
  .addOption({
    name: "safeaddress",
    description: "Address of the Safe multisig wallet",
    defaultValue: "",
  })
  .setAction(async () => ({
    default: async (
      {
        tokenaddress = "",
        pooladdress = "",
        safeaddress = "",
      }: {
        tokenaddress?: string;
        pooladdress?: string;
        safeaddress?: string;
      },
      hre: HardhatRuntimeEnvironment
    ) => {
      // ⚙️ Validate required parameters
      if (!tokenaddress) {
        throw new Error("❌ --tokenaddress is required");
      }

      if (!pooladdress) {
        throw new Error("❌ --pooladdress is required");
      }

      if (!safeaddress) {
        throw new Error("❌ --safeaddress is required");
      }

      // ⚙️ Connect to network and get viem client
      const networkConnection = await hre.network.connect();
      const { viem } = networkConnection;
      const networkName = networkConnection.networkName as Chains;
      const publicClient = await viem.getPublicClient();

      // ⚙️ Validate network config
      const networkConfig = getEVMNetworkConfig(networkName);
      if (!networkConfig)
        throw new Error(`❌ Network ${networkName} not found in config`);

      const { confirmations, tokenAdminRegistry } = networkConfig;
      if (confirmations === undefined)
        throw new Error(`❌ confirmations not defined for ${networkName}`);

      if (!tokenAdminRegistry)
        throw new Error(
          `❌ tokenAdminRegistry missing for ${networkName}`
        );

      // ⚙️ Validate addresses
      if (!isAddress(tokenaddress))
        throw new Error(`❌ Invalid token address: ${tokenaddress}`);
      if (!isAddress(pooladdress))
        throw new Error(`❌ Invalid pool address: ${pooladdress}`);
      if (!isAddress(safeaddress))
        throw new Error(`❌ Invalid Safe address: ${safeaddress}`);

      // ⚙️ Environment variables for Safe signers
      const pk1 = process.env.PRIVATE_KEY;
      const pk2 = process.env.PRIVATE_KEY_2;
      if (!pk1 || !pk2)
        throw new Error("❌ Both PRIVATE_KEY and PRIVATE_KEY_2 must be set");

      // ⚙️ Extract RPC URL for Safe Protocol Kit
      const rpcUrl = publicClient.chain.rpcUrls.default.http[0];
      if (!rpcUrl)
        throw new Error(`❌ RPC URL not found for ${networkName}`);

      logger.info(
        `⚙️ Connecting to TokenAdminRegistry at ${tokenAdminRegistry} on ${networkName}`
      );

      // ⚙️ Get registry contract interface
      const registry = await viem.getContractAt(
        CCIPContractName.TokenAdminRegistry,
        tokenAdminRegistry as `0x${string}`
      );

      // ⚙️ Get current token config and admin
      const config = await registry.read.getTokenConfig([
        tokenaddress as `0x${string}`,
      ]);
      const currentAdmin = config.administrator;

      logger.info(
        `⚙️ Preparing to set pool for token ${tokenaddress} → ${pooladdress}, current admin: ${currentAdmin}`
      );

      // ⚙️ Check if Safe is the admin
      if (currentAdmin.toLowerCase() !== safeaddress.toLowerCase()) {
        throw new Error(
          `❌ Safe ${safeaddress} is not the admin for token ${tokenaddress}.\n` +
          `   Current admin: ${currentAdmin}\n` +
          `   \n` +
          `   The Safe must be the token admin to set the pool.`
        );
      }

      // ⚙️ Check if pool is already set
      const currentPool = config.tokenPool;
      if (currentPool && currentPool.toLowerCase() === pooladdress.toLowerCase()) {
        logger.info(`⚠️ Pool ${pooladdress} is already set for token ${tokenaddress}`);
        logger.info(`✅ No action needed - pool is already configured`);
        return;
      }

      // ⚙️ Encode function call data
      const callData = encodeFunctionData({
        abi: registry.abi,
        functionName: "setPool",
        args: [tokenaddress as `0x${string}`, pooladdress as `0x${string}`],
      });

      logger.info(`⚙️ Initializing Safe Protocol Kit for multisig transaction...`);

      // ⚙️ Initialize Safe instances for both signers
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

      const metaTx: MetaTransactionData = {
        to: tokenAdminRegistry,
        data: callData,
        value: "0",
      };

      // ⚙️ Create Safe transaction
      let safeTx: SafeTransaction;
      try {
        safeTx = await safe1.createTransaction({ transactions: [metaTx] });
        logger.info("✅ Safe transaction created");
      } catch (err) {
        logger.error("❌ Failed to create Safe transaction", err);
        throw err;
      }

      // ⚙️ Sign by both owners
      try {
        safeTx = await safe1.signTransaction(safeTx);
        logger.info("✅ Signed by owner 1");
        safeTx = await safe2.signTransaction(safeTx);
        logger.info("✅ Signed by owner 2");
        logger.info(`✅ Transaction has ${safeTx.signatures.size} signature(s)`);
      } catch (err) {
        logger.error("❌ Error signing Safe transaction", err);
        throw err;
      }

      // ⚙️ Execute Safe transaction
      logger.info(`🚀 Executing Safe transaction to set pool for ${tokenaddress}...`);
      let result: any;
      try {
        result = await safe1.executeTransaction(safeTx);
      } catch (err) {
        logger.error("❌ Execution failed", err);
        throw err;
      }

      if (!result?.transactionResponse)
        throw new Error("❌ No transaction response returned");

      logger.info(
        `⏳ Waiting ${confirmations} blocks for tx ${result.hash} confirmation...`
      );
      await result.transactionResponse.wait(confirmations);

      logger.info(`✅ Pool set for token ${tokenaddress} → ${pooladdress}`);
    },
  }))
  .build();
