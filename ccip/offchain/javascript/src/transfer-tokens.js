// Import necessary modules and data
const {
  getProviderRpcUrl,
  getRouterConfig,
  getPrivateKey,
  getMessageState,
} = require("./config");
const { ethers, JsonRpcProvider } = require("ethers");
const routerAbi = require("../../abi/Router.json");
const offRampAbi = require("../../abi/OffRamp.json");
const erc20Abi = require("../../abi/IERC20Metadata.json");

// Command: node src/transfer-tokens.js sourceChain destinationChain destinationAccount tokenAddress amount feeTokenAddress(optional)
// Examples(sepolia):

// pay fees with native token: node src/transfer-tokens.js ethereumSepolia avalancheFuji 0x9d087fC03ae39b088326b67fA3C788236645b717 0xFd57b4ddBf88a4e07fF4e34C487b99af2Fe82a05 100
// pay fees with LINK token: node src/transfer-tokens.js ethereumSepolia avalancheFuji 0x9d087fC03ae39b088326b67fA3C788236645b717 0xFd57b4ddBf88a4e07fF4e34C487b99af2Fe82a05 100 0x779877A7B0D9E8603169DdbD7836e478b4624789
// pay fees with a wrapped native token: node src/transfer-tokens.js ethereumSepolia avalancheFuji 0x9d087fC03ae39b088326b67fA3C788236645b717 0xFd57b4ddBf88a4e07fF4e34C487b99af2Fe82a05 100 0x097D90c9d3E0B50Ca60e1ae45F6A81010f9FB534
const handleArguments = () => {
  if (process.argv.length !== 7 && process.argv.length !== 8) {
    // feeTokenAddress is optional
    throw new Error("Wrong number of arguments");
  }

  const sourceChain = process.argv[2];
  const destinationChain = process.argv[3];
  const destinationAccount = process.argv[4];
  const tokenAddress = process.argv[5];
  const amount = BigInt(process.argv[6]);
  const feeTokenAddress = process.argv[7];

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

  /* 
  ==================================================
      Section: INITIALIZATION
      This section of the code parses the source and 
      destination router addresses and blockchain 
      selectors.
      It also initialized the ethers providers 
      to communicate with the blockchains.
  ==================================================
  */

  // Get the RPC URL for the chain from the config
  const rpcUrl = getProviderRpcUrl(sourceChain);
  // fetch the signer privateKey
  const privateKey = getPrivateKey();
  // Initialize a provider using the obtained RPC URL
  const provider = new JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey);
  const signer = wallet.connect(provider);

  // Get the router's address for the specified chain
  const sourceRouterAddress = getRouterConfig(sourceChain).router;
  const sourceChainSelector = getRouterConfig(sourceChain).chainSelector;
  // Get the chain selector for the target chain
  const destinationChainSelector =
    getRouterConfig(destinationChain).chainSelector;

  // Create a contract instance for the router using its ABI and address
  const sourceRouter = new ethers.Contract(
    sourceRouterAddress,
    routerAbi,
    signer
  );

  // Default number of confirmations blocks to wait for
  const DEFAULT_VERIFICATION_BLOCK_CONFIRMATIONS = 2;

  /* 
  ==================================================
      Section: Check if lane is supported
  ==================================================
  */

  const isChainSupported = await sourceRouter.isChainSupported(
    destinationChainSelector
  );

  if (!isChainSupported) {
    throw new Error(`Lane ${chain}->${destinationChain} is not supported}`);
  }

  /* 
  ==================================================
      Section: Check token validity
      Check first if the token you would like to 
      transfer is supported.
  ==================================================
  */

  // Fetch the list of supported tokens
  const supportedTokens = await sourceRouter.getSupportedTokens(
    destinationChainSelector
  );

  if (!supportedTokens.includes(tokenAddress)) {
    throw Error(
      `Token address ${tokenAddress} not in the list of supportedTokens ${supportedTokens}`
    );
  }

  /* 
  ==================================================
      Section: BUILD CCIP MESSAGE
      build CCIP message that you will send to the
      Router contract.
  ==================================================
  */

  // build message
  const tokenAmounts = [
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

  const message = {
    receiver: defaultAbiCoder.encode(["address"], [destinationAccount]),
    data: "0x", // no data
    tokenAmounts: tokenAmounts,
    feeToken: feeTokenAddress ? feeTokenAddress : ethers.ZeroAddress, // If fee token address is provided then fees must be paid in fee token.
    extraArgs: encodedExtraArgs,
  };

  /* 
  ==================================================
      Section: CALCULATE THE FEES
      Call the Router to estimate the fees for sending tokens.
  ==================================================
  */

  const fees = await sourceRouter.getFee(destinationChainSelector, message);
  if (!feeTokenAddress) {
    console.log(`Estimated fees (native): ${fees}\n`);
  } else {
    const erc20 = new ethers.Contract(feeTokenAddress, erc20Abi, provider);
    const symbol = await erc20.symbol();
    const decimals = await erc20.decimals();
    const feesFormatted = ethers.formatUnits(fees, decimals);

    console.log(`Estimated fees (${symbol}): ${feesFormatted}\n`);
  }

  /* 
  ==================================================
      Section: SEND tokens
      This code block initializes an ERC20 token contract for token transfer across chains. It handles three cases:
      1. If the fee token is the native blockchain token, it makes one approval for the transfer amount. The fees are included in the msg.value field.
      2. If the fee token is different from both the native blockchain token and the transfer token, it makes two approvals: one for the transfer amount and another for the fees. The fees are part of the message.
      3. If the fee token is the same as the transfer token but not the native blockchain token, it makes a single approval for the sum of the transfer amount and fees. The fees are part of the message.
      The code waits for the transaction to be mined and stores the transaction receipt.
  ==================================================
  */

  // Create a contract instance for the token using its ABI and address
  const erc20 = new ethers.Contract(tokenAddress, erc20Abi, signer);
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
      const erc20Fees = new ethers.Contract(feeTokenAddress, erc20Abi, signer);
      console.log(
        `Approving router ${sourceRouterAddress} to spend fees ${fees} of feeToken ${feeTokenAddress}\n`
      );
      approvalTx = await erc20Fees.approve(sourceRouterAddress, fees); // 1 approval for the fees token

      console.log(`Approval done. Transaction: ${approvalTx.hash}\n`);
    }

    console.log(
      `Calling the router to send ${amount} of token ${tokenAddress} to account ${destinationAccount} on destination chain ${destinationChain} using CCIP\n`
    );
    sendTx = await sourceRouter.ccipSend(destinationChainSelector, message); // fees are part of the message
  }

  const receipt = await sendTx.wait(DEFAULT_VERIFICATION_BLOCK_CONFIRMATIONS); // wait for the transaction to be mined

  /* 
  ==================================================
      Section: Fetch message ID
      The Router ccipSend function returns the messageId.
      This section makes a call (simulation) to the blockchain
      to fetch the messageId that was returned by the Router.
  ==================================================
  */

  // Simulate a call to the router to fetch the messageID
  // prepare an ethersjs PreparedTransactionRequest
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

  /* 
  ==================================================
      Section: Check status of the destination chain
      Poll the off-ramps contracts of the destination chain
      to wait for the message to be executed then return
      the status.
  ==================================================
  */

  // Fetch status on destination chain
  const destinationRpcUrl = getProviderRpcUrl(destinationChain);

  // Initialize providers for interacting with the blockchains
  const destinationProvider = new JsonRpcProvider(destinationRpcUrl);
  const destinationRouterAddress = getRouterConfig(destinationChain).router;

  // Instantiate the router contract on the destination chain
  const destinationRouterContract = new ethers.Contract(
    destinationRouterAddress,
    routerAbi,
    destinationProvider
  );

  // CHECK DESTINATION CHAIN - POLL UNTIL the messageID is found or timeout

  const POLLING_INTERVAL = 60000; // Poll every 60 seconds
  const TIMEOUT = 40 * 60 * 1000; // 40 minutes in milliseconds

  let pollingId;
  let timeoutId;

  const pollStatus = async () => {
    // Fetch the OffRamp contract addresses on the destination chain
    const offRamps = await destinationRouterContract.getOffRamps();

    // Iterate through OffRamps to find the one linked to the source chain and check message status
    for (const offRamp of offRamps) {
      if (offRamp.sourceChainSelector.toString() === sourceChainSelector) {
        const offRampContract = new ethers.Contract(
          offRamp.offRamp,
          offRampAbi,
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
            const status = getMessageState(state);
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
