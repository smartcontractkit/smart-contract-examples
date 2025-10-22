import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types/hre";
import { isAddress, formatUnits } from "viem";
import {
  Chains,
  TokenContractName,
  logger,
  getEVMNetworkConfig,
} from "../config";

/**
 * Checks the token balance of the wallet.
 *
 * Example:
 * npx hardhat checkTokenBalance \
 *   --tokenaddress 0xYourTokenAddress \
 *   --network sepolia
 */
export const checkTokenBalance = task(
  "checkTokenBalance",
  "Checks the token balance of the wallet"
)
  .addOption({
    name: "tokenaddress",
    description: "The token address",
    defaultValue: "",
  })
  .setAction(async () => ({
    default: async (
      {
        tokenaddress,
      }: {
        tokenaddress: string;
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
      const networkName = networkConnection.networkName as Chains;

      const networkConfig = getEVMNetworkConfig(networkName);
      if (!networkConfig)
        throw new Error(`Network ${networkName} not found in config`);

      // Validate token address format
      if (!isAddress(tokenaddress))
        throw new Error(`Invalid token address: ${tokenaddress}`);

      const [wallet] = await viem.getWalletClients();

      try {
        // Connect to token contract
        const token = await viem.getContractAt(
          TokenContractName.BurnMintERC20,
          tokenaddress as `0x${string}`
        );

        const symbol = await token.read.symbol();
        const decimals = await token.read.decimals();
        const balance = await token.read.balanceOf([wallet.account.address]);

        logger.info(`🔍 Token Balance Check`);
        logger.info(`   Token Address: ${tokenaddress}`);
        logger.info(`   Token Symbol: ${symbol}`);
        logger.info(`   Wallet Address: ${wallet.account.address}`);
        logger.info(`   Balance: ${balance.toString()} (${formatUnits(balance, Number(decimals))} ${symbol})`);
      } catch (error) {
        logger.error("❌ Failed to check token balance:", error);
        throw error;
      }
    },
  }))
  .build();
