import { task } from "hardhat/config";
import {
  Chains,
  logger,
  TokenContractName,
  getEVMNetworkConfig,
} from "../../config";
import BurnMintERC20ABI from "@chainlink/contracts/abi/v0.8/shared/BurnMintERC20.abi.json";

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
 *   --verifycontract true \
 *   --network sepolia
 */
task(
  "deployTokenWithSafe",
  "Deploys a BurnMintERC20 token and assigns Safe as owner & CCIP admin"
).setAction(<any>(async (taskArgs: {
  safeaddress: string;
  name: string;
  symbol: string;
  decimals?: number;
  maxsupply?: bigint;
  premint?: bigint;
  verifycontract?: boolean;
}, hre: any) => {
  const {
    safeaddress,
    name,
    symbol,
    decimals = 18,
    maxsupply = 0n,
    premint = 0n,
    verifycontract = false,
  } = taskArgs;

  const networkName = hre.network.name as Chains;

  // ✅ Validate network configuration
  const networkConfig = getEVMNetworkConfig(networkName);
  if (!networkConfig)
    throw new Error(`Network ${networkName} not found in config`);

  // ✅ Validate Safe address
  if (!hre.viem.isAddress(safeaddress))
    throw new Error(`Invalid Safe address: ${safeaddress}`);

  logger.info(`🚀 Deploying ${TokenContractName.BurnMintERC20} on ${networkName}`);
  logger.info(`Token: ${name} (${symbol}), Safe: ${safeaddress}`);

  const [wallet] = await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();

  try {
    // ✅ Deploy BurnMintERC20 contract
    const { contractAddress, txHash } = await hre.viem.deployContract(
      TokenContractName.BurnMintERC20,
      [name, symbol, decimals, maxsupply, premint]
    );

    const { confirmations } = networkConfig;
    if (confirmations === undefined)
      throw new Error(`confirmations not defined for ${networkName}`);

    logger.info(`⏳ Deployment tx: ${txHash}`);
    await publicClient.waitForTransactionReceipt({ hash: txHash });

    logger.info(`✅ Token deployed at: ${contractAddress}`);

    // ✅ Optional contract verification
    if (verifycontract) {
      logger.info("Verifying contract on Etherscan...");
      try {
        await hre.run("verify:verify", {
          address: contractAddress,
          constructorArguments: [name, symbol, decimals, maxsupply, premint],
        });
        logger.info("✅ Contract verified successfully");
      } catch (err: any) {
        if (err.message?.includes("Already Verified")) {
          logger.warn("Already verified on explorer");
        } else {
          logger.error(`Verification failed: ${err.message}`);
        }
      }
    }

    // ✅ Connect to deployed token
    const token = await hre.viem.getContractAt({
      address: contractAddress,
      abi: BurnMintERC20ABI,
    });

    // ✅ Grant admin role to Safe
    const adminRole = await token.read.DEFAULT_ADMIN_ROLE();
    logger.info(`Granting DEFAULT_ADMIN_ROLE to Safe: ${safeaddress}`);
    const grantTx = await token.write.grantRole(
      [adminRole, safeaddress],
      { account: wallet.account }
    );
    await publicClient.waitForTransactionReceipt({ hash: grantTx });
    logger.info("✅ Safe granted DEFAULT_ADMIN_ROLE");

    // ✅ Set Safe as CCIP admin
    logger.info("Setting CCIP admin to Safe...");
    const ccipTx = await token.write.setCCIPAdmin(
      [safeaddress],
      { account: wallet.account }
    );
    await publicClient.waitForTransactionReceipt({ hash: ccipTx });
    logger.info("✅ Safe set as CCIP admin");
  } catch (error) {
    logger.error("❌ Token deployment failed:", error);
    throw error;
  }
}));
