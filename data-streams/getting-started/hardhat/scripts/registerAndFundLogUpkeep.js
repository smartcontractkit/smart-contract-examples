import { createWalletClient, createPublicClient, http, getContract, parseEther, encodeAbiParameters, parseAbiParameters } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrumSepolia } from "viem/chains";
import { spin } from "./utils/index.js";
import fs from "fs";
import path from "path";

/**
 * Script to register and fund a log-triggered upkeep with Chainlink Automation using Viem.
 * 
 * 
 * Usage: STREAMS_UPKEEP=0xAddress LOG_EMITTER=0xAddress npx hardhat run scripts/registerAndFundLogUpkeep.js --network arbitrumSepolia
 * 
 */

async function main() {
  // Get contract addresses from environment variables
  const streamsUpkeepAddress = process.env.STREAMS_UPKEEP;
  const logEmitterAddress = process.env.LOG_EMITTER;

  if (!streamsUpkeepAddress) {
    throw new Error("Please set the STREAMS_UPKEEP environment variable");
  }

  if (!logEmitterAddress) {
    throw new Error("Please set the LOG_EMITTER environment variable");
  }

  const spinner = spin();

  try {
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

    spinner.start(`Registering upkeep with Chainlink Automation using account: ${account.address}`);

    // Load the StreamsUpkeepRegistrar contract ABI
    const artifactPath = path.resolve(
      process.cwd(),
      "build/artifacts/contracts/StreamsUpkeepRegistrar.sol/StreamsUpkeepRegistrar.json"
    );
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));

    // Define registration parameters
    const name = "Prog. Streams Upkeep";
    const encryptedEmail = "0x";
    const gasLimit = 500000;
    const triggerType = 1; // Log Trigger
    const checkData = "0x";
    const offchainConfig = "0x";
    const amount = parseEther("1"); // 1 LINK in wei

    // Event signature hash for the LogEmitter event
    const topic0 = "0xb8a00d6d8ca1be30bfec34d8f97e55f0f0fd9eeb7fb46e030516363d4cfe1ad6";
    const topic1 = "0x0000000000000000000000000000000000000000000000000000000000000000";
    const topic2 = "0x0000000000000000000000000000000000000000000000000000000000000000";
    const topic3 = "0x0000000000000000000000000000000000000000000000000000000000000000";

    // ABI-encode the trigger configuration using Viem
    // This replaces ethers.utils.defaultAbiCoder.encode()
    const triggerConfig = encodeAbiParameters(
      parseAbiParameters("address, uint8, bytes32, bytes32, bytes32, bytes32"),
      [logEmitterAddress, 0, topic0, topic1, topic2, topic3]
    );

    // Construct the registration parameters struct
    // Viem handles structs as arrays in the order they appear in the ABI
    const params = {
      name,
      encryptedEmail,
      upkeepContract: streamsUpkeepAddress,
      gasLimit,
      adminAddress: account.address,
      triggerType,
      checkData,
      triggerConfig,
      offchainConfig,
      amount,
    };

    // Create contract instance
    const streamsUpkeepContract = getContract({
      address: streamsUpkeepAddress,
      abi: artifact.abi,
      client: { public: publicClient, wallet: walletClient },
    });

    spinner.info("Trigger configuration encoded successfully");
    spinner.start("Submitting registration transaction...");

    // Call registerAndPredictID with the params struct
    const hash = await streamsUpkeepContract.write.registerAndPredictID([params]);

    spinner.info(`Transaction submitted: ${hash}`);
    spinner.start("Waiting for transaction confirmation...");

    // Wait for transaction to be mined
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    spinner.succeed(
      `Upkeep registered and funded with 1 LINK successfully!\n` +
      `  Transaction Hash: ${receipt.transactionHash}\n` +
      `  Block Number: ${receipt.blockNumber}\n` +
      `  Gas Used: ${receipt.gasUsed}\n` +
      `  Upkeep Name: ${name}\n` +
      `  Trigger Type: Log Trigger (${triggerType})\n` +
      `  Gas Limit: ${gasLimit}`
    );

  } catch (error) {
    spinner.fail("Failed to register upkeep");
    console.error(error);
    process.exitCode = 1;
  }
}

main();
