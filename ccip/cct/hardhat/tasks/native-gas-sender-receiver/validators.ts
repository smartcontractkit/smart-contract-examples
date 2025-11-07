import { isAddress, parseEther } from "viem";
import type { Address } from "viem";
import { Chains, isValidChain, configData } from "../../config";
import type { FeeTokenType } from "./types";
import { ValidationError } from "./types";
import { validateChainAddressOrThrow, InvalidAddressError, UnsupportedChainFamilyError } from "../../utils/chainHandlers";
import { CHAIN_FAMILY } from "../../config/types";


/**
 * Type guard to check if a string is a valid Ethereum address
 */
export function isValidAddress(value: string): value is Address {
  return isAddress(value);
}

/**
 * Type guard to check if a string is a valid fee token type
 */
export function isValidFeeToken(value: string): value is FeeTokenType {
  return value === "native" || value === "link" || value === "wrappedNative";
}

/**
 * Type guard to check if a string is a valid amount
 */
export function isValidAmount(value: string): boolean {
  try {
    const amount = parseFloat(value);
    return !isNaN(amount) && amount > 0 && isFinite(amount);
  } catch {
    return false;
  }
}

/**
 * Type guard to check if a string can be parsed as ether
 */
export function isValidEtherAmount(value: string): boolean {
  try {
    parseEther(value);
    return isValidAmount(value);
  } catch {
    return false;
  }
}

/**
 * Validates and returns a typed address
 */
export function validateAddress(value: string, paramName: string): Address {
  if (!value) {
    throw new ValidationError(`Missing required parameter: ${paramName}`, { paramName });
  }
  
  if (!isValidAddress(value)) {
    throw new ValidationError(`Invalid address format for ${paramName}: ${value}`, { 
      paramName, 
      value 
    });
  }
  
  return value;
}

/**
 * Validates and returns a typed chain name
 */
export function validateChain(value: string, paramName: string): Chains {
  if (!value) {
    throw new ValidationError(`Missing required parameter: ${paramName}`, { paramName });
  }
  
  if (!isValidChain(value)) {
    throw new ValidationError(`Unsupported chain: ${value}. Supported chains: ${Object.keys(configData).join(", ")}`, {
      paramName,
      value,
      supportedChains: Object.keys(configData)
    });
  }
  
  return value;
}

/**
 * Validates and returns a typed fee token
 */
export function validateFeeToken(value: string, paramName: string): FeeTokenType {
  if (!isValidFeeToken(value)) {
    throw new ValidationError(`Invalid fee token: ${value}. Must be 'native', 'link', or 'wrappedNative'`, {
      paramName,
      value,
      validOptions: ["native", "link", "wrappedNative"]
    });
  }
  
  return value;
}

/**
 * Validates an ether amount string
 */
export function validateEtherAmount(value: string, paramName: string): string {
  if (!value) {
    throw new ValidationError(`Missing required parameter: ${paramName}`, { paramName });
  }
  
  if (!isValidEtherAmount(value)) {
    throw new ValidationError(`Invalid amount format for ${paramName}: ${value}. Must be a positive number`, {
      paramName,
      value
    });
  }
  
  return value;
}

/**
 * Validates a contract address parameter
 */
export function validateContractAddress(value: string): Address {
  return validateAddress(value, "contract");
}

/**
 * Validates a receiver address parameter
 */
export function validateReceiverAddress(value: string): Address {
  return validateAddress(value, "receiver");
}

/**
 * Type guard to check if a string is a valid gas limit
 */
export function isValidGasLimit(value: string): boolean {
  try {
    const gasLimit = parseInt(value, 10);
    return !isNaN(gasLimit) && gasLimit >= 0 && gasLimit <= 2000000 && isFinite(gasLimit);
  } catch {
    return false;
  }
}

/**
 * Validates and returns a gas limit as bigint
 */
export function validateGasLimit(value: string, paramName: string): bigint {
  if (!value) {
    throw new ValidationError(`Missing required parameter: ${paramName}`, { paramName });
  }
  
  if (!isValidGasLimit(value)) {
    throw new ValidationError(`Invalid gas limit for ${paramName}: ${value}. Must be a number between 0 and 2,000,000`, {
      paramName,
      value,
      validRange: "0-2,000,000"
    });
  }
  
  return BigInt(value);
}

/**
 * Validates receiver address based on destination chain family
 * Supports both EVM (0x hex) and non-EVM (e.g., Solana base58) addresses
 */
export function validateReceiverAddressForChain(
  address: string,
  chainFamily: CHAIN_FAMILY,
  paramName: string = "receiver"
): string {
  if (!address) {
    throw new ValidationError(`Missing required parameter: ${paramName}`, { paramName });
  }
  
  try {
    validateChainAddressOrThrow(address, chainFamily);
    return address;
  } catch (error) {
    if (error instanceof InvalidAddressError || error instanceof UnsupportedChainFamilyError) {
      throw new ValidationError(
        `Invalid ${chainFamily} address for ${paramName}: ${address} — ${error.message}`,
        { paramName, address, chainFamily }
      );
    }
    throw error;
  }
}
