import { createWalletClient, createPublicClient, http, getContract, formatEther, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrumSepolia } from "viem/chains";
import { spin } from "./utils/index.js";
import { networkConfig } from "../helper-hardhat-config.js";

// Minimal ERC20 ABI for LINK token interactions
const minimalERC20ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
];

/**
 * Script to transfer LINK tokens using Viem.
 * 
 * Usage: RECIPIENT=0xAddress AMOUNT=1000000000000000000 npx hardhat run scripts/transferLink.js --network arbitrumSepolia
 * 
*/

async function main() {
  // Get parameters from environment variables
  const recipientAddress = process.env.RECIPIENT;
  const amount = process.env.AMOUNT;
  const linkAddressOverride = process.env.LINK_ADDRESS;

  if (!recipientAddress) {
    throw new Error("Please set the RECIPIENT environment variable");
  }

  if (!amount) {
    throw new Error("Please set the AMOUNT environment variable (in Juels, e.g., 1000000000000000000 for 1 LINK)");
  }

  const spinner = spin();

  try {
    // Get LINK token address from network config or override
    const chainId = arbitrumSepolia.id;
    const linkTokenAddress = linkAddressOverride || networkConfig[chainId]?.linkToken;

    if (!linkTokenAddress) {
      throw new Error(`No LINK token address found for network ${chainId}`);
    }

    // Create account from private key
    const account = privateKeyToAccount(`0x${process.env.PRIVATE_KEY}`);

    // Create wallet client for sending transactions
    const walletClient = createWalletClient({
      account,
      chain: arbitrumSepolia,
      transport: http(process.env.ARBITRUM_SEPOLIA_RPC_URL),
    });

    // Create public client for reading state
    const publicClient = createPublicClient({
      chain: arbitrumSepolia,
      transport: http(process.env.ARBITRUM_SEPOLIA_RPC_URL),
    });

    spinner.info(`Starting LINK transfer from ${account.address} to ${recipientAddress}`);
    spinner.info(`LINK token address: ${linkTokenAddress}`);

    // Create LINK token contract instance
    const linkToken = getContract({
      address: linkTokenAddress,
      abi: minimalERC20ABI,
      client: { public: publicClient, wallet: walletClient },
    });

    // Check sender's LINK balance (read operation)
    const balance = await linkToken.read.balanceOf([account.address]);
    spinner.info(`LINK balance of sender ${account.address} is ${formatEther(balance)} LINK`);

    // Convert amount to bigint for comparison
    const amountBigInt = BigInt(amount);

    // Check if sender has enough LINK
    if (balance >= amountBigInt) {
      spinner.start("Transferring LINK tokens...");

      // Perform the transfer (write operation)
      const hash = await linkToken.write.transfer([recipientAddress, amountBigInt]);

      spinner.info(`Transaction submitted: ${hash}`);
      spinner.start("Waiting for transaction confirmation...");

      // Wait for transaction to be mined
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      spinner.succeed(
        `${formatEther(amountBigInt)} LINK were sent from ${account.address} to ${recipientAddress}\n` +
        `  Transaction Hash: ${receipt.transactionHash}\n` +
        `  Block Number: ${receipt.blockNumber}\n` +
        `  Gas Used: ${receipt.gasUsed}`
      );
    } else {
      spinner.fail(
        `Sender doesn't have enough LINK.\n` +
        `  Current balance: ${formatEther(balance)} LINK\n` +
        `  Tried to send: ${formatEther(amountBigInt)} LINK`
      );
      process.exitCode = 1;
    }

  } catch (error) {
    spinner.fail("Failed to transfer LINK tokens");
    console.error(error);
    process.exitCode = 1;
  }
}

main();
