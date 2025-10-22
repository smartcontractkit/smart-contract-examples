
import { HardhatUserConfig } from "hardhat/config";
import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import hardhatVerifyPlugin from "@nomicfoundation/hardhat-verify";
import { networks } from "./config";
import { tasks, npmFilesToBuild } from "./tasks";

// Type adapter to convert Networks type to Hardhat's expected Record<string, NetworkUserConfig>
type HardhatNetworks = Record<string, {
  type: "http";
  chainId: number;
  url: string;
  accounts: string[];
  gasPrice?: number;
  nonce?: number;
}>;

// Type-safe conversion function that ensures networks match Hardhat's expected structure
function toHardhatNetworks(networks: typeof import("./config").networks): HardhatNetworks {
  return networks as HardhatNetworks;
}

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
  // Fix for Arbitrum Sepolia chain descriptor bug in hardhat-verify
  chainDescriptors: {
    421614: {
      name: "Arbitrum Sepolia",
      chainType: "generic",
      blockExplorers: {
        etherscan: {
          name: "Arbiscan",
          url: "https://sepolia.arbiscan.io",
          apiUrl: "https://api-sepolia.arbiscan.io/api",
        },
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
  networks: toHardhatNetworks(networks)
};

export default config;