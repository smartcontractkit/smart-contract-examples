import { task, types } from "hardhat/config";
import { Chains, networks, logger } from "../config";

interface TransferTokensArgs {
  tokenaddress: string;
  amount: string;
  destinationchain: string;
  receiveraddress: string;
  fee: string;
}

enum Fee {
  native = "native", // Native gas token (e.g., ETH, AVAX) used to pay fees
  link = "LINK", // LINK token used to pay fees
}

// Helper function to try decoding error data
async function tryDecodeError(revertData: string) {
  const {
    IRouterClient__factory,
    EVM2EVMOnRamp__factory,
    TokenPool__factory,
    RateLimiter__factory,
    Client__factory,
    ERC20__factory,
    BurnMintERC677__factory,
    BurnMintTokenPool__factory,
    LockReleaseTokenPool__factory,
  } = await import("../typechain-types");

  const factories = [
    IRouterClient__factory,
    EVM2EVMOnRamp__factory,
    TokenPool__factory,
    RateLimiter__factory,
    Client__factory,
    ERC20__factory,
    BurnMintERC677__factory,
    BurnMintTokenPool__factory,
    LockReleaseTokenPool__factory,
  ];

  // Iterate over the factories, trying to decode with each one
  for (let i = 0; i < factories.length; i++) {
    const factory = factories[i];
    try {
      const iface = factory.createInterface();
      const decodedError = iface.parseError(revertData);

      // If successfully decoded, log and stop execution
      if (decodedError) {
        console.error(
          `Decoded error from factory ${factory.name}:`,
          decodedError.name,
          decodedError.args
        );
        return; // Error successfully decoded, stop execution
      }
    } catch (err) {
      // Continue to the next factory if parsing fails
      continue;
    }
  }

  // If no factory could decode the error, log the final revert data
  console.error(`Could not decode the revert data. Error data: ${revertData}`);
}

// Task to transfer tokens across chains using CCIP, with options for paying fees in LINK or native tokens
task("transferTokens", "Transfer tokens to a receiver on another chain")
  .addParam("tokenaddress", "The address of the token") // The token address being transferred
  .addParam("amount", "The amount to transfer") // The amount of tokens to transfer (in wei)
  .addParam("destinationchain", "The destination chain") // The destination blockchain
  .addParam("receiveraddress", "The receiver address in the destination chain") // The receiver address on the destination chain
  .addOptionalParam("fee", "The fee token", Fee.link, types.string) // The token used for paying CCIP fees (LINK or native)
  .setAction(async (taskArgs: TransferTokensArgs, hre) => {
    const {
      tokenaddress: tokenAddress,
      amount,
      destinationchain: destinationChain,
      receiveraddress: receiverAddress,
      fee,
    } = taskArgs;

    const networkName = hre.network.name as Chains;

    // Retrieve the network configuration for the local chain
    const networkConfig = networks[networkName];
    if (!networkConfig) {
      throw new Error(`Network ${networkName} not found in config`);
    }

    // Retrieve the network configuration for the destination chain
    const destinationNetworkName = destinationChain as Chains;
    const destinationNetworkConfig = networks[destinationNetworkName];
    if (!destinationNetworkConfig) {
      throw new Error(`Network ${destinationNetworkName} not found in config`);
    }

    // Validate the provided token and receiver addresses
    if (!hre.ethers.isAddress(tokenAddress)) {
      throw new Error(`Invalid token address: ${tokenAddress}`);
    }

    if (!hre.ethers.isAddress(receiverAddress)) {
      throw new Error(`Invalid receiver address: ${receiverAddress}`);
    }

    // Determine the fee token based on user input (LINK or native)
    let feeTokenAddress;
    switch (fee) {
      case Fee.native:
        feeTokenAddress = hre.ethers.ZeroAddress; // Use native token
        break;
      case Fee.link:
        feeTokenAddress = networkConfig.link; // Use LINK token
        if (!feeTokenAddress) {
          throw new Error(`Link token address not defined in network config`);
        }
        break;
      default:
        throw new Error(`Invalid fee token: ${fee}`);
    }

    // Get router and confirmations from the network config
    const { router, confirmations } = networkConfig;
    if (!router) {
      throw new Error(`Router not defined for ${networkName}`);
    }

    // Get the chain selector for the destination chain
    const { chainSelector: destinationChainSelector } =
      destinationNetworkConfig;
    if (!destinationChainSelector) {
      throw new Error(
        `Chain selector not defined for ${destinationNetworkName}`
      );
    }

    // Get the signer (used to approve and send tokens)
    const signer = (await hre.ethers.getSigners())[0];

    // Load the Router Client and ERC20 contract factories
    const { IRouterClient__factory, IERC20__factory, EVM2EVMOnRamp__factory } =
      await import("../typechain-types");

    // Connect to the CCIP Router contract
    const routerContract = IRouterClient__factory.connect(router, signer);

    // Ensure the destination chain is supported by the router
    if (!(await routerContract.isChainSupported(destinationChainSelector))) {
      throw new Error(`Chain ${destinationChain} not supported`);
    }

    const abiCoder = new hre.ethers.AbiCoder();

    // Encode the extra arguments for CCIP V2 (gasLimit and allowOutOfOrderExecution)
    const functionSelector = hre.ethers.id("CCIP EVMExtraArgsV2").slice(0, 10);
    const gasLimit = 0; // Set gas limit to 0 as we are only transferring tokens and not calling a contract on the destination chain
    const allowOutOfOrderExecution = true; // Allow out of order execution - the message can be executed in any order relative to other messages from the same sender
    const extraArgs = abiCoder.encode(
      ["uint256", "bool"],
      [gasLimit, allowOutOfOrderExecution]
    );
    const encodedExtraArgs = functionSelector + extraArgs.slice(2);

    // Prepare the token amounts for transfer
    const tokenAmounts = [
      {
        token: tokenAddress,
        amount: BigInt(amount), // Convert amount to BigInt
      },
    ];

    // Build the CCIP message for cross-chain token transfer
    const message = {
      receiver: abiCoder.encode(["address"], [receiverAddress]), // Encode the receiver address
      data: "0x", // No additional data
      tokenAmounts: tokenAmounts,
      feeToken: feeTokenAddress, // Use either LINK or native token for fees
      extraArgs: encodedExtraArgs, // Encoded extra arguments
    };

    // Estimate the fees required for the transfer
    const fees = await routerContract.getFee(destinationChainSelector, message);
    logger.info(`Estimated fees: ${fees.toString()}`);

    let tx;

    // Ensure the number of confirmations is defined
    if (confirmations === undefined) {
      throw new Error(`confirmations is not defined for ${networkName}`);
    }

    // Approve the token transfer
    const tokenContract = IERC20__factory.connect(tokenAddress, signer);
    logger.info(`Approving ${amount} ${tokenAddress} to ${router}`);
    tx = await tokenContract.approve(router, BigInt(amount));
    await tx.wait(confirmations);

    // If using LINK for fees, approve the router for LINK
    if (feeTokenAddress !== hre.ethers.ZeroAddress) {
      const feeTokenContract = IERC20__factory.connect(feeTokenAddress, signer);

      logger.info(`Approving ${fees} ${fee} to ${router}`);
      tx = await feeTokenContract.approve(router, fees);
      await tx.wait(confirmations);

      // Send the tokens using CCIP with LINK as fee token
      logger.info(
        `Transferring ${amount} of ${tokenAddress} to ${receiverAddress} on chain ${destinationChain} with ${fees} of ${fee} as fees`
      );

      try {
        await routerContract.ccipSend.staticCall(
          destinationChainSelector,
          message
        );
      } catch (e) {
        console.error("Simulation failed");
        const revertData = (e as any).data;

        // Call the function to decode the error data
        await tryDecodeError(revertData);
        return;
      }

      tx = await routerContract.ccipSend(destinationChainSelector, message);
    } else {
      // Send the tokens using CCIP with native token as fee
      logger.info(
        `Transferring ${amount} of ${tokenAddress} to ${receiverAddress} on chain ${destinationChain} with ${fees} of native token as fees`
      );

      try {
        await routerContract.ccipSend.staticCall(
          destinationChainSelector,
          message,
          {
            value: fees,
          }
        );
      } catch (e) {
        console.error("Simulation failed");
        const revertData = (e as any).data;

        // Call the function to decode the error data
        await tryDecodeError(revertData);
        return;
      }
      tx = await routerContract.ccipSend(destinationChainSelector, message, {
        value: fees,
      });
    }

    // Wait for the transaction to be confirmed
    const receipt = await tx.wait(confirmations);
    logger.info(`Transaction hash: ${tx.hash}`);
    if (!receipt) throw new Error("Transaction not confirmed");

    let messageId = "";
    receipt.logs.forEach((log) => {
      try {
        const parsedLog =
          EVM2EVMOnRamp__factory.createInterface().parseLog(log);
        if (parsedLog && parsedLog.name === "CCIPSendRequested") {
          messageId = parsedLog.args[0].messageId;
          logger.info(`Message dispatched. Message id: ${messageId}`);
        }
      } catch (e) {
        // ignore errors if the log can't be parsed
      }
    });

    if (!messageId) {
      throw new Error("Message ID not found in the transaction logs");
    }

    logger.info(
      `✅ Transferred ${amount} of ${tokenAddress} to ${receiverAddress} on chain ${destinationChain}. Transaction hash: ${tx.hash} - CCIP message id: ${messageId}`
    );
    logger.info(
      `Check status of message on https://ccip.chain.link/msg/${messageId}`
    );
  });
