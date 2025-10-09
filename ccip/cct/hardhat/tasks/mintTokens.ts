import { task } from "hardhat/config";
import { Chains, logger, getEVMNetworkConfig } from "../config";
import BurnMintERC20ABI from "@chainlink/contracts/abi/v0.8/shared/BurnMintERC20.abi.json";

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
task("mintTokens", "Mints tokens for a specified receiver (defaults to signer)")
  .setAction(<any>(async (taskArgs: {
    tokenaddress: string;
    amount: string;
    receiveraddress?: string;
  }, hre: any) => {
    const { tokenaddress, amount, receiveraddress } = taskArgs;
    const networkName = hre.network.name as Chains;

    // ✅ Load network configuration
    const networkConfig = getEVMNetworkConfig(networkName);
    if (!networkConfig)
      throw new Error(`Network ${networkName} not found in config`);

    // ✅ Wallet and client
    const [wallet] = await hre.viem.getWalletClients();
    const publicClient = await hre.viem.getPublicClient();

    const to = receiveraddress || wallet.account.address;
    if (!hre.viem.isAddress(to))
      throw new Error(`Invalid receiver address: ${to}`);

    // ✅ Connect to token contract
    const token = await hre.viem.getContractAt({
      address: tokenaddress,
      abi: BurnMintERC20ABI,
    });

    const symbol = await token.read.symbol();
    logger.info(`Minting ${amount} ${symbol} to ${to}...`);

    // ✅ Execute mint transaction
    const txHash = await token.write.mint([to, BigInt(amount)], {
      account: wallet.account,
    });

    const { confirmations } = networkConfig;
    if (confirmations === undefined)
      throw new Error(`confirmations is not defined for ${networkName}`);

    logger.info(`⏳ Waiting for ${confirmations} confirmations...`);
    await publicClient.waitForTransactionReceipt({ hash: txHash });

    // ✅ Log transaction and new balance
    const newBalance = await token.read.balanceOf([to]);
    logger.info(`✅ Minted ${amount} ${symbol} to ${to}. Tx hash: ${txHash}`);
    logger.info(`Current balance of ${to}: ${newBalance.toString()} ${symbol}`);
  }));
