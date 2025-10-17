
import { HardhatUserConfig } from "hardhat/config";
import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import hardhatVerifyPlugin from "@nomicfoundation/hardhat-verify";
import { networks } from "./config";
import { tasks, npmFilesToBuild } from "./tasks";

const SOLC_SETTINGS = {
  optimizer: {
    enabled: true,
    runs: 1_000,
  },
};

const config: HardhatUserConfig = {
  plugins: [hardhatToolboxViemPlugin, hardhatVerifyPlugin],
  tasks,
  solidity: {
    npmFilesToBuild,
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
  verify: {
    etherscan: {
      apiKey: process.env.ETHERSCAN_API_KEY || "UNSET",
      enabled: true,
    },
    blockscout: {
      enabled: false,
    },
  },
  networks: networks as any
};

export default config;