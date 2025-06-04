# Chainlink Data Feeds on TRON - Complete Tutorial

![TRON](https://img.shields.io/badge/TRON-FF0013?style=for-the-badge&logo=tron&logoColor=white)
![Chainlink](https://img.shields.io/badge/Chainlink-375BD2?style=for-the-badge&logo=chainlink&logoColor=white)
![Solidity](https://img.shields.io/badge/Solidity-363636?style=for-the-badge&logo=solidity&logoColor=white)

A comprehensive example demonstrating how to integrate Chainlink Data Feeds with smart contracts on the TRON blockchain. This project includes both on-chain smart contracts and off-chain JavaScript code for reading real-time price data.

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Project Structure](#-project-structure)
- [Smart Contract](#-smart-contract)
- [Deployment](#-deployment)
- [Usage](#-usage)
- [Networks](#-networks)
- [Troubleshooting](#-troubleshooting)
- [Additional Resources](#-additional-resources)

## 🔍 Overview

This project demonstrates how to:

- ✅ Create smart contracts that consume Chainlink price feeds on TRON
- ✅ Deploy contracts using TronBox framework
- ✅ Interact with deployed contracts using TronWeb
- ✅ Handle real-time cryptocurrency price data (BTC/USD, ETH/USD)
- ✅ Implement proper error handling and data validation

**Live Example**: The contract reads live BTC/USD and ETH/USD prices from Chainlink's decentralized oracle network.

## ✨ Features

### Smart Contract (`DataFeedReader.sol`)

- **Multiple Functions**: Get complete round data, simple price, decimals, and feed descriptions
- **Educational Comments**: Comprehensive NatSpec documentation for learning
- **Multi-Feed Support**: Works with any Chainlink price feed on TRON

### Off-Chain Script (`reader.js`)

- **TronWeb Integration**: Uses [TronWeb SDK](https://www.npmjs.com/package/tronweb) to interact with smart contracts on TRON
- **Multiple Examples**: Shows both detailed and simplified usage patterns
- **Educational Value**: Perfect for learning blockchain interactions

## 📚 Prerequisites

Before you begin, ensure you have:

- **Node.js** (v14 or higher)
- **npm** package manager
- **TronBox** framework (`npm install -g tronbox`)
- **TRON wallet** with testnet TRX for deployment
- **Basic knowledge** of Solidity and JavaScript

## 🚀 Installation

### 1. Clone and Setup

```bash
# Navigate to the project directory
cd data-feeds/tron/getting-started

# Install dependencies
npm install
```

### 2. Environment Configuration

Create a `.env` file in the project root:

```bash
# Copy the sample environment file
cp sample-env .env
```

Edit `.env` and add your private keys:

```env
export PRIVATE_KEY_NILE=your_nile_testnet_private_key_here
```

> ⚠️ **Security Warning**: Never commit private keys to version control. The `.env` file should be gitignored.

### 3. Get Testnet TRX

For testing, you'll need testnet TRX:

- **Nile Testnet**: [https://nileex.io/join/getJoinPage](https://nileex.io/join/getJoinPage)

## 📁 Project Structure

```
├── contracts/
│   └── DataFeedReader.sol      # Main smart contract
├── migrations/
│   └── 2_deploy_contracts.js   # Deployment script
├── offchain/
│   └── reader.js              # Interactive script
├── tronbox-config.js          # TronBox configuration
├── tronbox-evm-config.js      # EVM configuration
└── README.md                  # This file
```

## 🔗 Smart Contract

### `DataFeedReader.sol`

Our main contract provides four key functions:

#### 1. `getChainlinkDataFeedLatestAnswer(address aggregator)`

Returns complete round data including price, timestamps, and round IDs.

#### 2. `getLatestPrice(address aggregator)`

Simplified function that returns only the current price.

#### 3. `getDecimals(address aggregator)`

Returns the number of decimal places for proper price formatting.

#### 4. `getDescription(address aggregator)`

Returns human-readable description (e.g., "BTC / USD").

### Supported Price Feeds

| Asset Pair | Nile Testnet Address                 | Network |
| ---------- | ------------------------------------ | ------- |
| BTC/USD    | `TD3hrfAtPcnkLSsRh4UTgjXBo6KyRfT1AR` | Nile    |
| ETH/USD    | `TYaLVmqGzz33ghKEMTdC64dUnde5LZc6Y3` | Nile    |

> 📚 Find more feeds at: [Chainlink Price Feeds Documentation](https://docs.chain.link/data-feeds/price-feeds/addresses?network=tron)

## 🚢 Deployment

### 1. Compile the Contract

```bash
tronbox compile
```

### 2. Deploy to Testnet

**Nile Testnet:**

```bash
source .env && tronbox migrate --network nile
```

### 3. Note the Contract Address

After successful deployment, you'll see output like:

```
Deploying 'DataFeedReader'
...
DataFeedReader: TTZEzaRUfrSm2ENfkhrPzk5mMEkZVwS3eD
```

Copy this address for use in the off-chain script.

## 🎯 Usage

### Update Contract Address

Edit `offchain/reader.js` and update the contract address:

```javascript
const CONTRACT_ADDRESS = "YOUR_DEPLOYED_CONTRACT_ADDRESS_HERE";
```

### Run the Price Reader

```bash
node offchain/reader.js
```

### Expected Output

```
🚀 Starting Chainlink Data Feed Reader
🌐 Network: TRON Nile Testnet
📋 Contract: TTZEzaRUfrSm2ENfkhrPzk5mMEkZVwS3eD
════════════════════════════════════════════════════════════

🔍 Reading BTC/USD Price Feed Data...
📍 Feed Address: TD3hrfAtPcnkLSsRh4UTgjXBo6KyRfT1AR
──────────────────────────────────────────────────
📊 BTC / USD
💰 Current Price: $105,191.97
🔢 Raw Price Value: 10519197220314
📏 Decimals: 8
🆔 Round ID: 18446744073709556841
🕐 Started At: 04/06/2025 13:55:40
🕒 Updated At: 04/06/2025 13:55:45
✅ Answered In Round: 18446744073709556841
⏰ Data Age: 96 minutes ago
```

## 🌐 Networks

### Nile Testnet (Recommended for Development)

- **RPC**: `https://nile.trongrid.io`
- **Explorer**: [NileScan](https://nile.tronscan.org/)
- **Faucet**: [Get Nile TRX](https://nileex.io/join/getJoinPage)

## 🤝 Contributing

This is an educational example project. Feel free to:

- Report issues or bugs
- Suggest improvements
- Submit pull requests
- Share your learning experience

## ⚠️ Disclaimer

This code is for educational purposes only. It has not been audited and should not be used in production without proper security review. Always test thoroughly on testnets before mainnet deployment.
