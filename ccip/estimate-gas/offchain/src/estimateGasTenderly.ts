// Import environment variable handling from the Chainlink library to access sensitive or configurable values securely.
require("@chainlink/env-enc").config();
// Import the Axios library for making HTTP requests.
import axios from "axios";
// Import configuration settings for CCIP (Cross-Chain Interoperability Protocol).
import { getCCIPConfig } from "../ccip.config";
// Import a helper function for building transaction data.
import { buildTransactionData } from "./helper";
// Import test data, which includes sender and receiver addresses.
import testData from "../data.json";

/**
 * Simulates transactions and estimates gas usage by interacting with the Tenderly API.
 */
const simulateTransaction = async () => {
  // Retrieve Tenderly account, project, and access key from environment variables.
  const TENDERLY_ACCOUNT_SLUG = process.env.TENDERLY_ACCOUNT_SLUG;
  const TENDERLY_PROJECT_SLUG = process.env.TENDERLY_PROJECT_SLUG;
  const TENDERLY_ACCESS_KEY = process.env.TENDERLY_ACCESS_KEY;
  // Construct the API URL for sending simulation requests to Tenderly.
  const tenderlyApiUrl = `https://api.tenderly.co/api/v1/account/${TENDERLY_ACCOUNT_SLUG}/project/${TENDERLY_PROJECT_SLUG}/simulate`;

  // Retrieve router address and chain selector for both Ethereum Sepolia and Avalanche Fuji from the configuration.
  const ethereumSepoliaRouterAddress = getCCIPConfig("ethereumSepolia").router;
  const avalancheFujiChainSelector =
    getCCIPConfig("avalancheFuji").chainSelector;
  // Extract the sender and receiver addresses from the test data.
  const sender = testData.avalancheFuji.sender;
  const receiver = testData.ethereumSepolia.receiver;

  // Define iteration parameters for the simulation: minimum, average, and maximum.
  const params = [
    0, // minimum
    50, // average
    99, // maximum
  ];

  // Initialize an array to hold the gas usage report for each simulation.
  const gasUsageReport = [];

  // Loop through each iteration parameter to simulate transactions.
  for (const iterations of params) {
    // Generate transaction data using helper function.
    const txData = buildTransactionData(
      iterations,
      avalancheFujiChainSelector,
      sender
    );

    // Perform a POST request to Tenderly's simulation API endpoint.
    const { data } = await axios.post(
      tenderlyApiUrl,
      {
        // Configuration for the simulation.
        save: true, // Whether to save the simulation result.
        save_if_fails: false, // Whether to save the result even if the simulation fails.
        estimate_gas: true, // Request gas estimation.
        simulation_type: "quick", // Type of simulation.
        network_id: "11155111", // Network ID for Sepolia.
        // Transaction details.
        from: ethereumSepoliaRouterAddress,
        to: receiver,
        input: txData,
        gas: 8000000, // Maximum gas allowance.
        gas_price: 0, // Gas price set to 0 for simulation purposes.
        value: 0, // Transaction value.
      },
      {
        headers: {
          "X-Access-Key": TENDERLY_ACCESS_KEY, // Authorization header with the access key.
        },
      }
    );
    // Extract the gas used from the simulation response.
    const { gas_used } = data.transaction.transaction_info.call_trace;

    // Add the iteration's gas usage information to the report.
    gasUsageReport.push({
      iterations,
      gasUsed: gas_used.toString(),
    });
  }

  // Output the final gas usage report to the console.
  console.log("Final Gas Usage Report:");
  gasUsageReport.forEach((report) => {
    console.log(
      `Number of iterations: ${report.iterations} - Gas used: ${report.gasUsed}`
    );
  });
};

// Execute the simulation function and handle any errors.
simulateTransaction().catch(console.error);
