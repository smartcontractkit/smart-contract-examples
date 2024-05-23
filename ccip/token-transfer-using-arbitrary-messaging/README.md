# CCIP: Token transfers using arbitrary data

> **Note**
>
> _This repository represents an example of using a Chainlink product or service. It is provided to help you understand how to interact with Chainlink’s systems so that you can integrate them into your own. This template is provided "AS IS" without warranties of any kind, has not been audited, and may be missing key checks or error handling to make the usage of the product more clear. Take everything in this repository as an example and not something to be copy pasted into a production ready service._

This project demonstrates how to use Chainlink CCIP to send tokens to a receiver using arbitrary data. This example is interesting for projects that want to send tokens crosschain that are not supported by Chainlink CCIP.

## Overview

This project showcases three main scenarios:

### Burn and Mint

![burn-and-mint](./img/tokens-messaing-burn-and-mint.jpg)

In this scenario, tokens are burned on the source chain and minted on the destination chain. When the sender initiates a transfer, the Bridge contract on the source chain transfers the tokens to the token pool then calls the `lockOrBurn` function of the token pool to burn the tokens. On the destination chain, the bridge contract receives the CCIP message and calls the `releaseOrMint` function of the token pool to mint the tokens for the receiver.

### Lock and Mint / Burn and Release

![lock-and-mint](./img/tokens-messaing-lock-and-mint.jpg)

In this scenario, tokens are locked on the source chain and minted on the destination chain. When the sender initiates a transfer, the Bridge contract on the source chain transfers the tokens to the token pool then calls the `lockOrBurn` function of the token pool to lock the tokens. On the destination chain, the bridge contract receives the CCIP message and calls the `releaseOrMint` function of the token pool to mint the tokens for the receiver.

The reverse scenario works as follows: When the sender initiates a transfer, the Bridge contract on the source chain transfers the tokens to the token pool then calls the `lockOrBurn` function of the token pool to burn the tokens. On the destination chain, the bridge contract receives the CCIP message and calls the `releaseOrMint` function of the token pool to release the tokens for the receiver. **Note**: This scenario requires active liquidity management to ensure that there are enough tokens on the destination chain to release tokens for the receivers.

### Lock and Release

![lock-and-release](./img/tokens-messaging-lock-and-release.jpg)

In this scenario, tokens are locked on the source chain and released on the destination chain. When the sender initiates a transfer, the Bridge contract on the source chain transfers the tokens to the token pool then calls the `lockOrBurn` function of the token pool to lock the tokens. On the destination chain, the bridge contract receives the CCIP message and calls the `releaseOrMint` function of the token pool to release the tokens for the receiver. **Note**: This scenario requires active liquidity management to ensure that there are enough tokens on the destination chain to release tokens for the receivers.

### Contracts

#### Bridge

The `Bridge.sol` contract serves as a central component for enabling the transfer of tokens across different blockchain networks. This contract utilizes the Chainlink CCIP (Cross-Chain Interoperability Protocol) for passing arbitrary data. The arbitrary data contains information such as the receiver address, the amount, and the token address on the destination chain.

Key Functions and Features:

- On the source chain:

  - Interacts with the Configuration contract to fetch the necessary configuration, such as the token pool, destination token address, and the CCIP extra args (the gas limit for the execution of the Bridge's ccipReceive function on the destination chain).
  - Interacts with the relevant token pools to lock or burn tokens.
  - Interacts with CCIP Router for fee calculation and routing of arbitrary data to the bridge on the destination chain.

- On the destination chain:
  - Interacts with the Configuration contract to fetch the necessary configuration, such as the token pool.
  - Interacts with the relevant token pools to release or mint tokens for the receiver.

#### Configuration

The `Configuration.sol` contract is a centralized repository designed to manage and store the configuration details required for cross-chain operations facilitated by the `Bridge.sol` contract. This contract holds important information such as bridge addresses, token pool mappings, and specific chain settings (extraArgs).

Key Functions and Features:

- Bridge and Token Settings: Stores and updates the addresses of sender and receiver bridges that facilitate the cross-chain communication. It also manages mappings between source tokens on one chain and their corresponding destination tokens on another.
- Token Pool Management: Links ERC20 tokens to their respective token pools, which handle the actual locking, burning, releasing, and minting of tokens.
- Extra Arguments Storage: Maintains additional parameters needed for transaction execution on remote chains, such as gas limits, ensuring that each cross-chain message is tailored to meet the destination chain’s operational requirements.

#### Token pools

Token pools handle essential tasks such as locking, releasing, minting, and burning of tokens.

Types of Token Pools:

- BurnMint Token Pools: These pools refer to crosschain tokens that can be minted or burned. In this model, tokens are burned on the source chain and minted on the destination chain.
- LockRelease Token Pools: These are designed for scenarios where tokens cannot be directly minted or burned across chains. Instead, tokens are "locked" in the pool on the source chain and an equivalent amount of tokens is "released" from a similar pool on the destination chain. This method requires active liquidity management to ensure sufficient tokens on the destination chain to release tokens for the receivers.

### Transfer tokens using arbitrary data

Here’s a step-by-step breakdown for transferring tokens using arbitrary data:

1. **Token Approval**:

   - The sender on the source chain approves the Bridge contract to spend tokens on their behalf, enabling the Bridge to handle tokens during the transfer process.

2. **Initiating Transfer**:

   - The sender initiates the transfer by calling the `transferTokensToDestinationChain` function on the Bridge contract on the source chain, specifying the amount of tokens, the destination chain selector, the receiver's address on the destination chain, and any applicable fee tokens.

3. **Configuration Fetch**:

   - The Bridge contract interacts with the Configuration contract to fetch necessary details such as the associated token pool, the destination token address on the destination chain, and extra arguments needed for cross-chain communication.

4. **Token Handling (Lock or Burn)**:

   - Depending on the type of token pool:
     - **LockRelease Token Pool**: Tokens are locked in the pool on the source chain, withheld from circulation but not destroyed.
     - **BurnMint Token Pool**: Tokens are burned on the source chain, reducing the total supply on that chain.

5. **CCIP Message Preparation and Sending**:

   - A CCIP message containing details about the receiver, amount, and destination token is sent to the Bridge on the destination chain via the CCIP Router. Fees are calculated and handled accordingly.

6. **Receiving on the destination chain**:
   - The Bridge on the destination chain processes the message, validates the data against its Configuration contract, and performs token operations:
     - **LockRelease Token Pool**: Tokens equivalent to the locked amount on the source chain are released and transferred to the receiver.
     - **BurnMint Token Pool**: New tokens are minted equivalent to the burned amount on the source chain and transferred to the receiver.

## Test locally

The tests are written in Solidity and can be found in the `test` directory. The tests cover the core functionalities of the Bridge, Configuration, and Token Pool contracts.
`BridgeWithSimulator.t.sol` uses the Chainlink CCIP simulator locally. While the `BridgeWithSimulatorFork.t.sol` uses the Chainlink CCIP simulator with forked Ethereum Sepolia (as source chain) and Avalanche Fuji (as destination chain).

To run the tests:

- Set three environment variables that will be used to fork the source and destination chains:

  - `ETHEREUM_SEPOLIA_RPC_URL`: The RPC URL of Ethereum Sepolia.

    ```text
    export ETHEREUM_SEPOLIA_RPC_URL=YOUR_SEPOLIA_RPC_URL
    ```

  - `AVALANCHE_FUJI_RPC_URL`: The RPC URL of Avalanche Fuji.

    ```text
    export AVALANCHE_FUJI_RPC_URL=YOUR_FUJI_RPC_URL
    ```

  - `ARBITRUM_SEPOLIA_RPC_URL`: The RPC URL of Arbitrum Sepolia.

    ```text
    export ARBITRUM_SEPOLIA_RPC_URL=YOUR_ARBITRUM_SEPOLIA_RPC_URL
    ```

- Run the tests:

  ```bash
  forge test
  ```

## Test on testnets

### Prerequisites

- To test on testnets, you need to set the private key environment variable for the sender account:

  - `PRIVATE_KEY`: Your EOA private key.

    ```text
    export PRIVATE_KEY=YOUR_PRIVATE_KEY
    ```

- Your EOA must have enough LINK and native gas tokens on Avalanche Fuji, Ethereum Sepolia, and Arbitrum Sepolia. You can use the [Chainlink Faucet](https://faucets.chain.link/) to get testnet tokens.

### Deploy Contracts

First, deploy the contracts to the specified networks. This script reads from the `addresses.json` file to get the necessary contract addresses.

```sh
forge script script/Deploy.s.sol --broadcast --legacy --with-gas-price 100000000000
```

### Burn and Mint from Fuji to Sepolia

This script tests the burn and mint functionality, transferring tokens from Fuji to Sepolia.

```sh
forge script script/BurnAndMint.s.sol --broadcast --legacy --with-gas-price 100000000000 -vvvvv
```

### Lock and Mint from Sepolia to Arbitrum

This script tests the lock and mint functionality, transferring tokens from Sepolia to Arbitrum.

```sh
forge script script/LockAndMint.s.sol --broadcast --legacy --with-gas-price 100000000000 -vvvvv
```

### Burn and Release from Arbitrum to Sepolia

This script tests the burn and release functionality, transferring tokens from Arbitrum to Sepolia.

```sh
forge script script/BurnAndRelease.s.sol --broadcast --legacy --with-gas-price 100000000000 -vvvvv
```
