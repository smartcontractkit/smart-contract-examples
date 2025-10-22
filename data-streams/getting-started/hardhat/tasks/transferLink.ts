import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types/hre";
import { formatEther, parseEther, isAddress, getContract } from "viem";
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
] as const;

/**
 * Task to transfer LINK tokens using Viem.
 *
 * Usage: npx hardhat transfer-link --recipient 0xAddress --amount 1.5 --network arbitrumSepolia
 */
export const transferLink = task(
  "transfer-link",
  "Transfers LINK tokens to a recipient"
)
  .addOption({
    name: "recipient",
    description: "The address to receive LINK tokens",
    defaultValue: "",
  })
  .addOption({
    name: "amount",
    description: "The amount of LINK to transfer (in LINK, e.g., 1.5)",
    defaultValue: "0",
  })
  .addOption({
    name: "linkAddress",
    description: "Override the LINK token address",
    defaultValue: "",
  })
  .setAction(async () => ({
    default: async (
      {
        recipient,
        amount,
        linkAddress: linkAddressOverride,
      }: { recipient: string; amount: string; linkAddress?: string },
      hre: HardhatRuntimeEnvironment
    ) => {
      if (!recipient) {
        throw new Error("Recipient address is required (--recipient)");
      }

      if (!amount || amount === "0") {
        throw new Error(
          "Amount is required and must be greater than 0 (--amount)"
        );
      }

      if (!isAddress(recipient)) {
        throw new Error(`Invalid recipient address: ${recipient}`);
      }

      const spinner = spin();

      try {
        // Connect to network and get viem clients
        const networkConnection = await hre.network.connect();
        const { viem } = networkConnection;

        const publicClient = await viem.getPublicClient();
        const [walletClient] = await viem.getWalletClients();

        // Get LINK token address from network config or override
        const chainId = await publicClient.getChainId();
        const linkTokenAddress =
          linkAddressOverride || networkConfig[chainId]?.linkToken;

        if (!linkTokenAddress) {
          throw new Error(`No LINK token address found for network ${chainId}`);
        }

        if (!isAddress(linkTokenAddress)) {
          throw new Error(`Invalid LINK token address: ${linkTokenAddress}`);
        }

        const account = walletClient.account.address;

        spinner.info(`Starting LINK transfer from ${account} to ${recipient}`);
        spinner.info(`LINK token address: ${linkTokenAddress}`);

        // Create LINK token contract instance using viem's getContract
        const linkToken = getContract({
          address: linkTokenAddress,
          abi: minimalERC20ABI,
          client: { public: publicClient, wallet: walletClient },
        });

        // Check sender's LINK balance (read operation)
        const balance = await linkToken.read.balanceOf([account]);
        spinner.info(
          `LINK balance of sender ${account} is ${formatEther(balance)} LINK`
        );

        // Convert amount to wei (Juels)
        const amountBigInt = parseEther(amount);

        // Check if sender has enough LINK
        if (balance >= amountBigInt) {
          spinner.start("Transferring LINK tokens...");

          // Perform the transfer (write operation)
          const hash = await linkToken.write.transfer([
            recipient,
            amountBigInt,
          ]);

          spinner.info(`Transaction submitted: ${hash}`);
          spinner.start("Waiting for transaction confirmation...");

          // Wait for transaction to be mined
          const receipt = await publicClient.waitForTransactionReceipt({
            hash,
          });

          spinner.succeed(
            `${formatEther(
              amountBigInt
            )} LINK were sent from ${account} to ${recipient}\n` +
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
          throw new Error("Insufficient LINK balance");
        }
      } catch (error) {
        spinner.fail("Failed to transfer LINK tokens");
        console.error(error);
        throw error;
      }
    },
  }))
  .build();
