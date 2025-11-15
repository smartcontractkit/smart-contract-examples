import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { networkConfig } from "../../helper-hardhat-config.js";

const StreamsModule = buildModule("StreamsModule", (m) => {
  // Get network configuration for Arbitrum Sepolia (chainId: 421614)
  const config = networkConfig[421614];

  if (!config) {
    throw new Error("Network configuration not found for Arbitrum Sepolia");
  }

  // Deploy LogEmitter contract (no constructor args)
  const logEmitter = m.contract("LogEmitter");

  // Deploy StreamsUpkeepRegistrar contract with constructor args from network config
  const streamsUpkeepRegistrar = m.contract("StreamsUpkeepRegistrar", [
    config.verifierProxyAddress,
    config.linkToken,
    config.automationRegistrarAddress,
    config.feedIds,
  ]);

  return { logEmitter, streamsUpkeepRegistrar };
});

export default StreamsModule;
