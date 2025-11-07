import { task } from "hardhat/config";
import type { HardhatRuntimeEnvironment } from "hardhat/types/hre";
import { parseEther, formatEther } from "viem";
import {
  Chains,
  CCIPContractName,
  logger,
  getEVMNetworkConfig,
  configData,
  validateNetworkName,
} from "../../config";
import { CHAIN_FAMILY } from "../../config/types";
import { NetworkError } from "./types";
import {
  validateContractAddress,
  validateChain,
  validateEtherAmount,
  validateFeeToken,
  validateGasLimit,
  validateReceiverAddressForChain,
} from "./validators";
import { 
  buildCCIPMessage, 
  getFeeWithFormatting, 
  getFeeTokenAddress,
  checkAndLogWalletBalances
} from "./utils";

/**
 * Task-specific types for estimateFee
 */
interface EstimateParams {
  readonly contract: string;
  readonly destinationchain: string;
  readonly amount: string;
  readonly feetoken: string;
  readonly receiver: string;
  readonly gaslimit: string;
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

export const estimateFee = task(
  "estimateFee",
  "Estimate fees for cross-chain native token transfer"
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
    name: "receiver",
    description: "Destination address (EtherSenderReceiver contract, EOA, or any contract)",
    defaultValue: "",
  })
  .addOption({
    name: "gaslimit",
    description: "Gas limit for ccipReceive call (use 0 for simple transfers to EOAs/non-CCIP contracts - receiver gets wrapped native only)",
    defaultValue: "200000",
  })
  .setAction(async () => ({
    default: async (
      {
        contract: contractAddress,
        destinationchain,
        amount,
        feetoken = "native",
        receiver = "",
        gaslimit = "200000",
      }: EstimateParams,
      hre: HardhatRuntimeEnvironment
    ): Promise<EstimateResult> => {
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

      logger.info(`🔍 Estimating cross-chain native token transfer fees...`);
      logger.info(`   From: ${networkName}`);
      logger.info(`   To: ${validatedDestinationChain}`);
      logger.info(`   Amount: ${validatedAmount} ${sourceConfig.nativeCurrencySymbol}`);
      logger.info(`   Destination Address: ${validatedReceiver}`);
      
      // ✅ Log gas limit behavior
      if (validatedGasLimit === 0n) {
        logger.info(`   Gas limit: 0 (receiver will get wrapped native tokens only - no ccipReceive call)`);
      } else {
        logger.info(`   Gas limit: ${validatedGasLimit} (receiver will get native ${sourceConfig.nativeCurrencySymbol} via ccipReceive)`);
      }

      // ✅ Parse amount
      const amountWei = parseEther(validatedAmount);

      // ✅ Connect to contract
      const etherSenderReceiver = await viem.getContractAt(
        CCIPContractName.EtherSenderReceiver,
        validatedContractAddress
      );

      try {
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

        // ✅ Get fee with proper formatting using utility
        logger.info(`💸 Calculating fees...`);
        const { fee, feeFormatted, feeTokenSymbol } = await getFeeWithFormatting(
          etherSenderReceiver,
          BigInt(destConfig.chainSelector),
          message,
          validatedFeeToken,
          feeTokenAddress,
          sourceConfig.nativeCurrencySymbol,
          viem
        );

        // ✅ Display results with clear separation
        logger.info(`📊 Fee Estimation Results:`);
        logger.info(`   Transfer Amount: ${validatedAmount} ${sourceConfig.nativeCurrencySymbol}`);
        logger.info(`   CCIP Fee: ${feeFormatted} ${feeTokenSymbol}`);
        
        // ✅ Show wallet costs clearly based on fee token
        if (validatedFeeToken === "native") {
          const walletNativeCost = formatEther(amountWei + fee);
          logger.info(`   Wallet ${sourceConfig.nativeCurrencySymbol} Cost: ${walletNativeCost} ${sourceConfig.nativeCurrencySymbol}`);
          logger.info(`     (${validatedAmount} ${sourceConfig.nativeCurrencySymbol} transfer + ${feeFormatted} ${feeTokenSymbol} fee)`);
        } else {
          logger.info(`   Wallet ${sourceConfig.nativeCurrencySymbol} Cost: ${validatedAmount} ${sourceConfig.nativeCurrencySymbol} (transfer only)`);
          logger.info(`   Wallet ${feeTokenSymbol} Cost: ${feeFormatted} ${feeTokenSymbol} (fee only)`);
        }

        // ✅ Check and log wallet balances (informational only)
        const [wallet] = await viem.getWalletClients();
        const publicClient = await viem.getPublicClient();
        
        await checkAndLogWalletBalances(
          wallet.account.address,
          amountWei,
          fee,
          validatedFeeToken,
          feeTokenAddress,
          feeTokenSymbol,
          sourceConfig.nativeCurrencySymbol,
          publicClient,
          viem
        );

        // ✅ Calculate wallet costs for return values
        const walletEthCost = validatedFeeToken === "native" 
          ? formatEther(amountWei + fee) 
          : validatedAmount;
        const walletEthCostWei = validatedFeeToken === "native" 
          ? (amountWei + fee).toString() 
          : amountWei.toString();
        const walletFeeTokenCost = validatedFeeToken !== "native" ? feeFormatted : "0";

        return {
          transferAmount: validatedAmount,
          transferAmountWei: amountWei.toString(),
          ccipFee: fee.toString(),
          ccipFeeFormatted: feeFormatted,
          feeToken: feeTokenSymbol,
          walletEthCost,
          walletEthCostWei,
          walletFeeTokenCost,
          sourceChain: networkName,
          destinationChain: validatedDestinationChain,
        };

      } catch (error) {
        logger.error(`❌ Fee estimation failed:`, error);
        throw error;
      }
    }
  }))
  .build();
