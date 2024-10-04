// Import necessary modules and data
const {
  getProviderRpcUrl,
  getRouterConfig,
  getPrivateKey,
  getMessageStatus,
  getTokenAdminRegistryConfig,
} = require("./config");
const { ethers } = require("ethers");
const routerAbi = require("../../abi/Router.json");
const offRampAbi = require("../../abi/OffRamp.json");
const erc20Abi = require("../../abi/IERC20Metadata.json");
const tokenAdminRegistryAbi = require("../../abi/TokenAdminRegistry.json");

// Command: node src/transfer-tokens.js sourceChain destinationChain destinationAccount tokenAddress amount feeTokenAddress(optional)
// Examples (sepolia):

// Pay fees with native token:
// node src/transfer-tokens.js ethereumSepolia avalancheFuji <destinationAccount> <tokenAddress> 100

// Pay fees with LINK token:
// node src/transfer-tokens.js ethereumSepolia avalancheFuji <destinationAccount> <tokenAddress> 100 <feeTokenAddress>

// Pay fees with a wrapped native token:
// node src/transfer-tokens.js ethereumSepolia avalancheFuji <destinationAccount> <tokenAddress> 100 <feeTokenAddress>

const handleArguments = () => {
  if (process.argv.length !== 7 && process.argv.length !== 8) {
    // feeTokenAddress is optional
    throw new Error(
      "Wrong number of arguments. Expected format: node src/transfer-tokens.js <sourceChain> <destinationChain> <destinationAccount> <tokenAddress> <amount> [feeTokenAddress]"
    );
  }

  const sourceChain = process.argv[2];
  const destinationChain = process.argv[3];
  const destinationAccount = ethers.getAddress(process.argv[4]);
  const tokenAddress = ethers.getAddress(process.argv[5]);
  const amount = BigInt(process.argv[6]);
  const feeTokenAddress = process.argv[7] && ethers.getAddress(process.argv[7]);

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
      This section initializes providers and 
      retrieves necessary configurations.
  ==================================================
  */

  // Get the RPC URL for the chain from the config
  const rpcUrl = getProviderRpcUrl(sourceChain);
  // Fetch the signer's private key
  const privateKey = getPrivateKey();
  // Initialize a provider using the obtained RPC URL
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey);
  const signer = wallet.connect(provider);

  // Get the router's address and chain selectors
  const { router, chainSelector: sourceChainSelector } =
    getRouterConfig(sourceChain);
  const sourceRouterAddress = router.address;
  const { chainSelector: destinationChainSelector } =
    getRouterConfig(destinationChain);

  // Create a contract instance for the router using its ABI and address
  const sourceRouter = new ethers.Contract(
    sourceRouterAddress,
    routerAbi,
    signer
  );

  // Default number of confirmation blocks to wait for
  const DEFAULT_VERIFICATION_BLOCK_CONFIRMATIONS = 2;

  /* 
  ==================================================
      Section: Check if lane is supported
  ==================================================
  */

  // Check if the destination chain is supported
  const isChainSupported = await sourceRouter.isChainSupported(
    destinationChainSelector
  );

  if (!isChainSupported) {
    throw new Error(
      `Lane ${sourceChain} -> ${destinationChain} is not supported`
    );
  }

  /* 
  ==================================================
      Section: Check token validity
      Check if the token you would like to transfer 
      is supported.
  ==================================================
  */

  // Check if TokenAdminRegistry is present for the source chain
  const tokenAdminRegistryConfig = getTokenAdminRegistryConfig(sourceChain);

  if (!tokenAdminRegistryConfig) {
    // TokenAdminRegistry not present, proceed as before
    // Fetch the list of supported tokens
    const supportedTokens = await sourceRouter.getSupportedTokens(
      destinationChainSelector
    );

    if (!supportedTokens.includes(tokenAddress)) {
      throw new Error(
        `Token address ${tokenAddress} not in the list of supported tokens ${supportedTokens}`
      );
    }
  } else {
    // TokenAdminRegistry is present, use getPool to check if token is supported
    const tokenAdminRegistryAddress = tokenAdminRegistryConfig.address;
    const tokenAdminRegistry = new ethers.Contract(
      tokenAdminRegistryAddress,
      tokenAdminRegistryAbi,
      provider
    );

    const poolAddress = await tokenAdminRegistry.getPool(tokenAddress);

    if (poolAddress === ethers.AddressZero) {
      throw new Error(
        `Token address ${tokenAddress} is not supported (no pool found)`
      );
    }
  }

  /* 
  ==================================================
      Section: BUILD CCIP MESSAGE
      Build the CCIP message that you will send to the
      Router contract.
  ==================================================
  */

  // Build message
  const tokenAmounts = [
    {
      token: tokenAddress,
      amount: amount,
    },
  ];

  // Encoding the data

  const functionSelector = ethers.id("CCIP EVMExtraArgsV2").slice(0, 10);
  // "extraArgs" is a structure that can be represented as ['uint256', 'bool']
  // ExtraArgs are { gasLimit: 0, allowOutOfOrderExecution: true }
  // We set gasLimit specifically to 0 because we are not sending any data

  const defaultAbiCoder = ethers.AbiCoder.defaultAbiCoder();
  const extraArgs = defaultAbiCoder.encode(["uint256", "bool"], [0, true]);

  const encodedExtraArgs = functionSelector + extraArgs.slice(2);

  const message = {
    receiver: defaultAbiCoder.encode(["address"], [destinationAccount]),
    data: "0x", // No data
    tokenAmounts: tokenAmounts,
    feeToken: feeTokenAddress ? feeTokenAddress : ethers.constants.AddressZero, // If fee token address is provided, fees must be paid in fee token
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
      Section: SEND TOKENS
      This code block handles token approvals and 
      sending tokens across chains.
  ==================================================
  */

  // Create a contract instance for the token using its ABI and address
  const erc20 = new ethers.Contract(tokenAddress, erc20Abi, signer);
  let sendTx, approvalTx;

  if (!feeTokenAddress) {
    // Pay with native token
    // First approve the router to spend tokens
    console.log(
      `Approving router ${sourceRouterAddress} to spend ${amount} of token ${tokenAddress}\n`
    );
    approvalTx = await erc20.approve(sourceRouterAddress, amount);
    await approvalTx.wait(DEFAULT_VERIFICATION_BLOCK_CONFIRMATIONS); // Wait for the transaction to be mined
    console.log(`Approval done. Transaction: ${approvalTx.hash}\n`);

    console.log(
      `Calling the router to send ${amount} of token ${tokenAddress} to account ${destinationAccount} on destination chain ${destinationChain} using CCIP\n`
    );
    sendTx = await sourceRouter.ccipSend(destinationChainSelector, message, {
      value: fees,
    }); // Fees are sent as value since we are paying the fees in native currency
  } else {
    if (tokenAddress === feeTokenAddress) {
      // Fee token is the same as the token to transfer
      // Amount of tokens to approve is transfer amount + fees
      console.log(
        `Approving router ${sourceRouterAddress} to spend ${amount} and fees ${fees} of token ${tokenAddress}\n`
      );
      approvalTx = await erc20.approve(sourceRouterAddress, amount + fees);
      await approvalTx.wait(DEFAULT_VERIFICATION_BLOCK_CONFIRMATIONS); // Wait for the transaction to be mined
      console.log(`Approval done. Transaction: ${approvalTx.hash}\n`);
    } else {
      // Fee token is different from the token to transfer
      // Need two approvals
      console.log(
        `Approving router ${sourceRouterAddress} to spend ${amount} of token ${tokenAddress}\n`
      );
      approvalTx = await erc20.approve(sourceRouterAddress, amount); // Approval for the tokens to transfer
      await approvalTx.wait(DEFAULT_VERIFICATION_BLOCK_CONFIRMATIONS); // Wait for the transaction to be mined
      console.log(`Approval done. Transaction: ${approvalTx.hash}\n`);

      const erc20Fees = new ethers.Contract(feeTokenAddress, erc20Abi, signer);
      console.log(
        `Approving router ${sourceRouterAddress} to spend fees ${fees} of fee token ${feeTokenAddress}\n`
      );
      approvalTx = await erc20Fees.approve(sourceRouterAddress, fees); // Approval for the fee token
      await approvalTx.wait(DEFAULT_VERIFICATION_BLOCK_CONFIRMATIONS); // Wait for the transaction to be mined
      console.log(`Approval done. Transaction: ${approvalTx.hash}\n`);
    }

    console.log(
      `Calling the router to send ${amount} of token ${tokenAddress} to account ${destinationAccount} on destination chain ${destinationChain} using CCIP\n`
    );
    sendTx = await sourceRouter.ccipSend(destinationChainSelector, message); // Fees are part of the message
  }

  const receipt = await sendTx.wait(DEFAULT_VERIFICATION_BLOCK_CONFIRMATIONS); // Wait for the transaction to be mined

  /* 
  ==================================================
      Section: Fetch message ID
      Simulate a call to the router to fetch the message ID.
  ==================================================
  */

  // Prepare a transaction request to simulate
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
    `\n✅ ${amount} of Tokens(${tokenAddress}) sent to account ${destinationAccount} on destination chain ${destinationChain} using CCIP. Transaction hash ${sendTx.hash} - Message ID is ${messageId}\n`
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
  const destinationProvider = new ethers.JsonRpcProvider(destinationRpcUrl);
  const { router: destinationRouter } = getRouterConfig(destinationChain);
  const destinationRouterAddress = destinationRouter.address;

  // Instantiate the router contract on the destination chain
  const destinationRouterContract = new ethers.Contract(
    destinationRouterAddress,
    routerAbi,
    destinationProvider
  );

  // Get the current block number on the destination chain. This will be used to reduce the number of blocks to poll
  const currentBlockNumber = await destinationProvider.getBlockNumber();

  // Polling for message execution status

  const POLLING_INTERVAL = 60000; // Poll every 60 seconds
  const TIMEOUT = 40 * 60 * 1000; // 40 minutes in milliseconds

  let pollingId;
  let timeoutId;

  const pollStatus = async () => {
    // Fetch the OffRamp contract addresses on the destination chain
    const offRamps = await destinationRouterContract.getOffRamps();

    // Iterate through OffRamps to find the one linked to the source chain and check message status
    for (const offRamp of offRamps) {
      if (
        offRamp.sourceChainSelector.toString() ===
        sourceChainSelector.toString()
      ) {
        const offRampContract = new ethers.Contract(
          offRamp.offRamp,
          offRampAbi,
          destinationProvider
        );

        const executionStateChangeEvent =
          offRampContract.filters.ExecutionStateChanged(undefined, messageId);

        const events = await offRampContract.queryFilter(
          executionStateChangeEvent,
          currentBlockNumber
        );

        // Check if an event with the specific messageId exists and log its status
        for (let event of events) {
          if (event.args && event.args.messageId === messageId) {
            const state = event.args.state;
            const status = getMessageStatus(state);
            console.log(
              `\n✅ Status of message ${messageId} is ${status} - Check the explorer https://ccip.chain.link/msg/${messageId}`
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
      `Message ${messageId} has not been processed yet on the destination chain. Trying again in 60 seconds - Check the explorer https://ccip.chain.link/msg/${messageId}`
    );
  };

  // Start polling
  console.log(
    `Waiting for message ${messageId} to be executed on the destination chain - Check the explorer https://ccip.chain.link/msg/${messageId}\n`
  );
  pollingId = setInterval(pollStatus, POLLING_INTERVAL);

  // Set timeout to stop polling after 40 minutes
  timeoutId = setTimeout(() => {
    console.log(
      `Timeout reached. Stopping polling - check again later or check the explorer https://ccip.chain.link/msg/${messageId}\n`
    );
    clearInterval(pollingId);
  }, TIMEOUT);
};

transferTokens().catch((e) => {
  console.error(e);
  process.exit(1);
});
