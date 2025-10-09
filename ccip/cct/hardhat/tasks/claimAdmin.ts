import { task } from "hardhat/config";
import { Chains, logger, getEVMNetworkConfig } from "../config";
import RegistryModuleOwnerCustomABI from "@chainlink/contracts-ccip/abi/RegistryModuleOwnerCustom.abi.json";
import BurnMintERC20ABI from "@chainlink/contracts/abi/v0.8/shared/BurnMintERC20.abi.json";

/**
 * Enum defining registration modes
 */
enum RegistrationMode {
  GET_CCIP_ADMIN = "getCCIPAdmin",
  OWNER = "owner",
  ACCESS_CONTROL = "accessControl",
}

/**
 * Validate that a token address points to a deployed contract
 */
async function validateContractExists(tokenAddress: string, hre: any) {
  try {
    const code = await hre.viem.getPublicClient().getBytecode({ address: tokenAddress });
    if (!code) {
      throw new Error(`❌ No contract found at ${tokenAddress} on ${hre.network.name}`);
    }
  } catch (error: any) {
    throw new Error(`❌ Failed to validate contract at ${tokenAddress}: ${error.message}`);
  }
}

/**
 * Hardhat 3 + Viem version of claimAdmin
 */
task("claimAdmin", "Claims the admin of a token via various registration methods")
  .setAction(<any>(async (taskArgs: { tokenaddress: string; mode?: string }, hre: any) => {
    const { tokenaddress, mode = RegistrationMode.GET_CCIP_ADMIN } = taskArgs;
    const networkName = hre.network.name as Chains;

    // ✅ Validate mode
    if (!Object.values(RegistrationMode).includes(mode as RegistrationMode)) {
      throw new Error(
        `Invalid mode: ${mode}. Must be one of: ${Object.values(RegistrationMode).join(", ")}`
      );
    }
    const registrationMode = mode as RegistrationMode;

    logger.info(`🎯 Claiming admin for ${tokenaddress} using ${registrationMode} mode`);

    // ✅ Network + contract checks
    const networkConfig = getEVMNetworkConfig(networkName);
    if (!networkConfig) throw new Error(`Network ${networkName} not found in config`);
    if (!hre.viem.isAddress(tokenaddress)) throw new Error(`Invalid token address: ${tokenaddress}`);

    await validateContractExists(tokenaddress, hre);

    const { registryModuleOwnerCustom, confirmations } = networkConfig;
    if (!registryModuleOwnerCustom)
      throw new Error(`registryModuleOwnerCustom missing for ${networkName}`);
    if (confirmations === undefined)
      throw new Error(`confirmations not defined for ${networkName}`);

    // ✅ Wallet + public client
    const [wallet] = await hre.viem.getWalletClients();
    const publicClient = await hre.viem.getPublicClient();

    // ✅ Connect to contracts
    const registry = await hre.viem.getContractAt({
      address: registryModuleOwnerCustom,
      abi: RegistryModuleOwnerCustomABI,
    });
    const token = await hre.viem.getContractAt({
      address: tokenaddress,
      abi: BurnMintERC20ABI,
    });

    // ✅ Mode-specific logic
    let txHash: string | undefined;

    switch (registrationMode) {
      case RegistrationMode.GET_CCIP_ADMIN: {
        const admin = await token.read.getCCIPAdmin();
        logger.info(`Current CCIP admin: ${admin}`);
        if (admin.toLowerCase() !== wallet.account.address.toLowerCase())
          throw new Error(`Signer ${wallet.account.address} is not CCIP admin of ${tokenaddress}`);

        logger.info(`Claiming admin via getCCIPAdmin()...`);
        txHash = await registry.write.registerAdminViaGetCCIPAdmin([tokenaddress], {
          account: wallet.account,
        });
        break;
      }

      case RegistrationMode.OWNER: {
        const owner = await token.read.owner();
        logger.info(`Current token owner: ${owner}`);
        if (owner.toLowerCase() !== wallet.account.address.toLowerCase())
          throw new Error(`Signer ${wallet.account.address} is not owner of ${tokenaddress}`);

        logger.info(`Claiming admin via owner()...`);
        txHash = await registry.write.registerAdminViaOwner([tokenaddress], {
          account: wallet.account,
        });
        break;
      }

      case RegistrationMode.ACCESS_CONTROL: {
        const defaultAdminRole = await token.read.DEFAULT_ADMIN_ROLE();
        const hasRole = await token.read.hasRole([
          defaultAdminRole,
          wallet.account.address,
        ]);
        logger.info(`Default admin role: ${defaultAdminRole}`);
        logger.info(`Signer has admin role: ${hasRole}`);

        if (!hasRole)
          throw new Error(
            `Signer ${wallet.account.address} does not have DEFAULT_ADMIN_ROLE for ${tokenaddress}`
          );

        logger.info(`Claiming admin via AccessControl DEFAULT_ADMIN_ROLE...`);
        txHash = await registry.write.registerAccessControlDefaultAdmin([tokenaddress], {
          account: wallet.account,
        });
        break;
      }
    }

    // ✅ Wait for confirmations
    if (!txHash) throw new Error("No transaction hash returned.");
    logger.info(`⏳ Tx sent: ${txHash}`);
    await publicClient.waitForTransactionReceipt({ hash: txHash });
    logger.info(`✅ Successfully claimed admin for ${tokenaddress} via ${registrationMode}.`);
  }));
