// Import necessary modules and data
const { getProviderRpcUrl, getRouterConfig } = require("./config");
const ethers = require("ethers");
const routerAbi = require("../../abi/Router.json");
const erc20Abi = require("../../abi/IERC20Metadata.json");

// A script is run with two arguments representing the source and target chains
// Example usage: node src/supported-tokens.js ethereumSepolia avalancheFuji
const handleArguments = () => {
  // Check if the correct number of arguments have been passed
  if (process.argv.length !== 4) {
    throw new Error("Expects 2 arguments");
  }

  // Retrieve the chain names from command line arguments
  const chain = process.argv[2];
  const targetChain = process.argv[3];

  return { chain, targetChain };
};

// Function to fetch and display supported tokens
const getSupportedTokens = async () => {
  // Get the source and target chain names from the command line arguments
  const { chain, targetChain } = handleArguments();

  // Get the RPC URL for the chain from the config
  const rpcUrl = getProviderRpcUrl(chain);
  // Initialize a provider using the obtained RPC URL
  const provider = new ethers.JsonRpcProvider(rpcUrl);

  // Get the router's address for the specified chain
  const routerAddress = getRouterConfig(chain).router;
  // Get the chain selector for the target chain
  const targetChainSelector = getRouterConfig(targetChain).chainSelector;

  // Create a contract instance for the router using its ABI and address
  const router = new ethers.Contract(routerAddress, routerAbi, provider);

  const isChainSupported = await router.isChainSupported(targetChainSelector);

  if (!isChainSupported) {
    throw new Error(`Lane ${chain}->${targetChain} is not supported}`);
  }

  // Fetch the list of supported tokens
  const supportedTokens = await router.getSupportedTokens(targetChainSelector);

  // For each supported token, print its name, symbol, and decimal precision
  for (const supportedToken of supportedTokens) {
    // Create a contract instance for the token using its ABI and address
    const erc20 = new ethers.Contract(supportedToken, erc20Abi, provider);

    // Fetch the token's name, symbol, and decimal precision
    const name = await erc20.name();
    const symbol = await erc20.symbol();
    const decimals = await erc20.decimals();

    // Print the token's details
    console.log(
      `ERC20 token with address ${supportedToken} is ${name} of symbol ${symbol} and decimals ${decimals}`
    );
  }
};

// Run the function and handle any errors
getSupportedTokens().catch((e) => {
  // Print any error message and terminate the script with a non-zero exit code
  console.error(e);
  process.exit(1);
});
