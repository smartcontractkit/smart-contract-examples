# Native Gas Sender Receiver Tasks

This folder contains Hardhat tasks for deploying and interacting with the Chainlink CCIP `EtherSenderReceiver` contract, which enables cross-chain native token transfers (ETH/WETH, AVAX/WAVAX, MATIC/WMATIC, etc.).

## Setup for Testing

### Prerequisites

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Set up encrypted environment variables:**

   ```bash
   # Set encryption password (required at start of each session)
   npx env-enc set-pw

   # Set environment variables (interactive prompts)
   npx env-enc set
   ```

### Required Environment Variables

For testing with **Ethereum Sepolia** and **Arbitrum Sepolia**, you'll need:

| Variable                   | Description                                  | Example                                  |
| -------------------------- | -------------------------------------------- | ---------------------------------------- |
| `PRIVATE_KEY`              | Your wallet private key (with testnet funds) | `0x1234...`                              |
| `ETHEREUM_SEPOLIA_RPC_URL` | Ethereum Sepolia RPC endpoint                | `https://rpc.sepolia.org`                |
| `ARBITRUM_SEPOLIA_RPC_URL` | Arbitrum Sepolia RPC endpoint                | `https://sepolia-rollup.arbitrum.io/rpc` |
| `ETHERSCAN_API_KEY`        | Etherscan API key for contract verification  | `ABC123...`                              |
| `ARBISCAN_API_KEY`         | Arbiscan API key for contract verification   | `DEF456...`                              |

### Setting Environment Variables

When you run `npx env-enc set`, you'll be prompted to enter each variable:

```bash
$ npx env-enc set
? Variable name: PRIVATE_KEY
? Variable value: [hidden] 0x1234567890abcdef...
✓ Variable PRIVATE_KEY saved

? Variable name: ETHEREUM_SEPOLIA_RPC_URL
? Variable value: https://rpc.sepolia.org
✓ Variable ETHEREUM_SEPOLIA_RPC_URL saved

? Variable name: ARBITRUM_SEPOLIA_RPC_URL
? Variable value: https://sepolia-rollup.arbitrum.io/rpc
✓ Variable ARBITRUM_SEPOLIA_RPC_URL saved

? Variable name: ETHERSCAN_API_KEY
? Variable value: [hidden] ABC123...
✓ Variable ETHERSCAN_API_KEY saved

? Variable name: ARBISCAN_API_KEY
? Variable value: [hidden] DEF456...
✓ Variable ARBISCAN_API_KEY saved

? Variable name: [Press Enter to finish]
```

### Verify Setup

Check your encrypted variables:

```bash
npx env-enc view
```

### Security Notes

- **Password Protection**: Your `.env.enc` file is encrypted and safe to commit to git
- **Session Management**: Set password with `npx env-enc set-pw` at the start of each session
- **Private Key Safety**: Never commit unencrypted private keys or share them

## Core Concepts

### What is EtherSenderReceiver?

The `EtherSenderReceiver` contract enables cross-chain transfers of native tokens (ETH, AVAX, MATIC, etc.) by:

1. **Wrapping** native tokens to wrapped tokens (ETH→WETH, AVAX→WAVAX, etc.) for CCIP transfer
2. **Sending** wrapped tokens cross-chain via CCIP
3. **Unwrapping** wrapped tokens back to native tokens on the destination (when using `ccipReceive`)

### Two Bridging Scenarios

#### Scenario 1: Same Ecosystem Bridging (`gasLimit > 0`)

- **Use Case**: Bridge native tokens within the same ecosystem (ETH ↔ ETH, AVAX ↔ AVAX)
- **Example**: Send ETH from Ethereum → receive ETH on Arbitrum
- **Receiver**: EtherSenderReceiver contract on destination chain
- **Process**: Wrap → Send → Unwrap via `ccipReceive`
- **Gas Allocation**: `gasLimit > 0` allocates gas for `ccipReceive` execution to unwrap tokens
- **Result**: Recipient gets native tokens on destination chain

#### Scenario 2: Cross-Ecosystem Token Bridging (`gasLimit = 0`)

- **Use Case**: Bridge wrapped tokens from one ecosystem to another ecosystem
- **Example**: Send WXYZ from Chain XYZ → receive WXYZ on Ethereum (different token ecosystems)
- **Receiver**: Any address (EOA, simple contract, etc.) on destination chain
- **Process**: Wrap native XYZ → WXYZ, send WXYZ directly to recipient
- **Gas Allocation**: `gasLimit = 0` because no `ccipReceive` call needed (just token transfer)
- **Requirements**: WXYZ token pools must be configured on destination chain
- **Result**: Recipient gets foreign wrapped tokens directly

### When to Use Each Scenario

| Scenario            | Use When                                 | Example    | Recipient Gets         | CCIP Fees                    |
| ------------------- | ---------------------------------------- | ---------- | ---------------------- | ---------------------------- |
| **Same Ecosystem**  | Bridging within same token system        | ETH → ETH  | Native tokens          | Higher (gas for ccipReceive) |
| **Cross-Ecosystem** | Bridging between different token systems | XYZ → WXYZ | Foreign wrapped tokens | Lower (no ccipReceive)       |

### Testing Simplification

For testing purposes, we use **WETH on both chains** to simulate the cross-ecosystem bridging concept, but in reality:

- **Chain XYZ** would have its own native token `XYZ` and wrapped token `WXYZ`
- **Ethereum** would receive `WXYZ` tokens (not `WETH`)
- **Token pools** would be configured to support `WXYZ` on Ethereum

## Use Case 1: Native Token Delivery

### Overview

When recipients need native tokens (ETH, AVAX, MATIC), deploy EtherSenderReceiver contracts on both chains. The destination contract automatically unwraps wrapped tokens back to native tokens via `ccipReceive`.

### Step 1: Deploy Contracts

Deploy EtherSenderReceiver contracts on both source and destination chains:

```bash
# Deploy on Ethereum Sepolia
npx hardhat deployTokenSenderReceiver --network ethereumSepolia --verifycontract

# Deploy on Arbitrum Sepolia
npx hardhat deployTokenSenderReceiver --network arbitrumSepolia --verifycontract
```

### Step 2: Send Native Tokens

Send tokens between EtherSenderReceiver contracts (default `gasLimit=200000`):

```bash
npx hardhat sendTokens \
  --contract 0x26153D479bdf325f7DB482e27982d8fD1C3Bb0b8 \
  --destinationchain arbitrumSepolia \
  --receiver 0x3EAC47F1EBacBd2Eb1f1B872092a01774098A3a2 \
  --amount 0.001 \
  --feetoken native \
  --network ethereumSepolia
```

**Example Output:**

```
✅ Tasks loaded from /tasks/index.ts
🚀 Sending ETH cross-chain from ethereumSepolia to arbitrumSepolia...
💰 Amount: 0.001 ETH (1000000000000000 wei)
🔍 Estimating fees...
💸 Estimated fee: 0.000214971110551261 ETH
🛡️  Fee with 10% buffer: 0.000236468221606387 ETH
📤 Sending cross-chain transaction...
⏳ Transaction sent: 0x07419b3c454c52e6917748680a983acb28d861b3fd936af8b66a32e4a0b8bf76
   Waiting for 3 confirmation(s)...
🎉 Cross-chain transfer completed successfully!
📋 Transaction Summary:
   Hash: 0x07419b3c454c52e6917748680a983acb28d861b3fd936af8b66a32e4a0b8bf76
   Block: 9510460
   Gas Used: 234950
   From: ethereumSepolia → To: arbitrumSepolia
   Amount: 0.001 ETH
   Destination Contract: 0x3EAC47F1EBacBd2Eb1f1B872092a01774098A3a2
   Final Recipient: 0x9d087fc03ae39b088326b67fa3c788236645b717 (sender)
   Fee: 0.000214971110551261 ETH
👉 Track cross-chain status: https://ccip.chain.link/tx/0x07419b3c454c52e6917748680a983acb28d861b3fd936af8b66a32e4a0b8bf76
```

**Estimate-Only Mode:**

```bash
npx hardhat sendTokens \
  --contract 0x26153D479bdf325f7DB482e27982d8fD1C3Bb0b8 \
  --destinationchain arbitrumSepolia \
  --receiver 0x3EAC47F1EBacBd2Eb1f1B872092a01774098A3a2 \
  --amount 0.001 \
  --feetoken native \
  --estimateonly \
  --network ethereumSepolia
```

**Example Output:**

```
🚀 Sending ETH cross-chain from ethereumSepolia to arbitrumSepolia...
💰 Amount: 0.001 ETH (1000000000000000 wei)
🔍 Estimating fees...
💸 Estimated fee: 0.000211334930545389 ETH
🛡️  Fee with 10% buffer: 0.000232468423599927 ETH
📊 Fee estimation completed (estimate-only mode)
   Wallet ETH Cost: 0.001211334930545389 ETH
     (0.001 ETH transfer + 0.000211334930545389 ETH fee)
```

**LINK Fee Payment:**

```bash
npx hardhat sendTokens \
  --contract 0x26153D479bdf325f7DB482e27982d8fD1C3Bb0b8 \
  --destinationchain arbitrumSepolia \
  --receiver 0x3EAC47F1EBacBd2Eb1f1B872092a01774098A3a2 \
  --amount 0.001 \
  --feetoken link \
  --network ethereumSepolia
```

**Example Output:**

```
🚀 Sending ETH cross-chain from ethereumSepolia to arbitrumSepolia...
💰 Amount: 0.001 ETH (1000000000000000 wei)
🔍 Estimating fees...
💸 Estimated fee: 0.045226197996850688 LINK
🛡️  Fee with 10% buffer: 0.049748817796535756 LINK
🔓 Approving LINK for fee payment...
⏳ Approval tx: 0x8ac829ddde8b02c4c6017678903e94562236584e64cc03b57460d115572e7c13
   Waiting for 3 confirmation(s)...
✅ LINK approval confirmed
📤 Sending cross-chain transaction...
⏳ Transaction sent: 0x3a831dadf27a81607882750d55f3f664ea7fc6665296be93233ec5703d78ce70
   Waiting for 3 confirmation(s)...
🎉 Cross-chain transfer completed successfully!
📋 Transaction Summary:
   Hash: 0x3a831dadf27a81607882750d55f3f664ea7fc6665296be93233ec5703d78ce70
   Block: 9511697
   Gas Used: 245580
   From: ethereumSepolia → To: arbitrumSepolia
   Amount: 0.001 ETH
   Destination Contract: 0x3EAC47F1EBacBd2Eb1f1B872092a01774098A3a2
   Final Recipient: 0x9d087fc03ae39b088326b67fa3c788236645b717 (sender)
   Fee: 0.045226197996850688 LINK
👉 Track cross-chain status: https://ccip.chain.link/tx/0x3a831dadf27a81607882750d55f3f664ea7fc6665296be93233ec5703d78ce70
```

**Wrapped Native Fee Payment (WETH):**

```bash
npx hardhat sendTokens \
  --contract 0x26153D479bdf325f7DB482e27982d8fD1C3Bb0b8 \
  --destinationchain arbitrumSepolia \
  --receiver 0x3EAC47F1EBacBd2Eb1f1B872092a01774098A3a2 \
  --amount 0.001 \
  --feetoken wrappedNative \
  --network ethereumSepolia
```

**Example Output:**

```
🚀 Sending ETH cross-chain from ethereumSepolia to arbitrumSepolia...
💰 Amount: 0.001 ETH (1000000000000000 wei)
🔍 Estimating fees...
💸 Estimated fee: 0.000211334930545389 WETH
🛡️  Fee with 10% buffer: 0.000232468423599927 WETH
🔓 Approving WETH for fee payment...
⏳ Approval tx: 0xe7c4c0e052d3140baf4aac5ed3136167883a281b1538047eff72c557175ec3fa
   Waiting for 3 confirmation(s)...
✅ WETH approval confirmed
📤 Sending cross-chain transaction...
⏳ Transaction sent: 0x634ac812632e8ccb95e15dc1d600a483d5afb003ead0d96b87b3adf3ed7e3cfd
   Waiting for 3 confirmation(s)...
🎉 Cross-chain transfer completed successfully!
📋 Transaction Summary:
   Hash: 0x634ac812632e8ccb95e15dc1d600a483d5afb003ead0d96b87b3adf3ed7e3cfd
   Block: 9511706
   Gas Used: 230353
   From: ethereumSepolia → To: arbitrumSepolia
   Amount: 0.001 ETH
   Destination Contract: 0x3EAC47F1EBacBd2Eb1f1B872092a01774098A3a2
   Final Recipient: 0x9d087fc03ae39b088326b67fa3c788236645b717 (sender)
   Fee: 0.000211334930545389 WETH
👉 Track cross-chain status: https://ccip.chain.link/tx/0x634ac812632e8ccb95e15dc1d600a483d5afb003ead0d96b87b3adf3ed7e3cfd
```

## Use Case 2: Cross-Ecosystem Token Bridging

### Overview

When bridging wrapped tokens from one blockchain ecosystem to another blockchain ecosystem (e.g., WXYZ from Chain XYZ → WXYZ on Ethereum), you send wrapped tokens directly to any address without needing EtherSenderReceiver contracts on the destination. Since we're only making token transfers without triggering `ccipReceive` on the destination, we don't need to account for gas limit for calling `ccipReceive`, hence `gasLimit=0` makes CCIP fees cheaper.

### Real-World Example

**Scenario**: You have a blockchain "XYZ Chain" with:

- Native token: `XYZ`
- Wrapped native: `WXYZ`

You want to bridge `WXYZ` tokens to Ethereum where `WXYZ` is also supported (via token pools).

**Process**:

1. **Source (XYZ Chain)**: Use EtherSenderReceiver to wrap `XYZ → WXYZ`
2. **CCIP Transfer**: Send `WXYZ` tokens cross-chain
3. **Destination (Ethereum)**: Recipient receives `WXYZ` tokens directly (not `WETH`)

### Testing Simplification

For testing, we use **Arbitrum Sepolia → Ethereum Sepolia** with WETH to simulate this concept, but the principle is the same for any cross-ecosystem bridging scenario.

### Requirements

**Token Pool Configuration**: The destination chain must have token pools configured to support the foreign wrapped token (WXYZ in our example). This is handled by CCIP's token pool infrastructure.

### Test Example: Arbitrum → Ethereum (WETH Simulation)

**Native Fee Payment:**

```bash
npx hardhat sendTokens \
  --contract 0x3EAC47F1EBacBd2Eb1f1B872092a01774098A3a2 \
  --destinationchain ethereumSepolia \
  --receiver 0x9d087fc03ae39b088326b67fa3c788236645b717 \
  --amount 0.001 \
  --feetoken native \
  --gaslimit 0 \
  --network arbitrumSepolia
```

**Actual Test Results:**

```
✅ Tasks loaded from /tasks/index.ts
🚀 Sending ETH cross-chain from arbitrumSepolia to ethereumSepolia...
⚡ Gas limit: 0 (receiver will get wrapped native tokens only - no ccipReceive call)
💰 Amount: 0.001 ETH (1000000000000000 wei)
🔍 Estimating fees...
💸 Estimated fee: 0.000122394174768242 ETH
🛡️  Fee with 10% buffer: 0.000134633592245066 ETH
📤 Sending cross-chain transaction...
⏳ Transaction sent: 0x023c301d7d4ffe3f209190a4dd4f5d4b897f089280137cd42f74ddf17ed282c9
   Waiting for 2 confirmation(s)...
🎉 Cross-chain transfer completed successfully!
📋 Transaction Summary:
   Hash: 0x023c301d7d4ffe3f209190a4dd4f5d4b897f089280137cd42f74ddf17ed282c9
   Block: 209499039
   Gas Used: 228315
   From: arbitrumSepolia → To: ethereumSepolia
   Amount: 0.001 ETH
   Destination Address: 0x9d087fc03ae39b088326b67fa3c788236645b717
   Final Recipient: 0x9d087fc03ae39b088326b67fa3c788236645b717 (sender)
   Fee: 0.000122394174768242 ETH
👉 Track cross-chain status: https://ccip.chain.link/tx/0x023c301d7d4ffe3f209190a4dd4f5d4b897f089280137cd42f74ddf17ed282c9
```

**LINK Fee Payment:**

```bash
npx hardhat sendTokens \
  --contract 0x3EAC47F1EBacBd2Eb1f1B872092a01774098A3a2 \
  --destinationchain ethereumSepolia \
  --receiver 0x9d087fc03ae39b088326b67fa3c788236645b717 \
  --amount 0.001 \
  --feetoken link \
  --gaslimit 0 \
  --network arbitrumSepolia
```

**Actual LINK Fee Results:**

```
✅ Tasks loaded from /tasks/index.ts
🚀 Sending ETH cross-chain from arbitrumSepolia to ethereumSepolia...
⚡ Gas limit: 0 (receiver will get wrapped native tokens only - no ccipReceive call)
💰 Amount: 0.001 ETH (1000000000000000 wei)
🔍 Estimating fees...
💸 Estimated fee: 0.024574550690792038 LINK
🛡️  Fee with 10% buffer: 0.027032005759871241 LINK
🔓 Approving LINK for fee payment...
⏳ Approval tx: 0x2d740424bd2c09a2b9fff198d24473572c1d36712848f166a376fd8005b0f843
   Waiting for 2 confirmation(s)...
✅ LINK approval confirmed
📤 Sending cross-chain transaction...
⏳ Transaction sent: 0x695d4be32dcbcbafabfdb57158112a02503af489d3c31a356ee76c55316d50e2
   Waiting for 2 confirmation(s)...
🎉 Cross-chain transfer completed successfully!
📋 Transaction Summary:
   Hash: 0x695d4be32dcbcbafabfdb57158112a02503af489d3c31a356ee76c55316d50e2
   Block: 209499981
   Gas Used: 238784
   From: arbitrumSepolia → To: ethereumSepolia
   Amount: 0.001 ETH
   Destination Address: 0x9d087fc03ae39b088326b67fa3c788236645b717
   Final Recipient: 0x9d087fc03ae39b088326b67fa3c788236645b717 (sender)
   Fee: 0.024574550690792038 LINK
👉 Track cross-chain status: https://ccip.chain.link/tx/0x695d4be32dcbcbafabfdb57158112a02503af489d3c31a356ee76c55316d50e2
```

**Cross-Ecosystem Bridging Explanation:**

In a real cross-ecosystem scenario (e.g., Chain XYZ → Ethereum):

1. **Source (Chain XYZ)**: Native `XYZ` is wrapped to `WXYZ` and sent via CCIP
2. **CCIP Transfer**: `WXYZ` tokens are transferred cross-chain
3. **Destination (Ethereum)**: Recipient receives `WXYZ` tokens directly (foreign wrapped tokens)
4. **No Unwrapping**: `gasLimit=0` because no `ccipReceive` needed - just token delivery
5. **Result**: Ethereum recipient now has `WXYZ` tokens from Chain XYZ ecosystem

**Why gasLimit=0 Works**: Since we're delivering foreign wrapped tokens directly (not unwrapping to native), no contract execution is needed on the destination, making CCIP fees cheaper.

### Fee Estimation

Use `estimateFee` to calculate costs before sending:

```bash
# Estimate fees for native token delivery (gasLimit=200000 default)
npx hardhat estimateFee \
  --contract 0x26153D479bdf325f7DB482e27982d8fD1C3Bb0b8 \
  --destinationchain arbitrumSepolia \
  --receiver 0x3EAC47F1EBacBd2Eb1f1B872092a01774098A3a2 \
  --amount 0.001 \
  --feetoken native \
  --network ethereumSepolia
```

## Fee Token Options

CCIP accepts fees in 3 different modes, allowing you to choose the fee token of your preference:

### 1. Native Token Fees (`--feetoken native`)

- **Payment**: Pay fees in the chain's native token (ETH, AVAX, MATIC)
- **Process**: Direct payment, no approval required
- **Use when**: You have sufficient native tokens and want simplicity

### 2. LINK Token Fees (`--feetoken link`)

- **Payment**: Pay fees in LINK tokens
- **Process**: Requires ERC20 approval before transfer
- **Use when**: You prefer to hold native tokens and have LINK available

### 3. Wrapped Native Fees (`--feetoken wrappedNative`)

- **Payment**: Pay fees in wrapped native tokens (WETH, WAVAX, WMATIC)
- **Process**: Requires ERC20 approval before transfer
- **Use when**: You have wrapped tokens from DeFi activities

All three options work with both native delivery (gasLimit > 0) and wrapped delivery (gasLimit = 0) modes.

## Supported Networks

The tasks work on all CCIP-supported testnet and mainnet networks:

- **Ethereum Sepolia** / Ethereum Mainnet
- **Arbitrum Sepolia** / Arbitrum One
- **Avalanche Fuji** / Avalanche Mainnet
- **Base Sepolia** / Base Mainnet
- **Polygon Amoy** / Polygon Mainnet

Each network automatically uses its native token pair (ETH/WETH, AVAX/WAVAX, MATIC/WMATIC, etc.).
