import { task } from "hardhat/config";
import type { HardhatRuntimeEnvironment } from "hardhat/types/hre";
import { parseEther, formatEther } from "viem";
import {
  Chains,
  CCIPContractName,
  logger,
  getEVMNetworkConfig,
  configData,
} from "../../config";
import { NetworkError } from "./types";
import {
  validateContractAddress,
  validateChain,
  validateEtherAmount,
  validateFeeToken,
  validateGasLimit,
  validateNetworkChainType,
  validateAddress
} from "./validators";
import { 
  buildCCIPMessage, 
  getFeeWithFormatting, 
  getFeeTokenAddress,
  checkAndLogWalletBalances
} from "./utils";

/**
 * Task-specific types for estimateEtherFee
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

export const estimateEtherFee = task(
  "estimateEtherFee",
  "Estimate fees for cross-chain ETH transfer"
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
    description: "Amount of ETH to send (in ETH units, e.g., 0.1)",
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
      const networkName = networkConnection.networkName;

      // ✅ Validate network and parameters with proper typing
      const typedNetworkName = validateNetworkChainType(networkName);
      const validatedContractAddress = validateContractAddress(contractAddress);
      const validatedDestinationChain = validateChain(destinationchain, "destinationchain");
      const validatedAmount = validateEtherAmount(amount, "amount");
      const validatedFeeToken = validateFeeToken(feetoken, "feetoken");
      const validatedReceiver = validateAddress(receiver, "receiver");
      const validatedGasLimit = validateGasLimit(gaslimit, "gaslimit");

      logger.info(`🔍 Estimating cross-chain ETH transfer fees...`);
      logger.info(`   From: ${typedNetworkName}`);
      logger.info(`   To: ${validatedDestinationChain}`);
      logger.info(`   Amount: ${validatedAmount} ETH`);
      logger.info(`   Destination Contract: ${validatedReceiver}`);
      
      // ✅ Log gas limit behavior
      if (validatedGasLimit === 0n) {
        logger.info(`   Gas limit: 0 (receiver will get wrapped native tokens only - no ccipReceive call)`);
      } else {
        logger.info(`   Gas limit: ${validatedGasLimit} (receiver will get native ETH via ccipReceive)`);
      }

      // ✅ Get network configurations
      const sourceConfig = getEVMNetworkConfig(typedNetworkName);
      if (!sourceConfig) {
        throw new NetworkError(`Network ${typedNetworkName} not found in config`, {
          networkName: typedNetworkName
        });
      }

      const destConfig = configData[validatedDestinationChain];
      if (!destConfig) {
        throw new NetworkError(`Configuration not found for destination chain: ${validatedDestinationChain}`, {
          destinationChain: validatedDestinationChain
        });
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

        // ✅ Build CCIP message using utility
        const message = buildCCIPMessage(
          validatedReceiver,
          amountWei,
          feeTokenAddress,
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
        logger.info(`   Transfer Amount: ${validatedAmount} ETH`);
        logger.info(`   CCIP Fee: ${feeFormatted} ${feeTokenSymbol}`);
        
        // ✅ Show wallet costs clearly based on fee token
        if (validatedFeeToken === "native") {
          const walletEthCost = formatEther(amountWei + fee);
          logger.info(`   Wallet ETH Cost: ${walletEthCost} ${sourceConfig.nativeCurrencySymbol}`);
          logger.info(`     (${validatedAmount} ETH transfer + ${feeFormatted} ${feeTokenSymbol} fee)`);
        } else {
          logger.info(`   Wallet ETH Cost: ${validatedAmount} ETH (transfer only)`);
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
          sourceChain: typedNetworkName,
          destinationChain: validatedDestinationChain,
        };

      } catch (error) {
        logger.error(`❌ Fee estimation failed:`, error);
        throw error;
      }
    }
  }))
  .build();
