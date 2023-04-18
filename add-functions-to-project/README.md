## Chainlink Functions Examples

Send Chainlink Functions requests to deployed contracts using JavaScript. Run this example on Polygon Mumbai.

This repository currently includes code from [functions-hardhat-starter-kit](https://github.com/smartcontractkit/functions-hardhat-starter-kit) to make running examples easier.

## Before you begin

1. Clone this repository: `git clone https://github.com/dwightjl/functions-examples.git`
1. Change directories: `cd functions-examples`
1. Run `npm install` to install dependencies.
1. Complete the [Chainlink Functions Getting Started](https://docs.chain.link/chainlink-functions/getting-started) guide. The guide completes the following setup steps:
    1. Compile and deploy a basic [FunctionsConsumer.sol](https://github.com/smartcontractkit/functions-hardhat-starter-kit/blob/main/contracts/FunctionsConsumer.sol) contract to handle your Chainlink Functions requests.
    1. Create and fund a subscription with LINK to pay for fulfilled requests.
    1. Create a `.env` file with your wallet private key and Polygon Mumbai RPC URL:
        - `PRIVATE_KEY="your_private_key"`
        - `MUMBAI_RPC_URL="your_rpc_url"`
1. Run `npm run compile` to have Hardhat compile the necessary ABI files in the `./artifacts/` directory.

## Run the example

1. Edit the request config and other parameters in `./scripts/request.js` to work with your source file.
1. Run `npm run request`