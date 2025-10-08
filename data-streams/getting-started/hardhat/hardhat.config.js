import { config as envEncConfig } from "@chainlink/env-enc"
import "@nomicfoundation/hardhat-toolbox-mocha-ethers"
// Note: Tasks are temporarily disabled due to ESM loading issues in Hardhat 3
// import "./tasks/index.js"

// Load environment variables
envEncConfig()

// Set EVM private keys (required)
const PRIVATE_KEY = process.env.PRIVATE_KEY

const COMPILER_SETTINGS = {
  optimizer: {
    enabled: true,
    runs: 1000000,
  },
  metadata: {
    bytecodeHash: "none",
  },
}

export default {
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
      url: process.env.ARBITRUM_SEPOLIA_RPC_URL || "https://arbitrum-sepolia.rpc.thirdweb.com",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: 421614,
    },
  },
  paths: {
    sources: "./contracts",
    cache: "./build/cache",
    artifacts: "./build/artifacts",
  },
}
