# CCIP gas estimator using Hardhat

This guide is designed to help you accurately estimate the gas consumption of the `ccipReceive` function within a CCIP Receiver contract. Understanding the gas dynamics of this function is crucial for setting an appropriate gasLimit when sending a CCIP message from the Sender contract.

The `ccipReceive` function is crafted for educational purposes to demonstrate how gas consumption changes with computational complexity. It is structured to accept a `uint256` input representing the number of iterations a loop within the function will execute. This input is decoded from the received CCIP message as follows:

```solidity
uint256 iterations = abi.decode(any2EvmMessage.data, (uint256)); // abi-decoding of the receiver number of iterations
```

To mitigate excessive gas consumption and ensure predictability, the iterations variable is internally capped at `99`. The function achieves this by performing the modulo operation `iterations % 100`, thereby limiting the maximum number of iterations to `99`. The core logic of the function, including the iteration cap and the loop, is outlined below:

```solidity
// Initialize the result with the number of iterations
uint256 result = iterations;
// Cap the number of iterations to a maximum of 99
uint256 maxIterations = iterations % 100;

// Execute the loop, simulating computational work
for (uint256 i = 0; i < maxIterations; i++) {
    result += i;
}
```

By experimenting with different iterations values, developers can gain insights into optimal gas limit settings.

### Prerequisites

- Make sure to install all the dependencies

````bash
npm install
```

- Set the password to encrypt your environment variables

```bash
npx env-enc set-pw
````

- Setup this environment variables:

  - `PRIVATE_KEY`
  - `ETHEREUM_SEPOLIA_RPC_URL`
  - `AVALANCHE_FUJI_RPC_URL`
  - `ETHERSCAN_API_KEY`

  using the following command:

  ```bash
  npx env-enc set
  ```

## Local testing

To run only the TypeScript tests, use the test nodejs task:

```bash
npx hardhat test nodejs
```

Example output:

```text
$ npx hardhat test nodejs

Running node:test tests

Final Gas Usage Report:
Number of iterations 0 - Gas used: 5151
Number of iterations 50 - Gas used: 11301
Number of iterations 99 - Gas used: 17328
  Sender and Receiver
    ✔ should CCIP message from sender to receiver (802ms)


  1 passing (1064ms)
```

As you can notice from the output, the gas usage increases with the number of iterations. This is a crucial insight for setting the gasLimit when sending a CCIP message from the Sender contract. The maximum gas usage is observed when the number of iterations is set to `99` (gas: `17328`).

## Testnet testing

The Sender is deployed on Avalanche Fuji and the Receiver is deployed on Ethereum Sepolia.

### Deploy and configure

1. Deploy Sender on Avalanche Fuji:

```bash
npx hardhat run scripts/deployment/deploySender.ts --network avalancheFuji
```

Example output:

```text
$ npx hardhat run scripts/deployment/deploySender.ts --network avalancheFuji

Deploying Sender contract on avalancheFuji...
Sender contract deployed at: 0x6e80C9d77B12470A6158459cED1616F705aA13Ea
⏳ Deployment tx: 0xabdc46accad62963e955dec0b2946fe73e4b45e089cca9bb8f98ce2c7db805aa
wait for 20 blocks
Verifying Sender contract on avalancheFuji...

📤 Submitted source code for verification on SnowTrace:

  contracts/Sender.sol:Sender
  Address: 0x6e80C9d77B12470A6158459cED1616F705aA13Ea

⏳ Waiting for verification result...


✅ Contract verified successfully on SnowTrace!

  contracts/Sender.sol:Sender
  Explorer: https://testnet.snowtrace.io/address/0x6e80C9d77B12470A6158459cED1616F705aA13Ea#code
✅ Sender contract verified on avalancheFuji!
Writing to config file: ./scripts/generatedData.json {
  ethereumSepolia: { receiver: '' },
  avalancheFuji: { sender: '0x6e80C9d77B12470A6158459cED1616F705aA13Ea' }
}
```

1. Deploy Receiver on Ethereum Sepolia:

```bash
npx hardhat run scripts/deployment/deployReceiver.ts --network ethereumSepolia
```

Example output:

```text
$ npx hardhat run scripts/deployment/deployReceiver.ts --network ethereumSepolia

Deploying Receiver contract on ethereumSepolia...
Receiver contract deployed at: 0x20A6a64294ea22B9d560e291f23dA3F44955eF6b
⏳ Deployment tx: 0x62381804ab6672fbf4ce0652e95609b5218396338f7202a05b19c3c3a087e344
wait for 5 blocks
Verifying Receiver contract on ethereumSepolia...

📤 Submitted source code for verification on Etherscan:

  contracts/Receiver.sol:Receiver
  Address: 0x20A6a64294ea22B9d560e291f23dA3F44955eF6b

⏳ Waiting for verification result...


✅ Contract verified successfully on Etherscan!

  contracts/Receiver.sol:Receiver
  Explorer: https://sepolia.etherscan.io/address/0x20A6a64294ea22B9d560e291f23dA3F44955eF6b#code
✅ Receiver contract verified on ethereumSepolia!
Writing to config file: ./scripts/generatedData.json {
  ethereumSepolia: { receiver: '0x20A6a64294ea22B9d560e291f23dA3F44955eF6b' },
  avalancheFuji: { sender: '0x6e80C9d77B12470A6158459cED1616F705aA13Ea' }
}
```

1. Allow the Sender to send messages to Ethereum Sepolia:

```bash
npx hardhat run scripts/configuration/allowlistingForSender.ts --network avalancheFuji
```

Example output:

```text
$ npx hardhat run scripts/configuration/allowlistingForSender.ts --network avalancheFuji    

Allowlisting destination chain ethereumSepolia...
✅ Allowlisted: ethereumSepolia
```

1. Allow the Receiver to receiver messages from the Sender:

```bash
npx hardhat run scripts/configuration/allowlistingForReceiver.ts --network ethereumSepolia
```

Example output:

```text
$ npx hardhat run scripts/configuration/allowlistingForReceiver.ts --network ethereumSepolia   

Allowlisting source chain for avalancheFuji...
✓ Source chain avalancheFuji allowlisted
Allowlisting sender 0x6e80C9d77B12470A6158459cED1616F705aA13Ea...
✓ Sender 0x6e80C9d77B12470A6158459cED1616F705aA13Ea allowlisted
✅ Allowlisted: avalancheFuji , 0x6e80C9d77B12470A6158459cED1616F705aA13Ea
```

### Test

1. Send three CCIP messages with different number of iterations:

```bash
npx hardhat run scripts/testing/sendCCIPMessages.ts --network avalancheFuji
```

Example output

```text
$ npx hardhat run scripts/testing/sendCCIPMessages.ts --network avalancheFuji

Approving 0x0b9d5D9136855f6FEc3c0993feE6E9CE8a297846 for 0x6e80C9d77B12470A6158459cED1616F705aA13Ea. Allowance is max uint256. Signer 0x8c244f0b2164e6a3bed74ab429b0ebd661bb14ca...
Number of iterations 0 - Gas limit: 5685 - Message Id: 0x7a51c84fd0734afef641e3578b29e718c208d6ac2e50826f73a3fec24076a72b
Number of iterations 50 - Gas limit: 16190 - Message Id: 0x348ab504289f5a0a0ffed023d8315668dbdd8a8a2ae93349845e837e397aa1ac
Number of iterations 99 - Gas limit: 26485 - Message Id: 0xe4dfdac75ae90f355583b356033179a89a95e5174256a04c371ab10dfe433d96
```

1. Go to the [CCIP explorer](https://ccip.chain.link) and wait for each message to be successfully transmitted (Status in the explorer: `Success`).

For the example above, here below the destination transaction hashes:

| Message id                                                         | Ethereum Sepolia transaction hash                                  |
| ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| 0x7a51c84fd0734afef641e3578b29e718c208d6ac2e50826f73a3fec24076a72b | 0x25c26be00c5e72127588a29ef485b817dae0d1bf4cd59fd2446da9af03441413 |
| 0x348ab504289f5a0a0ffed023d8315668dbdd8a8a2ae93349845e837e397aa1ac | 0x25c26be00c5e72127588a29ef485b817dae0d1bf4cd59fd2446da9af03441413 |
| 0xe4dfdac75ae90f355583b356033179a89a95e5174256a04c371ab10dfe433d96 | 0x25c26be00c5e72127588a29ef485b817dae0d1bf4cd59fd2446da9af03441413 |

**Note** that the Ethereum Sepolia transaction hash is the same for all the messages. This is because CCIP batched the messages.

1. Open [Tenderly](https://dashboard.tenderly.co) and Search for the [destination transaction hash](https://dashboard.tenderly.co/tx/sepolia/0x25c26be00c5e72127588a29ef485b817dae0d1bf4cd59fd2446da9af03441413).

1. Search for `_callWithExactGasSafeReturnData` that has payload containing your messageId (without `0x`). This is an [example](https://dashboard.tenderly.co/tx/0x25c26be00c5e72127588a29ef485b817dae0d1bf4cd59fd2446da9af03441413?trace=0.0.0.12.0.2.2) for `0x7a51c84fd0734afef641e3578b29e718c208d6ac2e50826f73a3fec24076a72b`.

1. Just below it, you will find the call trace from the Router to your Receiver contract. This is the [trace](https://dashboard.tenderly.co/tx/0x25c26be00c5e72127588a29ef485b817dae0d1bf4cd59fd2446da9af03441413?trace=0.0.0.12.0.2.2).

    > **Note**: Tenderly's numeric trace indices aren't stable over time (reprocessing can shift them), so if the trace link above doesn't work, you can still find the correct trace by searching for `_callWithExactGasSafeReturnData`.

1. Right below the `_callWithExactGasSafeReturnData`, you will see the   `Router` => `Receiver`.`ccipReceive` call. If it shows "No source for this contract", click on "Fetch the contract from public explorer" to load the source code from Etherscan since it's already verified. When you click on the value of the `message` parameter, it will display the exact message ID (as `messageId`) (i.e., `0x7a51c84fd0734afef641e3578b29e718c208d6ac2e50826f73a3fec24076a72b` in this case) as one of its fields.

1. Click on the debugger and you'll get the gas details:

    ```text
    "gas":{
    "gas_left":5685
    "gas_used":5016
    "total_gas_used":7994315
    }
    ```

1. Note the `gas_left` is equal to the limit that is set in the `sendCCIPMessages.ts` script: `5685`. The `gas_used` is the actual gas used by the Receiver contract to process the message.

1. Repeating the same steps for the other two messages, we can summarize the output:

| Number of iterations | Gas used during local testing | Gas limit on testnet | Gas used on testnet |
| -------------------- | ----------------------------- | -------------------- | ------------------- |
| 0                    | 5151                          | 5685                 | 5016                |
| 50                   | 11301                         | 16190                | 11166               |
| 99                   | 17328                         | 26485                | 17193               |

**Remark**: Compare this with the results from the [Foundry guide](../foundry/README.md).
