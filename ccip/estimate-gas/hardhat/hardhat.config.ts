import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
require("@chainlink/env-enc").config();

const SOLC_SETTINGS = {
  optimizer: {
    enabled: true,
    runs: 1_000,
  },
};

const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const accounts = [PRIVATE_KEY];

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.19",
        settings: SOLC_SETTINGS,
      },
    ],
  },
  networks: {
    ethereumSepolia: {
      url: process.env.ETHEREUM_SEPOLIA_RPC_URL || "UNSET",
      chainId: 11155111,
      accounts,
    },
    avalancheFuji: {
      url: process.env.AVALANCHE_FUJI_RPC_URL || "UNSET",
      chainId: 43113,
      accounts,
    },
  },
  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_API_KEY || "UNSET",
      avalancheFuji: "avalancheFuji",
    },
    customChains: [
      {
        network: "avalancheFuji",
        chainId: 43113,
        urls: {
          apiURL:
            "https://api.routescan.io/v2/network/testnet/evm/43113/etherscan",
          browserURL: "https://testnet.snowtrace.io",
        },
      },
    ],
  },
};

export default config;
