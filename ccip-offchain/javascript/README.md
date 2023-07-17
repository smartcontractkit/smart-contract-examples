## Prerequisites

- Your sending Externally Owned Account (EOA) must be whitelisted.
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

- PRIVATE_KEY
- ETHEREUM_MAINNET_RPC_URL
- ETHEREUM_SEPOLIA_RPC_URL
- OPTIMISM_MAINNET_RPC_URL
- OPTIMISM_GOERLI_RPC_URL
- ARBITRUM_TESTNET_RPC_URL
- AVALANCHE_MAINNET_RPC_URL
- AVALANCHE_FUJI_RPC_URL
- POLYGON_MAINNET_RPC_URL
- POLYGON_MUMBAI_RPC_URL

## Examples

The following examples can be executed using Node.js. The chains supported in these examples can be specified via the command line. The chains supported are (case sensitive):

- ethereumMainnet
- ethereumSepolia
- optimismMainnet
- optimismGoerli
- arbitrumTestnet
- avalancheMainnet
- avalancheFuji
- polygonMainnet
- polygonMumbai

### Get the list of supported tokens

In this example, you will interact with the router contract to retrieve the list of supported tokens that can be transferred from your blockchain to a target blockchain.

```shell
node src/supported-tokens.js sourceBlockchain targetBlockchain
```

Example:

```shell
node src/supported-tokens.js ethereumSepolia avalancheFuji
```

### Transfer a token

In these examples, you will interact with the router contract to transfer a specified amount of tokens from your account to another account on a different blockchain. The source blockchain, target blockchain, target account address, token address, and amount are all provided as command-line arguments. Please note, a validation check is in place to ensure the token address provided is supported.

#### Pay fees in LINK token

```shell
node src/transfer-tokens.js sourceBlockchain targetBlockchain targetAccountAddress tokenAddress amount linkTokenAddress
```

Example (transfer CCIP-BnM and pay fees in LINK):

```shell
node src/transfer-tokens.js ethereumSepolia avalancheFuji 0x9d087fC03ae39b088326b67fA3C788236645b717 0xFd57b4ddBf88a4e07fF4e34C487b99af2Fe82a05 1000000000000000 0x779877A7B0D9E8603169DdbD7836e478b4624789
```

#### Pay fees in native gas

```shell
node src/transfer-tokens.js sourceBlockchain targetBlockchain targetAccountAddress tokenAddress amount
```

Example (transfer CCIP-BnM and pay fees in sepolia ETH):

```shell
node src/transfer-tokens.js ethereumSepolia avalancheFuji 0x9d087fC03ae39b088326b67fA3C788236645b717 0xFd57b4ddBf88a4e07fF4e34C487b99af2Fe82a05 1000000000000000
```

#### Pay fees in wrapped native gas

```shell
node src/transfer-tokens.js sourceBlockchain targetBlockchain targetAccountAddress tokenAddress amount wrappedNativeAddress
```

Example (send CCIP-BnM and pay fees in WETH):

```shell
node src/transfer-tokens.js ethereumSepolia avalancheFuji 0x9d087fC03ae39b088326b67fA3C788236645b717 0xFd57b4ddBf88a4e07fF4e34C487b99af2Fe82a05 1000000000000000 0x097D90c9d3E0B50Ca60e1ae45F6A81010f9FB534
```
