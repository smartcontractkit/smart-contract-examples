import { task } from "hardhat/config";
import { Chains, logger, getEVMNetworkConfig, configData } from "../config";
import RouterABI from "@chainlink/contracts-ccip/abi/Router.abi.json";
import ERC20ABI from "@chainlink/contracts/abi/v0.8/shared/ERC20.abi.json";
import OnRampABI from "@chainlink/contracts-ccip/abi/OnRamp.abi.json";

/**
 * CLI arguments interface
 */
interface TransferTokensArgs {
  tokenaddress: string;
  amount: string;
  destinationchain: string;
  receiveraddress: string;
  fee?: string;
}

enum Fee {
  native = "native",
  link = "LINK",
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
task("transferTokens", "Transfer tokens cross-chain via CCIP")
  .setAction(<any>(async (taskArgs: TransferTokensArgs, hre: any) => {
    const {
      tokenaddress,
      amount,
      destinationchain,
      receiveraddress,
      fee = Fee.link,
    } = taskArgs;

    const networkName = hre.network.name as Chains;

    // ✅ Load network configs
    const networkConfig = getEVMNetworkConfig(networkName);
    if (!networkConfig)
      throw new Error(`Network ${networkName} not found in config`);

    const destConfig = configData[destinationchain as keyof typeof configData];
    if (!destConfig)
      throw new Error(`Destination chain ${destinationchain} not found in config`);

    // ✅ Validate addresses
    if (!hre.viem.isAddress(tokenaddress))
      throw new Error(`Invalid token address: ${tokenaddress}`);
    if (!hre.viem.isAddress(receiveraddress))
      throw new Error(`Invalid receiver address: ${receiveraddress}`);

    // ✅ Determine fee token
    let feeTokenAddress: string;
    if (fee === Fee.native) {
      feeTokenAddress = hre.viem.zeroAddress;
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

    const [wallet] = await hre.viem.getWalletClients();
    const publicClient = await hre.viem.getPublicClient();

    // ✅ Connect to router
    const routerContract = await hre.viem.getContractAt({
      address: router,
      abi: RouterABI,
    });

    const supported = await routerContract.read.isChainSupported([destChainSelector]);
    if (!supported)
      throw new Error(`Destination chain ${destinationchain} not supported by router`);

    // ✅ Build CCIP message
    const abi = hre.viem.abi;
    const extraArgs = abi.encode(["uint256", "bool"], [0n, true]); // gasLimit=0, allowOutOfOrderExecution=true
    const selector = hre.viem.keccak256(hre.viem.toBytes("CCIP EVMExtraArgsV2")).slice(0, 10);
    const encodedExtraArgs = selector + extraArgs.slice(2);

    const tokenAmounts = [
      { token: tokenaddress, amount: BigInt(amount) },
    ];

    const message = {
      receiver: abi.encode(["address"], [receiveraddress]),
      data: "0x",
      tokenAmounts,
      feeToken: feeTokenAddress,
      extraArgs: encodedExtraArgs,
    };

    // ✅ Estimate fees
    const fees = await routerContract.read.getFee([destChainSelector, message]);
    logger.info(`Estimated fees: ${fees.toString()}`);

    // ✅ Approve tokens for router
    const token = await hre.viem.getContractAt({
      address: tokenaddress,
      abi: ERC20ABI,
    });
    logger.info(`Approving ${amount} tokens for router ${router}`);
    let txHash = await token.write.approve([router, BigInt(amount)], {
      account: wallet.account,
    });
    await publicClient.waitForTransactionReceipt({ hash: txHash });

    // Approve LINK if fee in LINK
    if (feeTokenAddress !== hre.viem.zeroAddress) {
      const linkToken = await hre.viem.getContractAt({
        address: feeTokenAddress,
        abi: ERC20ABI,
      });
      logger.info(`Approving ${fees} ${fee} to router`);
      txHash = await linkToken.write.approve([router, fees], {
        account: wallet.account,
      });
      await publicClient.waitForTransactionReceipt({ hash: txHash });
    }

    // ✅ Simulate (optional)
    try {
      await routerContract.simulate.staticCall
        ? await routerContract.simulate.staticCall(destChainSelector, message, {
            value: feeTokenAddress === hre.viem.zeroAddress ? fees : 0n,
          })
        : logger.info("Skipping simulation (staticCall not supported)");
    } catch (e: any) {
      logger.error("Simulation failed", e);
      return;
    }

    // ✅ Send CCIP message
    txHash = await routerContract.write.ccipSend(
      [destChainSelector, message],
      { account: wallet.account, value: feeTokenAddress === hre.viem.zeroAddress ? fees : 0n }
    );

    logger.info(`Tx sent: ${txHash}`);
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

    // ✅ Parse messageId from logs
    let messageId = "";
    const iface = new hre.viem.Interface(OnRampABI);
    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed?.name === "CCIPMessageSent") {
          messageId = parsed.args[2].messageId;
          logger.info(`✅ Message dispatched, id: ${messageId}`);
          logger.info(`Check status: https://ccip.chain.link/msg/${messageId}`);
          break;
        }
      } catch {
        continue;
      }
    }

    if (!messageId) {
      logger.warn(`Could not parse message ID from tx ${txHash}`);
      logger.info(`Check status manually: https://ccip.chain.link/tx/${txHash}`);
    }
  }));
