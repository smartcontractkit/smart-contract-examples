require("@chainlink/env-enc").config()
require("@nomicfoundation/hardhat-toolbox")
require("./tasks")

const PRIVATE_KEY = process.env.PRIVATE_KEY || ""

const COMPILER_SETTINGS = {
  optimizer: {
    enabled: true,
    runs: 1000000,
  },
  metadata: {
    bytecodeHash: "none",
  },
}

module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.19",
        settings: COMPILER_SETTINGS,
      },
    ],
  },
  networks: {
    ethereumSepolia: {
      url: process.env.ETHEREUM_SEPOLIA_RPC_URL || "UNSET",
      accounts: [PRIVATE_KEY],
      chainId: 11155111,
    },
  },
  paths: {
    sources: "./contracts",
    cache: "./build/cache",
    artifacts: "./build/artifacts",
  },
}
