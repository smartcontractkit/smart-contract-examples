import { task } from "hardhat/config";
import type { HardhatRuntimeEnvironment } from "hardhat/types/hre";
import { verifyContract } from "@nomicfoundation/hardhat-verify/verify";
import type { Address } from "viem";
import {
  CCIPContractName,
  logger,
  getEVMNetworkConfig,
  validateNetworkName,
} from "../../config";
import { NetworkError, ContractError } from "./types";
import { validateAddress } from "./validators";

/**
 * Task-specific types for deployEtherSenderReceiver
 */
interface DeployParams {
  readonly verifycontract: boolean;
}

interface DeployResult {
  readonly contractAddress: Address;
  readonly deploymentHash: `0x${string}`;
  readonly router: Address;
  readonly weth: Address;
  readonly version: string;
}

/**
 * Task to deploy an EtherSenderReceiver contract with optional verification.
 *
 * Example:
 * npx hardhat deployTokenSenderReceiver \
 *   --verifycontract \
 *   --network avalancheFuji
 */
export const deployTokenSenderReceiver = task(
  "deployTokenSenderReceiver",
  "Deploys an EtherSenderReceiver contract for cross-chain native token transfers"
)
  .addFlag({
    name: "verifycontract",
    description: "Verify the contract on Etherscan",
  })
  .setAction(async () => ({
    default: async (
      { verifycontract = false }: DeployParams,
      hre: HardhatRuntimeEnvironment
    ): Promise<DeployResult> => {
      // Connect to network first to get network connection details
      const networkConnection = await hre.network.connect();
      const { viem } = networkConnection;
      const networkName = validateNetworkName(networkConnection.networkName);

      logger.info(`🚀 Deploying EtherSenderReceiver on ${networkName}...`);

      // ✅ Get network configuration
      const evmNetworkConfig = getEVMNetworkConfig(networkName);
      if (!evmNetworkConfig) {
        throw new NetworkError(`Network ${networkName} not found in config`, {
          networkName
        });
      }

      const { router } = evmNetworkConfig;
      if (!router) {
        throw new NetworkError(`CCIP Router not configured for network: ${networkName}`, {
          networkName
        });
      }

      logger.info(`📍 Using CCIP Router: ${router}`);

      // ✅ Get public client
      const publicClient = await viem.getPublicClient();

      try {
        // ✅ Deploy contract
        const routerAddress = validateAddress(router, "router");
        const constructorArgs = [routerAddress];

        const { contract, deploymentTransaction } = await viem.sendDeploymentTransaction(
          CCIPContractName.EtherSenderReceiver,
          [routerAddress]
        );

        logger.info(`⏳ Deployment tx: ${deploymentTransaction.hash}`);

        const { confirmations } = evmNetworkConfig;

        logger.info(`   Waiting for ${confirmations} confirmation(s)...`);
        await publicClient.waitForTransactionReceipt({
          hash: deploymentTransaction.hash,
          confirmations,
        });

        logger.info(`✅ EtherSenderReceiver deployed at: ${contract.address}`);

        // ✅ Get contract info with proper typing
        const etherSenderReceiver = await viem.getContractAt(
          CCIPContractName.EtherSenderReceiver,
          contract.address
        );

        const [version, actualRouter, wethAddress] = await Promise.all([
          etherSenderReceiver.read.typeAndVersion(),
          etherSenderReceiver.read.getRouter(),
          etherSenderReceiver.read.i_weth(),
        ]) as [string, Address, Address];

        // ✅ Verify contract if requested
        let isVerified = false;
        if (verifycontract) {
          logger.info(`🔍 Verifying contract...`);
          try {
            isVerified = await verifyContract(
              {
                address: contract.address,
                constructorArgs: constructorArgs,
              },
              hre,
            );
          } catch (error) {
            logger.error(`❌ Verification failed:`, error);
          }
        }

        // ✅ Final deployment summary with all information
        logger.info(`🎉 Deployment completed successfully!`);
        logger.info(`📋 Contract Information:`);
        logger.info(`   Address: ${contract.address}`);
        logger.info(`   Network: ${networkName} (Chain ID: ${evmNetworkConfig.chainId})`);
        logger.info(`   Version: ${version}`);
        logger.info(`   Router: ${actualRouter}`);
        logger.info(`   WETH: ${wethAddress}`);
        logger.info(`   Verified: ${isVerified ? "✅ Yes" : "❌ No"}`);

        const result: DeployResult = {
          contractAddress: contract.address,
          deploymentHash: deploymentTransaction.hash,
          router: actualRouter,
          weth: wethAddress,
          version,
        };

        return result;

      } catch (error) {
        if (error instanceof NetworkError || error instanceof ContractError) {
          throw error;
        }

        logger.error(`❌ Deployment failed:`, error);
        throw new ContractError(`Failed to deploy EtherSenderReceiver contract`, {
          networkName,
          router: router,
          originalError: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }))
  .build();
