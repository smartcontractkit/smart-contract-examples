import { task } from "hardhat/config";
import { Chains, logger, getEVMNetworkConfig } from "../../config";
import {
  MetaTransactionData,
  SafeTransaction,
  TransactionResult,
} from "@safe-global/safe-core-sdk-types";
import Safe, { SigningMethod } from "@safe-global/protocol-kit";

import BurnMintERC20ABI from "@chainlink/contracts/abi/v0.8/shared/BurnMintERC20.abi.json";
import RegistryModuleOwnerCustomABI from "@chainlink/contracts-ccip/abi/RegistryModuleOwnerCustom.abi.json";
import TokenAdminRegistryABI from "@chainlink/contracts-ccip/abi/TokenAdminRegistry.abi.json";

/**
 * Claims and accepts the admin role of a token via a Gnosis Safe.
 *
 * Example:
 * npx hardhat claimAndAcceptAdminRoleFromSafe \
 *   --tokenaddress 0xYourToken \
 *   --safeaddress 0xYourSafe \
 *   --network sepolia
 */
task("claimAndAcceptAdminRoleFromSafe",
  "Claim and accept the admin role of a token via Safe multisig"
).setAction(<any>(async (taskArgs: {
  tokenaddress: string;
  safeaddress: string;
}, hre: any) => {
  const { tokenaddress, safeaddress } = taskArgs;
  const networkName = hre.network.name as Chains;

  // ✅ Validate network configuration
  const networkConfig = getEVMNetworkConfig(networkName);
  if (!networkConfig)
    throw new Error(`Network ${networkName} not found in config`);

  const { tokenAdminRegistry, registryModuleOwnerCustom, confirmations } =
    networkConfig;
  if (!tokenAdminRegistry || !registryModuleOwnerCustom)
    throw new Error(
      `tokenAdminRegistry or registryModuleOwnerCustom missing for ${networkName}`
    );
  if (confirmations === undefined)
    throw new Error(`confirmations not defined for ${networkName}`);

  // ✅ Validate addresses
  if (!hre.viem.isAddress(tokenaddress))
    throw new Error(`Invalid token address: ${tokenaddress}`);
  if (!hre.viem.isAddress(safeaddress))
    throw new Error(`Invalid Safe address: ${safeaddress}`);

  // ✅ Load environment keys
  const pk1 = process.env.PRIVATE_KEY;
  const pk2 = process.env.PRIVATE_KEY_2;
  if (!pk1 || !pk2)
    throw new Error("Both PRIVATE_KEY and PRIVATE_KEY_2 must be set");

  // ✅ Get RPC URL from Hardhat config
  const netCfg = hre.config.networks[networkName] as any;
  if (!netCfg?.url)
    throw new Error(`RPC URL not found for network ${networkName}`);
  const rpcUrl = netCfg.url;

  // ✅ Read token CCIP admin
  const token = await hre.viem.getContractAt({
    address: tokenaddress,
    abi: BurnMintERC20ABI,
  });
  const ccipAdmin = await token.read.getCCIPAdmin();
  logger.info(`Current CCIP admin: ${ccipAdmin}`);

  // ✅ Encode both function calls
  const registryModuleIface = new hre.viem.Interface(RegistryModuleOwnerCustomABI);
  const registryIface = new hre.viem.Interface(TokenAdminRegistryABI);

  const claimAdminData = registryModuleIface.encodeFunctionData(
    "registerAdminViaGetCCIPAdmin",
    [tokenaddress]
  );
  const acceptAdminData = registryIface.encodeFunctionData(
    "acceptAdminRole",
    [tokenaddress]
  );

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

  logger.info(`Prepared Safe meta-transactions for ${tokenaddress}`);

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

  // ✅ Create Safe transaction
  let safeTx: SafeTransaction;
  try {
    safeTx = await safe1.createTransaction({ transactions: metaTxs });
    logger.info("✅ Safe transaction (claim + accept) created");
  } catch (err) {
    logger.error("❌ Failed to create Safe transaction", err);
    throw err;
  }

  // ✅ Sign with both owners
  try {
    safeTx = await safe1.signTransaction(safeTx, SigningMethod.ETH_SIGN);
    logger.info("✅ Signed by owner 1");
    safeTx = await safe2.signTransaction(safeTx, SigningMethod.ETH_SIGN);
    logger.info("✅ Signed by owner 2");
  } catch (err) {
    logger.error("❌ Error signing Safe transaction", err);
    throw err;
  }

  // ✅ Execute via Safe
  logger.info("🚀 Executing Safe transaction (claim + accept admin role)...");
  let result: TransactionResult;
  try {
    result = await safe1.executeTransaction(safeTx);
  } catch (err) {
    logger.error("❌ Safe execution failed", err);
    throw err;
  }

  if (!result?.transactionResponse)
    throw new Error("No transaction response returned");

  logger.info(
    `⏳ Waiting ${confirmations} confirmations for tx ${result.hash}...`
  );
  await (result.transactionResponse as any).wait(confirmations);

  logger.info(`✅ Admin role claimed and accepted for ${tokenaddress}`);
}));
