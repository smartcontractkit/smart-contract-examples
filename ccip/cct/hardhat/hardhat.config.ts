import "@nomicfoundation/hardhat-toolbox-viem";
import { HardhatUserConfig } from "hardhat/config";
import { etherscan, networks } from "./config";
import "./tasks";

const SOLC_SETTINGS = {
  optimizer: {
    enabled: true,
    runs: 1_000,
  },
};

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.24",
        settings: SOLC_SETTINGS,
      },
    ],
  },
  verify: { etherscan: etherscan as any },
  networks: { ...(networks as any) },
};

export default config;