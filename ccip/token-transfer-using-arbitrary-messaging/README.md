# CCIP: Token transfers using arbitrary data

> **Note**
>
> _This repository represents an example of using a Chainlink product or service. It is provided to help you understand how to interact with Chainlink’s systems so that you can integrate them into your own. This template is provided "AS IS" without warranties of any kind, has not been audited, and may be missing key checks or error handling to make the usage of the product more clear. Take everything in this repository as an example and not something to be copy pasted into a production ready service._

This project demonstrates how to use Chainlink CCIP to send tokens to a receiver using arbitrary data. This example is interesting for projects that want to send tokens crosschain that are not supported by Chainlink CCIP.

## Prerequisites

### Development Environment

Before running this project, ensure you have the following tools installed:

1. **Foundry** - Required for compiling and deploying smart contracts

   ```bash
   curl -L https://foundry.paradigm.xyz | bash
   foundryup
   ```

   Installation guide: [https://getfoundry.sh/introduction/installation](https://getfoundry.sh/introduction/installation)

1. **Node.js and npm** - Required for managing dependencies (v20 or higher)

   ```bash
   # Recommended: Use Node Version Manager (nvm) for easy version switching
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash

   # Install and use Node.js v20
   nvm install 20
   nvm use 20

   # Alternative: Download directly from https://nodejs.org/

   # Install project dependencies
   npm install
   ```

   **Recommended**: Use [Node Version Manager (nvm)](https://github.com/nvm-sh/nvm) to easily switch between Node.js versions

1. **Git** - Required for cloning the repository and submodules
   ```bash
   git --version  # Verify Git is installed
   ```

### Environment Setup

- **Environment Variables**: Copy the example environment file and configure your settings:

  ```bash
  # Copy the environment template
  cp .env.example .env

  # Edit .env file with your variables
  ```

  **Required Environment Variables:**

  - `PRIVATE_KEY`: Your EOA private key for deploying and testing contracts
  - `ETHEREUM_SEPOLIA_RPC_URL`: RPC URL for Ethereum Sepolia (for local testing)
  - `AVALANCHE_FUJI_RPC_URL`: RPC URL for Avalanche Fuji (for local testing)
  - `ARBITRUM_SEPOLIA_RPC_URL`: RPC URL for Arbitrum Sepolia (for local testing)

- **Testnet Tokens**: Your EOA must have enough LINK and native gas tokens on:

  - Avalanche Fuji
  - Ethereum Sepolia
  - Arbitrum Sepolia

  Get testnet tokens from the [Chainlink Faucet](https://faucets.chain.link/)

## Overview

This project showcases three main scenarios:

### Burn and Mint

![burn-and-mint](./img/tokens-messaging-burn-and-mint.jpg)

In this scenario, tokens are burned on the source chain and minted on the destination chain. When the sender initiates a transfer, the Bridge contract on the source chain transfers the tokens to the token pool then calls the `lockOrBurn` function of the token pool to burn the tokens. On the destination chain, the bridge contract receives the CCIP message and calls the `releaseOrMint` function of the token pool to mint the tokens for the receiver.

### Lock and Mint

![lock-and-mint](./img/tokens-messaging-lock-and-mint.jpg)

In this scenario, tokens are locked on the source chain and minted on the destination chain. When the sender initiates a transfer, the Bridge contract on the source chain transfers the tokens to the token pool then calls the `lockOrBurn` function of the token pool to lock the tokens. On the destination chain, the bridge contract receives the CCIP message and calls the `releaseOrMint` function of the token pool to mint the tokens for the receiver.

### Burn and Release

In this scenario, tokens are burned on the source chain and released on the destination chain. When the sender initiates a transfer, the Bridge contract on the source chain transfers the tokens to the token pool then calls the `lockOrBurn` function of the token pool to burn the tokens. On the destination chain, the bridge contract receives the CCIP message and calls the `releaseOrMint` function of the token pool to release the tokens for the receiver. **Note**: This scenario requires active liquidity management to ensure that there are enough tokens on the destination chain to release tokens for the receivers.

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

### Technical Implementation

#### Token Interfaces

This project uses official Chainlink contracts and interfaces:

- **IBurnMintERC20**: Official Chainlink interface for burn/mint token functionality
- **BurnMintERC20**: Official Chainlink implementation with built-in access control
- **Access Control**: All mint/burn operations require proper role grants (`MINTER_ROLE`, `BURNER_ROLE`)

#### Role Management

The BurnMintERC20 tokens implement OpenZeppelin's AccessControl:

- Token pools must be granted appropriate roles during deployment (`MINTER_ROLE`, `BURNER_ROLE`)
- Test accounts require minting permissions for test execution
- Deployment scripts automatically handle role assignments

#### Important Implementation Notes

- **Chain Selectors**: Each test script uses the destination chain selector, not the source chain selector, when calling `transferTokensToDestinationChain`
- **Liquidity Management**: LockRelease scenarios require pre-funded token pools on destination chains
- **Role Grants**: BurnMint test scripts must grant `MINTER_ROLE` to sender addresses before minting test tokens

### Transfer tokens using arbitrary data

Here’s a step-by-step breakdown for transferring tokens using arbitrary data:

1. **Token Approval**:

   - The sender on the source chain approves the Bridge contract to spend tokens on their behalf, enabling the Bridge to handle tokens during the transfer process.

1. **Initiating Transfer**:

   - The sender initiates the transfer by calling the `transferTokensToDestinationChain` function on the Bridge contract on the source chain, specifying the amount of tokens, the destination chain selector, the receiver's address on the destination chain, and any applicable fee tokens.

1. **Configuration Fetch**:

   - The Bridge contract interacts with the Configuration contract to fetch necessary details such as the associated token pool, the destination token address on the destination chain, and extra arguments needed for cross-chain communication.

1. **Token Handling (Lock or Burn)**:

   - Depending on the type of token pool:
     - **LockRelease Token Pool**: Tokens are locked in the pool on the source chain, withheld from circulation but not destroyed.
     - **BurnMint Token Pool**: Tokens are burned on the source chain, reducing the total supply on that chain.

1. **CCIP Message Preparation and Sending**:

   - A CCIP message containing details about the receiver, amount, and destination token is sent to the Bridge on the destination chain via the CCIP Router. Fees are calculated and handled accordingly.

1. **Receiving on the destination chain**:
   - The Bridge on the destination chain processes the message, validates the data against its Configuration contract, and performs token operations:
     - **LockRelease Token Pool**: Tokens equivalent to the locked amount on the source chain are released and transferred to the receiver.
     - **BurnMint Token Pool**: New tokens are minted equivalent to the burned amount on the source chain and transferred to the receiver.

## Test locally

The tests are written in Solidity and can be found in the `test` directory. The tests cover the core functionalities of the Bridge, Configuration, and Token Pool contracts.
`BridgeWithSimulator.t.sol` uses the Chainlink CCIP simulator locally. While the `BridgeWithSimulatorFork.t.sol` uses the Chainlink CCIP simulator with forked Ethereum Sepolia (as source chain) and Avalanche Fuji (as destination chain).

**Note**: Ensure you have completed the [Prerequisites](#prerequisites) setup, including configuring your `.env` file with the required RPC URLs.

First, verify that your contracts compile successfully:

```bash
forge build
```

Once the build completes without errors, run the tests:

```bash
forge test
```

## Test on testnets

### Deploy Contracts

This project uses a reliable split deployment architecture that eliminates RPC reliability issues. Deployment consists of two phases:

#### Phase 1: Deploy Contracts (Independent)

Deploy contracts to each chain independently. These commands use separate RPC endpoints and can run in parallel:

```sh
# Deploy to Sepolia
forge script script/deploy/DeploySepolia.s.sol --broadcast

# Deploy to Arbitrum Sepolia  
forge script script/deploy/DeployArbitrumSepolia.s.sol --broadcast

# Deploy to Fuji
forge script script/deploy/DeployFuji.s.sol --broadcast
```

#### Phase 2: Configure Cross-Chain Relationships (Independent)

After ALL deployments complete successfully, configure cross-chain relationships:

```sh
# Configure Sepolia
forge script script/configure/ConfigureSepolia.s.sol --broadcast

# Configure Arbitrum Sepolia
forge script script/configure/ConfigureArbitrumSepolia.s.sol --broadcast

# Configure Fuji
forge script script/configure/ConfigureFuji.s.sol --broadcast
```

#### Benefits of Split Deployment

- **RPC Reliability**: Each script uses its own RPC endpoint, eliminating multi-RPC failures
- **Error Recovery**: Retry individual failed deployments without affecting successful ones
- **Parallel Execution**: Deploy to multiple chains simultaneously
- **Better Debugging**: Smaller, focused scripts are easier to troubleshoot

**Note**: Each deployment creates a network-specific address file (`script/addresses-Sepolia.json`, `script/addresses-ArbitrumSepolia.json`, `script/addresses-Fuji.json`) with the deployed contract addresses. This ensures deployments don't overwrite each other and provides better error isolation.

### Test Cross-Chain Token Transfers

After deployment, you can test different token transfer scenarios. Each test script reads the contract addresses from the network-specific address files created by the deployment (`addresses-Sepolia.json`, `addresses-ArbitrumSepolia.json`, `addresses-Fuji.json`).

### Burn and Mint from Avalanche Fuji to Ethereum Sepolia

This script tests the burn and mint functionality, transferring tokens from Fuji to Sepolia.

```sh
forge script script/BurnAndMint.s.sol --broadcast --with-gas-price 100000000000 -vvvvv
```

### Lock and Mint from Ethereum Sepolia to Arbitrum Sepolia

This script tests the lock and mint functionality, transferring tokens from Sepolia to Arbitrum.

```sh
forge script script/LockAndMint.s.sol --broadcast --with-gas-price 100000000000 -vvvvv
```

### Burn and Release from Arbitrum Sepolia to Ethereum Sepolia

This script tests the burn and release functionality, transferring tokens from Arbitrum to Sepolia.

```sh
forge script script/BurnAndRelease.s.sol --broadcast --with-gas-price 100000000000 -vvvvv
```

## Tracking Cross-Chain Transactions

After running any of the test scripts, you can track the progress of your cross-chain token transfer using the transaction logs and the [Chainlink CCIP Explorer](https://ccip.chain.link/).

### Reading the Important Log Information

When a test script completes successfully, look for these key events in the output:

#### 1. CrossChainMessageSent Event

```
emit CrossChainMessageSent(messageId: 0xb0ee445819469dbb75034d3176a817df8692e00588acc9df89e4dedf1467d230, sender: 0x9d087fC03ae39b088326b67fA3C788236645b717, receiver: 0x9d087fC03ae39b088326b67fA3C788236645b717)
```

**Key Information:**

- **messageId**: `0xb0ee445819469dbb75034d3176a817df8692e00588acc9df89e4dedf1467d230` - This is your unique transaction identifier
- **sender**: The address that initiated the transfer
- **receiver**: The address that will receive tokens on the destination chain

#### 2. TokensTransferred Event

**Burn and Mint Example (Fuji → Sepolia):**

```
emit TokensTransferred(tokenSource: 0x41c619bd8539B04c89B305E4523B491E9a9d8aDE, tokenSourcePool: 0x95a66F64E5cCdC714474886AA0e228f40D6987C9, destinationChainSelector: 16015286601757825753, tokenDestination: 0xB9bbeF3582D4726CF2611f931b3f3B0426C9526C, amount: 1000, fees: 24950998476540937)
```

**Lock and Mint Example (Sepolia → ArbitrumSepolia):**

```
emit TokensTransferred(tokenSource: 0x9a27B7268E29fc10B809C0921dFa86477886DC5B, tokenSourcePool: 0x227e98E683c178d9096A7D8b6a5CA5bCd08c3749, destinationChainSelector: 3478487238524512106, tokenDestination: 0xB74dC068486cEB67cbf9b62Ba10F0623FaFFD82D, amount: 1000, fees: 43680043224555953)
```

**Burn and Release Example (ArbitrumSepolia → Sepolia):**

```
emit TokensTransferred(tokenSource: 0xB74dC068486cEB67cbf9b62Ba10F0623FaFFD82D, tokenSourcePool: 0x0Ba199bD57d72dD9D50aC44B5ed0a797c2bdB630, destinationChainSelector: 16015286601757825753, tokenDestination: 0x9a27B7268E29fc10B809C0921dFa86477886DC5B, amount: 1000, fees: 24633191249502071)
```

**Key Information:**

- **amount**: Number of tokens transferred (1000 in all examples)
- **fees**: CCIP fees paid for the cross-chain transaction
- **destinationChainSelector**: Target chain (16015286601757825753 = Ethereum Sepolia, 3478487238524512106 = Arbitrum Sepolia)

#### 3. Token Pool Events (Scenario-Specific)

Different scenarios emit different events depending on the token pool type:

**Burn and Mint:**

```
emit Burned(sender: 0x0178b1F8Eb54D469F8Ce2e24c554b64BD2fC5393, amount: 1000)
```

**Lock and Mint/Release:**

```
emit Locked(sender: 0x6DDE0d425f0eBde9747460360Ca63E06B93d1025, amount: 1000)
```

**Pool Balance Information:**

- **Lock scenarios**: Check `poolBalance` in logs to confirm tokens are locked in the pool
- **Burn scenarios**: Tokens are destroyed, reducing total supply

### Using the CCIP Explorer

1. **Copy the messageId** from the `CrossChainMessageSent` event
1. **Open the CCIP Explorer**: [https://ccip.chain.link/](https://ccip.chain.link/)
1. **Track your transaction**: Navigate to `https://ccip.chain.link/#/side-drawer/msg/{messageId}`

**Examples**:

- **Burn and Mint** messageId `0xb0ee445819469dbb75034d3176a817df8692e00588acc9df89e4dedf1467d230`:  
  [https://ccip.chain.link/#/side-drawer/msg/0xb0ee445819469dbb75034d3176a817df8692e00588acc9df89e4dedf1467d230](https://ccip.chain.link/#/side-drawer/msg/0xb0ee445819469dbb75034d3176a817df8692e00588acc9df89e4dedf1467d230)

- **Lock and Mint** messageId `0x6078bb971566af2195fe33c1647ab1a28af20d172d8f7980f2d8fb68ab73cb1a`:  
  [https://ccip.chain.link/#/side-drawer/msg/0x6078bb971566af2195fe33c1647ab1a28af20d172d8f7980f2d8fb68ab73cb1a](https://ccip.chain.link/#/side-drawer/msg/0x6078bb971566af2195fe33c1647ab1a28af20d172d8f7980f2d8fb68ab73cb1a)

- **Burn and Release** messageId `0xd0f514dc055fa27f11d8527985f25547d6a97aba642cafaa2084fa608a827876`:  
  [https://ccip.chain.link/#/side-drawer/msg/0xd0f514dc055fa27f11d8527985f25547d6a97aba642cafaa2084fa608a827876](https://ccip.chain.link/#/side-drawer/msg/0xd0f514dc055fa27f11d8527985f25547d6a97aba642cafaa2084fa608a827876)

### What to Expect

#### Transaction States in CCIP Explorer:

The CCIP Explorer will show your transaction progressing through these stages:

1. **Waiting for finality**: Transaction awaits finality on the source chain

1. **Committed**: Merkle root of transaction batch is committed to the destination chain

1. **Blessed**: Merkle root is blessed by the Risk Management Network (RMN)

1. **Success**: Transaction completed successfully, tokens delivered to receiver
   - **Manual execution**: Indicates execution failed on destination chain - requires intervention

#### Upon Successful Completion:

- **Burn and Mint**: Tokens are burned on source chain (e.g., Fuji) and minted on destination chain (e.g., Sepolia)
- **Lock and Release**: Tokens are locked on source chain and released from destination pool
- **Lock and Mint**: Tokens are locked on source chain and minted on destination chain

**Verification**: Check the receiver's token balance on the destination chain to confirm the tokens were received.

For more details on CCIP execution latency and architecture, see:

- [CCIP Execution Latency](https://docs.chain.link/ccip/ccip-execution-latency)
- [CCIP Architecture Overview](https://docs.chain.link/ccip/concepts/architecture/overview)

### Expected End-to-End Transaction Times

Complete transaction times from submission to final completion:

- **Avalanche Fuji → Ethereum Sepolia**: < 10 minutes
- **Ethereum Sepolia → Arbitrum Sepolia**: ~25 minutes
- **Arbitrum Sepolia → Ethereum Sepolia**: ~35 minutes

_Note: These times include all CCIP stages: finality, commitment, blessing, and execution._

### Troubleshooting

If your transaction shows as "Failed" in the CCIP Explorer:

- Check that all token approvals were granted correctly
- Ensure destination chain has sufficient liquidity (for Lock/Release scenarios)
- Verify all contracts are properly configured with correct roles
