# CCIP Self-Serve Tokens

This repository contains a collection of Foundry scripts designed to simplify interactions with CCIP 1.5 contracts.

Find a list of available tutorials on the Chainlink documentation: [Cross-Chain Token (CCT) Tutorials](http://docs.chain.link/ccip/tutorials/cross-chain-tokens#overview).

## Table of Contents

- [Setup](#setup)
- [AcceptAdminRole](#acceptadminrole)
- [AcceptTokenAdminRole](#accepttokenadminrole)
- [AddRemotePool](#addremotepool)
- [ApplyChainUpdates](#applychainupdates)
- [ClaimAdmin](#claimadmin)
- [DeployBurnMintTokenPool](#deployburnminttokenpool)
- [DeployLockReleaseTokenPool](#deploylockreleasetokenpool)
- [DeployToken](#deploytoken)
- [GetCurrentRateLimits](#getcurrentratelimits)
- [GetPoolConfig](#getpoolconfig)
- [MintTokens](#minttokens)
- [RemoveRemotePool](#removeremotepool)
- [SetPool](#setpool)
- [SetRateLimitAdmin](#setratelimitadmin)
- [TransferTokenAdminRole](#transfertokenadminrole)
- [TransferTokens](#transfertokens)
- [UpdateAllowList](#updateallowlist)
- [UpdateRateLimiters](#updateratelimiters)

---

## Setup

### Config File Overview

The `config.json` file within the `script` directory defines the key parameters used by all scripts. You can customize the token name, symbol, maximum supply, and cross-chain settings, among other fields.

Example `config.json` file:

```json
{
  "BnMToken": {
    "name": "BnM KH",
    "symbol": "BnMkh",
    "decimals": 18,
    "maxSupply": 0,
    "withGetCCIPAdmin": false,
    "ccipAdminAddress": "0x0000000000000000000000000000000000000000"
  },
  "tokenAmountToMint": 1000000000000000000000,
  "tokenAmountToTransfer": 10000,
  "feeType": "native",
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
| `maxSupply`             | The maximum supply of tokens (in the smallest unit, according to `decimals`). When maxSupply is 0, the supply is unlimited.                                                                                                                                                                                                                              |
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

## AcceptAdminRole

### Description

Accepts the admin role for a deployed token via the `TokenAdminRegistry` contract. This script reads the token address from a JSON file and uses the `TokenAdminRegistry` contract to accept the admin role if the signer is the pending administrator for the token.

### Usage

```bash
forge script script/AcceptAdminRole.s.sol --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast
```

### Config Parameters

The script pulls the token address from a previously deployed token in a JSON file located in the `script/output/` folder. The `TokenAdminRegistry` address is fetched from the `HelperConfig.s.sol` file.

- **Deployed Token Address**: The token address is read from the output file corresponding to the current chain (e.g., `deployedToken_avalancheFuji.json`).
- **TokenAdminRegistry Address**: The `TokenAdminRegistry` address is retrieved based on the network settings in `HelperConfig.s.sol`.

### Examples

- Accept the admin role for a token:

  ```bash
  forge script script/AcceptAdminRole.s.sol --rpc-url $RPC_URL_FUJI --private-key $PRIVATE_KEY --broadcast
  ```

  This will:

  - Retrieve the deployed token address from the JSON file for the Fuji network.
  - Check if the current signer is the pending administrator.
  - Accept the admin role for the token if the signer is the pending administrator.

### Notes

- **Config-based Execution**: The script automatically retrieves the token address from the JSON file generated during token deployment. Ensure the token is deployed before running this script.
- **Pending Administrator Check**: The script ensures that only the pending administrator (specified in the token config) can accept the admin role. If the signer is not the pending administrator, the script will fail.
- **Chain Name**: The script automatically determines the current chain based on the `block.chainid` and uses the appropriate JSON file for the deployed token address.

## AcceptTokenAdminRole

### Description

Accepts the admin role for a specified token via the `TokenAdminRegistry` contract. This script requires the token address as an input parameter and uses the `TokenAdminRegistry` to accept the admin role if the signer is the pending administrator for the token.

### Usage

```bash
forge script script/AcceptTokenAdminRole.s.sol --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast --sig "run(address)" -- <TOKEN_ADDRESS>
```

### Config Parameters

- **Token Address**: The address of the token for which you want to accept the admin role. This is passed as an argument to the script.
- **TokenAdminRegistry Address**: Retrieved from the network configuration in `HelperConfig.s.sol`.

### Examples

- Accept the admin role for a token on Avalanche Fuji:

  ```bash
  forge script script/AcceptTokenAdminRole.s.sol --rpc-url $RPC_URL_FUJI --private-key $PRIVATE_KEY --broadcast --sig "run(address)" -- 0xYourTokenAddress
  ```

  This will:

  - Retrieve the `TokenAdminRegistry` address from the network configuration.
  - Check if the current signer (from `PRIVATE_KEY`) is the pending administrator for the specified token.
  - Accept the admin role for the token if the signer is the pending administrator.

### Notes

- **Token Address as Input**: Unlike `AcceptAdminRole`, this script requires the token address as a command-line argument.
- **Signer Verification**: The script ensures that only the pending administrator (derived from `PRIVATE_KEY`) can accept the admin role. If the signer is not the pending administrator, the script will fail.
- **Environment Variables**: Ensure that `PRIVATE_KEY` is set in your environment variables.
- **Chain Configuration**: The script uses `HelperConfig.s.sol` to get the `TokenAdminRegistry` address for the current network.

## AddRemotePool

### Description

Adds a remote pool to a local token pool's configuration, enabling cross-chain interactions with the specified remote pool. This script updates the local `TokenPool` contract by adding the address of the remote pool associated with a remote chain.

### Usage

```bash
forge script script/AddRemotePool.s.sol --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast \
  --sig "run(address,uint256,address)" -- <POOL_ADDRESS> <REMOTE_CHAIN_ID> <REMOTE_POOL_ADDRESS>
```

### Parameters

- **poolAddress**: The address of the local `TokenPool` contract where the remote pool will be added.
- **remoteChainId**: The chain ID of the remote blockchain where the remote pool is deployed.
- **remotePoolAddress**: The address of the remote pool contract on the remote chain.

### Examples

- Add a remote pool to a local pool on Avalanche Fuji, specifying a remote pool on Arbitrum Sepolia:

  ```bash
  forge script script/AddRemotePool.s.sol --rpc-url $RPC_URL_FUJI --private-key $PRIVATE_KEY --broadcast \
    --sig "run(address,uint256,address)" -- \
    0xYourLocalPoolAddress \
    421613 \
    0xYourRemotePoolAddressOnArbitrumSepolia
  ```

  This will:

  - Retrieve the `remoteChainSelector` corresponding to the `REMOTE_CHAIN_ID` using the network configuration.
  - Call `addRemotePool` on the local pool contract to add the remote pool.

### Notes

- **Network Configuration**: The script uses `HelperConfig.s.sol` and `HelperUtils.s.sol` to map `remoteChainId` to a `remoteChainSelector`. Ensure that the remote chain ID is configured in `HelperConfig.s.sol`.
- **Permissions**: The account executing the script must have the necessary permissions (e.g., owner) to call `addRemotePool` on the `TokenPool` contract.
- **Encoded Address**: The remote pool address is encoded before being sent to the `addRemotePool` function. Ensure that the address provided is correct.

## ApplyChainUpdates

### Description

Configures cross-chain parameters for a token pool, including remote pool addresses and rate limiting settings for token transfers between chains. This script reads the necessary information from `config.json` and JSON files containing the deployed pool and token addresses for the local and remote chains.

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
- **Rate Limiter Configuration**: The script allows configuring rate limiting for both inbound and outbound transfers. By default, rate limiting is disabled in this script.

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
- **Rate Limiting**: The script allows for configuring rate limiting (inbound and outbound) for token transfers. By default, rate limiting is disabled, but it can be enabled by modifying the script's rate limiter configurations.

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

## DeployBurnMintTokenPool

### Description

Deploys a new `BurnMintTokenPool` contract and associates it with an already deployed token. This script reads the token address from a JSON file, deploys the token pool, and assigns mint and burn roles to the pool on the token contract.

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

## DeployLockReleaseTokenPool

### Description

Deploys a new `LockReleaseTokenPool` contract and associates it with an already deployed token. This script reads the token address from a JSON file, deploys the token pool, and saves the pool address to a JSON file for future reference.

### Usage

```bash
forge script script/DeployLockReleaseTokenPool.s.sol --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast --verify
```

### Config Parameters

The script pulls the token address from a previously deployed token in a JSON file located in the `script/output/` folder. The network configuration (router and RMN proxy addresses) is fetched from the `HelperConfig.s.sol` file.

- **Deployed Token Address**: The token address is read from the output file corresponding to the current chain (e.g., `deployedToken_avalancheFuji.json`).
- **Router and RMN Proxy**: The router and RMN proxy addresses are retrieved based on the network settings in `HelperConfig.s.sol`.

### Examples

- Deploy a `LockReleaseTokenPool`:

  ```bash
  forge script script/DeployLockReleaseTokenPool.s.sol --rpc-url $RPC_URL_FUJI --private-key $PRIVATE_KEY --broadcast --verify
  ```

  This will:

  - Retrieve the deployed token address from the JSON file for the Fuji network.
  - Deploy the `LockReleaseTokenPool` contract.
  - Save the deployed pool address to a JSON file for future reference.

### Notes

- **Config-based Deployment**: The script automatically retrieves the token address from the JSON file generated during token deployment. Ensure the token is deployed before running this script.
- **Chain Name**: The script automatically determines the current chain based on the `block.chainid` and saves the deployed token pool address in a file located in `script/output/`.
- **Accept Liquidity**: In the script, `acceptLiquidity` is set to `false`. If you want the pool to accept liquidity, you may need to modify this parameter in the script.

## DeployToken

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
- **`BnMToken.maxSupply`**: The maximum supply of tokens (in the smallest unit, according to `decimals`). When `maxSupply` is 0, the supply is unlimited.
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

- Deploy a token with a maximum supply:

  Update the `maxSupply` field in `config.json` to the desired value (in the smallest unit, according to `decimals`):

  ```json
  "BnMToken": {
  "name": "BnM KH",
  "symbol": "BnMkh",
  "decimals": 18,
  "maxSupply": 1000000000000000000000,
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
- **Grant Mint & Burn Roles**: After deployment, mint and burn roles are automatically granted to the deployer's address.

## GetCurrentRateLimits

### Description

Retrieves and displays the current inbound and outbound rate limiter states for a given `TokenPool` contract and a specified remote chain. This script helps you monitor the rate limiter configurations, including tokens, last updated time, enabled status, capacity, and rate.

### Usage

```bash
forge script script/GetCurrentRateLimits.s.sol:GetCurrentRateLimits --rpc-url $RPC_URL --sig "run(address,uint256)" -- <POOL_ADDRESS> <REMOTE_CHAIN_ID>
```

### Parameters

- **poolAddress**: The address of the `TokenPool` contract for which you want to retrieve the rate limiter states.
- **remoteChainId**: The chain ID of the remote chain whose rate limiter states you want to query.

### Examples

- Get current rate limits for a pool on Avalanche Fuji with a remote chain of Arbitrum Sepolia:

  ```bash
  forge script script/GetCurrentRateLimits.s.sol:GetCurrentRateLimits \
    --rpc-url $RPC_URL_FUJI \
    --sig "run(address,uint256)" -- \
    0xYourPoolAddressOnFuji \
    421613
  ```

  This will:

  - Retrieve the `remoteChainSelector` corresponding to `421613` (Arbitrum Sepolia) using the network configuration.
  - Fetch and display the current inbound and outbound rate limiter states for the specified pool and remote chain.

### Notes

- **Network Configuration**: The script uses `HelperConfig.s.sol` and `HelperUtils.s.sol` to map `remoteChainId` to a `remoteChainSelector`. Ensure that the remote chain ID is configured in `HelperConfig.s.sol`.
- **Output**: The script outputs the rate limiter states, including tokens, last updated timestamp, enabled status, capacity, and rate for both inbound and outbound rate limiters.

## GetPoolConfig

### Description

Retrieves and displays the current configuration for a deployed token pool, including supported remote chains, remote pool and token addresses, rate limiter settings for both inbound and outbound transfers, and other pool information such as the rate limit admin and allow list settings.

### Usage

```bash
forge script script/GetPoolConfig.s.sol:GetPoolConfig --rpc-url $RPC_URL --sig "run(address)" -- <POOL_ADDRESS>
```

### Parameters

- **poolAddress**: The address of the token pool for which you want to retrieve the configuration.

### Examples

- Check the pool configuration for a token pool on Avalanche Fuji:

  ```bash
  forge script script/GetPoolConfig.s.sol:GetPoolConfig \
    --rpc-url $RPC_URL_FUJI \
    --sig "run(address)" -- \
    0xYourPoolAddressOnFuji
  ```

  This will:

  - Fetch the current configuration of the pool, including remote chains, rate limiter settings, and associated remote pool and token addresses.
  - Display additional pool information such as rate limit admin, router address, token address, and allow list settings.

- Check the pool configuration for a token pool on Arbitrum Sepolia:

  ```bash
  forge script script/GetPoolConfig.s.sol:GetPoolConfig \
    --rpc-url $RPC_URL_ARBITRUM_SEPOLIA \
    --sig "run(address)" -- \
    0xYourPoolAddressOnArbitrumSepolia
  ```

### Notes

- **Detailed Output**: The script outputs detailed information about the pool configuration, including:

  - **Rate Limit Admin**: The address that can manage rate limiter settings.
  - **Router Address**: The CCIP router address associated with the pool.
  - **Token Address**: The address of the token associated with the pool.
  - **Allow List**: Whether the allow list is enabled and the list of allowed addresses if it is.
  - **Remote Chains Configuration**: For each supported remote chain, the script displays:

    - **Remote Pool Addresses**: All remote pool addresses associated with the remote chain.
    - **Remote Token Address**: The address of the remote token.
    - **Rate Limiter Settings**: Enabled status, capacity, and rate for both inbound and outbound rate limiters.

- **Supported Chains**: The script uses `getSupportedChains()` to list all chains the pool supports for cross-chain token transfers.

- **Environment Setup**: Ensure your environment variables, such as `RPC_URL`, are properly set before running the command.

- **No Transactions**: This script only reads data from the blockchain and does not broadcast any transactions. You do not need to provide a private key.

- **Adjustments**: If you want to check the configuration on different networks or for different pools, update the `--rpc-url` and `<POOL_ADDRESS>` accordingly.

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

## RemoveRemotePool

### Description

Removes a remote pool from a local `TokenPool` contract's configuration, effectively disabling cross-chain interactions with the specified remote pool.

**Warning**: Removing a remote pool will reject all inflight transactions from that pool.

### Usage

```bash
forge script script/RemoveRemotePool.s.sol --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast \
  --sig "run(address,uint256,address)" -- <POOL_ADDRESS> <REMOTE_CHAIN_ID> <REMOTE_POOL_ADDRESS>
```

### Parameters

- **poolAddress**: The address of the local `TokenPool` contract from which the remote pool will be removed.
- **remoteChainId**: The chain ID of the remote blockchain where the remote pool is deployed.
- **remotePoolAddress**: The address of the remote pool contract on the remote chain to be removed.

### Examples

- Remove a remote pool from a local pool on Avalanche Fuji, specifying a remote pool on Arbitrum Sepolia:

  ```bash
  forge script script/RemoveRemotePool.s.sol --rpc-url $RPC_URL_FUJI --private-key $PRIVATE_KEY --broadcast \
    --sig "run(address,uint256,address)" -- \
    0xYourLocalPoolAddress \
    421613 \
    0xYourRemotePoolAddressOnArbitrumSepolia
  ```

  This will:

  - Retrieve the `remoteChainSelector` corresponding to the `REMOTE_CHAIN_ID` using the network configuration.
  - Check that the signer (from `PRIVATE_KEY`) is the owner of the local `TokenPool` contract.
  - Call `removeRemotePool` on the local pool contract to remove the specified remote pool.

### Notes

- **Network Configuration**: The script uses `HelperConfig.s.sol` and `HelperUtils.s.sol` to map `remoteChainId` to a `remoteChainSelector`. Ensure that the remote chain ID is configured in `HelperConfig.s.sol`.
- **Permissions**: The account executing the script must be the owner of the `TokenPool` contract to call `removeRemotePool`.
- **Impact of Removal**: Removing a remote pool will reject all inflight transactions from that pool. Use this operation with caution.
- **Encoded Address**: The remote pool address is encoded before being sent to the `removeRemotePool` function. Ensure that the address provided is correct.

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

## SetRateLimitAdmin

### Description

Sets the rate limit administrator for a specified `TokenPool` contract. This script allows the owner of the `TokenPool` to assign a new address that will have the authority to manage rate limiter configurations.

### Usage

```bash
forge script script/SetRateLimitAdmin.s.sol --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast \
  --sig "run(address,address)" -- <POOL_ADDRESS> <ADMIN_ADDRESS>
```

### Parameters

- **poolAddress**: The address of the `TokenPool` contract for which you want to set the rate limit admin.
- **adminAddress**: The address that will be assigned as the new rate limit administrator.

### Examples

- Set the rate limit admin for a pool on Avalanche Fuji:

  ```bash
  forge script script/SetRateLimitAdmin.s.sol --rpc-url $RPC_URL_FUJI --private-key $PRIVATE_KEY --broadcast \
    --sig "run(address,address)" -- \
    0xYourPoolAddress \
    0xNewAdminAddress
  ```

  This will:

  - Validate the provided pool and admin addresses.
  - Check that the signer (from `PRIVATE_KEY`) is the owner of the `TokenPool` contract.
  - Call `setRateLimitAdmin` on the `TokenPool` contract to assign the new admin address.

### Notes

- **Permissions**: Only the owner of the `TokenPool` contract can set the rate limit admin. The script ensures that the signer (from `PRIVATE_KEY`) is the owner.
- **Valid Addresses**: Both `poolAddress` and `adminAddress` must be valid, non-zero addresses. The script will fail if either is invalid.
- **Impact**: Setting a new rate limit admin transfers the authority to manage rate limiter configurations to the new admin address. Use this operation carefully.

## TransferTokenAdminRole

### Description

Initiates the transfer of the admin role for a specified token to a new administrator via the `TokenAdminRegistry` contract. This script allows the current admin to propose a new admin for the token. The new admin must call `acceptAdminRole` to complete the transfer.

### Usage

```bash
forge script script/TransferTokenAdminRole.s.sol --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast \
  --sig "run(address,address)" -- <TOKEN_ADDRESS> <NEW_ADMIN_ADDRESS>
```

### Parameters

- **tokenAddress**: The address of the token for which you want to transfer the admin role.
- **newAdmin**: The address of the new administrator who will assume the admin role after accepting it.

### Examples

- Transfer the admin role of a token on Avalanche Fuji to a new admin:

  ```bash
  forge script script/TransferTokenAdminRole.s.sol --rpc-url $RPC_URL_FUJI --private-key $PRIVATE_KEY --broadcast \
    --sig "run(address,address)" -- \
    0xYourTokenAddress \
    0xNewAdminAddress
  ```

  This will:

  - Retrieve the `TokenAdminRegistry` address from the network configuration.
  - Validate the provided token and new admin addresses.
  - Execute the `transferAdminRole` function on the `TokenAdminRegistry` contract to initiate the admin role transfer.
  - Note that the new admin must call `acceptAdminRole` to complete the transfer.

### Notes

- **Permissions**: Only the current admin of the token can initiate the transfer of the admin role. The script uses the signer (from `PRIVATE_KEY`) to execute the transaction.
- **Two-Step Process**: Transferring the admin role is a two-step process:
  1. The current admin calls `transferAdminRole` to propose the new admin.
  2. The new admin calls `acceptAdminRole` to accept the admin role.
- **Valid Addresses**: Both `tokenAddress` and `newAdmin` must be valid, non-zero addresses. The script will fail if either is invalid.
- **Network Configuration**: The script retrieves the `TokenAdminRegistry` address from `HelperConfig.s.sol`. Ensure your network configurations are correctly set up.

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

## UpdateAllowList

### Description

Updates the allow list for a specified `TokenPool` contract by adding and/or removing addresses. This script allows the pool owner to manage the list of addresses that are allowed to interact with the pool, provided that the allow list functionality is enabled for the pool.

### Usage

```bash
forge script script/UpdateAllowList.s.sol --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast \
  --sig "run(address,address[],address[])" -- <POOL_ADDRESS> [<ADDRESSES_TO_ADD>] [<ADDRESSES_TO_REMOVE>]
```

### Parameters

- **poolAddress**: The address of the `TokenPool` contract whose allow list you want to update.
- **addressesToAdd**: An array of addresses to add to the allow list.
- **addressesToRemove**: An array of addresses to remove from the allow list.

### Examples

- Update the allow list for a pool on Avalanche Fuji, adding two addresses and removing one:

  ```bash
  forge script script/UpdateAllowList.s.sol --rpc-url $RPC_URL_FUJI --private-key $PRIVATE_KEY --broadcast \
    --sig "run(address,address[],address[])" -- \
    0xYourPoolAddress \
    '[0xAddressToAdd1,0xAddressToAdd2]' \
    '[0xAddressToRemove]'
  ```

  This will:

  - Check if the allow list is enabled for the specified pool.
  - Validate the addresses to add and remove.
  - Update the allow list by adding the specified addresses and removing the specified addresses.

### Notes

- **Allow List Must Be Enabled**: The pool must have been deployed with allow list functionality enabled. If the allow list is not enabled, the script will inform you, and you will need to deploy a new pool with allow list functionality.
- **Valid Addresses**: All addresses in both the `addressesToAdd` and `addressesToRemove` lists must be valid, non-zero addresses. The script will fail if any invalid addresses are provided.
- **Permissions**: Only the owner of the `TokenPool` contract can update the allow list. The script uses the signer (from `PRIVATE_KEY`) to execute the transaction.
- **Address Input Format**: When passing arrays of addresses in the command line, ensure they are formatted correctly. Depending on your shell, you may need to enclose the arrays in single quotes and format them as comma-separated lists without spaces.

  For example:

  ```bash
  '[0xAddress1,0xAddress2,0xAddress3]'
  ```

- **Example with No Addresses to Remove**: If you only want to add addresses and not remove any, you can pass an empty array for `addressesToRemove`:

  ```bash
  forge script script/UpdateAllowList.s.sol --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast \
    --sig "run(address,address[],address[])" -- \
    0xYourPoolAddress \
    "[0x45C90FBb5acC1a5c156a401B56Fea55e69E7669d,0x2C961E991aeCbF15224f20b175bdB340c42806D4]" \
    "[]"
  ```

- **Example with No Addresses to Add**: If you only want to remove addresses and not add any, you can pass an empty array for `addressesToAdd`:

  ```bash
  forge script script/UpdateAllowList.s.sol --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast \
    --sig "run(address,address[],address[])" -- \
    0xYourPoolAddress \
    '[]' \
    '[0xAddressToRemove]'
  ```

## UpdateRateLimiters

### Description

The `UpdateRateLimiters` script allows you to modify the rate limiter settings for inbound and outbound transfers for a deployed token pool. You can enable or disable the rate limiters, set the capacity, and adjust the rate at which tokens are refilled in the limiter. These rate limiters help control the token flow between chains.

### Usage

```bash
forge script script/UpdateRateLimiters.s.sol --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast \
  --sig "run(address,uint256,uint8,bool,uint128,uint128,bool,uint128,uint128)" -- \
  <POOL_ADDRESS> \
  <REMOTE_CHAIN_ID> \
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
- **remoteChainId**: The chain ID of the remote blockchain to which the pool is linked.
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
  forge script script/UpdateRateLimiters.s.sol --rpc-url $RPC_URL_FUJI --private-key $PRIVATE_KEY --broadcast \
    --sig "run(address,uint256,uint8,bool,uint128,uint128,bool,uint128,uint128)" -- \
    <POOL_ADDRESS> \
    43113 \
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
  - Set the outbound rate limit to a capacity of **10 tokens** and a rate of **0.1 token per second**.
  - Set the inbound rate limit to a capacity of **20 tokens** and a rate of **0.1 token per second**.

- Update only the outbound rate limiter:

  ```bash
  forge script script/UpdateRateLimiters.s.sol --rpc-url $RPC_URL_FUJI --private-key $PRIVATE_KEY --broadcast \
    --sig "run(address,uint256,uint8,bool,uint128,uint128,bool,uint128,uint128)" -- \
    <POOL_ADDRESS> \
    43113 \
    0 \
    true \
    10000000000000000000 \
    100000000000000000 \
    false \
    0 \
    0
  ```

  This will:

  - Enable the outbound rate limiter.
  - Set the outbound rate limit to a capacity of **10 tokens** and a rate of **0.1 token per second**.
  - Disable the inbound rate limiter (values for capacity and rate are ignored).

### Notes

- **Rate Limiter Configuration**: You can update the inbound, outbound, or both rate limiters by setting the `rateLimiterToUpdate` parameter accordingly. If a rate limiter is not being updated, its corresponding parameters should be set to default or ignored.
- **Capacity and Rate**: The capacity represents the maximum number of tokens allowed in the rate limiter (bucket), while the rate represents how many tokens per second are refilled into the bucket.
- **Units**: Capacities and rates are specified in the smallest unit of the token (e.g., Wei for ETH). Ensure that the values are appropriate for your token's decimals and desired rate limits.
- **Chain Selector Mapping**: The script uses `HelperConfig.s.sol` and `HelperUtils.s.sol` to map `remoteChainId` to a `remoteChainSelector`. Ensure that the `remoteChainId` is configured in your network settings.
- **Permissions**: The account executing the script must have the necessary permissions (e.g., owner or rate limit admin) to call `setChainRateLimiterConfig` on the `TokenPool` contract.
