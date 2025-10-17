import { Chains, EVMChains } from "./types";
import { networks } from "./networks";

export {
  Chains,
  EVMChains,
  PoolType,
  TokenContractName,
  TokenPoolContractName,
  CCIPContractName,
} from "./types";

export type { Networks } from "./types"; 
export { networks, configData } from "./networks";
export { logger } from "./logger";

/**
 * Type guard to check if a chain is an EVM chain
 */
export function isEVMChain(chain: string): boolean {
  return Object.values(EVMChains).includes(chain as EVMChains);
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