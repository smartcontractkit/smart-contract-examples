import {
  getProviderRpcUrl,
  getRouterConfig,
  getMessageStatus,
  NETWORK,
} from "./config";
import { JsonRpcProvider } from "ethers";
import { Router__factory, OffRamp__factory } from "./typechain-types";
import { match } from "assert";

// Command: npx ts-node src/get-status.ts sourceChain destinationChain messageId
// Examples (sepolia --> Fuji):
// npx ts-node src/get-status.ts ethereumSepolia avalancheFuji 0x6adcad3b71f62c7fcd45b3145d8d5aebfeb4a7ffacf567c09e5ce509120e8a8d

interface Arguments {
  sourceChain: NETWORK;
  destinationChain: NETWORK;
  messageId: string;
}

const handleArguments = (): Arguments => {
  // Check if the correct number of arguments are passed
  if (process.argv.length !== 5) {
    throw new Error(
      "Wrong number of arguments. Expected format: npx ts-node src/get-status.ts <sourceChain> <destinationChain> <messageId>"
    );
  }

  // Extract the arguments from the command line
  const sourceChain = process.argv[2] as NETWORK;
  const destinationChain = process.argv[3] as NETWORK;
  const messageId = process.argv[4];

  // Return the arguments in an object
  return {
    sourceChain,
    destinationChain,
    messageId,
  };
};

// Main function to get the status of a message by its ID
const getStatus = async () => {
  // Parse command-line arguments
  const { sourceChain, destinationChain, messageId } = handleArguments();

  // Get the RPC URLs for both the source and destination chains
  const destinationRpcUrl = getProviderRpcUrl(destinationChain);
  const sourceRpcUrl = getProviderRpcUrl(sourceChain);

  // Initialize providers for interacting with the blockchains
  const destinationProvider = new JsonRpcProvider(destinationRpcUrl);
  const sourceProvider = new JsonRpcProvider(sourceRpcUrl);

  // Retrieve router configuration for the source and destination chains
  const sourceRouterConfig = getRouterConfig(sourceChain);
  const destinationRouterConfig = getRouterConfig(destinationChain);

  const sourceRouterAddress = sourceRouterConfig.router.address;
  const sourceChainSelector = sourceRouterConfig.chainSelector;
  const destinationRouterAddress = destinationRouterConfig.router.address;
  const destinationChainSelector = destinationRouterConfig.chainSelector;

  // Instantiate the router contract on the source chain
  const sourceRouterContract = Router__factory.connect(
    sourceRouterAddress,
    sourceProvider
  );

  const isChainSupported = await sourceRouterContract.isChainSupported(
    destinationChainSelector
  );

  if (!isChainSupported) {
    throw new Error(
      `Lane ${sourceChain} -> ${destinationChain} is not supported\n`
    );
  }

  // Instantiate the router contract on the destination chain
  const destinationRouterContract = Router__factory.connect(
    destinationRouterAddress,
    destinationProvider
  );

  // Fetch the OffRamp contract addresses on the destination chain
  const offRamps = await destinationRouterContract.getOffRamps();

  // Correctly compare the chain selectors (convert to strings)
  const matchingOffRamps = offRamps.filter(
    (offRamp) =>
      offRamp.sourceChainSelector.toString() === sourceChainSelector.toString()
  );

  // Initialize a flag to check if the message was found
  let messageFound = false;

  // Loop through all matching OffRamps
  for (const matchingOffRamp of matchingOffRamps) {
    const offRampContract = OffRamp__factory.connect(
      matchingOffRamp.offRamp,
      destinationProvider
    );

    // Fetch events with the specific messageId
    const events = await offRampContract.queryFilter(
      offRampContract.filters.ExecutionStateChanged(undefined, messageId)
    );

    if (events.length > 0) {
      const { state } = events[0].args;
      const status = getMessageStatus(state);
      console.log(
        `Status of message ${messageId} on offRamp ${matchingOffRamp.offRamp} is ${status}\n`
      );
      messageFound = true;
      break; // Exit the loop since we've found the message
    }
  }

  // If no event found in any OffRamp
  if (!messageFound) {
    console.log(
      `Either the message ${messageId} does not exist OR it has not been processed yet on the destination chain\n`
    );
  }
};

// Run the getStatus function and handle any errors
getStatus().catch((e) => {
  console.error(e);
  process.exit(1);
});
