# CCIP Off-Chain TypeScript

This repository contains a list of scripts that can be used to interact with the CCIP Off-Chain Router contract. The scripts are written in TypeScript and can be executed using Node.js:

- [transfer-tokens.js](src/transfer-tokens.ts): Transfer tokens from one blockchain to another.
- [supported-tokens.js](src/supported-tokens.ts): Retrieve the list of supported tokens that can be transferred from one blockchain to another. **Note**: This script is deprecated. A more future proof way will be provided in the future.
- [get-status.js](src/get-status.ts): Retrieve the status of a CCIP transaction.

## Supported Chains

The supported blockchains can be found in the [config](../config/) directory:

- [mainnet.json](../config/mainnet.json)
- [testnet.json](../config/testnet.json)

## Prerequisites

- Install the dependencies:

  ```shell
  npm install
  ```

- We use [@chainlink/env-enc](https://www.npmjs.com/package/@chainlink/env-enc) package to encrypt environment variables at rest. Set the password to encrypt and decrypt the environment varilable file `.env.enc`:

  ```shell
  npx env-enc set-pw
  ```

- Set and save the variables that you need:

  ```shell
  npx env-enc set
  ```

You will have to set-up the following variables:

- `PRIVATE_KEY`: private key of the account that will be used to sign the transactions.
- RPC URLs for the blockchains that you will interact with. In the [config](../config/) directory, the supported chains (for testnet and mainnet) are listed in camel case. Therefore, the RPC URLs environment variable names are derived from the chain name by converting it to upper case, replacing any camel case humps with underscores, and appending `_RPC_URL`. For example, the RPC URL for:

  - `ethereumSepolia` is `ETHEREUM_SEPOLIA_RPC_URL`.
  - `avalancheFuji` is `AVALANCHE_FUJI_RPC_URL`.

## Examples

### Get the list of supported tokens

> **Deprecation Notice:**  
> This function is **deprecated** and will be deactivated in future versions. We recommend avoiding its use at this time. An alternative method will be provided in an upcoming release.

In this example, you will interact with the router contract to retrieve the list of supported tokens that can be transferred from your blockchain to a target blockchain.

```shell
npx ts-node src/supported-tokens.ts sourceBlockchain targetBlockchain
```

Example:

```shell
npx ts-node src/supported-tokens.ts ethereumSepolia avalancheFuji
```

### Transfer a token

In these examples, you will interact with the router contract to transfer a specified amount of tokens from your account to another account on a different blockchain. The source blockchain, target blockchain, target account address, token address, and amount are all provided as command-line arguments. Please note, a validation check is in place to ensure the token address provided is supported.

#### Pay fees in LINK token

```shell
npx ts-node src/transfer-tokens.ts sourceBlockchain targetBlockchain targetAccountAddress tokenAddress amount linkTokenAddress
```

Example (transfer CCIP-BnM and pay fees in LINK):

```shell
npx ts-node src/transfer-tokens.ts ethereumSepolia avalancheFuji 0x9d087fC03ae39b088326b67fA3C788236645b717 0xFd57b4ddBf88a4e07fF4e34C487b99af2Fe82a05 100 0x779877A7B0D9E8603169DdbD7836e478b4624789
```

#### Pay fees in native gas

```shell
npx ts-node src/transfer-tokens.ts sourceBlockchain targetBlockchain targetAccountAddress tokenAddress amount
```

Example (transfer CCIP-BnM and pay fees in sepolia ETH):

```shell
npx ts-node src/transfer-tokens.ts ethereumSepolia avalancheFuji 0x9d087fC03ae39b088326b67fA3C788236645b717 0xFd57b4ddBf88a4e07fF4e34C487b99af2Fe82a05 100
```

#### Pay fees in wrapped native gas

```shell
npx ts-node src/transfer-tokens.ts sourceBlockchain targetBlockchain targetAccountAddress tokenAddress amount wrappedNativeAddress
```

Example (send CCIP-BnM and pay fees in WETH):

```shell
npx ts-node src/transfer-tokens.ts ethereumSepolia avalancheFuji 0x9d087fC03ae39b088326b67fA3C788236645b717 0xFd57b4ddBf88a4e07fF4e34C487b99af2Fe82a05 100 0x097D90c9d3E0B50Ca60e1ae45F6A81010f9FB534
```
