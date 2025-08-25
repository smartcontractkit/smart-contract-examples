# Reserve-Backed Stablecoin Project

This repository contains a practical implementation of a reserve-backed stablecoin built with Foundry, designed to accompany a YouTube tutorial video.

## Project Overview

This stablecoin demonstrates key concepts of a reserve-backed cryptocurrency:

- **ERC20 Token**: Implements a standard ERC20 token with additional functionality
- **Reserve Backing**: The stablecoin is fully backed by reserves verified through an oracle
- **Minting Controls**: Only mint tokens when sufficient reserves exist
- **Access Control**: Role-based permissions for administrative actions
- **Safety Features**: Includes pause/unpause functionality and other safety measures

## Prerequisites

- [Foundry](https://getfoundry.sh/) installed on your machine
- Basic understanding of Solidity and ERC20 tokens
- Familiarity with smart contract development

## Project Structure

- `src/StableCoin.sol`: The main stablecoin implementation
- `src/SmartDataMock.sol`: Mock price feed for testing
- `test/StableCoin.t.sol`: Comprehensive test suite
- `script/StableCoinInteraction.s.sol`: Deployment and interaction script

## Getting Started

### Installation

```shell
# Clone the repository
git clone https://github.com/yourusername/stablecoin-project.git
cd stablecoin-project

# Install dependencies
forge install
```

### Build

```shell
forge build
```

### Test

```shell
forge test
```

### Run Scripts

```shell
# Run the interaction script on local network
forge script script/StableCoinInteraction.s.sol --rpc-url localhost
```

## Key Features Explained

1. **Reserve Backing**: The stablecoin checks an oracle (price feed) to ensure it's fully backed
2. **Controlled Minting**: Tokens can only be minted if there are enough reserves
3. **Transparency**: Public functions to check reserve status and circulating supply
4. **Security**: Admin controls, pausability, and burning capabilities

🎬 **[Watch the full tutorial on YouTube](https://youtube.com/chainlink)**

## Disclaimer

This code is for educational purposes only and has not been audited. Do not use in production without proper security reviews and audits.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
