import type { Address } from "viem";
import type { HardhatRuntimeEnvironment } from "hardhat/types/hre";


/**
 * Fee token options for CCIP transfers
 */
export type FeeTokenType = "native" | "link" | "wrappedNative";




/**
 * Custom error types for better error handling
 */
export class EtherSenderReceiverError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "EtherSenderReceiverError";
  }
}

export class ValidationError extends EtherSenderReceiverError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "VALIDATION_ERROR", details);
    this.name = "ValidationError";
  }
}

export class NetworkError extends EtherSenderReceiverError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "NETWORK_ERROR", details);
    this.name = "NetworkError";
  }
}

export class ContractError extends EtherSenderReceiverError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "CONTRACT_ERROR", details);
    this.name = "ContractError";
  }
}

export class InsufficientBalanceError extends EtherSenderReceiverError {
  constructor(
    required: bigint,
    available: bigint,
    currency: string
  ) {
    super(
      `Insufficient balance. Required: ${required} ${currency}, Available: ${available} ${currency}`,
      "INSUFFICIENT_BALANCE",
      { required: required.toString(), available: available.toString(), currency }
    );
    this.name = "InsufficientBalanceError";
  }
}
