import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types/hre";
import { isAddress } from "viem";
import { verifyContract } from "@nomicfoundation/hardhat-verify/verify";
import {
  Chains,
  logger,
  TokenContractName,
  getEVMNetworkConfig,
  validateNetworkName,
} from "../../config";

/**
 * Deploy a BurnMintERC20 token and transfer ownership to a Safe multisig.
 *
 * Example:
 * npx hardhat deployTokenWithSafe \
 *   --safeaddress 0xYourSafe \
 *   --name MyToken \
 *   --symbol MTK \
 *   --decimals 18 \
 *   --maxsupply 1000000 \
 *   --premint 10000 \
 *   --verifycontract \
 *   --network sepolia
 */
export const deployTokenWithSafe = task(
  "deployTokenWithSafe",
  "Deploys a BurnMintERC20 token and assigns Safe as owner & CCIP admin"
)
  .addOption({
    name: "safeaddress",
    description: "The Safe multisig address",
    defaultValue: "",
  })
  .addOption({
    name: "name",
    description: "The token name",
    defaultValue: "MyToken",
  })
  .addOption({
    name: "symbol",
    description: "The token symbol",
    defaultValue: "MTK",
  })
  .addOption({
    name: "decimals",
    description: "The token decimals",
    defaultValue: "18",
  })
  .addOption({
    name: "maxsupply",
    description: "The maximum supply",
    defaultValue: "0",
  })
  .addOption({
    name: "premint",
    description: "The amount to premint",
    defaultValue: "0",
  })
  .addFlag({
    name: "verifycontract",
    description: "Verify the contract on Etherscan",
  })
  .setAction(async () => ({
    default: async (
      {
        safeaddress,
        name = "MyToken",
        symbol = "MTK",
        decimals: decimalsStr = "18",
        maxsupply: maxsupplyStr = "0",
        premint: premintStr = "0",
        verifycontract = false,
      }: {
        safeaddress: string;
        name?: string;
        symbol?: string;
        decimals?: string;
        maxsupply?: string;
        premint?: string;
        verifycontract?: boolean;
      },
      hre: HardhatRuntimeEnvironment
    ) => {
      // Validate required parameters
      if (!safeaddress) {
        throw new Error("Safe address is required (--safeaddress)");
      }

      // Parse string parameters to proper types
      const decimals = parseInt(decimalsStr, 10);
      if (isNaN(decimals)) {
        throw new Error(`Invalid decimals value: ${decimalsStr}`);
      }

      const maxsupply = BigInt(maxsupplyStr);
      const premint = BigInt(premintStr);

      // Connect to network first
      const networkConnection = await hre.network.connect();
      const { viem } = networkConnection;
      const networkName = validateNetworkName(networkConnection.networkName);
      const networkConfig = getEVMNetworkConfig(networkName);
      if (!networkConfig) throw new Error(`Network ${networkName} not found`);
      const { confirmations } = networkConfig;
      if (confirmations === undefined)
        throw new Error(`confirmations missing for ${networkName}`);

      // ✅ Validate Safe address
      if (!isAddress(safeaddress))
        throw new Error(`Invalid Safe address: ${safeaddress}`);

      const [wallet] = await viem.getWalletClients();
      const publicClient = await viem.getPublicClient();

      try {
        logger.info(`⚙️  Deploying ${TokenContractName.BurnMintERC20} on ${networkName}...`);
        logger.info(`   Token: ${name} (${symbol})`);
        logger.info(`   Decimals: ${decimals}`);
        logger.info(`   Max supply: ${maxsupply}`);
        logger.info(`   Premint: ${premint}`);
        logger.info(`   Safe address: ${safeaddress}`);

        // ✅ Deploy BurnMintERC20 contract
        logger.info(`   Deploying contract...`);
        const constructorArgs: [string, string, number, bigint, bigint] = [
              name,
              symbol,
              decimals,
              maxsupply,
              premint
        ];
        
        // Deploy contract using deployContract method instead of sendDeploymentTransaction
        // to avoid the immediate getTransaction call that causes the error
        const hash = await wallet.deployContract({
          abi: (await hre.artifacts.readArtifact(TokenContractName.BurnMintERC20)).abi,
          bytecode: (await hre.artifacts.readArtifact(TokenContractName.BurnMintERC20)).bytecode as `0x${string}`,
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
        
        logger.info(`✅ Token deployed at: ${contractAddress}`);

        // ✅ Verify contract if requested
        if (verifycontract) {
          logger.info(`   Verifying contract...`);

          try {
            
            const isVerified = await verifyContract(
              {
                address: contractAddress,
                constructorArgs: [...constructorArgs],
              },
              hre,
            );

            if (isVerified) {
              logger.info(`   ✅ Token contract verified successfully`);
            } else {
              logger.warn(`   ⚠️  Token contract verification failed`);
            }
          } catch (error: any) {
            if (error.message?.includes("Already Verified")) {
              logger.warn(`   ⚠️  Token contract already verified`);
            } else {
              logger.error(`   ❌ Verification failed: ${error.message}`);
            }
          }
        }

        // Transfer ownership of the token to the Safe account
        logger.info(`   Transferring ownership of token to Safe at ${safeaddress}`);
        
        // Get the deployed token contract
        const token = await viem.getContractAt(
          TokenContractName.BurnMintERC20,
          contractAddress
        );
        
        const adminRole = await token.read.DEFAULT_ADMIN_ROLE();
        logger.info(`   Granting DEFAULT_ADMIN_ROLE to Safe: ${safeaddress}`);
        // ✅ Grant admin role to Safe
        const grantTx = await token.write.grantRole(
          [adminRole, safeaddress as `0x${string}`],
          { account: wallet.account }
        );
        
        logger.info(`   ⏳ Grant role tx: ${grantTx}`);
        await publicClient.waitForTransactionReceipt({ 
          hash: grantTx,
          confirmations,
        });
        logger.info(`   ✅ Safe granted DEFAULT_ADMIN_ROLE`);

        // ✅ Set Safe as CCIP admin
        logger.info(`   Setting CCIP admin to Safe...`);
        const ccipTx = await token.write.setCCIPAdmin(
          [safeaddress as `0x${string}`],
          { account: wallet.account }
        );
        
        logger.info(`   ⏳ Set CCIP admin tx: ${ccipTx}`);
        await publicClient.waitForTransactionReceipt({ 
          hash: ccipTx,
          confirmations,
        });
        logger.info(`   ✅ Safe set as CCIP admin`);

        logger.info(`\n✅ Token deployment and configuration complete!`);
        logger.info(`   Token address: ${contractAddress}`);
        logger.info(`   Safe address: ${safeaddress}`);

      } catch (error) {
        logger.error("❌ Token deployment failed:", error);
        throw error;
      }
    },
  }))
  .build();
