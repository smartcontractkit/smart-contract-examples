import { merge } from "lodash";
import supportedNetworksMainnet from "../../../config/mainnet.json";
import supportedNetworksTestnet from "../../../config/testnet.json";

const mergedNetworks = merge(
  {},
  supportedNetworksMainnet,
  supportedNetworksTestnet
);
type NETWORK = keyof typeof mergedNetworks;
const supportedNetworks = Object.keys(mergedNetworks);

const getRouterConfig = (network: NETWORK) => {
  const config = mergedNetworks[network];
  if (!config || Object.keys(config).length === 0) {
    throw new Error("No config found for network: " + network);
  }

  return {
    router: config.router,
    chainSelector: BigInt(config.chainSelector),
  };
};

export { NETWORK, supportedNetworks, getRouterConfig };
