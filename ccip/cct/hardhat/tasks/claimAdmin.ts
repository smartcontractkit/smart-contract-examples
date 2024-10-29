import { task, types } from "hardhat/config";
import { Chains, networks, logger } from "../config";

interface ClaimAdminTaskArgs {
  withccipadmin: boolean;
  tokenaddress: string;
}

// Task to claim the admin role for a token, either via owner() or getCCIPAdmin()
task("claimAdmin", "Claims the admin of a token")
  .addOptionalParam(
    "withccipadmin", // Whether the token contract uses a CCIP admin (getCCIPAdmin())
    "Does the contract have a CCIP admin?",
    false,
    types.boolean
  )
  .addParam("tokenaddress", "The address of the token") // Token address
  .setAction(async (taskArgs: ClaimAdminTaskArgs, hre) => {
    const { withccipadmin: withCCIPAdmin, tokenaddress: tokenAddress } =
      taskArgs;
    const networkName = hre.network.name as Chains;

    // Retrieve the network configuration
    const networkConfig = networks[networkName];
    if (!networkConfig) {
      throw new Error(`Network ${networkName} not found in config`);
    }

    // Validate the provided token address
    if (!hre.ethers.isAddress(tokenAddress)) {
      throw new Error(`Invalid token address: ${tokenAddress}`);
    }

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

    // Get the signers (tokenAdmin will be used if CCIP admin is involved)
    const [signer, tokenAdmin] = await hre.ethers.getSigners();

    let tx;

    // If using CCIP admin, register via getCCIPAdmin() function
    if (withCCIPAdmin) {
      const { RegistryModuleOwnerCustom__factory } = await import(
        "../typechain-types"
      );
      const { BurnMintERC677WithCCIPAdmin__factory } = await import(
        "../typechain-types"
      );

      // Connect to the RegistryModuleOwnerCustom and token contracts
      const registryModuleOwnerCustomContract =
        RegistryModuleOwnerCustom__factory.connect(
          registryModuleOwnerCustom,
          tokenAdmin
        );
      const tokenContract = BurnMintERC677WithCCIPAdmin__factory.connect(
        tokenAddress,
        tokenAdmin
      );

      // Verify that the current CCIP admin matches the token admin
      const tokenContractCCIPAdmin = await tokenContract.getCCIPAdmin();
      logger.info(`Current token admin: ${tokenContractCCIPAdmin}`);
      if (tokenContractCCIPAdmin !== tokenAdmin.address) {
        throw new Error(
          `CCIP admin of token ${tokenAddress} is not ${tokenAdmin.address}`
        );
      }

      // Claim the admin role via the getCCIPAdmin() function
      logger.info(
        `Claiming admin of ${tokenAddress} via getCCIPAdmin() for CCIP admin ${tokenAdmin.address}`
      );
      tx = await registryModuleOwnerCustomContract.registerAdminViaGetCCIPAdmin(
        tokenAddress
      );
    } else {
      // If no CCIP admin, register via the owner() function
      const { RegistryModuleOwnerCustom__factory } = await import(
        "../typechain-types"
      );
      const { BurnMintERC677__factory } = await import("../typechain-types");

      // Connect to the token contract and check the current owner
      const tokenContract = BurnMintERC677__factory.connect(
        tokenAddress,
        signer
      );
      logger.info(`Current token owner: ${await tokenContract.owner()}`);
      logger.info(
        `Claiming admin of ${tokenAddress} via owner() for signer ${signer.address}`
      );

      // Register the admin via the owner() function
      const registryModuleOwnerCustomContract =
        RegistryModuleOwnerCustom__factory.connect(
          registryModuleOwnerCustom,
          signer
        );
      tx = await registryModuleOwnerCustomContract.registerAdminViaOwner(
        tokenAddress
      );
    }

    // Wait for transaction confirmation
    await tx.wait(confirmations);
    logger.info(`Claimed admin of ${tokenAddress} tx: ${tx.hash}`);
  });
