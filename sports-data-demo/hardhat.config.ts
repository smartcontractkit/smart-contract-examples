import { config as dotEnvConfig } from "dotenv"
dotEnvConfig()

const PRIVATE_KEY = process.env.PRIVATE_KEY

module.exports = {
  defaultNetwork: "avalanche",
  networks: {
    hardhat: {},
    avalanche: {
      url: "https://avalanche-fuji-c-chain.publicnode.com",
      accounts: [PRIVATE_KEY],
    },
  },
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  mocha: {
    timeout: 40000,
  },
}
