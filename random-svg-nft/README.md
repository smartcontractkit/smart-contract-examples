# Random Emoji NFT collection on OpenSea

This demo project demonstrates how to create randomly generated on-chain Emoji NFTs using Chainlink VRF and how to host that collection on OpenSea on Rinkeby Testnet.

## What we are building

![demo](demo.png)

## Getting started

### Prerequisites

Be sure to have installed the following

Be sure to have installed the following

- [Git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)
- [Node.js](https://nodejs.org/en/download/)
- [Yarn](https://yarnpkg.com/getting-started/install)

### Build and Deploy

1. Install packages

```shell
yarn install
```

2. Compile contracts

```shell
yarn compile
```

3. Run tests

```shell
yarn test
```

or

```shell
REPORT_GAS=true yarn test
```

4. Run test coverage

```shell
yarn coverage
```

5. Deploy contract to Rinkeby

Copy the `.env.example` file to a file named `.env`, and out your Private Key, [Alchemy key](https://alchemy.com/?r=08af1111-db8b-4c0c-8312-fd9737680f98) and [Etherscan API Key](https://etherscan.io/apis) like this

```shell
ETHERSCAN_API_KEY=ABC123ABC123ABC123ABC123ABC123ABC1
RINKEBY_URL=https://eth-rinkeby.alchemyapi.io/v2/<YOUR ALCHEMY KEY>
PRIVATE_KEY=0xabc123abc123abc123abc123abc123abc123abc123abc123abc123abc123abc1
```

After that run the deployment script which will

- deploy your smart contract to the Rinkeby
- fund it with 1 Rinkeby LINK
- verify it on Etherscan

```shell
yarn deploy
```

Make sure to have at least 1 Rinkeby LINK in your wallet, you can obtain it from the [Chainlink Faucet](https://faucets.chain.link/arbitrum-rinkeby)

If the verification process fails because the new contract hasn't been indexed yet on Etherscan, run the next command from your terminal

```shell
npx hardhat verify --network rinkeby <CONTRACT_ADDRESS> 0xb3dCcb4Cf7a26f6cf6B120Cf5A73875B7BBc655B 0x01BE23585060835E02B77ef475b0Cc51aA1e0709 0x2ed0feb3e7fd2022120aa84fab1945545a9f2ffc9076fd6156fa96eaff4c1311 100000000000000000
```

### Minting

Call `mint()` function of your contract. Soon after the successful transaction, your NFT will be available on [OpenSea](https://testnets.opensea.io/)
