import { ethers } from "ethers";
import { uid } from "uid";
import { Receiver__factory } from "./typechain-types";

/**
 * Builds the transaction data necessary for sending a cross-chain message.
 *
 * @param iterations The number of iterations or operations to perform.
 * @param sourceChainSelector The identifier of the source blockchain.
 * @param senderAddress The address of the sender in the Ethereum network.
 * @returns The encoded transaction data ready to be sent.
 */
export const buildTransactionData = (
  iterations: number,
  sourceChainSelector: string,
  senderAddress: string
) => {
  // Initialize the default ABI coder to encode and decode data.
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();

  // Create an interface for the receiver contract using its factory.
  const receiverInterface = Receiver__factory.createInterface();

  // Encode a fixed-length string to a 32-byte string, used as a unique identifier.
  const messageId = ethers.encodeBytes32String(uid(20));

  // Encode the sender's address as per the ABI specification.
  const senderEncoded = abiCoder.encode(["address"], [senderAddress]);

  // Encode the 'iterations' parameter as a uint256.
  const data = abiCoder.encode(["uint256"], [iterations]);

  // Construct the message payload with encoded data.
  const any2EVMMessageEncoded = {
    messageId: messageId,
    sourceChainSelector: sourceChainSelector,
    sender: senderEncoded,
    data: data,
    destTokenAmounts: [],
  };

  // Encode the function call to 'ccipReceive' with the message payload.
  const transactionData = receiverInterface.encodeFunctionData("ccipReceive", [
    any2EVMMessageEncoded,
  ]);

  return transactionData;
};

/**
 * Estimates the intrinsic gas cost for a given hex-encoded transaction data.
 *
 * @param data The hex-encoded transaction data.
 * @returns The estimated gas cost as a bigint.
 * @throws Error if the data length is invalid for hex string representation.
 */
export const estimateIntrinsicGas = (data: string): bigint => {
  // Constants for gas cost calculation
  const ZERO_BYTE_GAS_COST = BigInt(4);
  const NON_ZERO_BYTE_GAS_COST = BigInt(16);
  const BASE_GAS_COST = BigInt(21000);

  // Remove the '0x' prefix if present to process the hex data.
  const cleanData: string = data.startsWith("0x") ? data.substring(2) : data;
  let gasCost = BASE_GAS_COST;

  // Validate that the data length is even, indicating correct hex byte representation.
  if (cleanData.length % 2 !== 0) {
    throw new Error("Invalid data length. Hex string should represent bytes.");
  }

  // Iterate over the data by two-character steps to process each byte.
  for (let i = 0; i < cleanData.length; i += 2) {
    // Extract a byte (two hex characters).
    const byte: string = cleanData.substring(i, i + 2);

    // Accumulate gas cost, differentiating between zero and non-zero bytes.
    gasCost += byte === "00" ? ZERO_BYTE_GAS_COST : NON_ZERO_BYTE_GAS_COST;
  }

  return gasCost;
};
