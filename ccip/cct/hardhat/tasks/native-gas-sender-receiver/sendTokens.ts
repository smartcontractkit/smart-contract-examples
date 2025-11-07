import { task } from "hardhat/config";
import type { HardhatRuntimeEnvironment } from "hardhat/types/hre";
import { parseEther, formatEther, formatUnits } from "viem";
import type { Address } from "viem";
import {
  Chains,
  CCIPContractName,
  logger,
  getEVMNetworkConfig,
  configData,
  validateNetworkName,
} from "../../config";
import { CHAIN_FAMILY } from "../../config/types";
import { NetworkError, ContractError, InsufficientBalanceError } from "./types";
import {
  validateContractAddress,
  validateChain,
  validateReceiverAddressForChain,
  validateEtherAmount,
  validateFeeToken,
  validateGasLimit,
} from "./validators";
import {
  buildCCIPMessage,
  getFeeWithFormatting,
  getFeeTokenAddress,
  validateWalletBalances,
  getCCIPExplorerUrl
} from "./utils";

/**
 * Task-specific types for sendTokens
 */
interface SendParams {
  readonly contract: string;
  readonly destinationchain: string;
  readonly receiver: string;
  readonly amount: string;
  readonly feetoken: string;
  readonly gaslimit: string;
  readonly estimateonly: boolean;
}

interface SendResult {
  readonly transactionHash: `0x${string}`;
  readonly blockNumber: string;
  readonly gasUsed: string;
  readonly fee: string;
  readonly feeFormatted: string;
  readonly amount: string;
  readonly amountFormatted: string;
}

interface EstimateResult {
  readonly transferAmount: string;
  readonly transferAmountWei: string;
  readonly ccipFee: string;
  readonly ccipFeeFormatted: string;
  readonly feeToken: string;
  readonly walletEthCost: string;
  readonly walletEthCostWei: string;
  readonly walletFeeTokenCost: string;
  readonly sourceChain: Chains;
  readonly destinationChain: Chains;
}

export const sendTokens = task(
  "sendTokens",
  "Send native tokens cross-chain using EtherSenderReceiver contract"
)
  .addOption({
    name: "contract",
    description: "The EtherSenderReceiver contract address",
    defaultValue: "",
  })
  .addOption({
    name: "destinationchain",
    description: "The destination chain name",
    defaultValue: "",
  })
  .addOption({
    name: "receiver",
    description: "Destination address (EtherSenderReceiver contract, EOA, or any contract)",
    defaultValue: "",
  })
  .addOption({
    name: "amount",
    description: "Amount of native tokens to send (in native token units, e.g., 0.1)",
    defaultValue: "",
  })
  .addOption({
    name: "feetoken",
    description: "Fee token to use ('native', 'link', or 'wrappedNative')",
    defaultValue: "native",
  })
  .addOption({
    name: "gaslimit",
    description: "Gas limit for ccipReceive call (use 0 for simple transfers to EOAs/non-CCIP contracts - receiver gets wrapped native only)",
    defaultValue: "200000",
  })
  .addFlag({
    name: "estimateonly",
    description: "Only estimate fees, don't send transaction",
  })
  .setAction(async () => ({
    default: async (
      {
        contract: contractAddress,
        destinationchain,
        receiver,
        amount,
        feetoken = "native",
        gaslimit = "200000",
        estimateonly = false,
      }: SendParams,
      hre: HardhatRuntimeEnvironment
    ): Promise<SendResult | EstimateResult> => {
      // Connect to network first to get network connection details
      const networkConnection = await hre.network.connect();
      const { viem } = networkConnection;
      const networkName = validateNetworkName(networkConnection.networkName);

      // ✅ Validate parameters
      const validatedContractAddress = validateContractAddress(contractAddress);
      const validatedDestinationChain = validateChain(destinationchain, "destinationchain");
      
      // ✅ Get destination config to access chain family for receiver validation
      const destConfig = configData[validatedDestinationChain];
      if (!destConfig) {
        throw new NetworkError(`Configuration not found for destination chain: ${validatedDestinationChain}`, {
          destinationChain: validatedDestinationChain
        });
      }
      
      // ✅ Validate receiver address based on destination chain family
      const destChainFamily = destConfig.chainFamily as CHAIN_FAMILY;
      const validatedReceiver = validateReceiverAddressForChain(receiver, destChainFamily, "receiver");
      
      const validatedAmount = validateEtherAmount(amount, "amount");
      const validatedFeeToken = validateFeeToken(feetoken, "feetoken");
      const validatedGasLimit = validateGasLimit(gaslimit, "gaslimit");

      // ✅ Get network configurations
      const sourceConfig = getEVMNetworkConfig(networkName);
      if (!sourceConfig) {
        throw new NetworkError(`Network ${networkName} not found in config`, {
          networkName
        });
      }

      logger.info(`🚀 Sending ${sourceConfig.nativeCurrencySymbol} cross-chain from ${networkName} to ${validatedDestinationChain}...`);
      
      // ✅ Log gas limit behavior
      if (validatedGasLimit === 0n) {
        logger.info(`⚡ Gas limit: 0 (receiver will get wrapped native tokens only - no ccipReceive call)`);
      } else {
        logger.info(`⚡ Gas limit: ${validatedGasLimit} (receiver will get native ${sourceConfig.nativeCurrencySymbol} via ccipReceive)`);
      }

      // ✅ Parse amount
      const amountWei = parseEther(validatedAmount);
      logger.info(`💰 Amount: ${validatedAmount} ${sourceConfig.nativeCurrencySymbol} (${amountWei} wei)`);

      // ✅ Get wallet and clients
      const [wallet] = await viem.getWalletClients();
      const publicClient = await viem.getPublicClient();

      // ✅ Connect to contract
      const etherSenderReceiver = await viem.getContractAt(
        CCIPContractName.EtherSenderReceiver,
        validatedContractAddress
      );

      // ✅ Get WETH address from contract
      const wethAddress = await etherSenderReceiver.read.i_weth();

      // ✅ Get fee token address using utility
      const feeTokenAddress = await getFeeTokenAddress(
        validatedFeeToken,
        sourceConfig.link,
        wethAddress
      );

      // ✅ Build CCIP message using utility with destination chain family
      const message = buildCCIPMessage(
        validatedReceiver,
        amountWei,
        feeTokenAddress,
        destChainFamily,
        validatedGasLimit
      );

      try {
        // ✅ Get fee with proper formatting using utility
        logger.info(`🔍 Estimating fees...`);
        const { fee, feeFormatted, feeTokenSymbol } = await getFeeWithFormatting(
          etherSenderReceiver,
          BigInt(destConfig.chainSelector),
          message,
          validatedFeeToken,
          feeTokenAddress,
          sourceConfig.nativeCurrencySymbol,
          viem
        );

        // ✅ Add 10% safety buffer to protect against fee spikes
        const feeWithBuffer = (fee * 110n) / 100n;
        const feeBufferFormatted = validatedFeeToken === "native" 
          ? formatEther(feeWithBuffer)
          : await (async () => {
              const feeTokenContract = await viem.getContractAt("ERC20", feeTokenAddress);
              const decimals = await feeTokenContract.read.decimals() as number;
              return formatUnits(feeWithBuffer, decimals);
            })();

        logger.info(`💸 Estimated fee: ${feeFormatted} ${feeTokenSymbol}`);
        logger.info(`🛡️  Fee with 10% buffer: ${feeBufferFormatted} ${feeTokenSymbol}`);

        if (estimateonly) {
          logger.info(`📊 Fee estimation completed (estimate-only mode)`);

          // ✅ Show clear wallet costs for estimate-only mode
          if (validatedFeeToken === "native") {
            const walletNativeCost = formatEther(amountWei + fee);
            logger.info(`   Wallet ${sourceConfig.nativeCurrencySymbol} Cost: ${walletNativeCost} ${sourceConfig.nativeCurrencySymbol}`);
            logger.info(`     (${validatedAmount} ${sourceConfig.nativeCurrencySymbol} transfer + ${feeFormatted} ${feeTokenSymbol} fee)`);
          } else {
            logger.info(`   Wallet ${sourceConfig.nativeCurrencySymbol} Cost: ${validatedAmount} ${sourceConfig.nativeCurrencySymbol} (transfer only)`);
            logger.info(`   Wallet ${feeTokenSymbol} Cost: ${feeFormatted} ${feeTokenSymbol} (fee only)`);
          }

          const estimateResult: EstimateResult = {
            transferAmount: validatedAmount,
            transferAmountWei: amountWei.toString(),
            ccipFee: fee.toString(),
            ccipFeeFormatted: feeFormatted,
            feeToken: feeTokenSymbol,
            walletEthCost: validatedFeeToken === "native" ? formatEther(amountWei + fee) : validatedAmount,
            walletEthCostWei: validatedFeeToken === "native" ? (amountWei + fee).toString() : amountWei.toString(),
            walletFeeTokenCost: validatedFeeToken !== "native" ? feeFormatted : "0",
            sourceChain: networkName,
            destinationChain: validatedDestinationChain,
          };
          return estimateResult;
        }

        // ✅ Validate wallet balances with buffered fee (throws error if insufficient)
        await validateWalletBalances(
          wallet.account.address,
          amountWei,
          feeWithBuffer, // Use buffered fee for validation
          validatedFeeToken,
          feeTokenAddress,
          sourceConfig.nativeCurrencySymbol,
          publicClient,
          viem
        );

        // ✅ Handle ERC20 approval for non-native fee tokens
        if (validatedFeeToken !== "native") {
          logger.info(`🔓 Approving ${feeTokenSymbol} for fee payment...`);
          const feeTokenContract = await viem.getContractAt("ERC20", feeTokenAddress);
          const approveTx = await feeTokenContract.write.approve(
            [validatedContractAddress, feeWithBuffer], // Use buffered fee for approval
            { account: wallet.account }
          );

          logger.info(`⏳ Approval tx: ${approveTx}`);
          logger.info(`   Waiting for ${sourceConfig.confirmations} confirmation(s)...`);
          await publicClient.waitForTransactionReceipt({
            hash: approveTx,
            confirmations: sourceConfig.confirmations,
          });
          logger.info(`✅ ${feeTokenSymbol} approval confirmed`);
        }



        // ✅ Calculate msg.value with buffered fee for native payments
        const msgValue = validatedFeeToken === "native" 
          ? amountWei + feeWithBuffer  // Native: transfer + buffered fee
          : amountWei;                 // Non-native: transfer only

        // ✅ Send transaction
        logger.info(`📤 Sending cross-chain transaction...`);
        const txHash = await etherSenderReceiver.write.ccipSend(
          [BigInt(destConfig.chainSelector), message],
          {
            value: msgValue, // Use buffered fee for native payments
            account: wallet.account,
          }
        );

        logger.info(`⏳ Transaction sent: ${txHash}`);
        logger.info(`   Waiting for ${sourceConfig.confirmations} confirmation(s)...`);

        const receipt = await publicClient.waitForTransactionReceipt({
          hash: txHash,
          confirmations: sourceConfig.confirmations,
        });

        // ✅ Final transaction summary with all information
        logger.info(`🎉 Cross-chain transfer completed successfully!`);
        logger.info(`📋 Transaction Summary:`);
        logger.info(`   Hash: ${txHash}`);
        logger.info(`   Block: ${receipt.blockNumber}`);
        logger.info(`   Gas Used: ${receipt.gasUsed}`);
        logger.info(`   From: ${networkName} → To: ${validatedDestinationChain}`);
        logger.info(`   Amount: ${validatedAmount} ${sourceConfig.nativeCurrencySymbol}`);
        logger.info(`   Destination Address: ${validatedReceiver}`);
        logger.info(`   Final Recipient: ${wallet.account.address} (sender)`);
        logger.info(`   Fee: ${feeFormatted} ${feeTokenSymbol}`);

        // ✅ Show CCIP Explorer URL for tracking cross-chain status
        const ccipExplorerUrl = getCCIPExplorerUrl(txHash);
        logger.info(`👉 Track cross-chain status: ${ccipExplorerUrl}`);

        const transferResult: SendResult = {
          transactionHash: txHash,
          blockNumber: receipt.blockNumber?.toString() ?? "0",
          gasUsed: receipt.gasUsed?.toString() ?? "0",
          fee: fee.toString(),
          feeFormatted: formatEther(fee),
          amount: amountWei.toString(),
          amountFormatted: validatedAmount,
        };

        return transferResult;

      } catch (error) {
        if (error instanceof NetworkError || error instanceof ContractError || error instanceof InsufficientBalanceError) {
          throw error;
        }

        logger.error(`❌ Transaction failed:`, error);
        throw new ContractError(`Failed to send cross-chain native token transfer`, {
          sourceChain: networkName,
          destinationChain: validatedDestinationChain,
          amount: validatedAmount,
          receiver: validatedReceiver,
          originalError: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }))
  .build();
