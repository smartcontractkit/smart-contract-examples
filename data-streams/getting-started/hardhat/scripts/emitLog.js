import hre from "hardhat";
import { createWalletClient, createPublicClient, http, getContract } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrumSepolia } from "viem/chains";
import { spin } from "./utils/index.js";
import fs from "fs";

/**
 * Script to emit a log from the LogEmitter contract using Viem.
 * Usage: LOG_EMITTER=0xYourAddress npx hardhat run scripts/emitLog.js --network arbitrumSepolia
 * 
 * Required environment variables:
 * - ARBITRUM_SEPOLIA_RPC_URL
 * - PRIVATE_KEY
 * - LOG_EMITTER (the deployed LogEmitter contract address)
 */

async function main() {
  // Get the LogEmitter address from environment variable
  const logEmitterAddress = process.env.LOG_EMITTER;
  
  if (!logEmitterAddress) {
    throw new Error("Please set the LOG_EMITTER environment variable with the contract address");
  }

  // Initialize spinner for user feedback
  const spinner = spin();
  
  try {
    // Create account from private key
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
      throw new Error("PRIVATE_KEY environment variable is required");
    }
    const account = privateKeyToAccount(`0x${privateKey.replace(/^0x/, '')}`);
    
    // Create wallet client for sending transactions
    const walletClient = createWalletClient({
      account,
      chain: arbitrumSepolia,
      transport: http(process.env.ARBITRUM_SEPOLIA_RPC_URL),
    });
    
    // Create public client for reading blockchain state
    const publicClient = createPublicClient({
      chain: arbitrumSepolia,
      transport: http(process.env.ARBITRUM_SEPOLIA_RPC_URL),
    });

    // Load the contract ABI from compiled artifacts
    const artifactPath = `./build/artifacts/contracts/LogEmitter.sol/LogEmitter.json`;
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

    spinner.start(`Emitting a log from LogEmitter at ${logEmitterAddress}...`);

    // Get the contract instance
    const logEmitter = getContract({
      address: logEmitterAddress,
      abi: artifact.abi,
      client: { public: publicClient, wallet: walletClient },
    });

    // Call the emitLog function on the contract
    // This returns a transaction hash
    const hash = await logEmitter.write.emitLog();

    spinner.info(`Transaction submitted: ${hash}`);
    spinner.start("Waiting for transaction confirmation...");

    // Wait for the transaction to be mined
    // This is similar to tx.wait() in ethers
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    spinner.succeed(
      `Log emitted successfully!\n` +
      `  Transaction Hash: ${receipt.transactionHash}\n` +
      `  Block Number: ${receipt.blockNumber}\n` +
      `  Gas Used: ${receipt.gasUsed}`
    );

  } catch (error) {
    spinner.fail("Failed to emit log");
    console.error(error);
    process.exitCode = 1;
  }
}

main();
