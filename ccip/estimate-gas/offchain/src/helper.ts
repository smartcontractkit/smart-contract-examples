import { ethers } from "ethers";
import { Receiver__factory } from "./typechain-types";

export const buildTransactionData = (
  iterations: number,
  sourceChainSelector: string,
  senderAddress: string
) => {
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();
  const receiverInterface = Receiver__factory.createInterface();

  const messageId = ethers.encodeBytes32String("123");
  const senderEncoded = abiCoder.encode(["address"], [senderAddress]);
  const data = abiCoder.encode(["uint256"], [iterations]);
  const any2EVMMessageEncoded = {
    messageId: messageId,
    sourceChainSelector: sourceChainSelector,
    sender: senderEncoded,
    data: data,
    destTokenAmounts: [],
  };

  const transactionData = receiverInterface.encodeFunctionData("ccipReceive", [
    any2EVMMessageEncoded,
  ]);

  return transactionData;
};

export const estimateIntrinsicGas = (data: string): bigint => {
  const ZERO_BYTE_GAS_COST = BigInt(4);
  const NON_ZERO_BYTE_GAS_COST = BigInt(16);
  const BASE_GAS_COST = BigInt(21000);

  // Check if data starts with '0x' and remove it for processing
  const cleanData: string = data.startsWith("0x") ? data.substring(2) : data;
  let gasCost = BASE_GAS_COST;

  // Ensure data length is even for correct byte processing
  if (cleanData.length % 2 !== 0) {
    throw new Error("Invalid data length. Hex string should represent bytes.");
  }

  for (let i = 0; i < cleanData.length; i += 2) {
    // Each byte in the data string is represented by two characters
    const byte: string = cleanData.substring(i, i + 2);
    gasCost += byte === "00" ? ZERO_BYTE_GAS_COST : NON_ZERO_BYTE_GAS_COST;
  }

  return gasCost;
};
