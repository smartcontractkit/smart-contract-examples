import type { Chains, EVMChains } from "./types";
import { configData, networks } from "./networks";
export {
  PoolType,
  TokenContractName,
  TokenPoolContractName,
  CCIPContractName,
} from "./types";
export type { Chains, EVMChains, Networks } from "./types";
export { configData, networks } from "./networks";
export { logger } from "./logger";

/**
 * Type guard to check if a string is a valid chain name
 */
export function isValidChain(chain: string): chain is Chains {
  return chain in configData;
}

/**
 * Type guard to check if a chain is an EVM chain
 */
export function isEVMChain(chain: string): chain is EVMChains {
  if (!isValidChain(chain)) return false;
  return configData[chain].chainFamily === "evm";
}

/**
 * Validates and returns a typed network name from Hardhat runtime environment
 */
export function validateNetworkName(networkName: string): Chains {
  if (!isValidChain(networkName)) {
    throw new Error(`Unsupported network: ${networkName}`);
  }
  return networkName;
}

/**
 * Safely get network configuration for EVM chains only
 * Throws error if trying to access non-EVM chain network config
 */
export function getEVMNetworkConfig(chainName: string) {
  if (!isEVMChain(chainName)) {
    throw new Error(
      `Cannot access network configuration for non-EVM chain: ${chainName}. Use configData for non-EVM chains.`
    );
  }
  return networks[chainName as EVMChains];
}