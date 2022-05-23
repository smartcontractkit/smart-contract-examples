# Getting an asset price from EVM chain

## Table of Contents

- [About The Project](#about-the-project)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Usage](#usage)

## About The Project

The project shows how to retrieve asset price from any EVM chain. The price data feed contract addresses can be found [here](https://docs.chain.link/docs/reference-contracts/).

## Prerequisites

- [Go](https://go.dev/doc/install)
- Be familiar with [Chainlink Data Feeds](https://docs.chain.link/docs/get-the-latest-price/) and [Chainlink Data Feeds Contract Addresses](https://docs.chain.link/docs/reference-contracts/).

## Installation

1. Get a RPC API Key from a node provider such as [Alchemy](https://www.alchemy.com/), [Infura](https://infura.io/), [Moralis](https://moralis.io/), or [QuickNode](https://www.quicknode.com/). This example uses the KOVAN Ethereum test network.
1. Clone the repo
   ```sh
   git clone https://github.com/smartcontractkit/smart-contract-examples.git
   ```
1. Enter the direcory
   ```sh
   cd pricefeed-golang
   ```
1. Copy the example environment file `.env.example` to create `.env` file
   ```sh
   cp .env.example .env
   ```
1. In `.env` file , replace `REPLACE_BY_YOUR_RPC_URL` by the RPC_URL of the EVM chain you want to connect to.
1. In `.env` file , replace `REPLACE_BY_PRICE_FEED_PROXY_ADDR` by the price feed address. For instance, `0x9326BFA02ADD2366b30bacB125260Af641031331` if you want `ETH/USD` price feed in Kovan Testnet.

## Usage

After the installation step, run the example

```sh
go run main.go

2022/05/18 18:48:26 ETH / USD Price feed address is  0x9326BFA02ADD2366b30bacB125260Af641031331
2022/05/18 18:48:26 Round id is 36893488147419115714
2022/05/18 18:48:26 Answer is 195086228530
2022/05/18 18:48:26 Formatted answer is 1950.8622853
2022/05/18 18:48:26 Started at 2022-05-18 18:10:36 +0200 CEST
2022/05/18 18:48:26 Updated at 2022-05-18 18:10:36 +0200 CEST
2022/05/18 18:48:26 Answered in round 36893488147419115714
```

Note that you can also override the price feed address on the commmand line. For instance:

```sh
go run main.go 0x0c15Ab9A0DB086e062194c273CC79f41597Bbf13

2022/05/18 18:48:46 EUR / USD Price feed address is  0x0c15Ab9A0DB086e062194c273CC79f41597Bbf13
2022/05/18 18:48:46 Round id is 73786976294838233703
2022/05/18 18:48:46 Answer is 104976000
2022/05/18 18:48:46 Formatted answer is 1.04976
2022/05/18 18:48:46 Started at 2022-05-18 18:45:36 +0200 CEST
2022/05/18 18:48:46 Updated at 2022-05-18 18:45:36 +0200 CEST
2022/05/18 18:48:46 Answered in round 73786976294838233703
```
