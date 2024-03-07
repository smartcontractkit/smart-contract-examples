const { merge } = require("lodash");
const supportedNetworksMainnet = require("../../../config/mainnet.json");
const supportedNetworksTestnet = require("../../../config/testnet.json");

const mergedNetworks = merge(
  {},
  supportedNetworksMainnet,
  supportedNetworksTestnet
);

const supportedNetworks = Object.keys(mergedNetworks);

const getRouterConfig = (network) => {
  const config = mergedNetworks[network];
  if (!config || Object.keys(config).length === 0) {
    throw new Error("No config found for network: " + network);
  }

  return config;
};

module.exports = {
  supportedNetworks,
  getRouterConfig,
};
