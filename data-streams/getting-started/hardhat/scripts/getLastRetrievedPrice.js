import { createPublicClient, http, getContract } from "viem";
import { arbitrumSepolia } from "viem/chains";
import { spin } from "./utils/index.js";
import fs from "fs";
import path from "path";

/**
 * Script to retrieve the last price from the StreamsUpkeepRegistrar contract using Viem.
 * 
 * Usage: STREAMS_UPKEEP=0xYourAddress npx hardhat run scripts/getLastRetrievedPrice.js --network arbitrumSepolia
 */

async function main() {
  // Get the StreamsUpkeepRegistrar address from environment variable
  const streamsUpkeepAddress = process.env.STREAMS_UPKEEP;
  
  if (!streamsUpkeepAddress) {
    throw new Error("Please set the STREAMS_UPKEEP environment variable with the contract address");
  }

  // Initialize spinner for user feedback
  const spinner = spin();
  
  try {
    spinner.start(`Retrieving the last price from StreamsUpkeep at ${streamsUpkeepAddress}...`);

    // For READ operations, we only need a public client (no wallet/private key needed!)
    const publicClient = createPublicClient({
      chain: arbitrumSepolia,
      transport: http(process.env.ARBITRUM_SEPOLIA_RPC_URL),
    });

    // Load the contract ABI from the compiled artifacts
    const artifactPath = path.resolve(
      process.cwd(),
      "build/artifacts/contracts/StreamsUpkeepRegistrar.sol/StreamsUpkeepRegistrar.json"
    );
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));

    // Create a contract instance with Viem
    // For read-only operations, we use getContract with a public client
    const contract = getContract({
      address: streamsUpkeepAddress,
      abi: artifact.abi,
      client: publicClient,
    });

    // Call the read function - this is instant, no transaction needed!
    // Viem uses contract.read.functionName() for view/pure functions
    const lastDecodedPrice = await contract.read.lastDecodedPrice();

    spinner.succeed(
      `Last Retrieved Price: ${lastDecodedPrice}\n` +
      `  Contract: ${streamsUpkeepAddress}\n` +
      `  Network: Arbitrum Sepolia`
    );

  } catch (error) {
    spinner.fail("Failed to retrieve the last price");
    console.error(error);
    process.exitCode = 1;
  }
}

main();
