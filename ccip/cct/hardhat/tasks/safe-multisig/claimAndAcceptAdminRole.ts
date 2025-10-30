import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types/hre";
import { Chains, TokenContractName, CCIPContractName, logger, getEVMNetworkConfig, validateNetworkName } from "../../config";
import {
  MetaTransactionData,
  SafeTransaction,
} from "@safe-global/safe-core-sdk-types";
import SafeDefault from "@safe-global/protocol-kit";
import { isAddress, encodeFunctionData } from "viem";

/**
 * Claims and accepts the admin role of a token via a Gnosis Safe.
 *
 * Example:
 * npx hardhat claimAndAcceptAdminRoleFromSafe \
 *   --tokenaddress 0xYourToken \
 *   --safeaddress 0xYourSafe \
 *   --network sepolia
 */
export const claimAndAcceptAdminRoleFromSafe = task(
  "claimAndAcceptAdminRoleFromSafe",
  "Claim and accept the admin role of a token via Safe multisig"
)
  .addOption({
    name: "tokenaddress",
    description: "Address of the token contract",
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
        safeaddress = "",
      }: {
        tokenaddress?: string;
        safeaddress?: string;
      },
      hre: HardhatRuntimeEnvironment
    ) => {
      // ⚙️ Validate required parameters
      if (!tokenaddress) {
        throw new Error("❌ --tokenaddress is required");
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

      const { tokenAdminRegistry, registryModuleOwnerCustom } = networkConfig;
      if (!tokenAdminRegistry || !registryModuleOwnerCustom)
        throw new Error(
          `❌ tokenAdminRegistry or registryModuleOwnerCustom missing for ${networkName}`
        );

      // ⚙️ Validate addresses
      if (!isAddress(tokenaddress))
        throw new Error(`❌ Invalid token address: ${tokenaddress}`);
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

      logger.info(`⚙️ Connecting to token contract at ${tokenaddress}...`);

      // ⚙️ Get token contract interface
      const token = await viem.getContractAt(
        TokenContractName.BurnMintERC20,
        tokenaddress as `0x${string}`
      );

      // ⚙️ Read token CCIP admin
      const ccipAdmin = await token.read.getCCIPAdmin();
      logger.info(`⚙️ Current CCIP admin: ${ccipAdmin}`);

      // ⚙️ Verify CCIP admin matches Safe address
      if (ccipAdmin.toLowerCase() !== safeaddress.toLowerCase()) {
        throw new Error(
          `❌ CCIP admin (${ccipAdmin}) does not match Safe address (${safeaddress}).\n` +
          `   The Safe must be set as the CCIP admin before claiming the admin role.\n` +
          `   \n` +
          `   The token's CCIP admin should be the Safe address to proceed with this operation.`
        );
      }
      logger.info(`✅ CCIP admin matches Safe address - proceeding with claim and accept`);

      // ⚙️ Get registry contracts
      const registry = await viem.getContractAt(
        CCIPContractName.TokenAdminRegistry,
        tokenAdminRegistry as `0x${string}`
      );

      // ⚙️ Check if Safe has already accepted the admin role
      const currentAdmin = await registry.read.getTokenConfig([
        tokenaddress as `0x${string}`,
      ]);
      
      if (currentAdmin && currentAdmin.administrator && 
          currentAdmin.administrator.toLowerCase() === safeaddress.toLowerCase()) {
        logger.info(`⚠️ Safe ${safeaddress} has already claimed and accepted the admin role for token ${tokenaddress}`);
        logger.info(`✅ No action needed - admin role is already configured`);
        return;
      }

      // ⚙️ Get registry module contract
      const registryModule = await viem.getContractAt(
        CCIPContractName.RegistryModuleOwnerCustom,
        registryModuleOwnerCustom as `0x${string}`
      );

      // ⚙️ Encode both function calls
      const claimAdminData = encodeFunctionData({
        abi: registryModule.abi,
        functionName: "registerAdminViaGetCCIPAdmin",
        args: [tokenaddress as `0x${string}`],
      });

      const acceptAdminData = encodeFunctionData({
        abi: registry.abi,
        functionName: "acceptAdminRole",
        args: [tokenaddress as `0x${string}`],
      });

      const metaTxs: MetaTransactionData[] = [
        {
          to: registryModuleOwnerCustom,
          data: claimAdminData,
          value: "0",
        },
        {
          to: tokenAdminRegistry,
          data: acceptAdminData,
          value: "0",
        },
      ];

      logger.info(`⚙️ Prepared Safe meta-transactions for ${tokenaddress}`);

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

      // ⚙️ Create Safe transaction
      let safeTx: SafeTransaction;
      try {
        safeTx = await safe1.createTransaction({ transactions: metaTxs });
        logger.info("✅ Safe transaction (claim + accept) created");
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
      logger.info("🚀 Executing Safe transaction (claim + accept admin role)...");
      let result: any;
      try {
        result = await safe1.executeTransaction(safeTx);
      } catch (err) {
        logger.error("❌ Safe execution failed", err);
        throw err;
      }

      if (!result?.transactionResponse)
        throw new Error("❌ No transaction response returned");

      logger.info(
        `⏳ Waiting ${confirmations} blocks for tx ${result.hash} confirmation...`
      );
      await result.transactionResponse.wait(confirmations);

      logger.info(`✅ Admin role claimed and accepted for ${tokenaddress}`);
    },
  }))
  .build();
