// Import the JSON configuration files
import mainnetConfig from "../../../config/mainnet.json";
import testnetConfig from "../../../config/testnet.json";

type MainnetNetworks = keyof typeof mainnetConfig;
type TestnetNetworks = keyof typeof testnetConfig;

type NETWORK = MainnetNetworks | TestnetNetworks;

// Define the interface for the network configuration
interface NetworkConfig {
  chainSelector: string;
  router: {
    address: string;
    version: string;
  };
  armProxy: {
    address: string;
    version: string;
  };
  registryModule?: {
    address: string;
    version: string;
  };
  tokenAdminRegistry?: {
    address: string;
    version: string;
  };
  feeTokens: string[];
}

// Merge the configurations using the spread operator
const mergedNetworks: Record<NETWORK, NetworkConfig> = {
  ...mainnetConfig,
  ...testnetConfig,
};

// Get the list of supported networks
const supportedNetworks = Object.keys(mergedNetworks) as NETWORK[];

// Function to get router configuration
const getRouterConfig = (network: NETWORK) => {
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
const getRegistryModuleConfig = (network: NETWORK) => {
  const config = mergedNetworks[network];
  if (!config) {
    throw new Error("No config found for network: " + network);
  }

  return config.registryModule;
};

// Function to get token admin registry configuration
const getTokenAdminRegistryConfig = (network: NETWORK) => {
  const config = mergedNetworks[network];
  if (!config) {
    throw new Error("No config found for network: " + network);
  }

  return config.tokenAdminRegistry;
};

// Function to get ARM proxy configuration
const getArmProxyConfig = (network: NETWORK) => {
  const config = mergedNetworks[network];
  if (!config) {
    throw new Error("No config found for network: " + network);
  }

  return config.armProxy;
};

// Function to get fee tokens for a network
const getFeeTokens = (network: NETWORK) => {
  const config = mergedNetworks[network];
  if (!config || !config.feeTokens) {
    throw new Error("No fee tokens found for network: " + network);
  }

  return config.feeTokens;
};

// Export the types and functions
export {
  NETWORK,
  NetworkConfig,
  supportedNetworks,
  getRouterConfig,
  getRegistryModuleConfig,
  getTokenAdminRegistryConfig,
  getArmProxyConfig,
  getFeeTokens,
};
