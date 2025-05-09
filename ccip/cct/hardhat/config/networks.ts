import { CHAIN_TYPE, Chains, EtherscanConfig, Networks } from "./types";
import configData from "./config.json";

require("@chainlink/env-enc").config();

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const PRIVATE_KEY_2 = process.env.PRIVATE_KEY_2;
const accounts = [];
if (PRIVATE_KEY) {
  accounts.push(PRIVATE_KEY);
}

if (PRIVATE_KEY_2) {
  accounts.push(PRIVATE_KEY_2);
}

const networks: Networks = {
  [Chains.avalancheFuji]: {
    ...configData.avalancheFuji,
    url: process.env.AVALANCHE_FUJI_RPC_URL || "UNSET",
    chainType: configData.avalancheFuji.chainType as CHAIN_TYPE,
    gasPrice: undefined,
    nonce: undefined,
    accounts,
  },
  [Chains.arbitrumSepolia]: {
    ...configData.arbitrumSepolia,
    url: process.env.ARBITRUM_SEPOLIA_RPC_URL || "UNSET",
    chainType: configData.arbitrumSepolia.chainType as CHAIN_TYPE,
    gasPrice: undefined,
    nonce: undefined,
    accounts,
  },
  [Chains.sepolia]: {
    ...configData.ethereumSepolia,
    url: process.env.ETHEREUM_SEPOLIA_RPC_URL || "UNSET",
    chainType: configData.ethereumSepolia.chainType as CHAIN_TYPE,
    gasPrice: undefined,
    nonce: undefined,
    accounts,
  },
  [Chains.baseSepolia]: {
    ...configData.baseSepolia,
    url: process.env.BASE_SEPOLIA_RPC_URL || "UNSET",
    chainType: configData.baseSepolia.chainType as CHAIN_TYPE,
    gasPrice: undefined,
    nonce: undefined,
    accounts,
  },
};

const etherscan: EtherscanConfig = {
  apiKey: {
    [Chains.avalancheFuji]: "avalancheFuji",
    [Chains.sepolia]: process.env.ETHERSCAN_API_KEY || "UNSET",
    [Chains.arbitrumSepolia]: process.env.ARBISCAN_API_KEY || "UNSET",
    [Chains.baseSepolia]: process.env.BASESCAN_API_KEY || "UNSET",
  },
  customChains: [
    {
      network: Chains.avalancheFuji,
      chainId: configData.avalancheFuji.chainId,
      urls: {
        apiURL:
          "https://api.routescan.io/v2/network/testnet/evm/43113/etherscan",
        browserURL: "https://testnet.snowtrace.io",
      },
    },
  ],
};

export { networks, etherscan, configData };
