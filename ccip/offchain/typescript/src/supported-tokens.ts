import {
  getProviderRpcUrl,
  getRouterConfig,
  NETWORK,
  getTokenAdminRegistryConfig,
} from "./config";
import { JsonRpcProvider } from "ethers";
import {
  Router__factory,
  IERC20Metadata__factory,
  TokenAdminRegistry__factory,
  TokenPool__factory,
} from "./typechain-types";

// Interface for command-line arguments
interface Arguments {
  sourceChain: NETWORK;
  destinationChain: NETWORK;
}

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
  console.log(`[INFO] Starting token discovery for cross-chain transfers`);
  const { sourceChain, destinationChain } = handleArguments();

  // Get the RPC URL for the chain from the config
  const rpcUrl = getProviderRpcUrl(sourceChain);
  // Initialize a provider using the obtained RPC URL
  const provider = new JsonRpcProvider(rpcUrl);

  // Get the router's address for the specified chain
  const routerAddress = getRouterConfig(sourceChain).router.address;
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
    console.error(
      `[ERROR] Lane ${sourceChain} -> ${destinationChain} is not supported`
    );
    throw new Error(
      `Lane ${sourceChain} -> ${destinationChain} is not supported\n`
    );
  }
  console.log(`[INFO] Lane ${sourceChain} -> ${destinationChain} is supported`);

  // Check if TokenAdminRegistry is present for the source chain
  const tokenAdminRegistryConfig = getTokenAdminRegistryConfig(sourceChain);

  // TokenAdminRegistry is present, use getAllConfiguredTokens
  const tokenAdminRegistryAddress = tokenAdminRegistryConfig.address;
  const tokenAdminRegistryContract = TokenAdminRegistry__factory.connect(
    tokenAdminRegistryAddress,
    provider
  );

  // Handle pagination
  let startIndex = 0;
  const maxCount = 100;
  let tokensBatch: string[] = [];
  const tokenToPoolMap: Record<string, string> = {}; // Mapping of token to pool
  const uniqueTokens = new Set<string>(); // Use Set to handle potential duplicates

  console.log(
    `[INFO] Fetching all registered tokens from ${sourceChain} using TokenAdminRegistry at ${tokenAdminRegistryAddress}`
  );

  let totalProcessed = 0;
  do {
    console.log(
      `[INFO] Fetching batch: offset=${startIndex}, limit=${maxCount}`
    );
    tokensBatch = await tokenAdminRegistryContract.getAllConfiguredTokens(
      startIndex,
      maxCount
    );
    totalProcessed += tokensBatch.length;
    console.log(
      `[INFO] Found ${tokensBatch.length} tokens (total processed: ${totalProcessed})`
    );

    // Add to Set instead of array to handle potential duplicates
    tokensBatch.forEach((token) => uniqueTokens.add(token));
    startIndex = startIndex + tokensBatch.length;

    // Add log before pool checks
    console.log(
      `[INFO] Fetching pools for ${tokensBatch.length} tokens and checking support for ${destinationChain}`
    );
    const pools = await tokenAdminRegistryContract.getPools([...tokensBatch]);

    // Process pools in chunks of 5 for parallel processing
    for (let i = 0; i < tokensBatch.length; i += 5) {
      const chunkEnd = Math.min(i + 5, tokensBatch.length);
      const chunk = tokensBatch.slice(i, chunkEnd);
      const poolsChunk = pools.slice(i, chunkEnd);

      const supportCheckPromises = poolsChunk.map((poolAddress, index) => {
        const tokenPoolContract = TokenPool__factory.connect(
          poolAddress,
          provider
        );
        return tokenPoolContract
          .isSupportedChain(destinationChainSelector)
          .then((isSupported) => ({
            token: chunk[index],
            pool: poolAddress,
            isSupported,
            error: null,
          }))
          .catch((error) => ({
            token: chunk[index],
            pool: poolAddress,
            isSupported: false,
            error,
          }));
      });

      const results = await Promise.all(supportCheckPromises);

      // Process results
      results.forEach(({ token, pool, isSupported, error }) => {
        if (error) {
          console.warn(
            `Failed to check chain support for pool ${pool}, skipping...`
          );
        } else if (isSupported) {
          tokenToPoolMap[token] = pool;
        }
      });
    }
  } while (tokensBatch.length === maxCount);

  const eligibleTokens = Object.keys(tokenToPoolMap).length;
  console.log(
    `[SUMMARY] Found ${uniqueTokens.size} unique tokens, ${eligibleTokens} support ${destinationChain}`
  );

  // Convert Set to Array for final processing
  const supportedTokens = Array.from(uniqueTokens);

  // For each supported token, print its name, symbol, decimal precision, and pool
  for (const supportedToken of supportedTokens) {
    // Skip tokens whose pools don't support the destination chain
    if (!tokenToPoolMap[supportedToken]) {
      continue;
    }

    // Create a contract instance for the token using its ABI and address
    const erc20 = IERC20Metadata__factory.connect(supportedToken, provider);

    // Fetch the token's name, symbol, and decimal precision
    const [name, symbol, decimals] = await Promise.all([
      erc20.name(),
      erc20.symbol(),
      erc20.decimals(),
    ]);

    // Get the pool address for the token
    const poolAddress = tokenToPoolMap[supportedToken];

    // Print the token's details along with its pool
    console.log(
      `[INFO] Token: ${name} (${symbol}) at ${supportedToken}, decimals=${decimals}, pool=${poolAddress}`
    );
  }
};

// Improve error handling
getSupportedTokens().catch((e) => {
  console.error(`[ERROR] Token discovery failed:`);
  if (e instanceof Error) {
    console.error(`[ERROR] Message: ${e.message}`);
    console.error(`[ERROR] Stack: ${e.stack}`);
  } else {
    console.error(`[ERROR] Unknown error type:`, e);
  }
  process.exit(1);
});
