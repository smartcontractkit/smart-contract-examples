# CCIP Self-Serve Tokens

This repository contains a collection of Foundry scripts designed to simplify interactions with CCIP 1.5 contracts.

Find a list of available tutorials on the Chainlink documentation: [Cross-Chain Token (CCT) Tutorials](http://docs.chain.link/ccip/tutorials/cross-chain-tokens#overview).

## Table of Contents

- [Setup](#setup)
- [deployToken](#deploytoken)
- [DeployBurnMintTokenPool](#deployburnminttokenpool)
- [DeployLockReleaseTokenPool](#deploylockreleasetokenpool)
- [ClaimAdmin](#claimadmin)
- [AcceptAdminRole](#acceptadminrole)
- [SetPool](#setpool)
- [ApplyChainUpdates](#applychainupdates)
- [MintTokens](#minttokens)
- [TransferTokens](#transfertokens)
- [GetPoolConfig](#getpoolconfig)
- [UpdateRateLimiters](#updateratelimiters)

---

## Setup

### Config File Overview

The `config.json` file within the `script` directory defines the key parameters used by all scripts. You can customize the token name, symbol, supply, and cross-chain settings, among other fields.

Example `config.json` file:

```json
{
  "BnMToken": {
    "name": "BnM KH",
    "symbol": "BnMkh",
    "decimals": 18,
    "initialSupply": 0,
    "withGetCCIPAdmin": false,
    "ccipAdminAddress": "0x0000000000000000000000000000000000000000"
  },
  "tokenAmountToMint": 1000000000000000000000,
  "tokenAmountToTransfer": 10000,
  "feeType": "link",
  "remoteChains": {
    "43113": 421614,
    "421614": 43113
  }
}
```

The `config.json` file contains the following parameters:

| Field                   | Description                                                                                                                                                                                                                                                                                                                                              |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`                  | The name of the token you are going to deploy. Replace `"BnM KH"` with your desired token name.                                                                                                                                                                                                                                                          |
| `symbol`                | The symbol of the token. Replace `"BnMkh"` with your desired token symbol.                                                                                                                                                                                                                                                                               |
| `decimals`              | The number of decimals for the token (usually `18` for standard ERC tokens).                                                                                                                                                                                                                                                                             |
| `initialSupply`         | The initial token supply. Set this to `0` if you prefer to mint tokens later.                                                                                                                                                                                                                                                                            |
| `withGetCCIPAdmin`      | A boolean to determine whether the token contract has a `getCCIPAdmin()` function. If set to `true`, a CCIP admin is required. When `false`, token admin registration will use the token `owner()` function.                                                                                                                                             |
| `ccipAdminAddress`      | The address of the CCIP admin, only applicable if `withgetccipadmin` is set to `true`.                                                                                                                                                                                                                                                                   |
| ---                     | -----                                                                                                                                                                                                                                                                                                                                                    |
| `tokenAmountToMint`     | The amount of tokens to mint when running the minting script. This value should be specified in wei (1 token with 18 decimals = `1000000000000000000` wei).                                                                                                                                                                                              |
| ---                     | -----                                                                                                                                                                                                                                                                                                                                                    |
| `tokenAmountToTransfer` | The amount of tokens to transfer when running the token transfer script. Specify the number of tokens you want to transfer across chains.                                                                                                                                                                                                                |
| ---                     | -----                                                                                                                                                                                                                                                                                                                                                    |
| `feeType`               | Defines the fee type for transferring tokens across chains. Options are `"link"` (for paying fees in LINK tokens) or `"native"` (for paying fees in native tokens).                                                                                                                                                                                      |
| ---                     | -----                                                                                                                                                                                                                                                                                                                                                    |
| `remoteChains`          | Defines the relationship between source and remote (destination) chain IDs. The keys in this object are the current chain IDs, and the values represent the corresponding remote chain. Example: `"43113": 421614` means that if you're running a script on Avalanche Fuji (chain ID `43113`), the remote chain is Arbitrum Sepolia (chain ID `421614`). |

### Environment Variables

Example `.env` file to interact with the Fuji testnet and Arbitrum Sepolia testnet:

```bash
PRIVATE_KEY=<your_private_key>
RPC_URL_FUJI=<your_rpc_url_fuji>
RPC_URL_ARBITRUM_SEPOLIA=<your_rpc_url_arbitrum_sepolia>
ETHERSCAN_API_KEY=<your_etherscan_api_key>
ARBISCAN_API_KEY=<your_arbiscan_api_key>
```

Variables to configure:

- `PRIVATE_KEY`: The private key for your testnet wallet. If you use MetaMask, you can follow this [guide](https://support.metamask.io/managing-my-wallet/secret-recovery-phrase-and-private-keys/how-to-export-an-accounts-private-key/) to export your private key. **Note**: This key is required for signing transactions like token transfers.
- `RPC_URL_FUJI`: The RPC URL for the Fuji testnet. You can get this from the [Alchemy](https://www.alchemy.com/) or [Infura](https://infura.io/) website.
- `RPC_URL_ARBITRUM_SEPOLIA`: The RPC URL for the Arbitrum Sepolia testnet. You can get this from the [Alchemy](https://www.alchemy.com/) or [Infura](https://infura.io/) website.
- `ETHERSCAN_API_KEY`: An API key from Etherscan to verify your contracts. You can obtain one from [Etherscan](https://docs.etherscan.io/getting-started/viewing-api-usage-statistics).
- `ARBISCAN_API_KEY`: An API key from Arbiscan to verify your contracts on Arbitrum. See [this guide](https://docs.arbiscan.io/getting-started/viewing-api-usage-statistics) to get one from Arbiscan.

**Load the environment variables** into the terminal session where you will run the commands:

```bash
source .env
```

## deployToken

### Description

Deploys a new ERC-677 token contract with optional CCIP admin functionality. This script reads token parameters from the `config.json` file, deploys the token, and assigns mint and burn roles to the deployer.

### Usage

```bash
forge script script/DeployToken.s.sol --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast --verify
```

### Config Parameters

The script pulls its configuration from the `config.json` file located in the `script` folder. Below are the key fields it uses:

- **`BnMToken.name`**: The name of the token to be deployed.
- **`BnMToken.symbol`**: The symbol of the token.
- **`BnMToken.decimals`**: The number of decimals for the token.
- **`BnMToken.initialSupply`**: The initial supply of tokens. Set this to `0` if you prefer to mint tokens later.
- **`BnMToken.withGetCCIPAdmin`**: Boolean flag to determine whether the token contract has a `getCCIPAdmin()` function. If `true`, the token will include CCIP admin functionality.
- **`BnMToken.ccipAdminAddress`**: The address of the CCIP admin (only required if `withGetCCIPAdmin` is `true`). Defaults to the deployer's address if not provided.

### Examples

- Deploy a token without CCIP admin functionality:

  ```bash
  forge script script/DeployToken.s.sol --rpc-url $RPC_URL_FUJI --private-key $PRIVATE_KEY --broadcast --verify
  ```

- Deploy a token with CCIP admin functionality:

  Ensure that the `withGetCCIPAdmin` and `ccipAdminAddress` fields are properly set in the `config.json` file.

  ```bash
  forge script script/DeployToken.s.sol --rpc-url $RPC_URL_FUJI --private-key $PRIVATE_KEY --broadcast --verify
  ```

- Deploy a token with an initial supply:

  Update the `initialSupply` field in `config.json` to the desired value:

  ```json
  "BnMToken": {
  "name": "BnM KH",
  "symbol": "BnMkh",
  "decimals": 18,
  "initialSupply": 1000000000000000000000,
  "withGetCCIPAdmin": false,
  "ccipAdminAddress": "0x0000000000000000000000000000000000000000"
  }
  ```

  Then run the script:

  ```bash
  forge script script/DeployToken.s.sol --rpc-url $RPC_URL_FUJI --private-key $PRIVATE_KEY --broadcast --verify
  ```

### Notes

- **Config-based Deployment**: All deployment parameters are pulled from `config.json`, so ensure that the file is correctly set before running the script.
- **Chain Name**: The script automatically determines the current chain based on the `block.chainid` and saves the deployed token address in a file located in `script/output/`.
- **Broadcast & Verification**: The `--broadcast` flag will deploy the contract on-chain. The `--verify` flag will attempt to verify the contract on a blockchain explorer (e.g., Etherscan, Arbiscan). Ensure that you have the proper API keys in your environment variables.
- **Grant Mint & Burn Roles**: After deployment, mint and burn roles are automatically granted to the deployer's address.

## DeployBurnMintTokenPool

### Description

Deploys a new `BurnMintTokenPool` contract and associates it with an already deployed token. The script reads the token address from a JSON file and configures the pool for minting and burning operations. It also grants mint and burn roles to the token pool on the token contract.

### Usage

```bash
forge script script/DeployBurnMintTokenPool.s.sol --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast --verify
```

### Config Parameters

The script pulls the token address from a previously deployed token in a JSON file located in the `script/output/` folder. The network configuration (router and RMN proxy addresses) is also fetched from the `HelperConfig.s.sol` file.

- **Deployed Token Address**: The token address is read from the output file corresponding to the current chain (e.g., `deployedToken_avalancheFuji.json`).
- **Router and RMN Proxy**: The router and RMN proxy addresses are retrieved based on the network settings in `HelperConfig.s.sol`.

### Examples

- Deploy a token pool:

  ```bash
  forge script script/DeployBurnMintTokenPool.s.sol --rpc-url $RPC_URL_FUJI --private-key $PRIVATE_KEY --broadcast --verify
  ```

  This will:

  - Retrieve the deployed token address from the JSON file for the Fuji network.
  - Deploy the `BurnMintTokenPool` contract.
  - Grant mint and burn roles to the token pool.

### Notes

- **Config-based Deployment**: The script automatically retrieves the token address from the JSON file generated during token deployment. Ensure the token is deployed before running this script.
- **Grant Mint & Burn Roles**: After deploying the token pool, the script automatically grants mint and burn roles to the pool on the token contract.
- **Chain Name**: The script automatically determines the current chain based on the `block.chainid` and saves the deployed token pool address in a file located in `script/output/`.
- **Broadcast & Verification**: The `--broadcast` flag will deploy the contract on-chain. The `--verify` flag will attempt to verify the contract on a blockchain explorer (e.g., Etherscan, Arbiscan). Ensure that you have the proper API keys in your environment variables.

## DeployLockReleaseTokenPool

### Description

Deploys a new `LockReleaseTokenPool` contract and associates it with an already deployed token. The script reads the token address from a JSON file and configures the pool for lock and release operations. It also grants mint and burn roles to the token pool on the token contract.

### Usage

```bash
forge script script/DeployLockReleaseTokenPool.s.sol --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast --verify
```

### Config Parameters

The script pulls the token address from a previously deployed token in a JSON file located in the `script/output/` folder. The network configuration (router and RMN proxy addresses) is also fetched from the `HelperConfig.s.sol` file.

- **Deployed Token Address**: The token address is read from the output file corresponding to the current chain (e.g., `deployedToken_avalancheFuji.json`).
- **Router and RMN Proxy**: The router and RMN proxy addresses are retrieved based on the network settings in `HelperConfig.s.sol`.

### Examples

- Deploy a token pool:

  ```bash
  forge script script/DeployLockReleaseTokenPool.s.sol --rpc-url $RPC_URL_FUJI --private-key $PRIVATE_KEY --broadcast --verify
  ```

  This will:

  - Retrieve the deployed token address from the JSON file for the Fuji network.
  - Deploy the `LockReleaseTokenPool` contract.
  - Grant mint and burn roles to the token pool.

### Notes

- **Config-based Deployment**: The script automatically retrieves the token address from the JSON file generated during token deployment. Ensure the token is deployed before running this script.
- **Grant Mint & Burn Roles**: After deploying the token pool, the script automatically grants mint and burn roles to the pool on the token contract.
- **Chain Name**: The script automatically determines the current chain based on the `block.chainid` and saves the deployed token pool address in a file located in `script/output/`.
- **Broadcast & Verification**: The `--broadcast` flag will deploy the contract on-chain. The `--verify` flag will attempt to verify the contract on a blockchain explorer (e.g., Etherscan, Arbiscan). Ensure that you have the proper API keys in your environment variables.

## ClaimAdmin

### Description

Claims the admin role for a deployed token contract using either the `CCIP admin` or the standard `owner()` function, depending on the token's configuration. This script reads the token and admin information from the `config.json` file and interacts with the `RegistryModuleOwnerCustom` contract to claim the admin role.

### Usage

```bash
forge script script/ClaimAdmin.s.sol --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast --verify
```

### Config Parameters

The script pulls the token and admin details from the `config.json` file and the deployed token address from a JSON file located in the `script/output/` folder.

- **Deployed Token Address**: The token address is read from the output file corresponding to the current chain (e.g., `deployedToken_avalancheFuji.json`).
- **With CCIP Admin**: The script checks the `withGetCCIPAdmin` field in `config.json` to determine whether to claim admin via the CCIP admin (`getCCIPAdmin()` function) or the `owner()` function.
- **Admin Address**: The admin address is read from the `config.json` file (`ccipAdminAddress` field).

### Examples

- Claim admin role using the `owner()` function:

  ```bash
  forge script script/ClaimAdmin.s.sol --rpc-url $RPC_URL_FUJI --private-key $PRIVATE_KEY --broadcast --verify
  ```

  This will:

  - Retrieve the deployed token address from the JSON file for the Fuji network.
  - Claim admin using the `owner()` function.

- Claim admin role using the `getCCIPAdmin()` function:

  Ensure that the `withGetCCIPAdmin` and `ccipAdminAddress` fields are properly set in the `config.json` file.

  ```bash
  forge script script/ClaimAdmin.s.sol --rpc-url $RPC_URL_FUJI --private-key $PRIVATE_KEY --broadcast --verify
  ```

  This will:

  - Retrieve the deployed token address from the JSON file for the Fuji network.
  - Claim admin using the `getCCIPAdmin()` function.

### Notes

- **Config-based Deployment**: The script automatically retrieves the token address and admin settings from the JSON and config files. Ensure the token is deployed and the config is properly set before running this script.
- **CCIP Admin or Owner**: Depending on the value of `withGetCCIPAdmin` in the `config.json` file, the script will either claim admin using the `CCIP admin` or the `owner()` function.
- **Chain Name**: The script automatically determines the current chain based on the `block.chainid` and uses the appropriate JSON file for the deployed token address.
- **Broadcast & Verification**: The `--broadcast` flag will deploy the contract on-chain. The `--verify` flag will attempt to verify the contract on a blockchain explorer (e.g., Etherscan, Arbiscan). Ensure that you have the proper API keys in your environment variables.

## AcceptAdminRole

### Description

Accepts the admin role for a deployed token contract. This script reads the token address from a JSON file and uses the `TokenAdminRegistry` contract to accept the admin role if the sender is the pending administrator for the token.

### Usage

```bash
forge script script/AcceptAdminRole.s.sol --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast --verify
```

### Config Parameters

The script pulls the token address from a previously deployed token in a JSON file located in the `script/output/` folder. The network configuration (TokenAdminRegistry address) is fetched from the `HelperConfig.s.sol` file.

- **Deployed Token Address**: The token address is read from the output file corresponding to the current chain (e.g., `deployedToken_avalancheFuji.json`).
- **TokenAdminRegistry Address**: The `TokenAdminRegistry` address is retrieved based on the network settings in `HelperConfig.s.sol`.

### Examples

- Accept the admin role for a token:

  ```bash
  forge script script/AcceptAdminRole.s.sol --rpc-url $RPC_URL_FUJI --private-key $PRIVATE_KEY --broadcast --verify
  ```

  This will:

  - Retrieve the deployed token address from the JSON file for the Fuji network.
  - Check if the current signer is the pending administrator.
  - Accept the admin role for the token if the signer is the pending administrator.

### Notes

- **Config-based Execution**: The script automatically retrieves the token address from the JSON file generated during token deployment and checks the `TokenAdminRegistry` to verify the pending administrator.
- **Pending Administrator Check**: The script ensures that only the pending administrator (specified in the token config) can accept the admin role. If the signer is not the pending administrator, the script will fail.
- **Chain Name**: The script automatically determines the current chain based on the `block.chainid` and uses the appropriate JSON file for the deployed token address.
- **Broadcast & Verification**: The `--broadcast` flag will deploy the transaction on-chain. The `--verify` flag will attempt to verify the transaction on a blockchain explorer (e.g., Etherscan, Arbiscan). Ensure that you have the proper API keys in your environment variables.

## SetPool

### Description

Sets the pool for a deployed token in the `TokenAdminRegistry` contract. The script reads the token and pool addresses from JSON files and configures the token to be associated with the specified pool.

### Usage

```bash
forge script script/SetPool.s.sol --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast --verify
```

### Config Parameters

The script pulls the token and pool addresses from previously deployed token and pool JSON files located in the `script/output/` folder. The `TokenAdminRegistry` address is retrieved from the `HelperConfig.s.sol` file.

- **Deployed Token Address**: The token address is read from the output file corresponding to the current chain (e.g., `deployedToken_avalancheFuji.json`).
- **Deployed Pool Address**: The pool address is read from the output file corresponding to the current chain (e.g., `deployedTokenPool_avalancheFuji.json`).
- **TokenAdminRegistry Address**: The `TokenAdminRegistry` address is retrieved based on the network settings in `HelperConfig.s.sol`.

### Examples

- Set the pool for a token:

  ```bash
  forge script script/SetPool.s.sol --rpc-url $RPC_URL_FUJI --private-key $PRIVATE_KEY --broadcast --verify
  ```

  This will:

  - Retrieve the deployed token and pool addresses from the JSON files for the Fuji network.
  - Set the pool for the token in the `TokenAdminRegistry` contract.

### Notes

- **Config-based Execution**: The script automatically retrieves the token and pool addresses from the JSON files generated during their respective deployments. Ensure both the token and pool are deployed before running this script.
- **Admin Check**: The script checks the token's administrator using the `TokenAdminRegistry` to ensure the correct administrator is performing the operation.
- **Chain Name**: The script automatically determines the current chain based on the `block.chainid` and uses the appropriate JSON files for the deployed token and pool addresses.
- **Broadcast & Verification**: The `--broadcast` flag will deploy the transaction on-chain. The `--verify` flag will attempt to verify the transaction on a blockchain explorer (e.g., Etherscan, Arbiscan). Ensure that you have the proper API keys in your environment variables.

## ApplyChainUpdates

### Description

The `ApplyChainUpdates` script configures cross-chain parameters for a token pool, including remote pool addresses and rate limiting settings for token transfers between chains. The script reads the necessary information from `config.json` and JSON files containing the deployed pool and token addresses for the local and remote chains.

### Usage

```bash
forge script script/ApplyChainUpdates.s.sol --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast --verify
```

### Config Parameters

The script pulls the pool and token addresses from previously deployed pool and token JSON files located in the `script/output/` folder. The cross-chain configuration (e.g., chain selector) is fetched from the `HelperConfig.s.sol` file.

- **Deployed Local Pool Address**: The pool address is read from the output file corresponding to the current chain (e.g., `deployedTokenPool_avalancheFuji.json`).
- **Deployed Remote Pool Address**: The remote pool address is read from the JSON file corresponding to the remote chain (e.g., `deployedTokenPool_arbitrumSepolia.json`).
- **Deployed Remote Token Address**: The remote token address is read from the JSON file corresponding to the remote chain (e.g., `deployedToken_arbitrumSepolia.json`).
- **Remote Chain Selector**: The chain selector for the remote chain is fetched based on the network configuration in `HelperConfig.s.sol`.

### Examples

- Apply chain updates for cross-chain token transfers:

  ```bash
  forge script script/ApplyChainUpdates.s.sol --rpc-url $RPC_URL_FUJI --private-key $PRIVATE_KEY --broadcast --verify
  ```

  This will:

  - Retrieve the local pool address and remote pool/token addresses from their respective JSON files.
  - Configure the token pool for cross-chain transfers between the local and remote chains.
  - Set up rate limit configurations for token transfers (if enabled).

### Notes

- **Config-based Execution**: The script automatically retrieves the token and pool addresses from the JSON files generated during their respective deployments. Ensure both the local and remote pools/tokens are deployed before running this script.
- **Chain Name**: The script automatically determines the current and remote chain based on the `block.chainid` and the `remoteChains` field in `config.json`.
- **Rate Limiting**: The script allows for configuring rate limiting (inbound and outbound) for token transfers. By default, rate limiting is disabled, but it can be enabled by setting the appropriate fields in the script.
- **Broadcast & Verification**: The `--broadcast` flag will deploy the transaction on-chain. The `--verify` flag will attempt to verify the transaction on a blockchain explorer (e.g., Etherscan, Arbiscan). Ensure that you have the proper API keys in your environment variables.

## MintTokens

### Description

The `MintTokens` script mints a specified amount of tokens to the sender's address. The amount to mint is pulled from the `config.json` file, and the token address is retrieved from a JSON file corresponding to the current chain.

### Usage

```bash
forge script script/MintTokens.s.sol --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast
```

### Config Parameters

The script pulls the token address from a previously deployed token in a JSON file located in the `script/output/` folder. The mint amount is specified in the `config.json` file.

- **Deployed Token Address**: The token address is read from the output file corresponding to the current chain (e.g., `deployedToken_avalancheFuji.json`).
- **Mint Amount**: The amount of tokens to mint is read from the `config.json` file (`tokenAmountToMint` field).

### Examples

- Mint tokens:

  ```bash
  forge script script/MintTokens.s.sol --rpc-url $RPC_URL_FUJI --private-key $PRIVATE_KEY --broadcast
  ```

  This will:

  - Retrieve the deployed token address from the JSON file for the Fuji network.
  - Mint the specified amount of tokens (from `config.json`) to the sender's address.

### Notes

- **Config-based Execution**: The script retrieves the token address from the JSON file generated during token deployment and reads the amount to mint from `config.json`. Ensure the token is deployed and `tokenAmountToMint` is properly set before running this script.
- **Receiver Address**: The tokens are minted to the address of the sender (the address executing the script).
- **Chain Name**: The script automatically determines the current chain based on the `block.chainid` and uses the appropriate JSON file for the deployed token address.
- **Broadcast**: The `--broadcast` flag will deploy the transaction on-chain. Ensure that you have the proper RPC URL and private key in your environment variables.

## TransferTokens

### Description

The `TransferTokens` script facilitates cross-chain token transfers using Chainlink's CCIP (Cross-Chain Interoperability Protocol). The script reads the token address and amount to transfer from the `config.json` file, and interacts with the CCIP router to transfer tokens to a specified destination chain. It also handles fee payment, either in native tokens (e.g., ETH, AVAX) or LINK tokens.

### Usage

```bash
forge script script/TransferTokens.s.sol --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast --verify
```

### Config Parameters

The script pulls the token address, transfer amount, and fee type from the `config.json` file. It also reads the destination chain information from the same file.

- **Deployed Token Address**: The token address is read from the output file corresponding to the current chain (e.g., `deployedToken_avalancheFuji.json`).
- **Transfer Amount**: The amount of tokens to transfer is read from `config.json` (`tokenAmountToTransfer` field).
- **Fee Type**: The fee type is specified in the `config.json` file as either `"native"` (e.g., ETH, AVAX) or `"link"` (to pay fees in LINK tokens).
- **Destination Chain**: The destination chain ID is determined based on the current chain ID and the `remoteChains` field in `config.json`.

### Examples

- Transfer tokens across chains:

  ```bash
  forge script script/TransferTokens.s.sol --rpc-url $RPC_URL_FUJI --private-key $PRIVATE_KEY --broadcast --verify
  ```

  This will:

  - Retrieve the deployed token address from the JSON file for the Fuji network.
  - Transfer the specified amount of tokens from the `config.json` file to the sender's address on the destination chain.

### Notes

- **Config-based Execution**: The script automatically retrieves the token address and transfer amount from the JSON and config files. Ensure the token is deployed and the transfer amount is set before running this script.
- **Fee Payment**: The script supports two fee payment methods:
  - **Native tokens**: Set `feeType` to `"native"` to pay fees in ETH, AVAX, etc.
  - **LINK tokens**: Set `feeType` to `"link"` to pay fees in LINK tokens.
- **Chain Name**: The script automatically determines the current chain based on the `block.chainid` and uses the appropriate JSON file for the deployed token address and the `remoteChains` section in `config.json` for the destination chain.
- **Broadcast & Verification**: The `--broadcast` flag will deploy the transaction on-chain. The `--verify` flag will attempt to verify the transaction on a blockchain explorer (e.g., Etherscan, Arbiscan). Ensure that you have the proper API keys in your environment variables.

## GetPoolConfig

### Description

The `GetPoolConfig` script retrieves and displays the current configuration for a deployed token pool, including supported remote chains, remote pool and token addresses, and rate limiter settings for both inbound and outbound transfers.

### Usage

```bash
forge script ./script/GetPoolConfig.s.sol:GetPoolConfig --rpc-url $RPC_URL --sig "run(address)" -- <POOL_ADDRESS>
```

### Parameters

- **poolAddress**: The address of the token pool for which you want to retrieve the configuration.

### Examples

- Check the pool configuration for a token pool on Avalanche Fuji:

  ```bash
  forge script ./script/GetPoolConfig.s.sol:GetPoolConfig \
    --rpc-url $RPC_URL_FUJI \
    --sig "run(address)" -- \
    0x2734f31DDbB5d317893E9Aa65A387DD9C6147e9d
  ```

  This will:

  - Fetch the current configuration of the pool, including remote chains, rate limiter settings, and associated remote pool and token addresses.

- Check the pool configuration for a token pool on Arbitrum Sepolia:

  ```bash
  forge script ./script/GetPoolConfig.s.sol:GetPoolConfig \
    --rpc-url $RPC_URL_ARBITRUM_SEPOLIA \
    --sig "run(address)" -- \
    0x1dc7b609fb12CF512e93a273627e9f35C6f4dd81
  ```

### Output

The script will output the configuration for the specified pool. For each remote chain supported by the pool, the output includes:

- **Remote Pool Address**
- **Remote Token Address**
- **Outbound Rate Limiter** (enabled status, capacity, and rate)
- **Inbound Rate Limiter** (enabled status, capacity, and rate)

Example output:

```bash
== Logs ==
Fetching configuration for pool at address: 0x2734f31DDbB5d317893E9Aa65A387DD9C6147e9d

Configuration for Remote Chain: 3478487238524512106
    Allowed: true
    Remote Pool Address: 0x1dc7b609fb12CF512e93a273627e9f35C6f4dd81
    Remote Token Address: 0x410399aa04B05Acbda2bFc3462C3192BE21163aB
    Outbound Rate Limiter:
      Enabled: false
      Capacity: 0
      Rate: 0
    Inbound Rate Limiter:
      Enabled: false
      Capacity: 0
      Rate: 0
```

### Notes

- **Rate Limiters**: If rate limiting is enabled, the configuration includes the capacity and rate for both inbound and outbound transfers. If the rate limiters are disabled, their capacity and rate are set to `0`.
- **Supported Chains**: The script uses `getSupportedChains()` to list all chains the pool supports for cross-chain token transfers.
- **Broadcast & Environment Setup**: The command will retrieve information on-chain. Ensure your environment variables, such as `PRIVATE_KEY` and `RPC_URL`, are properly set before running the command.

## UpdateRateLimiters

### Description

The `UpdateRateLimiters` script allows you to modify the rate limiter settings for inbound and outbound transfers for a deployed token pool. You can enable or disable the rate limiters, set the capacity, and adjust the rate at which tokens are refilled in the limiter. These rate limiters help control the token flow between chains.

### Usage

```bash
forge script ./script/UpdateRateLimiters.s.sol:UpdateRateLimiters \
  --rpc-url <RPC_URL_NETWORK> \
  -vvv --broadcast \
  --sig "run(address,uint64,uint8,bool,uint128,uint128,bool,uint128,uint128)" -- \
  <POOL_ADDRESS> \
  <REMOTE_CHAIN_SELECTOR> \
  <RATE_LIMITER_TO_UPDATE> \
  <OUTBOUND_RATE_LIMIT_ENABLED> \
  <OUTBOUND_RATE_LIMIT_CAPACITY> \
  <OUTBOUND_RATE_LIMIT_RATE> \
  <INBOUND_RATE_LIMIT_ENABLED> \
  <INBOUND_RATE_LIMIT_CAPACITY> \
  <INBOUND_RATE_LIMIT_RATE>
```

### Parameters

- **poolAddress**: The address of the token pool being configured.
- **remoteChainSelector**: The chain selector for the remote blockchain to which the pool is linked.
- **rateLimiterToUpdate**: Specifies which rate limiters to update:
  - `0` for outbound
  - `1` for inbound
  - `2` for both.
- **outboundRateLimitEnabled**: Boolean to enable or disable outbound rate limits.
- **outboundRateLimitCapacity**: Maximum token capacity for the outbound rate limiter (in wei).
- **outboundRateLimitRate**: Refill rate for the outbound rate limiter (in wei).
- **inboundRateLimitEnabled**: Boolean to enable or disable inbound rate limits.
- **inboundRateLimitCapacity**: Maximum token capacity for the inbound rate limiter (in wei).
- **inboundRateLimitRate**: Refill rate for the inbound rate limiter (in wei).

### Examples

- Update both inbound and outbound rate limiters for a pool on Avalanche Fuji:

  ```bash
  forge script ./script/UpdateRateLimiters.s.sol:UpdateRateLimiters \
    --rpc-url $RPC_URL_FUJI \
    -vvv --broadcast \
    --sig "run(address,uint64,uint8,bool,uint128,uint128,bool,uint128,uint128)" -- \
    <POOL_ADDRESS> \
    3478487238524512106 \
    2 \
    true \
    10000000000000000000 \
    100000000000000000 \
    true \
    20000000000000000000 \
    100000000000000000
  ```

  This will:

  - Enable both outbound and inbound rate limiters.
  - Set the outbound rate limit to a capacity of 10 tokens and a rate of 0.1 token per second.
  - Set the inbound rate limit to a capacity of 20 tokens and a rate of 0.1 token per second.

- Update only the outbound rate limiter:

  ```bash
  forge script ./script/UpdateRateLimiters.s.sol:UpdateRateLimiters \
    --rpc-url $RPC_URL_FUJI \
    -vvv --broadcast \
    --sig "run(address,uint64,uint8,bool,uint128,uint128,bool,uint128,uint128)" -- \
    <POOL_ADDRESS> \
    3478487238524512106 \
    0 \
    true \
    10000000000000000000 \
    100000000000000000 \
    false \
    0 \
    0
  ```

### Notes

- **Rate Limiter Configuration**: This script can be used to update the inbound or outbound rate limiters, or both. If one of the rate limiters is not being updated, the corresponding fields should be set to `false`, and the capacity and rate will be ignored.
- **Capacity and Rate**: The capacity represents the maximum number of tokens allowed in the rate limiter (bucket), while the rate represents how many tokens per second are refilled into the bucket.
- **Chain Selector**: The `remoteChainSelector` identifies the remote chain for which the rate limiters are being updated. This value is retrieved from the network configuration in the `HelperConfig.s.sol` file.
- **Broadcast**: The `--broadcast` flag will deploy the transaction on-chain. Ensure that you have the correct RPC URL and private key in your environment variables.

### Verification

After applying the new rate limiter settings, you can use the `GetPoolConfig` script to verify that the changes have been applied successfully.
