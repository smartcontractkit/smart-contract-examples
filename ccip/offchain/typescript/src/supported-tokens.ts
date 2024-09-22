import { getProviderRpcUrl, getRouterConfig, NETWORK } from "./config";
import { JsonRpcProvider } from "ethers";
import { Router__factory, IERC20Metadata__factory } from "./typechain-types";

// Interface for command-line arguments
interface Arguments {
  sourceChain: NETWORK;
  destinationChain: NETWORK;
}

// Function to display a deprecation notice
const displayDeprecationNotice = () => {
  console.log("\n");
  console.log("=".repeat(80));
  console.log("\x1b[31m%s\x1b[0m", "DEPRECATION NOTICE:");
  console.log(
    "\x1b[33m%s\x1b[0m",
    "The function 'getSupportedTokens' is deprecated and will be deactivated in future versions."
  );
  console.log(
    "\x1b[33m%s\x1b[0m",
    "We recommend avoiding its use at this time."
  );
  console.log(
    "\x1b[33m%s\x1b[0m",
    "An alternative method will be provided in an upcoming release."
  );
  console.log("=".repeat(80));
  console.log("\n");
};

// Function to handle command-line arguments
const handleArguments = (): Arguments => {
  // Check if the correct number of arguments have been passed
  if (process.argv.length !== 4) {
    throw new Error(
      "Expects 2 arguments. Expected format: npx ts-node src/supported-tokens.ts <sourceChain> <destinationChain>"
    );
  }

  // Retrieve the chain names from command line arguments
  const sourceChain = process.argv[2] as NETWORK;
  const destinationChain = process.argv[3] as NETWORK;

  return { sourceChain, destinationChain };
};

// Function to fetch and display supported tokens
const getSupportedTokens = async () => {
  // Display the deprecation notice
  displayDeprecationNotice();

  // Get the source and target chain names from the command line arguments
  const { sourceChain, destinationChain } = handleArguments();

  // Get the RPC URL for the chain from the config
  const rpcUrl = getProviderRpcUrl(sourceChain);
  // Initialize a provider using the obtained RPC URL
  const provider = new JsonRpcProvider(rpcUrl);

  // Get the router's address for the specified chain
  const routerAddress = getRouterConfig(sourceChain).router;
  // Get the chain selector for the target chain
  const destinationChainSelector =
    getRouterConfig(destinationChain).chainSelector;

  // Create a contract instance for the router using its ABI and address
  const sourceRouterContract = Router__factory.connect(routerAddress, provider);

  // Check if the destination chain is supported
  const isChainSupported = await sourceRouterContract.isChainSupported(
    destinationChainSelector
  );

  if (!isChainSupported) {
    throw new Error(
      `Lane ${sourceChain} -> ${destinationChain} is not supported\n`
    );
  }

  // Fetch the list of supported tokens
  const supportedTokens = await sourceRouterContract.getSupportedTokens(
    destinationChainSelector
  );

  // For each supported token, print its name, symbol, and decimal precision
  for (const supportedToken of supportedTokens) {
    // Create a contract instance for the token using its ABI and address
    const erc20 = IERC20Metadata__factory.connect(supportedToken, provider);

    // Fetch the token's name, symbol, and decimal precision
    const name = await erc20.name();
    const symbol = await erc20.symbol();
    const decimals = await erc20.decimals();

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
