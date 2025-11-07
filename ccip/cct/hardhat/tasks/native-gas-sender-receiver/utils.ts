import { formatEther, formatUnits, zeroAddress, toHex, encodeAbiParameters } from "viem";
import type { Address, PublicClient } from "viem";
import type { HardhatViemHelpers } from "@nomicfoundation/hardhat-viem/types";
import { CCIPContractName, logger } from "../../config";
import type { FeeTokenType } from "./types";
import { validateAddress } from "./validators";
import { InsufficientBalanceError } from "./types";
import { prepareChainAddressData } from "../../utils/chainHandlers";
import { CHAIN_FAMILY } from "../../config/types";

/**
 * CCIP message structure for EtherSenderReceiver
 */
export interface CCIPMessage {
  readonly receiver: `0x${string}`; // Encoded as bytes
  readonly data: `0x${string}`;
  readonly tokenAmounts: readonly {
    readonly token: Address;
    readonly amount: bigint;
  }[];
  readonly feeToken: Address;
  readonly extraArgs: `0x${string}`;
}

/**
 * Fee calculation result with proper formatting
 */
export interface FeeResult {
  readonly fee: bigint;
  readonly feeFormatted: string;
  readonly feeTokenSymbol: string;
}

/**
 * Builds a CCIP message for EtherSenderReceiver contract with proper extraArgs
 * Note: receiver can be any chain address (EVM 0x or non-EVM like Solana base58)
 * Uses prepareChainAddressData to properly encode addresses based on destination chain family
 */
export function buildCCIPMessage(
  receiver: string,
  amount: bigint,
  feeTokenAddress: Address,
  destinationChainFamily: CHAIN_FAMILY,
  gasLimit: bigint = 200000n,
  allowOutOfOrderExecution: boolean = true
): CCIPMessage {
  // ✅ Encode extraArgs with CCIP GenericExtraArgsV2 structure
  const extraArgsEncoded = encodeAbiParameters(
    [
      { type: 'uint256', name: 'gasLimit' },
      { type: 'bool', name: 'allowOutOfOrderExecution' },
    ],
    [gasLimit, allowOutOfOrderExecution]
  );
  const evmExtraArgsV2Tag = '0x181dcf10'; // GENERIC_EXTRA_ARGS_V2_TAG
  const extraArgs = (evmExtraArgsV2Tag + extraArgsEncoded.slice(2)) as `0x${string}`;

  // ✅ Use prepareChainAddressData to properly encode receiver address based on chain family
  // This handles EVM (0x addresses), Solana (base58 decoded to hex), and other chain types
  const receiverBytes = prepareChainAddressData(receiver, destinationChainFamily);

  return {
    receiver: receiverBytes as `0x${string}`,
    data: toHex(""), // Will be overwritten by contract with abi.encode(msg.sender)
    tokenAmounts: [
      {
        token: zeroAddress, // Will be overwritten by contract with i_weth address
        amount,
      },
    ],
    feeToken: feeTokenAddress,
    extraArgs: extraArgs,
  };
}

/**
 * Gets fee estimate with proper decimal-aware formatting
 */
export async function getFeeWithFormatting(
  etherSenderReceiverContract: any,
  destinationChainSelector: bigint,
  message: CCIPMessage,
  feeTokenType: FeeTokenType,
  feeTokenAddress: Address,
  nativeCurrencySymbol: string,
  viem: HardhatViemHelpers
): Promise<FeeResult> {
  // ✅ Get fee estimate from contract
  const fee = await etherSenderReceiverContract.read.getFee([
    destinationChainSelector,
    message,
  ]);

  // ✅ Format fee with proper decimals based on fee token type
  let feeFormatted: string;
  let feeTokenSymbol: string;
  
  if (feeTokenType === "native") {
    feeFormatted = formatEther(fee);
    feeTokenSymbol = nativeCurrencySymbol;
  } else {
    // ✅ Fetch decimals from ERC20 contract for accurate formatting
    const feeTokenContract = await viem.getContractAt("ERC20", feeTokenAddress);
    const decimals = await feeTokenContract.read.decimals() as number;
    feeFormatted = formatUnits(fee, decimals);
    feeTokenSymbol = feeTokenType === "link" ? "LINK" : "WETH";
  }

  return {
    fee,
    feeFormatted,
    feeTokenSymbol,
  };
}

/**
 * Generates CCIP Explorer URL for tracking cross-chain transaction status
 */
export function getCCIPExplorerUrl(transactionHash: `0x${string}`): string {
  return `https://ccip.chain.link/tx/${transactionHash}`;
}

/**
 * Determines the fee token address based on fee token type
 */
export async function getFeeTokenAddress(
  feeTokenType: FeeTokenType,
  linkAddress: string,
  wethAddress: string
): Promise<Address> {
  switch (feeTokenType) {
    case "native":
      return zeroAddress;
    case "link":
      return validateAddress(linkAddress, "link");
    case "wrappedNative":
      return validateAddress(wethAddress, "weth");
  }
}

/**
 * Balance check result interface
 */
export interface BalanceCheckResult {
  readonly sufficientEth: boolean;
  readonly sufficientFeeToken: boolean;
  readonly ethBalance: bigint;
  readonly feeTokenBalance: bigint;
  readonly ethRequired: bigint;
  readonly feeTokenRequired: bigint;
}

/**
 * Validates wallet balances for sendEther (throws error if insufficient)
 */
export async function validateWalletBalances(
  walletAddress: Address,
  transferAmountWei: bigint,
  feeAmountWei: bigint,
  feeTokenType: FeeTokenType,
  feeTokenAddress: Address,
  nativeCurrencySymbol: string,
  publicClient: PublicClient,
  viem: HardhatViemHelpers
): Promise<void> {
  const balanceResult = await checkWalletBalances(
    walletAddress,
    transferAmountWei,
    feeAmountWei,
    feeTokenType,
    feeTokenAddress,
    nativeCurrencySymbol,
    publicClient,
    viem
  );

  // ✅ Throw error if insufficient balances
  if (!balanceResult.sufficientEth) {
    throw new InsufficientBalanceError(
      balanceResult.ethRequired,
      balanceResult.ethBalance,
      nativeCurrencySymbol
    );
  }

  if (!balanceResult.sufficientFeeToken && feeTokenType !== "native") {
    const feeTokenSymbol = feeTokenType === "link" ? "LINK" : "WETH";
    throw new InsufficientBalanceError(
      balanceResult.feeTokenRequired,
      balanceResult.feeTokenBalance,
      feeTokenSymbol
    );
  }
}

/**
 * Checks and logs wallet balances for estimateEtherFee (informational only)
 */
export async function checkAndLogWalletBalances(
  walletAddress: Address,
  transferAmountWei: bigint,
  feeAmountWei: bigint,
  feeTokenType: FeeTokenType,
  feeTokenAddress: Address,
  feeTokenSymbol: string,
  nativeCurrencySymbol: string,
  publicClient: PublicClient,
  viem: HardhatViemHelpers
): Promise<void> {
  const balanceResult = await checkWalletBalances(
    walletAddress,
    transferAmountWei,
    feeAmountWei,
    feeTokenType,
    feeTokenAddress,
    nativeCurrencySymbol,
    publicClient,
    viem
  );

  // ✅ Log balance information
  logger.info(`💰 Wallet Balance Check:`);
  logger.info(`   ETH Balance: ${formatEther(balanceResult.ethBalance)} ${nativeCurrencySymbol} ${balanceResult.sufficientEth ? "✅ Sufficient" : "❌ Insufficient"} (need ${formatEther(balanceResult.ethRequired)} ${nativeCurrencySymbol})`);
  
  if (feeTokenType !== "native") {
    // Format fee token balance with proper decimals
    const feeTokenContract = await viem.getContractAt("ERC20", feeTokenAddress);
    const decimals = await feeTokenContract.read.decimals() as number;
    const feeTokenBalanceFormatted = formatUnits(balanceResult.feeTokenBalance, decimals);
    const feeTokenRequiredFormatted = formatUnits(balanceResult.feeTokenRequired, decimals);
    
    logger.info(`   ${feeTokenSymbol} Balance: ${feeTokenBalanceFormatted} ${feeTokenSymbol} ${balanceResult.sufficientFeeToken ? "✅ Sufficient" : "❌ Insufficient"} (need ${feeTokenRequiredFormatted} ${feeTokenSymbol})`);
  }

  // ✅ Show warnings if insufficient
  if (!balanceResult.sufficientEth || !balanceResult.sufficientFeeToken) {
    logger.warn(`⚠️  Please ensure you have sufficient balances before sending!`);
  }
}

/**
 * Core balance checking logic (used by both validation and logging functions)
 */
async function checkWalletBalances(
  walletAddress: Address,
  transferAmountWei: bigint,
  feeAmountWei: bigint,
  feeTokenType: FeeTokenType,
  feeTokenAddress: Address,
  nativeCurrencySymbol: string,
  publicClient: PublicClient,
  viem: HardhatViemHelpers
): Promise<BalanceCheckResult> {
  // ✅ Get ETH balance
  const ethBalance = await publicClient.getBalance({ address: walletAddress });
  
  // ✅ Calculate ETH requirement
  const ethRequired = feeTokenType === "native" 
    ? transferAmountWei + feeAmountWei  // Transfer + fee
    : transferAmountWei;                // Transfer only

  // ✅ Get fee token balance (if not native)
  let feeTokenBalance = BigInt(0);
  let feeTokenRequired = BigInt(0);
  
  if (feeTokenType !== "native") {
    const feeTokenContract = await viem.getContractAt("ERC20", feeTokenAddress);
    feeTokenBalance = await feeTokenContract.read.balanceOf([walletAddress]) as bigint;
    feeTokenRequired = feeAmountWei;
  }

  return {
    sufficientEth: ethBalance >= ethRequired,
    sufficientFeeToken: feeTokenType === "native" || feeTokenBalance >= feeTokenRequired,
    ethBalance,
    feeTokenBalance,
    ethRequired,
    feeTokenRequired,
  };
}
