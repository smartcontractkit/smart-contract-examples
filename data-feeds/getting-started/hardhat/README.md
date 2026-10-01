# Getting Started with Data Feeds

You can use Chainlink Data Feeds to connect your smart contracts to asset pricing data like the [ETH / USD feed](https://data.chain.link/feeds/ethereum/mainnet/eth-usd). These data feeds use data aggregated from many independent Chainlink node operators. Each price feed has an onchain address and functions that enable contracts to read pricing data from that address.

## Before you begin

This guide uses the [Hardhat](https://hardhat.org/) development environment to deploy and interact with the contracts. To learn more about Hardhat, read the [Hardhat Documentation](https://hardhat.org/hardhat-runner/docs/getting-started).

### Requirements

- **Git**: Make sure you have Git installed. You can check your current version by running <CopyText text="git --version" code/> in your terminal and download the latest version from the official [Git website](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git) if necessary.
- **Nodejs** and **npm**: [Install the latest release of Node.js 20](https://nodejs.org/en/download/). Optionally, you can use the nvm package to switch between Node.js versions with `nvm use 20`. To ensure you are running the correct version in a terminal, type `node -v`.
  ```bash
   $ node -v
   v20.11.0
  ```
- **Testnet funds**: This guide requires testnet ETH on Ethereum Sepolia. If necessary, go to [faucets.chain.link](https://faucets.chain.link/sepolia) and get testnet ETH on Ethereum Sepolia.

## Examine the sample contract

This [example contract](https://github.com/smartcontractkit/smart-contract-examples/blob/main/data-feeds/getting-started/hardhat/contracts/DataConsumerV3.sol) obtains the latest price answer from the [BTC / USD feed](https://docs.chain.link/data-feeds/price-feeds/addresses) on the Sepolia testnet, but you can modify it to read any of the different [Types of Data Feeds](https://docs.chain.link/data-feeds#types-of-data-feeds).

The contract has the following components:

- The `import` line imports an interface named `AggregatorV3Interface`. Interfaces define functions without their implementation, which leaves inheriting contracts to define the actual implementation themselves. In this case, `AggregatorV3Interface` defines that all v3 Aggregators have the function `latestRoundData`. You can [see the complete code](https://github.com/smartcontractkit/chainlink/blob/master/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol) for the `AggregatorV3Interface` on GitHub.

- The `constructor() {}` initializes an interface object named `dataFeed` that uses `AggregatorV3Interface` and connects specifically to a proxy aggregator contract that is already deployed at `0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43`. The interface allows your contract to run functions on that deployed aggregator contract.

- The `getChainlinkDataFeedLatestAnswer()` function calls your `dataFeed` object and runs the `latestRoundData()` function. When you deploy the contract, it initializes the `dataFeed` object to point to the aggregator at `0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43`, which is the proxy address for the Sepolia BTC / USD data feed. Your contract connects to that address and executes the function. The aggregator connects with several oracle nodes and aggregates the pricing data from those nodes. The response from the aggregator includes several variables, but `getChainlinkDataFeedLatestAnswer()` returns only the `answer` variable.

## Tutorial

### Setup

1. Clone the repository that contains the Hardhat project setup for this guide. This repository contains the Solidity contract and the Hardhat configuration files you need to deploy and interact with the contract.

   ```bash
   git clone https://github.com/smartcontractkit/smart-contract-examples.git
   cd data-feeds/getting-started/hardhat
   ```

1. Install all the dependencies:

   ```bash
   npm install
   ```

1. Set an encryption password for your environment variables. This password needs to be set each time you create or restart a terminal shell session.

   ```bash
   npx env-enc set-pw
   ```

1. Set the required environment variables using the following command:

   ```bash
   npx env-enc set
   ```

   - `PRIVATE_KEY`: The private key for your testnet wallet that will deploy and interact with the contracts. If you use MetaMask, follow the instructions to [Export a Private Key](https://support.metamask.io/hc/en-us/articles/360015289632-How-to-export-an-account-s-private-key).
   - `ETHEREUM_SEPOLIA_RPC_URL`: The Remote Procedure Call (RPC) URL for the Ethereum Sepolia network. You can obtain one by creating an account on [Alchemy](https://www.alchemy.com/) or [Infura](https://www.infura.io/) and setting up an Ethereum Sepolia project.

### Deploy the `DataConsumerV3` contract

Execute the following command to deploy the `DataConsumerV3` contract on the Ethereum Sepolia testnet:

```bash
npx hardhat deployDataConsumerV3 --network ethereumSepolia
```

After a few seconds, the transaction completes. Expect output similar to the following in your terminal:

```bash
ℹ Compiling contracts...
Compiled 2 Solidity files successfully (evm target: paris).
ℹ Starting deployment of DataConsumerV3 with account: 0x45C90FBb5acC1a5c156a401B56Fea55e69E7669d
✔ DataConsumerV3 deployed at: 0xcbEAC520915727e2cf242feA77EEEEEb319A43bB on ethereumSepolia
```

Save the deployed contract address. You will use this address later.

### Get the latest answer from the aggregator contract

Execute the following command to get the latest answer from the aggregator contract:

```bash
npx hardhat getLatestAnswer --data-consumer-v3 <DataConsumerV3Address> --network ethereumSepolia
```

Replace `<DataConsumerV3Address>` with the address of the `DataConsumerV3` contract you saved earlier.

Expect output similar to the following in your terminal:

```bash
✔ Latest BTC / USD Data Feed answer: 6292416053902
```

In this example, the answer is the latest price. The returned answer is an integer, so it is missing its decimal point. You can find the correct number of decimal places for this answer on the [Price Feed addresses](https://docs.chain.link/data-feeds/price-feeds/addresses) page by clicking the **Show more details** checkbox. The answer on the BTC / USD feed uses 8 decimal places, so an answer of `6292416053902` indicates a BTC / USD price of `62924.16053902`. Each feed uses a different number of decimal places for answers.
