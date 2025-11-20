import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types/hre";
import { verifyContract } from "@nomicfoundation/hardhat-verify/verify";
import { isAddress } from "viem";
import {
  Chains,
  logger,
  TokenPoolContractName,
  PoolType,
  getEVMNetworkConfig,
  validateNetworkName,
  TokenContractName,
} from "../config";

/**
 * Deploy a token pool (BurnMintTokenPool or LockReleaseTokenPool)
 *
 * Example:
 * npx hardhat deployTokenPool \
 *   --tokenaddress 0xYourToken \
 *   --pooltype burnMint \
 *   --localtokendecimals 18 \
 *   --allowlist "0xAddress1,0xAddress2,0xAddress3" \
 *   --verifycontract \
 *   --network sepolia
 */
export const deployTokenPool = task("deployTokenPool", "Deploys a token pool (burnMint or lockRelease)")
  .addOption({
    name: "tokenaddress",
    description: "The token address",
    defaultValue: "",
  })
  .addOption({
    name: "pooltype",
    description: "Pool type: burnMint or lockRelease",
    defaultValue: "burnMint",
  })
  .addOption({
    name: "localtokendecimals",
    description: "The token decimals",
    defaultValue: "18",
  })
  .addOption({
    name: "allowlist",
    description: "Comma-separated list of allowed addresses (optional, leave empty for no restrictions)",
    defaultValue: "",
  })
  .addFlag({
    name: "verifycontract",
    description: "Verify the contract on Etherscan",
  })
  .setAction(async () => ({
    default: async (
      {
        tokenaddress,
        pooltype = "burnMint",
        localtokendecimals = "18",
        allowlist = "",
        verifycontract = false,
      }: {
        tokenaddress: string;
        pooltype?: string;
        localtokendecimals?: string;
        allowlist?: string;
        verifycontract?: boolean;
      },
      hre: HardhatRuntimeEnvironment
    ) => {
      // Validate token address is provided
      if (!tokenaddress) {
        throw new Error("Token address is required (--tokenaddress)");
      }

      // Connect to network first
      const networkConnection = await hre.network.connect();
      const { viem } = networkConnection;
      const networkName = validateNetworkName(networkConnection.networkName);

      const networkConfig = getEVMNetworkConfig(networkName);
      if (!networkConfig)
        throw new Error(`Network ${networkName} not found in config`);

      // Validate token address format
      if (!isAddress(tokenaddress))
        throw new Error(`Invalid token address: ${tokenaddress}`);

      const { router, rmnProxy, confirmations } = networkConfig;
      if (!router || !rmnProxy)
        throw new Error(`Router or RMN Proxy not defined for ${networkName}`);
      if (confirmations === undefined)
        throw new Error(`confirmations is not defined for ${networkName}`);

      // Convert decimals to number
      const decimalsNum = Number(localtokendecimals);

      // Parse allowlist from comma-separated string
      let allowlistAddresses: string[] = [];
      if (allowlist && allowlist.trim() !== "") {
        allowlistAddresses = allowlist.split(",").map(addr => addr.trim());
        
        // Validate all addresses in the allowlist
        for (const addr of allowlistAddresses) {
          if (!isAddress(addr)) {
            throw new Error(`Invalid address in allowlist: ${addr}`);
          }
        }
      }

      logger.info(`🚀 Deploying ${pooltype} pool on ${networkName}`);
      logger.info(`   Token: ${tokenaddress}`);
      logger.info(`   Decimals: ${decimalsNum}`);
      logger.info(`   Allowlist: ${allowlistAddresses.length > 0 ? allowlistAddresses.join(", ") : "None"}`);

      const [wallet] = await viem.getWalletClients();
      const publicClient = await viem.getPublicClient();

      try {
        // Determine contract name based on pool type
        let contractName: string;

        if (pooltype === PoolType.burnMint) {
          contractName = TokenPoolContractName.BurnMintTokenPool;
        } else if (pooltype === PoolType.lockRelease) {
          contractName = TokenPoolContractName.LockReleaseTokenPool;
        } else {
          throw new Error(`Invalid pool type: ${pooltype}. Use 'burnMint' or 'lockRelease'`);
        }

        // Deploy the token pool
        const constructorArgs: [string, number, string[], string, string] = [
            tokenaddress,
            decimalsNum,
            allowlistAddresses, // allowlist (empty array or provided addresses)
            rmnProxy,
            router,
        ];

        // Deploy contract using deployContract method instead of sendDeploymentTransaction
        // to avoid the immediate getTransaction call that causes the error
        const hash = await wallet.deployContract({
          abi: (await hre.artifacts.readArtifact(contractName)).abi,
          bytecode: (await hre.artifacts.readArtifact(contractName)).bytecode as `0x${string}`,
          args: constructorArgs,
        });

        logger.info(`⏳ Deployment tx: ${hash}`);
        logger.info(`   Waiting for ${confirmations} confirmation(s)...`);
        const receipt = await publicClient.waitForTransactionReceipt({
          hash,
          confirmations,
        });
        
        const contractAddress = receipt.contractAddress;
        if (!contractAddress) {
          throw new Error("Contract address not found in receipt");
        }
        
        logger.info(`✅ Token pool deployed at: ${contractAddress}`);

        // Grant mint/burn roles if BurnMint pool
        if (pooltype === PoolType.burnMint) {
          logger.info(
            `Granting mint and burn roles to ${contractAddress} on token ${tokenaddress}`
          );
          const token = await viem.getContractAt(
            TokenContractName.BurnMintERC20,
            tokenaddress as `0x${string}`
          );
          const grantTx = await token.write.grantMintAndBurnRoles(
            [contractAddress],
            { account: wallet.account }
          );
          logger.info(`   Waiting for ${confirmations} confirmation(s)...`);
          await publicClient.waitForTransactionReceipt({
            hash: grantTx,
            confirmations,
          });
          logger.info(`✅ Mint/Burn roles granted`);
        }

        // Verify contract if requested
        if (verifycontract) {
          logger.info("Verifying contract...");
          try {
            const isVerified = await verifyContract(
              {
                address: contractAddress,
                constructorArgs: [...constructorArgs],
              },
              hre,
            );

            if (isVerified) {
              logger.info("✅ Token pool contract verified successfully");
            } else {
              logger.warn("Token pool contract verification failed");
            }
          } catch (error: any) {
            if (error.message?.includes("Already Verified")) {
              logger.warn("Token pool contract already verified");
            } else {
              logger.error(`Verification failed: ${error.message}`);
            }
          }
        } else {
          logger.info("✅ Token pool contract deployed successfully (no verification)");
        }
      } catch (error) {
        logger.error("❌ Token pool deployment failed:", error);
        throw error;
      }
    },
  }))
  .build();
