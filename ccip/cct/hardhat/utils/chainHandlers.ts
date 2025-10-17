import { CHAIN_FAMILY } from "../config/types";
import bs58 from "bs58";
import { configData } from "../config";
import { isAddress, encodeAbiParameters, decodeAbiParameters, parseAbiParameters } from "viem";

/**
 * Error thrown when an invalid address is provided for a specific chain type
 */
export class InvalidAddressError extends Error {
  constructor(
    public readonly address: string,
    public readonly chainFamily: CHAIN_FAMILY,
    public readonly reason?: string
  ) {
    super(
      `Invalid ${chainFamily} address: ${address}${reason ? ` (${reason})` : ""}`
    );
    this.name = "InvalidAddressError";
  }
}

/**
 * Error thrown when an unsupported chain type is encountered
 */
export class UnsupportedChainFamilyError extends Error {
  constructor(public readonly chainFamily: string) {
    super(`Unsupported chain type: ${chainFamily}`);
    this.name = "UnsupportedChainFamilyError";
  }
}

/**
 * Interface for chain-specific address handling strategies
 */
export interface ChainAddressHandler {
  /**
   * Validates if an address is valid for this chain type
   * @param address - The address to validate
   * @returns true if valid, false otherwise
   */
  validateAddress(address: string): boolean;

  /**
   * Prepares address data for contract interaction
   * @param address - The address to prepare
   * @returns Prepared address data
   */
  prepareAddressData(address: string): string;

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
  validateAddress(address: string): boolean {
    return isAddress(address);
  }

  prepareAddressData(address: string): string {
    if (!this.validateAddress(address)) {
      throw new InvalidAddressError(
        address,
        "evm",
        "Invalid EVM address format"
      );
    }

    // For EVM chains, encode as an Ethereum address using viem
    return encodeAbiParameters(
      parseAbiParameters('address'),
      [address as `0x${string}`]
    );
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
  validateAddress(address: string): boolean {
    try {
      // Validate Solana address format (should be base58 encoded and proper length)
      const decoded = bs58.decode(address);
      return decoded.length === 32; // Solana addresses are 32 bytes
    } catch (error) {
      return false;
    }
  }

  prepareAddressData(address: string): string {
    if (!this.validateAddress(address)) {
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
const chainHandlers: Record<CHAIN_FAMILY, ChainAddressHandler> = {
  evm: new EvmAddressHandler(),
  svm: new SvmAddressHandler(),
} as const;

/**
 * Gets the appropriate address handler for a given chain type
 * @param chainFamily - The chain type
 * @returns The address handler for the chain type
 * @throws {UnsupportedChainFamilyError} If the chain type is not supported
 */
export function getChainHandler(chainFamily: CHAIN_FAMILY): ChainAddressHandler {
  const handler = chainHandlers[chainFamily];
  if (!handler) {
    throw new UnsupportedChainFamilyError(chainFamily);
  }
  return handler;
}

/**
 * Validates an address for a specific chain type
 * @param address - The address to validate
 * @param chainFamily - The chain type
 * @returns true if the address is valid for the chain type
 */
export function validateChainAddress(
  address: string,
  chainFamily: CHAIN_FAMILY
): boolean {
  try {
    const handler = getChainHandler(chainFamily);
    return handler.validateAddress(address);
  } catch (error) {
    return false;
  }
}

/**
 * Validates an address for a specific chain type, throwing an error if invalid
 * @param address - The address to validate
 * @param chainFamily - The chain type
 * @throws {InvalidAddressError} If the address is invalid
 * @throws {UnsupportedChainFamilyError} If the chain type is not supported
 */
export function validateChainAddressOrThrow(
  address: string,
  chainFamily: CHAIN_FAMILY
): void {
  const handler = getChainHandler(chainFamily);
  if (!handler.validateAddress(address)) {
    throw new InvalidAddressError(address, chainFamily);
  }
}

/**
 * Prepares address data for contract interaction based on chain type
 * @param address - The address to prepare
 * @param chainFamily - The chain type
 * @returns Prepared address data
 * @throws {InvalidAddressError} If the address is invalid
 * @throws {UnsupportedChainFamilyError} If the chain type is not supported
 */
export function prepareChainAddressData(
  address: string,
  chainFamily: CHAIN_FAMILY
): string {
  const handler = getChainHandler(chainFamily);
  return handler.prepareAddressData(address);
}

/**
 * Converts an address to hex format for a specific chain type
 * @param address - The address to convert
 * @param chainFamily - The chain type
 * @returns Hex representation of the address
 * @throws {InvalidAddressError} If the address is invalid
 * @throws {UnsupportedChainFamilyError} If the chain type is not supported
 */
export function convertChainAddressToHex(
  address: string,
  chainFamily: CHAIN_FAMILY
): string {
  const handler = getChainHandler(chainFamily);
  if (!handler.validateAddress(address)) {
    throw new InvalidAddressError(address, chainFamily);
  }
  return handler.toHex(address);
}

/**
 * Type guard to check if a string is a valid CHAIN_FAMILY
 * @param chainFamily - The string to check
 * @returns true if the string is a valid CHAIN_FAMILY
 */
export function isValidChainFamily(chainFamily: string): chainFamily is CHAIN_FAMILY {
  return chainFamily === "evm" || chainFamily === "svm";
}

/**
 * Interface for chain configuration lookup result
 */
export interface ChainInfo {
  name: string;
  chainFamily: CHAIN_FAMILY;
  chainSelector: string;
  config: any;
}

/**
 * Looks up chain information by chain selector
 * @param chainSelector - The chain selector to look up
 * @returns Chain information or undefined if not found
 */
export function getChainInfoBySelector(
  chainSelector: string | bigint
): ChainInfo | undefined {
  const selectorString = chainSelector.toString();

  const chainName = Object.keys(configData).find(
    (key) =>
      configData[key as keyof typeof configData]?.chainSelector?.toString() ===
      selectorString
  );

  if (!chainName) {
    return undefined;
  }

  const config = configData[chainName as keyof typeof configData];
  const chainFamily = config.chainFamily as CHAIN_FAMILY;

  return {
    name: chainName,
    chainFamily,
    chainSelector: selectorString,
    config,
  };
}

/**
 * Decodes an encoded address based on the chain type
 * @param encodedAddress - The encoded address data
 * @param chainFamily - The chain type (evm or svm)
 * @returns The decoded address string
 * @throws Error if decoding fails
 */
export function decodeChainAddress(
  encodedAddress: string,
  chainFamily: CHAIN_FAMILY
): string {
  if (chainFamily === "svm") {
    // For Solana, the encoded address is a hex string (32 bytes)
    const hexString = encodedAddress.startsWith("0x")
      ? encodedAddress.slice(2)
      : encodedAddress;
    const bytes = Buffer.from(hexString, "hex");
    return bs58.encode(bytes);
  } else if (chainFamily === "evm") {
    // For EVM chains, use viem's decodeAbiParameters
    const [decoded] = decodeAbiParameters(
      parseAbiParameters('address'),
      encodedAddress as `0x${string}`
    );
    return decoded as string;
  } else {
    throw new UnsupportedChainFamilyError(chainFamily);
  }
}

/**
 * Decodes an address by first looking up the chain type from the selector
 * @param encodedAddress - The encoded address data
 * @param chainSelector - The chain selector
 * @param hre - Hardhat runtime environment
 * @returns The decoded address string or "UNKNOWN_CHAIN" if chain not found
 */
export function decodeAddressByChainSelector(
  encodedAddress: string,
  chainSelector: string | bigint
): string {
  try {
    const chainInfo = getChainInfoBySelector(chainSelector);
    if (!chainInfo) {
      return "UNKNOWN_CHAIN";
    }
    return decodeChainAddress(encodedAddress, chainInfo.chainFamily);
  } catch (error) {
    return "DECODE_ERROR";
  }
}
