import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types/hre";
import { Chains, TokenPoolContractName, logger, getEVMNetworkConfig, validateNetworkName } from "../../config";
import { isAddress } from "viem";
import { verifyContract } from "@nomicfoundation/hardhat-verify/verify";

/**
 * Deploys a BurnMintTokenPool contract and transfers ownership to a Safe multisig.
 *
 * Example:
 * npx hardhat deployTokenPoolWithSafe \
 *   --tokenaddress 0xYourToken \
 *   --safeaddress 0xYourSafe \
 *   --localtokendecimals 18 \
 *   --verifycontract \
 *   --network sepolia
 */
export const deployTokenPoolWithSafe = task(
  "deployTokenPoolWithSafe",
  "Deploy a BurnMintTokenPool and transfer ownership to a Safe"
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
  .addOption({
    name: "localtokendecimals",
    description: "Decimals for the local token",
    defaultValue: "18",
  })
  .addFlag({
    name: "verifycontract",
    description: "Verify the contract on Etherscan",
  })
  .setAction(async () => ({
    default: async (
      {
        tokenaddress = "",
        safeaddress = "",
        localtokendecimals = "18",
        verifycontract = false,
      }: {
        tokenaddress?: string;
        safeaddress?: string;
        localtokendecimals?: string;
        verifycontract?: boolean;
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

      // ⚙️ Validate addresses
      if (!isAddress(tokenaddress))
        throw new Error(`❌ Invalid token address: ${tokenaddress}`);
      if (!isAddress(safeaddress))
        throw new Error(`❌ Invalid Safe address: ${safeaddress}`);

      // ⚙️ Parse decimals
      const decimals = parseInt(localtokendecimals);
      if (isNaN(decimals) || decimals < 0) {
        throw new Error(`❌ Invalid decimals: ${localtokendecimals}`);
      }

      // ⚙️ Get router and RMN proxy addresses
      const { router, rmnProxy } = networkConfig;
      if (!router || !rmnProxy)
        throw new Error(`❌ Router or RMN Proxy not defined for ${networkName}`);

      const [wallet] = await viem.getWalletClients();

      logger.info(`⚙️ Deploying BurnMintTokenPool on ${networkName}`);
      logger.info(`Token: ${tokenaddress}`);
      logger.info(`Safe:  ${safeaddress}`);
      logger.info(`Decimals: ${decimals}`);

      try {
        // ⚙️ Deploy contract
        const constructorArgs: [`0x${string}`, number, `0x${string}`[], `0x${string}`, `0x${string}`] = [
          tokenaddress as `0x${string}`,
          decimals,
          [],
          rmnProxy as `0x${string}`,
          router as `0x${string}`
        ];

        // Deploy contract using deployContract method instead of sendDeploymentTransaction
        // to avoid the immediate getTransaction call that causes the error
        const hash = await wallet.deployContract({
          abi: (await hre.artifacts.readArtifact(TokenPoolContractName.BurnMintTokenPool)).abi,
          bytecode: (await hre.artifacts.readArtifact(TokenPoolContractName.BurnMintTokenPool)).bytecode as `0x${string}`,
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
        
        logger.info(`✅ TokenPool deployed at: ${contractAddress}`);

        // ⚙️ Optional verification
        if (verifycontract) {
          logger.info("⚙️ Verifying contract...");
          try {
            const isVerified = await verifyContract(
              {
                address: contractAddress,
                constructorArgs: [...constructorArgs],
              },
              hre
            );

            if (isVerified) {
              logger.info("✅ TokenPool contract verified successfully");
            } else {
              logger.warn("⚠️ TokenPool contract verification failed");
            }
          } catch (err: any) {
            if (err.message?.includes("Already Verified")) {
              logger.warn("⚠️ Already verified on Etherscan");
            } else {
              logger.error(`❌ Verification failed: ${err.message}`);
            }
          }
        }

        // ⚙️ Transfer ownership to Safe
        logger.info(`⚙️ Transferring ownership to Safe: ${safeaddress}`);
        const pool = await viem.getContractAt(
          TokenPoolContractName.BurnMintTokenPool,
          contractAddress
        );

        const transferTx = await pool.write.transferOwnership(
          [safeaddress as `0x${string}`],
          { account: wallet.account }
        );
        await publicClient.waitForTransactionReceipt({ hash: transferTx });

        logger.info(`✅ Ownership transferred to Safe at ${safeaddress}`);
      } catch (error) {
        logger.error("❌ TokenPool deployment failed:", error);
        throw error;
      }
    },
  }))
  .build();
