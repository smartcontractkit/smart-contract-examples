# External adapters examples

> 📘 Important Note
>
> This directory contains samples generated using [Chainlink external adapters](https://github.com/smartcontractkit/external-adapters-js/) to help you get going. Each sub-directory will have a guide attached and will be explained in detail in our [official docs](https://docs.chain.link/docs/developers/).
>
> Hence we always recommend starting from the official docs or the [Chainlink external adapters contributing guide](https://github.com/smartcontractkit/external-adapters-js/blob/develop/CONTRIBUTING.md). The code here as only used as examples that could be copied/pasted.

## Table of Contents

- [About The Project](#external-adapters-examples)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Simple source adapter](#simple-source-adapter)

## Prerequisites

- [yarn](https://yarnpkg.com/getting-started)

## Installation

1. Clone the repo

   ```sh
   git clone https://github.com/smartcontractkit/smart-contract-examples.git
   ```

1. Enter the direcory

   ```sh
   cd external-adapters
   ```

1. Make sure you have yarn v3

   ```sh
    yarn --version
    #should return 3.2.1
   ```

1. Install dependencies
   ```sh
   yarn
   ```

## Simple source adapter

Simple source repo that shows how to call [Coinpaprika getTickersById](https://api.coinpaprika.com/#operation/getTickersById).

1. Run the tests

   ```sh
   yarn jest coinpaprika-custom
   ```

1. Enter the repo

   ```sh
   cd coinpaprika-custom
   ```

1. Build the project

   ```sh
   yarn build
   ```

1. Start the server

   ```sh
   yarn start
   ```

1. In a new terminal , call the `ticker-coin` endpoint

   ```sh
   curl --data '{"id": "1", "data": {"endpoint":"ticker-coin", "coinid":"btc-bitcoin","quote":"EUR" }}' -H "Content-Type: application/json" -X POST http://localhost:8080/
   # Example response: {"jobRunID":"1","result":28491.213102538215,"providerStatusCode":200,"statusCode":200,"data":{"result":28491.213102538215}}
   ```
