import {
  getProviderRpcUrl,
  getRouterConfig,
  getPrivateKey,
  getMessageStatus,
  NETWORK,
} from "./config";
import { ethers, JsonRpcProvider } from "ethers";
import {
  Router__factory,
  OffRamp__factory,
  IERC20Metadata__factory,
} from "./typechain-types";
import { Client } from "./typechain-types/Router";

// Command: npx ts-node src/transfer-tokens.ts sourceChain destinationChain destinationAccount tokenAddress amount feeTokenAddress(optional)
// pay fees with native token: npx ts-node src/transfer-tokens.ts ethereumSepolia avalancheFuji 0x9d087fC03ae39b088326b67fA3C788236645b717 0xFd57b4ddBf88a4e07fF4e34C487b99af2Fe82a05 100

interface Arguments {
  sourceChain: NETWORK;
  destinationChain: NETWORK;
  destinationAccount: string;
  tokenAddress: string;
  amount: bigint;
  feeTokenAddress?: string;
}

const handleArguments = (): Arguments => {
  if (process.argv.length !== 7 && process.argv.length !== 8) {
    throw new Error("Wrong number of arguments. Expected format: npx ts-node src/transfer-tokens.ts <sourceChain> <destinationChain> <destinationAccount> <tokenAddress> <amount> [feeTokenAddress]");
  }

  const sourceChain = process.argv[2] as NETWORK;
  const destinationChain = process.argv[3] as NETWORK;
  const destinationAccount: string = process.argv[4];
  const tokenAddress: string = process.argv[5];
  const amount: bigint = BigInt(process.argv[6]);
  const feeTokenAddress: string | undefined =
    process.argv.length === 8 ? process.argv[7] : undefined;

  return {
    sourceChain,
    destinationChain,
    destinationAccount,
    tokenAddress,
    amount,
    feeTokenAddress,
  };
};

const transferTokens = async () => {
  const {
    sourceChain,
    destinationChain,
    destinationAccount,
    tokenAddress,
    amount,
    feeTokenAddress,
  } = handleArguments();

  // Get the RPC URL for the chain from the config
  const rpcUrl = getProviderRpcUrl(sourceChain);
  // fetch the signer privateKey
  const privateKey = getPrivateKey();
  // Initialize a provider using the obtained RPC URL
  const provider = new JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey);
  const signer = wallet.connect(provider);

  // Get the router's address for the specified chain
  const { router: sourceRouterAddress, chainSelector: sourceChainSelector } =
    getRouterConfig(sourceChain);

  // For the destination chain
  const { chainSelector: destinationChainSelector } =
    getRouterConfig(destinationChain);

  // Create a contract instance for the router using its ABI and address

  const sourceRouter = Router__factory.connect(sourceRouterAddress, signer);

  // Default number of confirmations blocks to wait for
  const DEFAULT_VERIFICATION_BLOCK_CONFIRMATIONS = 2;

  const isChainSupported = await sourceRouter.isChainSupported(
    destinationChainSelector
  );

  if (!isChainSupported) {
    throw new Error(
      `Lane ${sourceChain}->${destinationChain} is not supported`
    );
  }

  const supportedTokens = await sourceRouter.getSupportedTokens(
    destinationChainSelector
  );

  if (!supportedTokens.includes(tokenAddress)) {
    throw Error(
      `Token address ${tokenAddress} not in the list of supportedTokens ${supportedTokens}`
    );
  }

  // build message
  const tokenAmounts: Client.EVMTokenAmountStruct[] = [
    {
      token: tokenAddress,
      amount: amount,
    },
  ];

  // Encoding the data

  const functionSelector = ethers.id("CCIP EVMExtraArgsV1").slice(0, 10);
  //  "extraArgs" is a structure that can be represented as [ 'uint256']
  // extraArgs are { gasLimit: 0 }
  // we set gasLimit specifically to 0 because we are not sending any data so we are not expecting a receiving contract to handle data

  const defaultAbiCoder = ethers.AbiCoder.defaultAbiCoder();
  const extraArgs = defaultAbiCoder.encode(["uint256"], [0]);

  const encodedExtraArgs = functionSelector + extraArgs.slice(2);

  const message: Client.EVM2AnyMessageStruct = {
    receiver: defaultAbiCoder.encode(["address"], [destinationAccount]),
    data: "0x", // no data
    tokenAmounts: tokenAmounts,
    feeToken: feeTokenAddress || ethers.ZeroAddress, // If fee token address is provided then fees must be paid in fee token.
    extraArgs: encodedExtraArgs,
  };

  const fees = await sourceRouter.getFee(destinationChainSelector, message);
  if (!feeTokenAddress) {
    console.log(`Estimated fees (native): ${fees}\n`);
  } else {
    const erc20 = IERC20Metadata__factory.connect(feeTokenAddress, provider);
    const symbol = await erc20.symbol();
    const decimals = await erc20.decimals();
    const feesFormatted = ethers.formatUnits(fees, decimals);

    console.log(`Estimated fees (${symbol}): ${feesFormatted}\n`);
  }

  // Create a contract instance for the token using its ABI and address
  const erc20 = IERC20Metadata__factory.connect(tokenAddress, signer);
  let sendTx, approvalTx;

  if (!feeTokenAddress) {
    // Pay native
    // First approve the router to spend tokens
    console.log(
      `Approving router ${sourceRouterAddress} to spend ${amount} of token ${tokenAddress}\n`
    );
    approvalTx = await erc20.approve(sourceRouterAddress, amount);
    await approvalTx.wait(DEFAULT_VERIFICATION_BLOCK_CONFIRMATIONS); // wait for the transaction to be mined
    console.log(`Approval done. Transaction: ${approvalTx.hash}\n`);

    console.log(
      `Calling the router to send ${amount} of token ${tokenAddress} to account ${destinationAccount} on destination chain ${destinationChain} using CCIP\n`
    );
    sendTx = await sourceRouter.ccipSend(destinationChainSelector, message, {
      value: fees,
    }); // fees are send as value since we are paying the fees in native
  } else {
    if (tokenAddress.toUpperCase() === feeTokenAddress.toUpperCase()) {
      // fee token is the same as the token to transfer
      // Amount tokens to approve are transfer amount + fees
      console.log(
        `Approving router ${sourceRouterAddress} to spend ${amount} and fees ${fees} of token ${tokenAddress}\n`
      );
      approvalTx = await erc20.approve(sourceRouterAddress, amount + fees);
      await approvalTx.wait(DEFAULT_VERIFICATION_BLOCK_CONFIRMATIONS); // wait for the transaction to be mined
      console.log(`Approval done. Transaction: ${approvalTx.hash}\n`);
    } else {
      // fee token is different than the token to transfer
      // 2 approvals
      console.log(
        `Approving router ${sourceRouterAddress} to spend ${amount} of token ${tokenAddress}\n`
      );
      approvalTx = await erc20.approve(sourceRouterAddress, amount); // 1 approval for the tokens to transfer
      await approvalTx.wait(DEFAULT_VERIFICATION_BLOCK_CONFIRMATIONS); // wait for the transaction to be mined
      console.log(`Approval done. Transaction: ${approvalTx.hash}\n`);
      const erc20Fees = IERC20Metadata__factory.connect(
        feeTokenAddress,
        signer
      );
      console.log(
        `Approving router ${sourceRouterAddress} to spend fees ${fees} of feeToken ${feeTokenAddress}\n`
      );
      approvalTx = await erc20Fees.approve(sourceRouterAddress, fees); // 1 approval for the fees token
      const receiptTmp = await approvalTx.wait(
        DEFAULT_VERIFICATION_BLOCK_CONFIRMATIONS
      );
      console.log(`Approval done. Transaction: ${approvalTx.hash}\n`);
    }

    console.log(
      `Calling the router to send ${amount} of token ${tokenAddress} to account ${destinationAccount} on destination chain ${destinationChain} using CCIP\n`
    );
    sendTx = await sourceRouter.ccipSend(destinationChainSelector, message); // fees are part of the message
  }

  const receipt = await sendTx.wait(DEFAULT_VERIFICATION_BLOCK_CONFIRMATIONS); // wait for the transaction to be mined
  // Simulate a call to the router to fetch the messageID
  // prepare an ethersjs PreparedTransactionRequest

  if (!receipt) throw Error("Transaction not mined yet"); // TODO : add a better code to handle this case
  const call = {
    from: sendTx.from,
    to: sendTx.to,
    data: sendTx.data,
    gasLimit: sendTx.gasLimit,
    gasPrice: sendTx.gasPrice,
    value: sendTx.value,
    blockTag: receipt.blockNumber - 1, // Simulate a contract call with the transaction data at the block before the transaction
  };

  const messageId = await provider.call(call);

  console.log(
    `\n✅ ${amount} of Tokens(${tokenAddress}) Sent to account ${destinationAccount} on destination chain ${destinationChain} using CCIP. Transaction hash ${sendTx.hash} -  Message id is ${messageId}\n`
  );

  // Fetch status on destination chain
  const destinationRpcUrl = getProviderRpcUrl(destinationChain);

  // Initialize providers for interacting with the blockchains
  const destinationProvider = new JsonRpcProvider(destinationRpcUrl);
  const destinationRouterAddress = getRouterConfig(destinationChain).router;

  // Instantiate the router contract on the destination chain
  const destinationRouterContract = Router__factory.connect(
    destinationRouterAddress,
    destinationProvider
  );

  // CHECK DESTINATION CHAIN - POLL UNTIL the messageID is found or timeout

  const POLLING_INTERVAL = 60000; // Poll every 60 seconds
  const TIMEOUT = 40 * 60 * 1000; // 40 minutes in milliseconds

  let pollingId: NodeJS.Timeout;
  let timeoutId: NodeJS.Timeout;

  const pollStatus = async () => {
    // Fetch the OffRamp contract addresses on the destination chain
    const offRamps = await destinationRouterContract.getOffRamps();

    // Iterate through OffRamps to find the one linked to the source chain and check message status
    for (const offRamp of offRamps) {
      if (offRamp.sourceChainSelector === sourceChainSelector) {
        const offRampContract = OffRamp__factory.connect(
          offRamp.offRamp,
          destinationProvider
        );

        const executionStateChangeEvent = offRampContract.filters[
          "ExecutionStateChanged"
        ](undefined, messageId, undefined, undefined);

        const events = await offRampContract.queryFilter(
          executionStateChangeEvent
        );

        // Check if an event with the specific messageId exists and log its status
        for (let event of events) {
          if (event.args && event.args.messageId === messageId) {
            const state = event.args.state;
            const status = getMessageStatus(state);
            console.log(
              `\n✅Status of message ${messageId} is ${status} - Check the explorer https://ccip.chain.link/msg/${messageId}`
            );

            // Clear the polling and the timeout
            clearInterval(pollingId);
            clearTimeout(timeoutId);
            return;
          }
        }
      }
    }
    // If no event found, the message has not yet been processed on the destination chain
    console.log(
      `Message ${messageId} has not been processed yet on the destination chain.Try again in 60sec - Check the explorer https://ccip.chain.link/msg/${messageId}`
    );
  };

  // Start polling
  console.log(
    `Wait for message ${messageId} to be executed on the destination chain - Check the explorer https://ccip.chain.link/msg/${messageId}\n`
  );
  pollingId = setInterval(pollStatus, POLLING_INTERVAL);

  // Set timeout to stop polling after 40 minutes
  timeoutId = setTimeout(() => {
    console.log(
      `Timeout reached. Stopping polling - check again later (Run "get-status" script) Or check the explorer https://ccip.chain.link/msg/${messageId}\n`
    );
    clearInterval(pollingId);
  }, TIMEOUT);
};

transferTokens().catch((e) => {
  console.error(e);
  process.exit(1);
});
