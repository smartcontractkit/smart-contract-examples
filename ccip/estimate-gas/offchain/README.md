# CCIP gas estimator offchain

This guide is designed to help you accurately estimate the gas consumption of the `ccipReceive` function for a deployed CCIP contract on Ethereum Sepolia. We will use two methods:

- Using [ethers.js `estimateGas`](https://docs.ethers.org/v6/api/providers/#Provider-estimateGas).
- Using [Tenderly `simulate` API](https://docs.tenderly.co/reference/api#tag/Simulations/operation/simulateTransaction).

This is an advanced guide and assumes you have a basic understanding of CCIP and you have already run the [CCIP gas estimator using Hardhat](../hardhat/README.md) guide.

## Prerequisites

1. You have already run the [CCIP gas estimator using Hardhat](../hardhat/README.md) guide. You will need the deployed addresses of the Sender and Receiver contracts.

1. Modify the `data.json` file and put the deployed addresses of the Sender and Receiver contracts.

1. Install all the dependencies:

```bash
npm install
```

1. Set the password to encrypt your environment variables

```bash
npx env-enc set-pw
```

1. Setup these environment variables (**Remark**: Read the [tenderly guide](https://docs.tenderly.co/account/projects/account-project-slug) for finding the `TENDERLY_ACCOUNT_SLUG` and `TENDERLY_PROJECT_SLUG`. You can get `TENDERLY_ACCESS_KEY` by generating a new access token):

- `ETHEREUM_SEPOLIA_RPC_URL`
- `TENDERLY_ACCOUNT_SLUG`
- `TENDERLY_PROJECT_SLUG`
- `TENDERLY_ACCESS_KEY`

using the following command:

```bash
npx env-enc set
```

1. Be familiar with abi encoding. In fact, you will encode an [Any2EVMMessage](https://docs.chain.link/ccip/api-reference/client#any2evmmessage) offchain and then simulate sending it to your Receiver contract.

1. Generate typechain typings for the Receiver contract:

```bash
npm run generate-types
```

The types will be generated in the `src/typechain-types` directory.

## Estimate gas using ethers.js provider

The logic is handled by the `estimateGasProvider.ts` script.

Run the script:

```bash
npm run estimate-gas-provider
```

Example output:

```text
$ npm run estimate-gas-provider

> offchain-simulator@1.0.0 estimate-gas-provider
> ts-node src/estimateGasProvider.ts

Final Gas Usage Report:
Number of iterations 0 - Gas used: 5377
Number of iterations 50 - Gas used: 14946
Number of iterations 99 - Gas used: 24324
```

As you can notice from the output, the gas usage increases with the number of iterations. This is a crucial insight for setting the gasLimit when sending a CCIP message from the Sender contract. The maximum gas usage is observed when the number of iterations is set to `99` (gas: `24324`).

## Estimate gas using tenderly API

The logic is handled by the `estimateGasTenderly.ts` script.

Run the script:

```bash
npm run estimate-gas-tenderly
```

Example output:

```text
$ npm run estimate-gas-tenderly

> offchain-simulator@1.0.0 estimate-gas-tenderly
> ts-node src/estimateGasTenderly.ts

Final Gas Usage Report:
Number of iterations 0 - Gas used: 5031
Number of iterations 50 - Gas used: 14581
Number of iterations 99 - Gas used: 23940
```

As you can notice from the output, the gas usage increases with the number of iterations. This is a crucial insight for setting the gasLimit when sending a CCIP message from the Sender contract. The maximum gas usage is observed when the number of iterations is set to `99` (gas: `23940`).

## Conclusion

| Number of iterations | ethers.js provider Gas used | tenderly API Gas used |
| -------------------- | --------------------------- | --------------------- |
| 0                    | 5377                        | 5031                  |
| 50                   | 14946                       | 14581                 |
| 99                   | 24324                       | 23940                 |

Read the [CCIP gas estimator using Hardhat](../hardhat/README.md) guide to compare the results. More specifically, check the actual testnet results. You will notice that using the tenderly API gives more precise results.
