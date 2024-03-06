# Getting an asset price from EVM chain

## Table of Contents

- [About The Project](#about-the-project)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Usage](#usage)

## About The Project

The project shows how to retrieve asset price from any EVM chain. The price data feed contract addresses can be found [here](https://docs.chain.link/docs/reference-contracts/).

> 📘 Note on `Go` bindings [`aggregator_v3_interface.go`](aggregatorv3/aggregator_v3_interface.go)
>
> Follow these steps to learn how to generate this file:
>
> 1. Generate the [Contract ABI](https://docs.soliditylang.org/en/latest/abi-spec.html) from a solidity source file using [solc](https://docs.soliditylang.org/en/latest/using-the-compiler.html). In this case, we are going to download the [`AggregatorV3Interface`](https://github.com/smartcontractkit/chainlink/blob/develop/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol) and generate an ABI called `AggregatorV3Interface.abi`:
>
> ```shell
> cd aggregatorv3
> wget https://raw.githubusercontent.com/smartcontractkit/chainlink/develop/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol
> ```
>
> ```shell
> solc --abi AggregatorV3Interface.sol -o .
> ```
>
> 2. From `AggregatorV3Interface.abi`, generate the `Go` bindings `aggregator_v3_interface.go` required to programmatically interact with a smart contract > using generated, typesafe `Go`code. Ensure that [Geth](https://geth.ethereum.org/docs/install-and-build/installing-geth) is installed so you can use > > > [`abigen`](https://geth.ethereum.org/docs/dapp/native-bindings).
>
> ```shell
> abigen --abi=AggregatorV3Interface.abi --pkg=aggregator_v3_interface --out=aggregator_v3_interface.go
> ```

## Prerequisites

- [Go](https://go.dev/doc/install)
- Be familiar with [Chainlink Data Feeds](https://docs.chain.link/docs/get-the-latest-price/) and [Chainlink Data Feeds Contract Addresses](https://docs.chain.link/docs/reference-contracts/).

## Installation

1. Get a RPC API Key from a node provider such as [Alchemy](https://www.alchemy.com/), [Infura](https://infura.io/), [Moralis](https://moralis.io/), or [QuickNode](https://www.quicknode.com/). This example uses the Rinkeby testnet.
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
1. In `.env` file , replace `REPLACE_BY_PRICE_FEED_PROXY_ADDR` by the price feed address. For instance, `0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419` if you want the `ETH/USD` price feed on the Ethereum mainnet.

## Usage

After the installation step, run the example

```sh
go run main.go
```

Example:

```sh
go run main.go

2024/03/06 16:52:38 ETH / USD Price feed address is  0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419
2024/03/06 16:52:38 Round id is 110680464442257322577
2024/03/06 16:52:38 Answer is 379607523254
2024/03/06 16:52:38 Formatted answer is 3796.07523254
2024/03/06 16:52:38 Started at 2024-03-06 16:31:11 +0100 CET
2024/03/06 16:52:38 Updated at 2024-03-06 16:31:11 +0100 CET
2024/03/06 16:52:38 Answered in round 110680464442257322577
```

Note that you can also override the price feed address on the command line. For instance:

```sh
go run main.go 0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419
```

Example:

```sh
go run main.go 0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419

2024/03/06 16:53:07 ETH / USD Price feed address is  0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419
2024/03/06 16:53:07 Round id is 110680464442257322577
2024/03/06 16:53:07 Answer is 379607523254
2024/03/06 16:53:07 Formatted answer is 3796.07523254
2024/03/06 16:53:07 Started at 2024-03-06 16:31:11 +0100 CET
2024/03/06 16:53:07 Updated at 2024-03-06 16:31:11 +0100 CET
2024/03/06 16:53:07 Answered in round 110680464442257322577
```
