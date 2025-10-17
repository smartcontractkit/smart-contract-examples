import type { HardhatUserConfig } from "hardhat/config";

import "@chainlink/env-enc";
import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";

// Load environment variables from env-enc
// Run: npx env-enc set-pw
// Then the variables will be available in process.env
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const ARBITRUM_SEPOLIA_RPC_URL = process.env.ARBITRUM_SEPOLIA_RPC_URL;

const COMPILER_SETTINGS = {
  optimizer: {
    enabled: true,
    runs: 1000000,
  },
  metadata: {
    bytecodeHash: "none",
  },
};

const config: HardhatUserConfig = {
  plugins: [hardhatToolboxViemPlugin],
  solidity: {
    compilers: [
      {
        version: "0.8.20",
        settings: COMPILER_SETTINGS,
      },
    ],
  },
  networks: {
    arbitrumSepolia: {
      type: "http",
      url: ARBITRUM_SEPOLIA_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: 421614,
    },
  },
  paths: {
    sources: "./contracts",
    cache: "./build/cache",
    artifacts: "./build/artifacts",
  },
};

export default config;
