import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types/hre";
import { Chains, TokenContractName, logger, getEVMNetworkConfig, validateNetworkName } from "../../config";
import {
  MetaTransactionData,
  SafeTransaction,
} from "@safe-global/safe-core-sdk-types";
import SafeDefault from "@safe-global/protocol-kit";
import { isAddress, encodeFunctionData } from "viem";

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
export const grantMintBurnRoleFromSafe = task(
  "grantMintBurnRoleFromSafe",
  "Grants mint and burn roles to multiple addresses via Safe"
)
  .addOption({
    name: "tokenaddress",
    description: "Address of the BurnMintERC20 token contract",
    defaultValue: "",
  })
  .addOption({
    name: "burnerminters",
    description: "Comma-separated addresses to grant MINTER_ROLE and BURNER_ROLE",
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
        burnerminters = "",
        safeaddress = "",
      }: {
        tokenaddress?: string;
        burnerminters?: string;
        safeaddress?: string;
      },
      hre: HardhatRuntimeEnvironment
    ) => {
      // ⚙️ Validate required parameters
      if (!tokenaddress) {
        throw new Error("❌ --tokenaddress is required");
      }

      if (!burnerminters) {
        throw new Error("❌ --burnerminters is required");
      }

      if (!safeaddress) {
        throw new Error("❌ --safeaddress is required");
      }

      // ⚙️ Connect to network and get viem client
      const networkConnection = await hre.network.connect();
      const { viem } = networkConnection;
      const networkName = validateNetworkName(networkConnection.networkName);
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

      // ⚙️ Parse and validate burner/minter addresses
      const burnerMinterAddresses = burnerminters
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean);

      if (burnerMinterAddresses.length === 0)
        throw new Error("❌ No burner/minter addresses provided");

      for (const addr of burnerMinterAddresses) {
        if (!isAddress(addr))
          throw new Error(`❌ Invalid burner/minter address: ${addr}`);
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
      const tokenContract = await viem.getContractAt(
        TokenContractName.BurnMintERC20,
        tokenaddress as `0x${string}`
      );

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
        `⚙️ Setting up Safe transaction to grant roles to: ${burnerMinterAddresses.join(", ")}`
      );

      // ⚙️ Build meta-transactions for each address
      const metaTxs: MetaTransactionData[] = burnerMinterAddresses.map((addr) => ({
        to: tokenaddress,
        data: encodeFunctionData({
          abi: tokenContract.abi,
          functionName: "grantMintAndBurnRoles",
          args: [addr as `0x${string}`],
        }),
        value: "0",
      }));

      // ⚙️ Create Safe transaction
      let safeTx: SafeTransaction;
      try {
        safeTx = await safe1.createTransaction({ transactions: metaTxs });
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
      logger.info("🚀 Executing Safe transaction to grant roles...");
      let result: any;
      try {
        result = await safe1.executeTransaction(safeTx);
      } catch (err) {
        logger.error("❌ Error executing Safe transaction", err);
        throw err;
      }

      if (!result?.transactionResponse)
        throw new Error("❌ No transaction response returned");

      logger.info(
        `⏳ Waiting ${confirmations} blocks for tx ${result.hash} confirmation...`
      );
      await result.transactionResponse.wait(confirmations);

      logger.info("✅ Mint and burn roles granted successfully");
    },
  }))
  .build();
