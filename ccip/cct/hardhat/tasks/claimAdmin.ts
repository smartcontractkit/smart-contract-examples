import { task } from "hardhat/config";
import { Chains, networks, logger } from "../config";

interface ClaimAdminTaskArgs {
  tokenaddress: string;
}

// Task to claim the admin role for a token
task("claimAdmin", "Claims the admin of a token")
  .addParam("tokenaddress", "The address of the token") // Token address
  .setAction(async (taskArgs: ClaimAdminTaskArgs, hre) => {
    const { tokenaddress: tokenAddress } =
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

    // Get the signers
    const [tokenAdmin] = await hre.ethers.getSigners();

    let tx;

    const { RegistryModuleOwnerCustom__factory } = await import(
      "../typechain-types"
    );
    const { BurnMintERC20__factory } = await import(
      "../typechain-types"
    );

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

    // Verify that the current CCIP admin matches the signer
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

    // Wait for transaction confirmation
    await tx.wait(confirmations);
    logger.info(`Claimed admin of ${tokenAddress} tx: ${tx.hash}`);
  });
