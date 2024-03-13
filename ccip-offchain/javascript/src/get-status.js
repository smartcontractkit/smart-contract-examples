// Import the required modules and configuration functions
const {
  getProviderRpcUrl,
  getRouterConfig,
  getMessageStatus,
} = require("./config");
const { ethers, providers } = require("ethers");
const routerAbi = require("../../abi/Router.json");
const offRampAbi = require("../../abi/OffRamp.json");

// Command: node src/get-status.js sourceChain destinationChain messageId
// Examples(sepolia-->Fuji):
// node src/get-status.js ethereumSepolia avalancheFuji 0xbd2f751ffab340b98575a8f46efc234e8d884db7b654c0144d7aabd72ff38595

const handleArguments = () => {
  // Check if the correct number of arguments are passed
  if (process.argv.length !== 5) {
    throw new Error("Wrong number of arguments");
  }

  // Extract the arguments from the command line
  const chain = process.argv[2];
  const targetChain = process.argv[3];
  const messageId = process.argv[4];

  // Return the arguments in an object
  return {
    chain,
    targetChain,
    messageId,
  };
};

// Main function to get the status of a message by its ID
const getStatus = async () => {
  // Parse command-line arguments
  const { chain, targetChain, messageId } = handleArguments();

  // Get the RPC URLs for both the source and destination chains
  const destinationRpcUrl = getProviderRpcUrl(targetChain);
  const sourceRpcUrl = getProviderRpcUrl(chain);

  // Initialize providers for interacting with the blockchains
  const destinationProvider = new providers.JsonRpcProvider(destinationRpcUrl);
  const sourceProvider = new providers.JsonRpcProvider(sourceRpcUrl);

  // Retrieve router configuration for the source and destination chains
  const sourceRouterAddress = getRouterConfig(chain).router;
  const sourceChainSelector = getRouterConfig(chain).chainSelector;
  const destinationRouterAddress = getRouterConfig(targetChain).router;
  const destinationChainSelector = getRouterConfig(targetChain).chainSelector;

  // Instantiate the router contract on the source chain
  const sourceRouterContract = new ethers.Contract(
    sourceRouterAddress,
    routerAbi,
    sourceProvider
  );

  const isChainSupported = await sourceRouterContract.isChainSupported(
    destinationChainSelector
  );

  if (!isChainSupported) {
    throw new Error(`Lane ${chain}->${targetChain} is not supported}`);
  }

  // Instantiate the router contract on the destination chain
  const destinationRouterContract = new ethers.Contract(
    destinationRouterAddress,
    routerAbi,
    destinationProvider
  );

  // Fetch the OffRamp contract addresses on the destination chain
  const offRamps = await destinationRouterContract.getOffRamps();

  const matchingOffRamps = offRamps.filter(
    (offRamp) => offRamp.sourceChainSelector.toString() === sourceChainSelector
  );

  for (const matchingOffRamp of matchingOffRamps) {
    const offRampContract = new ethers.Contract(
      matchingOffRamp.offRamp,
      offRampAbi,
      destinationProvider
    );
    const events = await offRampContract.queryFilter(
      offRampContract.filters.ExecutionStateChanged(undefined, messageId)
    );

    if (events.length > 0) {
      const { state } = events[0].args;
      const status = getMessageStatus(state);
      console.log(
        `Status of message ${messageId} on offRamp ${matchingOffRamp.offRamp} is ${status}\n`
      );
      return;
    }
  }

  // If no event found, the message has not yet been processed on the destination chain
  console.log(
    `Either the message ${messageId} does not exist OR it has not been processed yet on destination chain\n`
  );
};

// Run the getStatus function and handle any errors
getStatus().catch((e) => {
  console.error(e);
  process.exit(1);
});
