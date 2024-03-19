/**
 * Script to query the status of a cross-chain message by its ID.
 * Demonstrates interacting with blockchain networks using ethers.js, including contract interaction and event filtering.
 *
 * Usage:
 * - Run this script from the command line using Node.js.
 * - Requires three arguments: source chain identifier, destination chain identifier, and message ID.
 *
 * Example Command:
 * node src/get-status.js ethereumSepolia avalancheFuji 0xbd2f...
 *
 */

// Import necessary modules and functions from external files.
const {
  getProviderRpcUrl, // Function to get the RPC URL for a given blockchain.
  getRouterConfig, // Function to get configuration for the router smart contract.
  getMessageStatus, // Function to translate numeric message status codes into human-readable strings.
} = require("./config");
const { ethers, JsonRpcProvider } = require("ethers"); // Import ethers for blockchain interactions.
const routerAbi = require("../../abi/Router.json"); // Load Router contract ABI.
const offRampAbi = require("../../abi/OffRamp.json"); // Load OffRamp contract ABI.

/**
 * Parses command-line arguments and validates the input.
 * Expects three arguments after the script name: source chain, destination chain, and message ID.
 *
 * @throws {Error} If the incorrect number of arguments are provided.
 * @returns {{chain: string, targetChain: string, messageId: string}} Object containing the parsed arguments.
 */
const handleArguments = () => {
  if (process.argv.length !== 5) {
    // Check for the correct number of arguments.
    throw new Error("Wrong number of arguments");
  }

  // Extract the arguments: source chain, target chain, and the message ID.
  const chain = process.argv[2];
  const targetChain = process.argv[3];
  const messageId = process.argv[4];

  return { chain, targetChain, messageId };
};

/**
 * Main function to query the status of a cross-chain message by its ID.
 * It connects to the blockchain networks, instantiates the smart contracts, and checks the message status.
 */
const getStatus = async () => {
  const { chain, targetChain, messageId } = handleArguments(); // Extract arguments.

  // Retrieve RPC URLs for source and destination chains.
  const destinationRpcUrl = getProviderRpcUrl(targetChain);
  const sourceRpcUrl = getProviderRpcUrl(chain);

  // Initialize providers to connect to the blockchain networks.
  const destinationProvider = new JsonRpcProvider(destinationRpcUrl);
  const sourceProvider = new JsonRpcProvider(sourceRpcUrl);

  // Get configuration for routers on both chains.
  const sourceRouterAddress = getRouterConfig(chain).router;
  const sourceChainSelector = getRouterConfig(chain).chainSelector;
  const destinationRouterAddress = getRouterConfig(targetChain).router;
  const destinationChainSelector = getRouterConfig(targetChain).chainSelector;

  // Instantiate router contracts with ethers for both source and destination chains.
  const sourceRouterContract = new ethers.Contract(
    sourceRouterAddress,
    routerAbi,
    sourceProvider
  );
  // Check if the destination chain is supported by the source chain's router.
  const isChainSupported = await sourceRouterContract.isChainSupported(
    destinationChainSelector
  );
  if (!isChainSupported) {
    throw new Error(`Lane ${chain}->${targetChain} is not supported`);
  }

  const destinationRouterContract = new ethers.Contract(
    destinationRouterAddress,
    routerAbi,
    destinationProvider
  );

  // Fetch OffRamp contracts associated with the destination router contract.
  const offRamps = await destinationRouterContract.getOffRamps();
  // Filter for the OffRamps that match the source chain.
  const matchingOffRamps = offRamps.filter(
    (offRamp) => offRamp.sourceChainSelector.toString() === sourceChainSelector
  );

  // Check each matching OffRamp for the message ID.
  for (const matchingOffRamp of matchingOffRamps) {
    const offRampContract = new ethers.Contract(
      matchingOffRamp.offRamp,
      offRampAbi,
      destinationProvider
    );
    // Query for events indicating a change in execution state for the given message ID.
    const events = await offRampContract.queryFilter(
      offRampContract.filters.ExecutionStateChanged(undefined, messageId)
    );

    if (events.length > 0) {
      // If events are found, log the status and exit.
      const { state } = events[0].args;
      const status = getMessageStatus(state);
      console.log(
        `Status of message ${messageId} on offRamp ${matchingOffRamp.offRamp} is ${status}\n`
      );
      return;
    }
  }

  // If no events are found, it's likely the message hasn't been processed or doesn't exist on the destination chain.
  console.log(
    `Either the message ${messageId} does not exist OR it has not been processed yet on destination chain\n`
  );
};

// Execute the getStatus function and catch any errors.
getStatus().catch((e) => {
  console.error(e); // Log any errors encountered during execution.
  process.exit(1); // Exit the script with a status code indicating an error.
});
