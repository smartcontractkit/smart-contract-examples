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

export { networks, configData };
