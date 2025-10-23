import { HardhatUserConfig } from "hardhat/config";
import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import hardhatVerifyPlugin from "@nomicfoundation/hardhat-verify";
import * as envEnc from "@chainlink/env-enc";
envEnc.config();

const SOLC_SETTINGS = {
  optimizer: {
    enabled: true,
    runs: 1_000,
  },
};

const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const accounts = [PRIVATE_KEY];

const config: HardhatUserConfig = {
  plugins: [hardhatToolboxViemPlugin, hardhatVerifyPlugin],
  solidity: {
    npmFilesToBuild: [
      "@chainlink/contracts/src/v0.8/shared/token/ERC677/BurnMintERC677.sol",
      "@chainlink/contracts-ccip/contracts/test/mocks/MockRouter.sol"
    ],
    profiles: {
      default: {
        version: "0.8.24",
        settings: SOLC_SETTINGS
      },
      production: {
        version: "0.8.24",
        settings: SOLC_SETTINGS
      },
    },
  },
  networks: {
    ethereumSepolia: {
      type: "http",
      url: process.env.ETHEREUM_SEPOLIA_RPC_URL || "UNSET",
      chainId: 11155111,
      accounts,
    },
    avalancheFuji: {
      type: "http",
      url: process.env.AVALANCHE_FUJI_RPC_URL || "UNSET",
      chainId: 43113,
      accounts,
    },
  } as any,
  verify: {
    etherscan: {
      apiKey: process.env.ETHERSCAN_API_KEY || "UNSET",
      enabled: true,
    },
    blockscout: {
      enabled: false,
    },
  },
};

export default config;
