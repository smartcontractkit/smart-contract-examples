/**
 * Enhanced claimAdmin task supporting multiple registration modes.
 *
 * Features:
 * - Contract existence validation before attempting operations
 * - Multiple registration methods for different token types
 * - Clear error messages with natural error propagation
 * - Backward compatible default behavior (getCCIPAdmin)
 *
 * Usage examples:
 * 1. Default mode (getCCIPAdmin): npx hardhat claimAdmin --tokenaddress 0x123...
 * 2. Owner mode: npx hardhat claimAdmin --tokenaddress 0x123... --mode owner
 * 3. AccessControl mode: npx hardhat claimAdmin --tokenaddress 0x123... --mode accessControl
 *
 * Available modes:
 * - getCCIPAdmin: Uses token's getCCIPAdmin() method (default, backward compatible)
 * - owner: Uses token's owner() method via IOwner interface
 * - accessControl: Uses token's DEFAULT_ADMIN_ROLE via AccessControl
 *
 */

import { task, types } from "hardhat/config";
import { Chains, networks, logger, getEVMNetworkConfig } from "../config";

/**
 * Enum defining the available registration modes for token admin claiming.
 * Each mode corresponds to a different method in the RegistryModuleOwnerCustom contract.
 */
enum RegistrationMode {
  /** Uses the token's getCCIPAdmin() method for verification */
  GET_CCIP_ADMIN = "getCCIPAdmin",
  /** Uses the token's owner() method for verification */
  OWNER = "owner",
  /** Uses AccessControl's DEFAULT_ADMIN_ROLE for verification */
  ACCESS_CONTROL = "accessControl",
}

/**
 * Interface defining the arguments for the claimAdmin task
 */
interface ClaimAdminTaskArgs {
  /** The address of the token contract */
  tokenaddress: string;
  /** The registration mode to use (optional, defaults to getCCIPAdmin) */
  mode?: string;
}

/**
 * Helper function to validate that the token address points to a deployed contract
 */
async function validateContractExists(
  tokenAddress: string,
  hre: any
): Promise<void> {
  try {
    const code = await hre.ethers.provider.getCode(tokenAddress);
    if (code === "0x") {
      throw new Error(
        `❌ No contract found at address ${tokenAddress}.\n` +
          `💡 Please verify the token address is correct and the contract is deployed on ${hre.network.name}.`
      );
    }
  } catch (error: any) {
    if (error.message.includes("No contract found")) {
      throw error; // Re-throw our custom error
    }
    throw new Error(
      `❌ Failed to validate contract at ${tokenAddress}: ${error.message}\n` +
        `💡 Please check your network connection and token address.`
    );
  }
}

// Task to claim the admin role for a token using different registration methods
task("claimAdmin", "Claims the admin of a token")
  .addParam("tokenaddress", "The address of the token") // Token address
  .addOptionalParam(
    "mode",
    "Registration mode: 'getCCIPAdmin' (default), 'owner', or 'accessControl'",
    RegistrationMode.GET_CCIP_ADMIN,
    types.string
  )
  .setAction(async (taskArgs: ClaimAdminTaskArgs, hre) => {
    const {
      tokenaddress: tokenAddress,
      mode = RegistrationMode.GET_CCIP_ADMIN,
    } = taskArgs;
    const networkName = hre.network.name as Chains;

    // Validate registration mode
    if (!Object.values(RegistrationMode).includes(mode as RegistrationMode)) {
      throw new Error(
        `Invalid registration mode: ${mode}. Must be one of: ${Object.values(
          RegistrationMode
        ).join(", ")}`
      );
    }

    const registrationMode = mode as RegistrationMode;

    logger.info(
      `🎯 Attempting to claim admin for token ${tokenAddress} using ${registrationMode} mode`
    );

    // Retrieve the network configuration
    const networkConfig = getEVMNetworkConfig(networkName);
    if (!networkConfig) {
      throw new Error(`Network ${networkName} not found in config`);
    }

    // Validate the provided token address
    if (!hre.ethers.isAddress(tokenAddress)) {
      throw new Error(`Invalid token address: ${tokenAddress}`);
    }

    // Validate that a contract exists at the token address
    await validateContractExists(tokenAddress, hre);

    // Retrieve the RegistryModuleOwnerCustom contract address and confirmations
    const { registryModuleOwnerCustom, confirmations } = networkConfig;
    if (!registryModuleOwnerCustom) {
      throw new Error(
        `registryModuleOwnerCustom is not defined for ${networkName}`
      );
    }

    if (confirmations === undefined) {
      throw new Error(`confirmations is not defined for ${networkName}`);
    }

    // Get the signers
    const [tokenAdmin] = await hre.ethers.getSigners();

    let tx;

    const { RegistryModuleOwnerCustom__factory } = await import(
      "../typechain-types"
    );
    const { BurnMintERC20__factory } = await import("../typechain-types");

    // Connect to the RegistryModuleOwnerCustom and token contracts
    const registryModuleOwnerCustomContract =
      RegistryModuleOwnerCustom__factory.connect(
        registryModuleOwnerCustom,
        tokenAdmin
      );
    const tokenContract = BurnMintERC20__factory.connect(
      tokenAddress,
      tokenAdmin
    );

    // Execute registration based on the selected mode with defensive programming
    switch (registrationMode) {
      case RegistrationMode.GET_CCIP_ADMIN: {
        // Verify that the current CCIP admin matches the signer
        const tokenContractCCIPAdmin = await tokenContract.getCCIPAdmin();
        logger.info(`Current token CCIP admin: ${tokenContractCCIPAdmin}`);
        if (tokenContractCCIPAdmin !== tokenAdmin.address) {
          throw new Error(
            `CCIP admin of token ${tokenAddress} is not ${tokenAdmin.address}`
          );
        }

        // Claim the admin role via the getCCIPAdmin() function
        logger.info(
          `Claiming admin of ${tokenAddress} via getCCIPAdmin() for CCIP admin ${tokenAdmin.address}`
        );
        tx =
          await registryModuleOwnerCustomContract.registerAdminViaGetCCIPAdmin(
            tokenAddress
          );
        break;
      }

      case RegistrationMode.OWNER: {
        // Import IOwner interface to check ownership
        const { IOwner__factory } = await import("../typechain-types");
        const ownableContract = IOwner__factory.connect(
          tokenAddress,
          tokenAdmin
        );

        // Verify that the current owner matches the signer
        const tokenContractOwner = await ownableContract.owner();
        logger.info(`Current token owner: ${tokenContractOwner}`);
        if (tokenContractOwner !== tokenAdmin.address) {
          throw new Error(
            `Owner of token ${tokenAddress} is not ${tokenAdmin.address}`
          );
        }

        // Claim the admin role via the owner() function
        logger.info(
          `Claiming admin of ${tokenAddress} via owner() for owner ${tokenAdmin.address}`
        );
        tx = await registryModuleOwnerCustomContract.registerAdminViaOwner(
          tokenAddress
        );
        break;
      }

      case RegistrationMode.ACCESS_CONTROL: {
        // Get the DEFAULT_ADMIN_ROLE and verify the signer has it
        const defaultAdminRole = await tokenContract.DEFAULT_ADMIN_ROLE();
        const hasAdminRole = await tokenContract.hasRole(
          defaultAdminRole,
          tokenAdmin.address
        );

        logger.info(`Default admin role: ${defaultAdminRole}`);
        logger.info(`Signer has default admin role: ${hasAdminRole}`);

        if (!hasAdminRole) {
          throw new Error(
            `Signer ${tokenAdmin.address} does not have DEFAULT_ADMIN_ROLE for token ${tokenAddress}`
          );
        }

        // Claim the admin role via the AccessControl default admin
        logger.info(
          `Claiming admin of ${tokenAddress} via AccessControl DEFAULT_ADMIN_ROLE for admin ${tokenAdmin.address}`
        );
        tx =
          await registryModuleOwnerCustomContract.registerAccessControlDefaultAdmin(
            tokenAddress
          );
        break;
      }

      default: {
        // TypeScript exhaustiveness check - this should never be reached
        const exhaustiveCheck: never = registrationMode;
        throw new Error(`Unhandled registration mode: ${exhaustiveCheck}`);
      }
    }

    // Wait for transaction confirmation with error handling
    try {
      await tx.wait(confirmations);
      logger.info(
        `✅ Successfully claimed admin of ${tokenAddress} using ${registrationMode} mode. Transaction: ${tx.hash}`
      );
    } catch (error: any) {
      throw new Error(
        `❌ Transaction failed during confirmation: ${error.message}\n` +
          `🔗 Transaction hash: ${tx.hash}\n` +
          `💡 Check the transaction on the block explorer for detailed error information.`
      );
    }
  });
