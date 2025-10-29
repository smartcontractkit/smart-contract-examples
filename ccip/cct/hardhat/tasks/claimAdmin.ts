import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types/hre";
import { isAddress } from "viem";
import {
  Chains,
  TokenContractName,
  CCIPContractName,
  logger,
  getEVMNetworkConfig,
  validateNetworkName,
} from "../config";

/**
 * Enum defining registration modes
 */
enum RegistrationMode {
  GET_CCIP_ADMIN = "getCCIPAdmin",
  OWNER = "owner",
  ACCESS_CONTROL = "accessControl",
}

/**
 * Claims the admin of a token via various registration methods
 *
 * Example:
 * npx hardhat claimAdmin \
 *   --tokenaddress 0xYourToken \
 *   --mode getCCIPAdmin \
 *   --network sepolia
 */
export const claimAdmin = task("claimAdmin", "Claims the admin of a token via various registration methods")
  .addOption({
    name: "tokenaddress",
    description: "The token address",
    defaultValue: "",
  })
  .addOption({
    name: "mode",
    description: `Registration mode: ${Object.values(RegistrationMode).join(", ")}`,
    defaultValue: RegistrationMode.GET_CCIP_ADMIN,
  })
  .setAction(async () => ({
    default: async (
      {
        tokenaddress,
        mode = RegistrationMode.GET_CCIP_ADMIN,
      }: {
        tokenaddress: string;
        mode?: string;
      },
      hre: HardhatRuntimeEnvironment
    ) => {
      // Validate token address is provided
      if (!tokenaddress) {
        throw new Error("Token address is required (--tokenaddress)");
      }

      // Validate mode
      if (!Object.values(RegistrationMode).includes(mode as RegistrationMode)) {
        throw new Error(
          `Invalid mode: ${mode}. Must be one of: ${Object.values(RegistrationMode).join(", ")}`
        );
      }
      const registrationMode = mode as RegistrationMode;

      // Connect to network first
      const networkConnection = await hre.network.connect();
      const { viem } = networkConnection;
      const networkName = validateNetworkName(networkConnection.networkName);

      logger.info(`🎯 Claiming admin for ${tokenaddress} using ${registrationMode} mode`);

      const networkConfig = getEVMNetworkConfig(networkName);
      if (!networkConfig)
        throw new Error(`Network ${networkName} not found in config`);

      // Validate token address format
      if (!isAddress(tokenaddress))
        throw new Error(`Invalid token address: ${tokenaddress}`);

      const { registryModuleOwnerCustom, confirmations } = networkConfig;
      if (!registryModuleOwnerCustom)
        throw new Error(`registryModuleOwnerCustom missing for ${networkName}`);
      if (confirmations === undefined)
        throw new Error(`confirmations not defined for ${networkName}`);

      // Validate contract exists
      try {
        const code = await viem.getPublicClient().then(client =>
          client.getBytecode({ address: tokenaddress as `0x${string}` })
        );
        if (!code) {
          throw new Error(`No contract found at ${tokenaddress} on ${networkName}`);
        }
      } catch (error: any) {
        throw new Error(`Failed to validate contract at ${tokenaddress}: ${error.message}`);
      }

      const [wallet] = await viem.getWalletClients();
      const publicClient = await viem.getPublicClient();

      try {
        // Connect to contracts
        const registry = await viem.getContractAt(
          CCIPContractName.RegistryModuleOwnerCustom,
          registryModuleOwnerCustom as `0x${string}`
        );
        const token = await viem.getContractAt(
          TokenContractName.BurnMintERC20,
          tokenaddress as `0x${string}`
        );
        const ownerIsCreator = await viem.getContractAt(
          CCIPContractName.OwnerIsCreator,
          tokenaddress as `0x${string}`
        );

        // Call the appropriate method based on mode
        let txHash: `0x${string}`;

        if (registrationMode === RegistrationMode.OWNER) {
          // For Owner mode, check if token implements Ownable
          try {
            const owner = await ownerIsCreator.read.owner();
            if (owner.toLowerCase() !== wallet.account.address.toLowerCase()) {
              throw new Error(
                `Current wallet ${wallet.account.address} is NOT the token owner (${owner}).` +
                  `\nSwitch wallet or use a different mode.`
              );
            }
            logger.info(`✅ Current wallet ${wallet.account.address} is owner`);

            const hash = await registry.write.registerAdminViaOwner([tokenaddress], {
              account: wallet.account.address,
            });
            txHash = hash;
            logger.info(`📤 TX sent: ${hash}. Waiting for ${confirmations} confirmations...`);
          } catch (error: any) {
            // Check if it's an ABI error (function doesn't exist)
            if (error?.message?.includes("does not exist") || 
                error?.message?.includes("ABI") ||
                error?.message?.includes("owner")) {
              throw new Error(
                `Token ${tokenaddress} does not support owner() function.\nUse a different mode (e.g., getCCIPAdmin or accessControl).`
              );
            }
            throw new Error(
              `Failed to register via owner: ${error?.message || String(error)}`
            );
          }
        } else if (registrationMode === RegistrationMode.GET_CCIP_ADMIN) {
          let ccipAdmin: `0x${string}`;
          try {
            const adminResult = await token.read.getCCIPAdmin();
            if (!isAddress(adminResult)) {
              throw new Error(`Invalid address returned from getCCIPAdmin: ${adminResult}`);
            }
            ccipAdmin = adminResult as `0x${string}`;
          } catch (error: any) {
            // Check if it's an ABI error (function doesn't exist)
            if (error?.message?.includes("does not exist") || 
                error?.message?.includes("ABI") ||
                error?.message?.includes("getCCIPAdmin")) {
              throw new Error(
                `Token ${tokenaddress} does not support getCCIPAdmin() function.\nCheck it implements IGetCCIPAdmin or use a different mode (e.g., owner or accessControl).`
              );
            }
            throw new Error(
              `Failed to call getCCIPAdmin: ${error?.message || String(error)}`
            );
          }

          if (ccipAdmin.toLowerCase() !== wallet.account.address.toLowerCase()) {
            throw new Error(
              `Current wallet ${wallet.account.address} is NOT the token's CCIP admin (${ccipAdmin}).\nSwitch wallet or use a different mode.`
            );
          }
          logger.info(`✅ Current wallet ${wallet.account.address} is CCIP admin`);

          const hash = await registry.write.registerAdminViaGetCCIPAdmin([tokenaddress], {
            account: wallet.account.address,
          });
          txHash = hash;
          logger.info(`📤 TX sent: ${hash}. Waiting for ${confirmations} confirmations...`);
        } else if (registrationMode === RegistrationMode.ACCESS_CONTROL) {
          try {
            const ADMIN_ROLE = await token.read.DEFAULT_ADMIN_ROLE();
            const hasRole = await token.read.hasRole([
              ADMIN_ROLE,
              wallet.account.address,
            ]);
            if (!hasRole) {
              throw new Error(
                `Current wallet ${wallet.account.address} does NOT have the CCIP_ADMIN_ROLE.\nGrant the role first or use a different mode.`
              );
            }
            logger.info(
              `✅ Current wallet ${wallet.account.address} has the CCIP_ADMIN_ROLE (${ADMIN_ROLE})`
            );

            const hash = await registry.write.registerAccessControlDefaultAdmin([tokenaddress], {
              account: wallet.account.address,
            });
            txHash = hash;
            logger.info(`📤 TX sent: ${hash}. Waiting for ${confirmations} confirmations...`);
          } catch (error: any) {
            // Check if it's an ABI error (function doesn't exist)
            if (error?.message?.includes("does not exist") || 
                error?.message?.includes("ABI") ||
                error?.message?.includes("CCIP_ADMIN_ROLE") ||
                error?.message?.includes("hasRole")) {
              throw new Error(
                `Token ${tokenaddress} does not support AccessControl (CCIP_ADMIN_ROLE or hasRole functions missing).\nUse a different mode (e.g., owner or getCCIPAdmin).`
              );
            }
            throw new Error(
              `Failed to register via access control: ${error?.message || String(error)}`
            );
          }
        } else {
          throw new Error(`Mode ${registrationMode} not yet implemented`);
        }

        // Confirm transaction
        await publicClient.waitForTransactionReceipt({ hash: txHash, confirmations });
        logger.info(
          `✅ Admin claimed for ${tokenaddress} on ${networkName} (${confirmations} confirmations)`
        );
      } catch (error: any) {
        logger.error(`❌ Failed to claim admin: ${error?.message || String(error)}`);
        throw error;
      }
    },
  }))
  .build();
