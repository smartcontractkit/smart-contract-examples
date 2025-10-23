import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types/hre";
import { isAddress, zeroAddress, encodeAbiParameters, keccak256, stringToBytes, Abi, decodeErrorResult } from "viem";
import {
  Chains,
  CCIPContractName,
  TokenContractName,
  TokenPoolContractName,
  logger,
  getEVMNetworkConfig,
  configData,
} from "../config";

enum Fee {
  native = "native",
  link = "LINK",
}

/**
 * Helper function to decode and log error data from CCIP contracts
 * @param revertData - The revert data from the failed transaction
 * @param hre - Hardhat Runtime Environment
 */
async function tryDecodeError(revertData: any, hre: HardhatRuntimeEnvironment) {

  const contracts = [
    TokenContractName.BurnMintERC20,
    TokenContractName.ERC20,
    CCIPContractName.Router,
    CCIPContractName.OnRamp,
    CCIPContractName.RateLimiter,
    CCIPContractName.TokenPool,
    CCIPContractName.Client,
    CCIPContractName.OwnerIsCreator,
    TokenPoolContractName.BurnMintTokenPool,
    TokenPoolContractName.LockReleaseTokenPool,
  ];

  let firstMatch: { errorName: string; args: readonly unknown[] | undefined; contract: string } | null = null;

  // Try to decode with each contract's ABI
  for (const contract of contracts) {
    try {
      const artifact = await hre.artifacts.readArtifact(contract);
      const abi = artifact.abi as Abi;

      const decodedError = decodeErrorResult({
        abi,
        data: revertData as `0x${string}`,
      });

      if (decodedError && decodedError.errorName) {
        // Store the first match
        if (!firstMatch) {
          firstMatch = {
            errorName: decodedError.errorName,
            args: decodedError.args,
            contract
          };
        }

        // If this match has args and the first match didn't, use this one instead
        if (decodedError.args && Array.isArray(decodedError.args) && decodedError.args.length > 0) {
          firstMatch = {
            errorName: decodedError.errorName,
            args: decodedError.args,
            contract
          };
          break; // Stop once we find a match with args
        }
      }
    } catch (err) {
      // Continue to the next contract if parsing fails
      continue;
    }
  }

  if (firstMatch) {
    logger.error(`❌ ${firstMatch.errorName} (from ${firstMatch.contract})`);
    if (firstMatch.args && Array.isArray(firstMatch.args) && firstMatch.args.length > 0) {
      logger.error(`   Args:`);
      firstMatch.args.forEach((arg, index) => {
        logger.error(`     [${index}]: ${typeof arg === 'bigint' ? arg.toString() : JSON.stringify(arg)}`);
      });
    }
    return;
  }

  // If no method could decode the error, log it as-is
  logger.error(`❌ Could not decode the revert data`);
  logger.error(`   Raw data:`, revertData);
}

/**
 * Transfers tokens cross-chain using CCIP
 *
 * Example:
 * npx hardhat transferTokens \
 *   --tokenaddress 0xYourToken \
 *   --amount 1000000000000000000 \
 *   --destinationchain baseSepolia \
 *   --receiveraddress 0xReceiver \
 *   --fee LINK \
 *   --network sepolia
 */
export const transferTokens = task("transferTokens", "Transfer tokens cross-chain via CCIP")
  .addOption({
    name: "tokenaddress",
    description: "The token address to transfer",
    defaultValue: "",
  })
  .addOption({
    name: "amount",
    description: "The amount to transfer",
    defaultValue: "0",
  })
  .addOption({
    name: "destinationchain",
    description: "The destination chain name",
    defaultValue: "",
  })
  .addOption({
    name: "receiveraddress",
    description: "The receiver address on destination chain",
    defaultValue: "",
  })
  .addOption({
    name: "fee",
    description: "Fee token: native or LINK",
    defaultValue: "LINK",
  })
  .setAction(async () => ({
    default: async (
      {
        tokenaddress,
        amount = "0",
        destinationchain,
        receiveraddress,
        fee = "LINK",
      }: {
        tokenaddress: string;
        amount?: string;
        destinationchain: string;
        receiveraddress: string;
        fee?: string;
      },
      hre: HardhatRuntimeEnvironment
    ) => {
      // Validate required parameters
      if (!tokenaddress) {
        throw new Error("Token address is required (--tokenaddress)");
      }

      if (!amount || amount === "0") {
        throw new Error("Amount is required and must be greater than 0 (--amount)");
      }

      if (!destinationchain) {
        throw new Error("Destination chain is required (--destinationchain)");
      }

      if (!receiveraddress) {
        throw new Error("Receiver address is required (--receiveraddress)");
      }

      // Connect to network first
      const networkConnection = await hre.network.connect();
      const { viem } = networkConnection;
      const networkName = networkConnection.networkName as Chains;

      // ✅ Load network configs
      const networkConfig = getEVMNetworkConfig(networkName);
      if (!networkConfig)
        throw new Error(`Network ${networkName} not found in config`);

      const destConfig = configData[destinationchain as keyof typeof configData];
      if (!destConfig)
        throw new Error(`Destination chain ${destinationchain} not found in config`);

      // ✅ Validate addresses
      if (!isAddress(tokenaddress))
        throw new Error(`Invalid token address: ${tokenaddress}`);
      if (!isAddress(receiveraddress))
        throw new Error(`Invalid receiver address: ${receiveraddress}`);

      // ✅ Determine fee token
      let feeTokenAddress: string;
      if (fee === Fee.native) {
        feeTokenAddress = zeroAddress; // Use zero address for native
      } else if (fee === Fee.link) {
        feeTokenAddress = networkConfig.link;
        if (!feeTokenAddress)
          throw new Error(`LINK token address not defined in network config`);
      } else {
        throw new Error(`Invalid fee token: ${fee}`);
      }

      const { router, confirmations } = networkConfig;
      if (!router) throw new Error(`Router not defined for ${networkName}`);
      if (confirmations === undefined)
        throw new Error(`confirmations not defined for ${networkName}`);

      const destChainSelector = destConfig.chainSelector;
      if (!destChainSelector)
        throw new Error(`chainSelector not defined for ${destinationchain}`);

      const destChainSelectorBigInt = BigInt(destChainSelector);

      const [wallet] = await viem.getWalletClients();
      const publicClient = await viem.getPublicClient();

      try {
        logger.info(`🚀 Transferring ${amount} tokens via CCIP from ${networkName} to ${destinationchain}...`);
        logger.info(`   Token: ${tokenaddress}`);
        logger.info(`   Receiver: ${receiveraddress}`);
        logger.info(`   Fee token: ${fee}`);

        // ✅ Connect to router
        const routerContract = await viem.getContractAt(
          CCIPContractName.Router,
          router as `0x${string}`
        );

        const supported = await routerContract.read.isChainSupported([destChainSelectorBigInt]);
        if (!supported)
          throw new Error(`Destination chain ${destinationchain} not supported by router`);

        // ✅ Build CCIP message using viem utilities
        const gasLimit = 0; // Set gas limit to 0 as we are only transferring tokens and not calling a contract on the destination chain
        const allowOutOfOrderExecution = true; // Allow out of order execution - the message can be executed in any order relative to other messages from the same sender
        const extraArgs = encodeAbiParameters(
          [{ type: "uint256" }, { type: "bool" }],
          [BigInt(gasLimit), allowOutOfOrderExecution] // gasLimit=0, allowOutOfOrderExecution=true
        );
        const selector = keccak256(stringToBytes("CCIP EVMExtraArgsV2")).slice(0, 10);
        const encodedExtraArgs = selector + extraArgs.slice(2);

        const tokenAmounts = [
          { token: tokenaddress as `0x${string}`, amount: BigInt(amount) },
        ];

        const message = {
          receiver: encodeAbiParameters([{ type: "address" }], [receiveraddress as `0x${string}`]),
          data: "0x" as `0x${string}`,
          tokenAmounts,
          feeToken: feeTokenAddress as `0x${string}`,
          extraArgs: encodedExtraArgs as `0x${string}`,
        };

        // ✅ Estimate fees
        const fees = await routerContract.read.getFee([destChainSelectorBigInt, message]);
        logger.info(`💰 Estimated fees: ${(fees as bigint).toString()}`);

        // ✅ Approve tokens for router
        const tokenContract = await viem.getContractAt(
          TokenContractName.BurnMintERC20,
          tokenaddress as `0x${string}`
        );
        logger.info(`Approving ${amount} tokens for router ${router}`);
        let txHash = await tokenContract.write.approve([router as `0x${string}`, BigInt(amount)], {
          account: wallet.account,
        });
        logger.info(`   Waiting for ${confirmations} confirmation(s)...`);
        await publicClient.waitForTransactionReceipt({
          hash: txHash,
          confirmations,
        });

        // Approve LINK if fee in LINK
        if (feeTokenAddress !== zeroAddress) {
          const linkTokenContract = await viem.getContractAt(
            TokenContractName.BurnMintERC20, // Assuming LINK is also a BurnMintERC20
            feeTokenAddress as `0x${string}`
          );
          logger.info(`Approving ${(fees as bigint).toString()} ${fee} to router`);
          txHash = await linkTokenContract.write.approve([router as `0x${string}`, fees as bigint], {
            account: wallet.account,
          });
          logger.info(`   Waiting for ${confirmations} confirmation(s)...`);
          await publicClient.waitForTransactionReceipt({
            hash: txHash,
            confirmations,
          });
        }

        // ✅ Validate fee estimate
        logger.info(`💰 Estimated CCIP fees: ${(fees as bigint).toString()}`);
        if ((fees as bigint) === 0n) {
          throw new Error("Fee estimation returned 0, this may indicate an issue with the message");
        }

        // ✅ Simulate the CCIP send call first to catch potential errors
        logger.info("Simulating CCIP message...");
        try {
          await publicClient.simulateContract({
            address: router as `0x${string}`,
            abi: routerContract.abi,
            functionName: "ccipSend",
            args: [destChainSelectorBigInt, message],
            account: wallet.account.address,
            value: feeTokenAddress === zeroAddress ? fees as bigint : 0n,
          });
        } catch (error: any) {
          logger.error("❌ Simulation failed");
          // console.log(error)
          const revertData = error.cause?.raw;
          if (revertData) {
            await tryDecodeError(revertData, hre);
          } else {
            logger.error("Error:", error.message || error);
          }
          return;
        }

        // ✅ Send CCIP message
        logger.info("Sending CCIP message...");
        txHash = await routerContract.write.ccipSend(
          [destChainSelectorBigInt, message],
          {
            account: wallet.account,
            value: feeTokenAddress === zeroAddress ? fees as bigint : 0n
          }
        );

        logger.info(`⏳ CCIP message tx: ${txHash}`);
        logger.info(`   Waiting for ${confirmations} confirmation(s)...`);
        const receipt = await publicClient.waitForTransactionReceipt({
          hash: txHash,
          confirmations,
        });

        // ✅ Log success
        logger.info(`✅ CCIP message sent successfully`);
        logger.info(`   Transaction: ${txHash}`);
        logger.info(`   Check status: https://ccip.chain.link/tx/${txHash}`);

        // Log message details
        logger.info(`📋 Transfer Summary:`);
        logger.info(`   Token: ${tokenaddress}`);
        logger.info(`   Amount: ${amount}`);
        logger.info(`   From: ${networkName}`);
        logger.info(`   To: ${destinationchain}`);
        logger.info(`   Receiver: ${receiveraddress}`);
        logger.info(`   Fee paid in: ${fee}`);

      } catch (error) {
        logger.error("❌ CCIP transfer failed:", error);
        throw error;
      }
    },
  }))
  .build();
