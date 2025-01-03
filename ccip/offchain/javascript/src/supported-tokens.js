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
const tokenPoolAbi = require("../../abi/TokenPool.json");

// Function to handle command-line arguments
const handleArguments = () => {
  if (process.argv.length !== 4) {
    throw new Error(
      "Expects 2 arguments. Expected format: node src/supported-tokens.js <sourceChain> <destinationChain>"
    );
  }

  const sourceChain = process.argv[2];
  const destinationChain = process.argv[3];

  return { sourceChain, destinationChain };
};

const getSupportedTokens = async () => {
  console.log(`[INFO] Starting token discovery for cross-chain transfers`);
  const { sourceChain, destinationChain } = handleArguments();

  const rpcUrl = getProviderRpcUrl(sourceChain);
  const provider = new ethers.JsonRpcProvider(rpcUrl);

  const routerAddress = getRouterConfig(sourceChain).router.address;
  const destinationChainSelector = getRouterConfig(destinationChain).chainSelector;

  const sourceRouterContract = new ethers.Contract(
    routerAddress,
    routerAbi,
    provider
  );

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

  const tokenAdminRegistryConfig = getTokenAdminRegistryConfig(sourceChain);
  const tokenAdminRegistryAddress = tokenAdminRegistryConfig.address;
  const tokenAdminRegistryContract = new ethers.Contract(
    tokenAdminRegistryAddress,
    tokenAdminRegistryAbi,
    provider
  );

  let startIndex = 0;
  const maxCount = 100;
  let tokensBatch = [];
  const tokenToPoolMap = {}; // Mapping of token to pool
  const uniqueTokens = new Set(); // Use Set to handle potential duplicates

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

    tokensBatch.forEach((token) => uniqueTokens.add(token));
    startIndex = startIndex + tokensBatch.length;

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
        const tokenPoolContract = new ethers.Contract(
          poolAddress,
          tokenPoolAbi,
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

  const supportedTokens = Array.from(uniqueTokens);

  for (const supportedToken of supportedTokens) {
    if (!tokenToPoolMap[supportedToken]) {
      continue;
    }

    const erc20 = new ethers.Contract(supportedToken, erc20Abi, provider);

    const [name, symbol, decimals] = await Promise.all([
      erc20.name(),
      erc20.symbol(),
      erc20.decimals(),
    ]);

    const poolAddress = tokenToPoolMap[supportedToken];

    console.log(
      `[INFO] Token: ${name} (${symbol}) at ${supportedToken}, decimals=${decimals}, pool=${poolAddress}`
    );
  }
};

getSupportedTokens().catch((e) => {
  console.error(`[ERROR] Token discovery failed:`);
  if (e instanceof Error) {
    console.error(`[ERROR] Message: ${e.message}`);
    if (e.stack) {
      console.error(`[ERROR] Stack: ${e.stack}`);
    }
  } else {
    console.error(`[ERROR] Unknown error type:`, e);
  }
  process.exit(1);
});
