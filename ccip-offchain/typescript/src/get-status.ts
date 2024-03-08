import {
  getProviderRpcUrl,
  getRouterConfig,
  getMessageStatus,
  NETWORK,
} from "./config";
import { ethers, JsonRpcProvider } from "ethers";
import {
  Router__factory,
  OnRamp__factory,
  OffRamp__factory,
} from "./typechain-types";

// Command: npx ts-node src/get-status.ts sourceChain destinationChain messageId
// Examples(sepolia-->Fuji):
// npx ts-node src/get-status.ts ethereumSepolia avalancheFuji 0x6adcad3b71f62c7fcd45b3145d8d5aebfeb4a7ffacf567c09e5ce509120e8a8d
interface Arguments {
  sourceChain: NETWORK;
  destinationChain: NETWORK;
  messageId: string;
}

const handleArguments = (): Arguments => {
  // Check if the correct number of arguments are passed
  if (process.argv.length !== 5) {
    throw new Error("Wrong number of arguments");
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
  const sourceRouterAddress = getRouterConfig(sourceChain).router;
  const sourceChainSelector = getRouterConfig(sourceChain).chainSelector;
  const destinationRouterAddress = getRouterConfig(destinationChain).router;
  const destinationChainSelector =
    getRouterConfig(destinationChain).chainSelector;

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
      `Lane ${sourceChain}->${destinationChain} is not supported}`
    );
  }

  // Fetch the OnRamp contract address on the source chain
  const onRampAddress = await sourceRouterContract.getOnRamp(
    destinationChainSelector
  );

  const onRampContract = OnRamp__factory.connect(onRampAddress, sourceProvider);

  // Check if the messageId exists in the OnRamp contract
  const ccipSendRequestEvent = onRampContract.filters["CCIPSendRequested"]; // TODO: build a more efficient way than brute force all the events
  const events = await onRampContract.queryFilter(ccipSendRequestEvent);
  let messageFound = false;
  for (const event of events) {
    if (
      event.args &&
      event.args.message &&
      event.args.message.messageId === messageId
    ) {
      messageFound = true;
      break;
    }
  }

  // If the messageId doesn't exist, log an error and exit
  if (!messageFound) {
    console.error(`Message ${messageId} does not exist on this lane\n`);
    return;
  }

  // Instantiate the router contract on the destination chain
  const destinationRouterContract = Router__factory.connect(
    destinationRouterAddress,
    destinationProvider
  );

  // Fetch the OffRamp contract addresses on the destination chain
  const offRamps = await destinationRouterContract.getOffRamps();

  // Iterate through OffRamps to find the one linked to the source chain and check message status
  for (const offRamp of offRamps) {
    if (offRamp.sourceChainSelector === sourceChainSelector) {
      const offRampContract = OffRamp__factory.connect(
        offRamp.offRamp,
        destinationProvider
      );
      const executionStateChangeEvent = offRampContract.filters[
        "ExecutionStateChanged"
      ](undefined, messageId, undefined, undefined);

      const events = await offRampContract.queryFilter(
        executionStateChangeEvent,
        0
      );

      // Check if an event with the specific messageId exists and log its status
      for (let event of events) {
        if (event.args && event.args.messageId === messageId) {
          const state = event.args.state;
          const status = getMessageStatus(state);
          console.log(`Status of message ${messageId} is ${status}\n`);
          return;
        }
      }
    }
  }
  // If no event found, the message has not yet been processed on the destination chain
  console.log(
    `Message ${messageId} is not processed yet on destination chain\n`
  );
};

// Run the getStatus function and handle any errors
getStatus().catch((e) => {
  console.error(e);
  process.exit(1);
});
