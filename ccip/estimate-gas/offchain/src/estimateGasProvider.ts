// Load and configure environment variables from a .env file.
require("@chainlink/env-enc").config();

// Import the ethers library for interacting with the Ethereum blockchain.
import { ethers } from "ethers";
// Import a function to get configuration details for CCIP (Cross-Chain Interoperability Protocol).
import { getCCIPConfig } from "../ccip.config";
// Import helper functions for building transaction data and estimating intrinsic gas.
import { buildTransactionData, estimateIntrinsicGas } from "./helper";
// Import test data, including sender and receiver addresses.
import testData from "../data.json";

/**
 * Estimates gas usage for sending transactions from Avalanche Fuji to Ethereum Sepolia.
 */
async function estimateGas() {
  // Retrieve router address and chain selector from the configuration for Ethereum Sepolia and Avalanche Fuji.
  const ethereumSepoliaRouterAddress = getCCIPConfig("ethereumSepolia").router;
  const avalancheFujiChainSelector =
    getCCIPConfig("avalancheFuji").chainSelector;
  // Retrieve sender and receiver addresses from test data.
  const sender = testData.avalancheFuji.sender;
  const receiver = testData.ethereumSepolia.receiver;

  // Read the RPC URL for Ethereum Sepolia from the environment variables.
  const ETHEREUM_SEPOLIA_RPC_URL = process.env.ETHEREUM_SEPOLIA_RPC_URL;
  // Initialize a provider for interacting with the Ethereum blockchain using the RPC URL.
  const provider = new ethers.JsonRpcProvider(ETHEREUM_SEPOLIA_RPC_URL);
  // Define parameters for iterations: minimum, average, and maximum.
  const params = [
    0, // minimum
    50, // average
    99, // maximum
  ];

  // Initialize an array to store the gas usage report for each iteration.
  const gasUsageReport = [];

  // Loop through each iteration parameter to estimate gas usage.
  for (const iterations of params) {
    // Build transaction data using the iteration parameter, chain selector, and sender address.
    const data = buildTransactionData(
      iterations,
      avalancheFujiChainSelector,
      sender
    );

    // Estimate the gas cost for sending the transaction to the receiver.
    const estimatedGas = await provider.estimateGas({
      to: receiver,
      from: ethereumSepoliaRouterAddress,
      data: data,
    });

    // Calculate the intrinsic gas cost of the transaction data itself.
    const intrinsicGas = estimateIntrinsicGas(data);

    // Calculate the gas used specifically by the `ccipReceive` function, excluding intrinsic gas.
    const ccipReceiveGas = estimatedGas - intrinsicGas;

    // Add the iteration's gas usage information to the report.
    gasUsageReport.push({
      iterations,
      gasUsed: ccipReceiveGas.toString(),
    });
  }

  // Output the final gas usage report to the console.
  console.log("Final Gas Usage Report:");
  gasUsageReport.forEach((report) => {
    console.log(
      `Number of iterations: ${report.iterations} - Gas used: ${report.gasUsed}`
    );
  });
}

// Execute the `estimateGas` function and catch any errors.
estimateGas().catch(console.error);
