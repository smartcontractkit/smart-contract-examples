// Import the JSON configuration files
const mainnetConfig = require("../../../config/mainnet.json");
const testnetConfig = require("../../../config/testnet.json");
// Merge the configurations using the spread operator
const mergedNetworks = {
  ...mainnetConfig,
  ...testnetConfig,
};

// Get the list of supported networks
const supportedNetworks = Object.keys(mergedNetworks);

// Function to get router configuration
const getRouterConfig = (network) => {
  const config = mergedNetworks[network];
  if (!config) {
    throw new Error("No config found for network: " + network);
  }

  return {
    router: config.router,
    chainSelector: BigInt(config.chainSelector),
  };
};

// Function to get registry module configuration
const getRegistryModuleConfig = (network) => {
  const config = mergedNetworks[network];
  if (!config) {
    throw new Error("No config found for network: " + network);
  }

  return config.registryModule;
};

// Function to get token admin registry configuration
const getTokenAdminRegistryConfig = (network) => {
  const config = mergedNetworks[network];
  if (!config) {
    throw new Error("No config found for network: " + network);
  }

  return config.tokenAdminRegistry;
};

// Function to get ARM proxy configuration
const getArmProxyConfig = (network) => {
  const config = mergedNetworks[network];
  if (!config) {
    throw new Error("No config found for network: " + network);
  }

  return config.armProxy;
};

// Function to get fee tokens for a network
const getFeeTokens = (network) => {
  const config = mergedNetworks[network];
  if (!config || !config.feeTokens) {
    throw new Error("No fee tokens found for network: " + network);
  }

  return config.feeTokens;
};

// Export the functions
module.exports = {
  supportedNetworks,
  getRouterConfig,
  getRegistryModuleConfig,
  getTokenAdminRegistryConfig,
  getArmProxyConfig,
  getFeeTokens,
};
