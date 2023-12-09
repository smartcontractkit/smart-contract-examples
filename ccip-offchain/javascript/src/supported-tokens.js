// Import necessary modules and data
const { getProviderRpcUrl, getRouterConfig } = require("./config");
const ethers = require("ethers");
const { Router, ERC20 } = require("@chainlink/ccip-toolkit/dist");

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
  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);

  // Get the router's address for the specified chain
  const routerAddress = getRouterConfig(chain).address;
  // Get the chain selector for the target chain
  const targetChainSelector = getRouterConfig(targetChain).chainSelector;

  // Create a contract instance for the router using its ABI and address
  const router = new Router(routerAddress, provider);

  // Fetch the list of supported tokens
  const supportedTokens = await router.getSupportedTokens(targetChainSelector);

  // For each supported token, print its name, symbol, and decimal precision
  for (const supportedToken of supportedTokens) {
    // Create a contract instance for the token using its ABI and address
    const erc20 = new ERC20(supportedToken, provider);

    // Fetch the token's name, symbol, and decimal precision
    const { name, symbol, decimals } = await erc20.getTokenDetails();

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
