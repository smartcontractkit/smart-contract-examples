export type CHAIN_TYPE = "evm" | "svm";

/**
 * Type guard to check if a string is a valid CHAIN_TYPE
 * @param value - The string to check
 * @returns true if the string is a valid CHAIN_TYPE
 */
export function isChainType(value: string): value is CHAIN_TYPE {
  return value === "evm" || value === "svm";
}

export interface ChainConfig {
  chainId?: number | string; // Allow string for non-EVM chains like Solana
  chainSelector: string;
  router?: string; // Optional for non-EVM chains
  rmnProxy?: string; // Optional for non-EVM chains
  tokenAdminRegistry?: string; // Optional for non-EVM chains
  registryModuleOwnerCustom?: string; // Optional for non-EVM chains
  link?: string; // Optional for non-EVM chains
  confirmations: number;
  nativeCurrencySymbol: string;
  chainType: CHAIN_TYPE;
}

// Specific type for EVM chains used by Hardhat
export interface EVMChainConfig {
  chainId: number; // Strict number type for EVM chains
  chainSelector: string;
  router: string;
  rmnProxy: string;
  tokenAdminRegistry: string;
  registryModuleOwnerCustom: string;
  link: string;
  confirmations: number;
  nativeCurrencySymbol: string;
  chainType: string;
  type: string;
}

export enum Chains {
  avalancheFuji = "avalancheFuji",
  arbitrumSepolia = "arbitrumSepolia",
  sepolia = "sepolia",
  baseSepolia = "baseSepolia",
  solanaDevnet = "solanaDevnet",
  polygonAmoy = "polygonAmoy",
}

// EVM-only chains for Hardhat networks
export enum EVMChains {
  avalancheFuji = "avalancheFuji",
  arbitrumSepolia = "arbitrumSepolia",
  sepolia = "sepolia",
  baseSepolia = "baseSepolia",
  polygonAmoy = "polygonAmoy",
}

export type Configs = {
  [key in Chains]: ChainConfig;
};

export interface NetworkConfig extends EVMChainConfig {
  url: string;
  gasPrice?: number;
  nonce?: number;
  accounts: string[];
}

// Use EVMChains for Hardhat networks to ensure type safety
export type Networks = Partial<{
  [key in EVMChains]: NetworkConfig;
}>;

type ApiKeyConfig = Partial<{
  [key in Chains]: string;
}>;

interface Urls {
  apiURL: string;
  browserURL: string;
}

interface CustomChain {
  network: string;
  chainId: number;
  urls: Urls;
}

export interface EtherscanConfig {
  apiKey: ApiKeyConfig;
  customChains: CustomChain[];
}

export enum TokenContractName {
  BurnMintERC20 = "BurnMintERC20",
}

export enum TokenPoolContractName {
  BurnMintTokenPool = "BurnMintTokenPool",
  LockReleaseTokenPool = "LockReleaseTokenPool",
}

export enum PoolType {
  burnMint = "burnMint",
  lockRelease = "lockRelease",
}
