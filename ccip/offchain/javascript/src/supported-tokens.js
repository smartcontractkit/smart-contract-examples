// Import necessary modules and data
const {
  getProviderRpcUrl,
  getRouterConfig,
  getTokenAdminRegistryConfig,
} = require("./config");
const { ethers } = require("ethers");

// Import ABI files
const routerAbi = require("../../abi/Router.json");
const erc20Abi = require("../../abi/IERC20Metadata.json");
const tokenAdminRegistryAbi = require("../../abi/TokenAdminRegistry.json");

// Function to handle command-line arguments
const handleArguments = () => {
  // Check if the correct number of arguments have been passed
  if (process.argv.length !== 4) {
    throw new Error(
      "Expects 2 arguments. Expected format: node src/supported-tokens.js <sourceChain> <destinationChain>"
    );
  }

  // Retrieve the chain names from command line arguments
  const sourceChain = process.argv[2];
  const destinationChain = process.argv[3];

  return { sourceChain, destinationChain };
};

// Function to fetch and display supported tokens
const getSupportedTokens = async () => {
  // Get the source and target chain names from the command line arguments
  const { sourceChain, destinationChain } = handleArguments();

  // Get the RPC URL for the chain from the config
  const rpcUrl = getProviderRpcUrl(sourceChain);
  // Initialize a provider using the obtained RPC URL
  const provider = new ethers.JsonRpcProvider(rpcUrl);

  // Get the router's address for the specified chain
  const routerAddress = getRouterConfig(sourceChain).router.address;
  // Get the chain selector for the target chain
  const destinationChainSelector =
    getRouterConfig(destinationChain).chainSelector;

  // Create a contract instance for the router using its ABI and address
  const sourceRouterContract = new ethers.Contract(
    routerAddress,
    routerAbi,
    provider
  );

  // Check if the destination chain is supported
  const isChainSupported = await sourceRouterContract.isChainSupported(
    destinationChainSelector
  );

  if (!isChainSupported) {
    throw new Error(
      `Lane ${sourceChain} -> ${destinationChain} is not supported\n`
    );
  }

  // Check if TokenAdminRegistry is present for the source chain
  const tokenAdminRegistryConfig = getTokenAdminRegistryConfig(sourceChain);

  let supportedTokens = [];

  if (tokenAdminRegistryConfig) {
    // TokenAdminRegistry is present, use getAllConfiguredTokens
    const tokenAdminRegistryAddress = tokenAdminRegistryConfig.address;
    const tokenAdminRegistryContract = new ethers.Contract(
      tokenAdminRegistryAddress,
      tokenAdminRegistryAbi,
      provider
    );

    // Handle pagination
    let startIndex = 0;
    const maxCount = 100;
    let tokensBatch = [];

    do {
      tokensBatch = await tokenAdminRegistryContract.getAllConfiguredTokens(
        startIndex,
        maxCount
      );
      supportedTokens.push(...tokensBatch);
      startIndex += tokensBatch.length;
    } while (tokensBatch.length === maxCount);
  } else {
    // TokenAdminRegistry not present, use Router.getSupportedTokens
    supportedTokens = await sourceRouterContract.getSupportedTokens(
      destinationChainSelector
    );
  }

  // For each supported token, print its name, symbol, and decimal precision
  for (const supportedToken of supportedTokens) {
    // Create a contract instance for the token using its ABI and address
    const erc20 = new ethers.Contract(supportedToken, erc20Abi, provider);

    // Fetch the token's name, symbol, and decimal precision
    const [name, symbol, decimals] = await Promise.all([
      erc20.name(),
      erc20.symbol(),
      erc20.decimals(),
    ]);

    // Print the token's details
    console.log(
      `ERC20 token with address ${supportedToken} is ${name} with symbol ${symbol} and decimals ${decimals}\n`
    );
  }
};

// Run the function and handle any errors
getSupportedTokens().catch((e) => {
  // Print any error message and terminate the script with a non-zero exit code
  console.error(e);
  process.exit(1);
});
