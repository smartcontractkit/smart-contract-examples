import type { configData } from "./networks";

export type CHAIN_FAMILY = "evm" | "svm";
export type Chains = keyof typeof configData;
export type EVMChains = {
  [K in Chains]: (typeof configData)[K] extends { chainFamily: "evm" } ? K : never;
}[Chains];

export interface NetworkConfig {
  type: "http";
  chainId: number;
  url: string;
  accounts: string[];
  gasPrice?: number;
  nonce?: number;
}

// Use EVMChains for Hardhat networks to ensure type safety
export type Networks = Partial<{
  [key in EVMChains]: NetworkConfig;
}>;

export enum TokenContractName {
  BurnMintERC20 = "BurnMintERC20",
  ERC20 = "ERC20",
}

export enum TokenPoolContractName {
  BurnMintTokenPool = "BurnMintTokenPool",
  LockReleaseTokenPool = "LockReleaseTokenPool",
}

export enum CCIPContractName {
  RegistryModuleOwnerCustom = "RegistryModuleOwnerCustom",
  TokenAdminRegistry = "TokenAdminRegistry",
  TokenPool = "TokenPool",
  Router = "IRouterClient",
  OnRamp = "OnRamp",
  OwnerIsCreator = "OwnerIsCreator",
  RateLimiter = "RateLimiter",
  Client = "Client",
  EtherSenderReceiver = "EtherSenderReceiver",
}

export enum PoolType {
  burnMint = "burnMint",
  lockRelease = "lockRelease",
}
