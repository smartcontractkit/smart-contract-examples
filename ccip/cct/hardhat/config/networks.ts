import { EVMChains, EtherscanConfig, Networks } from "./types";
import configData from "./config.json";
import * as envEnc from "@chainlink/env-enc";
envEnc.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const PRIVATE_KEY_2 = process.env.PRIVATE_KEY_2;
const accounts: string[] = [];
if (PRIVATE_KEY) accounts.push(PRIVATE_KEY);
if (PRIVATE_KEY_2) accounts.push(PRIVATE_KEY_2);

const networks: Networks = {
  [EVMChains.avalancheFuji]: {
    type: "http",
    ...configData.avalancheFuji,
    url: process.env.AVALANCHE_FUJI_RPC_URL!,
    gasPrice: undefined,
    nonce: undefined,
    accounts,
  },
  [EVMChains.arbitrumSepolia]: {
    type: "http",
    ...configData.arbitrumSepolia,
    url: process.env.ARBITRUM_SEPOLIA_RPC_URL!,
    gasPrice: undefined,
    nonce: undefined,
    accounts,
  },
  [EVMChains.sepolia]: {
    type: "http",
    ...configData.ethereumSepolia,
    url: process.env.ETHEREUM_SEPOLIA_RPC_URL!,
    gasPrice: undefined,
    nonce: undefined,
    accounts,
  },
  [EVMChains.baseSepolia]: {
    type: "http",
    ...configData.baseSepolia,
    url: process.env.BASE_SEPOLIA_RPC_URL!,
    gasPrice: undefined,
    nonce: undefined,
    accounts,
  },
  [EVMChains.polygonAmoy]: {
    type: "http",
    ...configData.polygonAmoy,
    url: process.env.POLYGON_AMOY_RPC_URL!,
    gasPrice: undefined,
    nonce: undefined,
    accounts,
  },
};

const etherscan: EtherscanConfig = {
  apiKey: {
    [EVMChains.avalancheFuji]: "avalancheFuji",
    [EVMChains.sepolia]: process.env.ETHERSCAN_API_KEY || "UNSET",
    [EVMChains.arbitrumSepolia]: process.env.ARBISCAN_API_KEY || "UNSET",
    [EVMChains.baseSepolia]: process.env.BASESCAN_API_KEY || "UNSET",
    [EVMChains.polygonAmoy]: process.env.POLYGONSCAN_API_KEY || "UNSET",
  },
  customChains: [
    {
      network: EVMChains.avalancheFuji,
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
