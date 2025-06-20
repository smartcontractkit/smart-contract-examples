import { CHAIN_TYPE } from "../config/types";
import bs58 from "bs58";
import type { HardhatRuntimeEnvironment } from "hardhat/types";

/**
 * Error thrown when an invalid address is provided for a specific chain type
 */
export class InvalidAddressError extends Error {
  constructor(
    public readonly address: string,
    public readonly chainType: CHAIN_TYPE,
    public readonly reason?: string
  ) {
    super(
      `Invalid ${chainType} address: ${address}${reason ? ` (${reason})` : ""}`
    );
    this.name = "InvalidAddressError";
  }
}

/**
 * Error thrown when an unsupported chain type is encountered
 */
export class UnsupportedChainTypeError extends Error {
  constructor(public readonly chainType: string) {
    super(`Unsupported chain type: ${chainType}`);
    this.name = "UnsupportedChainTypeError";
  }
}

/**
 * Interface for chain-specific address handling strategies
 */
export interface ChainAddressHandler {
  /**
   * Validates if an address is valid for this chain type
   * @param address - The address to validate
   * @param hre - Hardhat runtime environment
   * @returns true if valid, false otherwise
   */
  validateAddress(address: string, hre: HardhatRuntimeEnvironment): boolean;

  /**
   * Prepares address data for contract interaction
   * @param address - The address to prepare
   * @param hre - Hardhat runtime environment
   * @returns Prepared address data
   */
  prepareAddressData(address: string, hre: HardhatRuntimeEnvironment): string;

  /**
   * Converts address to hex format if needed
   * @param address - The address to convert
   * @returns Hex representation of the address
   */
  toHex(address: string): string;
}

/**
 * EVM chain address handler implementation
 */
class EvmAddressHandler implements ChainAddressHandler {
  validateAddress(address: string, hre: HardhatRuntimeEnvironment): boolean {
    return hre.ethers.isAddress(address);
  }

  prepareAddressData(address: string, hre: HardhatRuntimeEnvironment): string {
    if (!this.validateAddress(address, hre)) {
      throw new InvalidAddressError(
        address,
        "evm",
        "Invalid EVM address format"
      );
    }

    // For EVM chains, encode as an Ethereum address
    return new hre.ethers.AbiCoder().encode(["address"], [address]);
  }

  toHex(address: string): string {
    // EVM addresses are already in hex format
    return address.toLowerCase();
  }
}

/**
 * Solana (SVM) chain address handler implementation
 */
class SvmAddressHandler implements ChainAddressHandler {
  validateAddress(address: string, hre: HardhatRuntimeEnvironment): boolean {
    try {
      // Validate Solana address format (should be base58 encoded and proper length)
      const decoded = bs58.decode(address);
      return decoded.length === 32; // Solana addresses are 32 bytes
    } catch (error) {
      return false;
    }
  }

  prepareAddressData(address: string, hre: HardhatRuntimeEnvironment): string {
    if (!this.validateAddress(address, hre)) {
      throw new InvalidAddressError(
        address,
        "svm",
        "Invalid Solana address format"
      );
    }

    // For Solana, convert directly to hex and return the string (don't use ABI encoding)
    return this.toHex(address);
  }

  toHex(address: string): string {
    try {
      const bytes = bs58.decode(address);
      return "0x" + Buffer.from(bytes).toString("hex");
    } catch (error) {
      throw new InvalidAddressError(address, "svm", "Failed to convert to hex");
    }
  }
}

/**
 * Registry of chain address handlers
 */
const chainHandlers: Record<CHAIN_TYPE, ChainAddressHandler> = {
  evm: new EvmAddressHandler(),
  svm: new SvmAddressHandler(),
} as const;

/**
 * Gets the appropriate address handler for a given chain type
 * @param chainType - The chain type
 * @returns The address handler for the chain type
 * @throws {UnsupportedChainTypeError} If the chain type is not supported
 */
export function getChainHandler(chainType: CHAIN_TYPE): ChainAddressHandler {
  const handler = chainHandlers[chainType];
  if (!handler) {
    throw new UnsupportedChainTypeError(chainType);
  }
  return handler;
}

/**
 * Validates an address for a specific chain type
 * @param address - The address to validate
 * @param chainType - The chain type
 * @param hre - Hardhat runtime environment
 * @returns true if the address is valid for the chain type
 */
export function validateChainAddress(
  address: string,
  chainType: CHAIN_TYPE,
  hre: HardhatRuntimeEnvironment
): boolean {
  try {
    const handler = getChainHandler(chainType);
    return handler.validateAddress(address, hre);
  } catch (error) {
    return false;
  }
}

/**
 * Validates an address for a specific chain type, throwing an error if invalid
 * @param address - The address to validate
 * @param chainType - The chain type
 * @param hre - Hardhat runtime environment
 * @throws {InvalidAddressError} If the address is invalid
 * @throws {UnsupportedChainTypeError} If the chain type is not supported
 */
export function validateChainAddressOrThrow(
  address: string,
  chainType: CHAIN_TYPE,
  hre: HardhatRuntimeEnvironment
): void {
  const handler = getChainHandler(chainType);
  if (!handler.validateAddress(address, hre)) {
    throw new InvalidAddressError(address, chainType);
  }
}

/**
 * Prepares address data for contract interaction based on chain type
 * @param address - The address to prepare
 * @param chainType - The chain type
 * @param hre - Hardhat runtime environment
 * @returns Prepared address data
 * @throws {InvalidAddressError} If the address is invalid
 * @throws {UnsupportedChainTypeError} If the chain type is not supported
 */
export function prepareChainAddressData(
  address: string,
  chainType: CHAIN_TYPE,
  hre: HardhatRuntimeEnvironment
): string {
  const handler = getChainHandler(chainType);
  return handler.prepareAddressData(address, hre);
}

/**
 * Converts an address to hex format for a specific chain type
 * @param address - The address to convert
 * @param chainType - The chain type
 * @param hre - Hardhat runtime environment
 * @returns Hex representation of the address
 * @throws {InvalidAddressError} If the address is invalid
 * @throws {UnsupportedChainTypeError} If the chain type is not supported
 */
export function convertChainAddressToHex(
  address: string,
  chainType: CHAIN_TYPE,
  hre: HardhatRuntimeEnvironment
): string {
  const handler = getChainHandler(chainType);
  if (!handler.validateAddress(address, hre)) {
    throw new InvalidAddressError(address, chainType);
  }
  return handler.toHex(address);
}

/**
 * Type guard to check if a string is a valid CHAIN_TYPE
 * @param chainType - The string to check
 * @returns true if the string is a valid CHAIN_TYPE
 */
export function isValidChainType(chainType: string): chainType is CHAIN_TYPE {
  return chainType === "evm" || chainType === "svm";
}
