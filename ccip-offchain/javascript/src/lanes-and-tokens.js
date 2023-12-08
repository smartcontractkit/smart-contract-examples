// Import necessary modules and data
const {
  getProviderRpcUrl,
  getRouterConfig,
  supportedNetworks,
} = require("./config");
const ethers = require("ethers");
const routerAbi = require("../../abi/Router.json");
const erc20Abi = require("../../abi/IERC20Metadata.json");
const onRampAbi = require("../../abi/OnRamp.json");
const poolAbi = require("../../abi/TokenPool.json");

// Example usage: node src/lanes-and-tokens.js
const checkArguments = () => {
  // Check if the correct number of arguments have been passed
  if (process.argv.length !== 2) {
    throw new Error("Doesn't expect any arguments");
  }
};

// Function to fetch and display supported tokens
const getLanesAndTokens = async () => {
  checkArguments();

  for (const supportedNetwork of supportedNetworks) {
    // Get the RPC URL for the chain from the config
    const rpcUrl = getProviderRpcUrl(supportedNetwork);
    // Initialize a provider using the obtained RPC URL
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    // Get the router's address for the specified chain
    const routerAddress = getRouterConfig(supportedNetwork).address;
    // Create a contract instance for the router using its ABI and address
    const router = new ethers.Contract(routerAddress, routerAbi, provider);

    for (const targetNetwork of supportedNetworks) {
      if (targetNetwork !== supportedNetwork) {
        // Get the chain selector for the target chain
        const targetChainSelector =
          getRouterConfig(targetNetwork).chainSelector;
        // Get OnRamp
        const onRamp = await router.getOnRamp(targetChainSelector);
        if (onRamp !== ethers.constants.AddressZero) {
          console.log(
            `\n\n ${supportedNetwork}==>${targetNetwork}.onRamp address ${onRamp}`
          );
          const onRampContract = new ethers.Contract(
            onRamp,
            onRampAbi,
            provider
          );
          const { tokens, lastUpdated, isEnabled, capacity, rate } =
            await onRampContract.currentRateLimiterState();

          if (isEnabled) {
            // global rate limit enabled
            console.log(`   global rate limit  enabled`);
          } else {
            console.log(`   global rate limit not enabled`);
          }

          const decimals = ethers.BigNumber.from("10").pow(18);

          console.log(
            `   Current USD available amount (Global): ${ethers.BigNumber.from(
              tokens
            ).div(decimals)} USD`
          );
          console.log(
            `   Timestamp in seconds last token refill (Global): ${lastUpdated}`
          );
          console.log(
            `   Maximum USD capacity amount (Global): ${ethers.BigNumber.from(
              capacity
            ).div(decimals)} USD`
          );
          console.log(
            `   Filling rate (Global): ${ethers.BigNumber.from(rate).div(
              decimals
            )} USD/seconds`
          );
          const supportedTokens = await onRampContract.getSupportedTokens(
            targetChainSelector
          );
          // For each supported token, print its name, symbol, and decimal precision
          for (const supportedToken of supportedTokens) {
            // Create a contract instance for the token using its ABI and address
            const erc20 = new ethers.Contract(
              supportedToken,
              erc20Abi,
              provider
            );

            // Fetch the token's name, symbol, and decimal precision
            const name = await erc20.name();
            const symbol = await erc20.symbol();
            const decimals = await erc20.decimals();

            // Print the token's details
            console.log(
              `\n  Token ${supportedToken} - ${name} - symbol ${symbol} - decimals ${decimals}`
            );

            const pool = await onRampContract.getPoolBySourceToken(
              targetChainSelector,
              supportedToken
            );
            console.log(`   pool ${pool}`);

            poolContract = new ethers.Contract(pool, poolAbi, provider);
            const { tokens, lastUpdated, isEnabled, capacity, rate } =
              await poolContract.currentOnRampRateLimiterState(onRamp);

            if (isEnabled) {
              // rate limit enabled
              console.log(`   pool rate limit  enabled`);
            } else {
              console.log(`   pool rate limit not enabled`);
            }
            console.log(`   Number of tokens in the bucket: ${tokens}`);
            console.log(
              `   Timestamp in seconds last token refill: ${lastUpdated}`
            );
            console.log(
              `   Maximum number of tokens that can be in the bucket: ${capacity}`
            );
            console.log(
              `   Number of tokens per second that the bucket is refilled: ${rate}`
            );
          }
        }
      }
    }
  }
};

// Run the function and handle any errors
getLanesAndTokens().catch((e) => {
  // Print any error message and terminate the script with a non-zero exit code
  console.error(e);
  process.exit(1);
});
