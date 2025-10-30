import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types/hre";
import {isAddress} from "viem";
import {
  Chains,
  TokenContractName,
  logger,
  getEVMNetworkConfig,
  validateNetworkName,
} from "../config";

/**
 * Mints tokens for a receiver.
 * Defaults to the connected signer's address if no receiver is specified.
 *
 * Example:
 * npx hardhat mintTokens \
 *   --tokenaddress 0xYourTokenAddress \
 *   --amount 1000000000000000000 \
 *   --receiveraddress 0xReceiverAddress \
 *   --network sepolia
 */
export const mintTokens = task("mintTokens", "Mints tokens for a specified receiver (defaults to signer)")
  .addOption({
    name: "tokenaddress",
    description: "The token address",
    defaultValue: "",
  })
  .addOption({
    name: "amount",
    description: "The amount to mint",
    defaultValue: "0",
  })
  .addOption({
    name: "receiveraddress",
    description: "The receiver address (defaults to signer)",
    defaultValue: "",
  })
  .setAction(async () => ({
    default: async (
      {
        tokenaddress,
        amount = "0",
        receiveraddress = "",
      }: {
        tokenaddress: string;
        amount?: string;
        receiveraddress?: string;
      },
      hre: HardhatRuntimeEnvironment
    ) => {
      // Validate token address is provided
      if (!tokenaddress) {
        throw new Error("Token address is required (--tokenaddress)");
      }

      // Validate amount
      if (!amount || amount === "0") {
        throw new Error("Amount is required and must be greater than 0 (--amount)");
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

      const { confirmations } = networkConfig;
      if (confirmations === undefined)
        throw new Error(`confirmations is not defined for ${networkName}`);

      const [wallet] = await viem.getWalletClients();
      const publicClient = await viem.getPublicClient();

      // Determine receiver address
      const to = receiveraddress || wallet.account.address;
      if (!isAddress(to))
        throw new Error(`Invalid receiver address: ${to}`);

      try {
        // Connect to token contract
        const token = await viem.getContractAt(
          TokenContractName.BurnMintERC20,
          tokenaddress as `0x${string}`
        );

        const symbol = await token.read.symbol();
        logger.info(`🪙 Minting ${amount} ${symbol} to ${to}...`);

        // Execute mint transaction
        const txHash = await token.write.mint([to, BigInt(amount)], {
          account: wallet.account,
        });

        logger.info(`⏳ Mint tx: ${txHash}`);
        logger.info(`   Waiting for ${confirmations} confirmation(s)...`);
        await publicClient.waitForTransactionReceipt({
          hash: txHash,
          confirmations,
        });

        // Log transaction and new balance
        const newBalance = await token.read.balanceOf([to]);
        logger.info(`✅ Minted ${amount} ${symbol} to ${to}`);
        logger.info(`   Current balance of ${to}: ${newBalance.toString()} ${symbol}`);
      } catch (error) {
        logger.error("❌ Token minting failed:", error);
        throw error;
      }
    },
  }))
  .build();
