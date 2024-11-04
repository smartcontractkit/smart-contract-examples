# CCIP Self-Serve Tokens

Find a list of available tutorials on the Chainlink documentation: [Cross-Chain Token (CCT) Tutorials](http://docs.chain.link/ccip/tutorials/cross-chain-tokens#overview).

## Table of Contents

**EOA**:

- [deployToken](#deploytoken)
- [deployTokenPool](#deploytokenpool)
- [claimAdmin](#claimadmin)
- [acceptAdminRole](#acceptadminrole)
- [setPool](#setpool)
- [applyChainUpdates](#applychainupdates)
- [mintTokens](#minttokens)
- [transferTokens](#transfertokens)
- [getPoolConfig](#getpoolconfig)
- [updateRateLimiters](#updateratelimiters)

**Safe Multisig**:

- [deploySafe](#deploysafe)
- [deployTokenWithSafe](#deploytokenwithsafe)
- [acceptOwnershipFromSafe](#acceptownershipfromsafe)
- [deployTokenPoolWithSafe](#deploytokenpoolwithsafe)
- [claimAndAcceptAdminRoleFromSafe](#claimandacceptadminrolefromsafe)
- [grantMintBurnRoleFromSafe](#grantmintburnrolefromsafe)
- [setPoolFromSafe](#setpoolfromsafe)
- [applyChainUpdatesFromSafe](#applychainupdatesfromsafe)

## EOA

### deployToken

#### Description

Deploys a new ERC-677 token contract, with optional CCIP admin settings. This task allows you to create a standard token or a token with CCIP administrative functionalities.

#### Usage

```bash
npx hardhat deployToken [parameters]
```

#### Parameters

- Required:
  - `--name`: **string**
    - The name of the token.
  - `--symbol`: **string**
    - The symbol of the token.
  - `--network`: **string**
    - The network to deploy the token to. Must be a valid network name from the Hardhat config.
- Optional:
  - `--withgetccipadmin`: **boolean** (default: `false`)
    - Indicates whether the token contract includes a `getCCIPAdmin()` function.
  - `--ccipadminaddress`: **string**
    - The address of the CCIP admin. Required if `--withgetccipadmin` is `true`.
  - `--decimals`: **integer** (default: `18`)
    - The number of decimals the token uses.
  - `--initialsupply`: **bigint** (default: `0`)
    - The initial supply of tokens (in the smallest unit, according to `decimals`).
  - `--verifycontract`: **boolean** (default: `false`)
    - If set to `true`, the contract will be verified on a blockchain explorer like Etherscan.

#### Examples

- Deploy a token:

  ```bash
  npx hardhat deployToken --name "My Token" --symbol "MTK" --network avalancheFuji
  ```

- Deploy a token with CCIP admin functionality:

  ```bash
  npx hardhat deployToken \
  --name "My Token" \
  --symbol "MTK" \
  --withgetccipadmin true \
  --ccipadminaddress 0xYourCCIPAdminAddress \
  --network avalancheFuji
  ```

- Deploy a token with an initial supply and verify the contract:
  ```bash
  npx hardhat deployToken \
  --name "My Token" \
  --symbol "MTK" \
  --initialsupply 1000000000000000000000 \
  --verifycontract true \
  --network avalancheFuji
  ```

##### Notes

- **CCIP Admin**:

  - If `--withgetccipadmin` is set to `true`, you must provide a valid `--ccipadminaddress`.
  - The CCIP admin address is responsible for managing certain administrative functions of the token.

- **Initial Supply**:

  - The `--initialsupply` is specified in the smallest unit (wei). For a token with 18 decimals, 1 token equals `1e18` wei.

- **Contract Verification**:
  - The `--verifycontract` option verifies the contract on a blockchain explorer.

### deployTokenPool

#### Description

Deploys a new token pool, which can either be a Burn & Mint or a Lock & Release token pool. These pools enable token management features like burning, minting, or locking and releasing tokens. The task also supports contract verification and optional liquidity acceptance for the Lock & Release pool type.

#### Usage

```bash
npx hardhat deployTokenPool [parameters]
```

#### Parameters

- Required:
  - `--tokenaddress`: **string**
    - The address of the token to be associated with the pool.
- Optional:
  - `--pooltype`: **string** (default: `"burnMint"`)
    - Specifies the type of pool to deploy. Options:
      - `"burnMint"`: A pool that supports burning and minting of tokens.
      - `"lockRelease"`: A pool that supports locking and releasing tokens.
  - `--acceptliquidity`: **boolean** (default: `false`)
    - Indicates if liquidity should be accepted in the pool. This option only applies to the `"lockRelease"` pool type.
  - `--verifycontract`: **boolean** (default: `false`)
    - If set to `true`, the contract will be verified on a blockchain explorer like Etherscan.

#### Examples

- Deploy and verify a Burn & Mint token pool:

  ```bash
  npx hardhat deployTokenPool --tokenaddress 0xYourTokenAddress --verifycontract true --network avalancheFuji
  ```

- Deploy a Lock & Release token pool with liquidity acceptance:

  ```bash
  npx hardhat deployTokenPool \
  --tokenaddress 0xYourTokenAddress \
  --pooltype lockRelease \
  --acceptliquidity true \
  --network avalancheFuji
  ```

##### Notes

- **Liquidity Acceptance**:
  - The `--acceptliquidity` parameter only applies to the `lockRelease` pool type.

### claimAdmin

#### Description

Claims the admin role for a token contract. This task allows the user to claim admin either through the `owner()` function or the `getCCIPAdmin()` function if the token contract is configured with a CCIP admin.

#### Usage

```bash
npx hardhat claimAdmin [parameters]
```

#### Parameters

- Required:
  - `--tokenaddress`: **string**
    - The address of the token for which the admin role is being claimed.
- Optional:
  - `--withccipadmin`: **boolean** (default: `false`)
    - Specifies whether the token uses the `getCCIPAdmin()` function to manage admin roles. If `true`, the task claims the admin via this function; otherwise, it claims through the `owner()` function.

#### Examples

- Claim admin using the `owner()` function:

  ```bash
  npx hardhat claimAdmin --tokenaddress 0xYourTokenAddress --network avalancheFuji
  ```

- Claim admin using the `getCCIPAdmin()` function:

  ```bash
  npx hardhat claimAdmin \
  --tokenaddress 0xYourTokenAddress \
  --withccipadmin true \
  --network avalancheFuji
  ```

##### Notes

- **Admin Types**:

  - `owner()`: This function allows claiming the admin role for the token if the contract uses a standard ownership model.
  - `getCCIPAdmin()`: If the token contract supports CCIP admin functionality, this function is used to claim the admin role via the CCIP admin mechanism.

- **CCIP Admin Validation**:
  - If using `withccipadmin`, the task checks that the CCIP admin address matches the current signer's address before claiming the admin role.

### acceptAdminRole

#### Description

Accepts the admin role for a token contract where there is a pending administrator. This task finalizes the transfer of admin rights to the pending administrator.

#### Usage

```bash
npx hardhat acceptAdminRole [parameters]
```

#### Parameters

- Required:
  - `--tokenaddress`: **string**
    - The address of the token for which the admin role is being accepted.

#### Examples

- Accept the admin role for a token:

  ```bash
  npx hardhat acceptAdminRole --tokenaddress 0xYourTokenAddress --network avalancheFuji
  ```

##### Notes

- **Pending Administrator**:

  - This task can only be executed by the pending administrator. If the signer is not the pending administrator for the token, the task will fail.

### setPool

#### Description

Links a token to its respective pool in the `TokenAdminRegistry` contract. This task sets the pool address for the given token, ensuring that the token and its associated pool are properly connected.

#### Usage

```bash
npx hardhat setPool [parameters]
```

#### Parameters

- Required:
  - `--tokenaddress`: **string**
    - The address of the token to be linked to the pool.
  - `--pooladdress`: **string**
    - The address of the pool to be linked to the token.

#### Examples

- Set the pool for a token:

  ```bash
  npx hardhat setPool --tokenaddress 0xYourTokenAddress --pooladdress 0xYourPoolAddress --network avalancheFuji
  ```

##### Notes

- **Admin Rights**:

  - Only the administrator of the token can execute this task. The task verifies that the signer is the token's current administrator before setting the pool.

- **Pool Linking**:
  - The `setPool` function ensures that the token and pool are correctly linked in the `TokenAdminRegistry` contract.

### applyChainUpdates

#### Description

Initializes a pool configuration by setting up cross-chain parameters and rate limits for a token pool. This task allows you to configure the interaction between the pool on the source chain and a remote chain, including rate limiting for token transfers.

#### Usage

```bash
npx hardhat applyChainUpdates [parameters]
```

#### Parameters

- Required:

  - `--pooladdress`: **string**
    - The address of the pool on the source chain.
  - `--remotechain`: **string**
    - The remote chain that the pool will interact with.
  - `--remotepooladdress`: **string**
    - The address of the pool on the remote chain.
  - `--remotetokenaddress`: **string**
    - The address of the token on the remote chain.

- Optional:
  - `--allowed`: **boolean** (default: `true`)
    - Specifies whether the remote chain is allowed for cross-chain transfers.
  - `--outboundratelimitenabled`: **boolean** (default: `false`)
    - Enables or disables outbound rate limits, controlling the flow of tokens leaving the source chain.
  - `--outboundratelimitcapacity`: **integer** (default: `0`)
    - Maximum number of tokens allowed for outbound transfers (bucket capacity).
  - `--outboundratelimitrate`: **integer** (default: `0`)
    - Number of tokens added per second to the outbound rate limit bucket.
  - `--inboundratelimitenabled`: **boolean** (default: `false`)
    - Enables or disables inbound rate limits, controlling the flow of tokens entering the source chain.
  - `--inboundratelimitcapacity`: **integer** (default: `0`)
    - Maximum number of tokens allowed for inbound transfers (bucket capacity).
  - `--inboundratelimitrate`: **integer** (default: `0`)
    - Number of tokens added per second to the inbound rate limit bucket.

#### Examples

- Apply a basic chain update:

  ```bash
  npx hardhat applyChainUpdates --pooladdress 0xYourPoolAddress --remotechain avalanche --remotepooladdress 0xRemotePoolAddress --remotetokenaddress 0xRemoteTokenAddress --network avalancheFuji
  ```

- Apply a chain update with rate limiting:

  ```bash
  npx hardhat applyChainUpdates \
  --pooladdress 0xYourPoolAddress \
  --remotechain avalanche \
  --remotepooladdress 0xRemotePoolAddress \
  --remotetokenaddress 0xRemoteTokenAddress \
  --outboundratelimitenabled true \
  --outboundratelimitcapacity 10000 \
  --outboundratelimitrate 100 \
  --inboundratelimitenabled true \
  --inboundratelimitcapacity 5000 \
  --inboundratelimitrate 50 \
  --network avalancheFuji
  ```

##### Notes

- **Remote Chain Interaction**:

  - The task configures cross-chain interactions by linking the pool and token on the source chain to their counterparts on the remote chain.
  - The remote chain selector is retrieved from the network configuration.

- **Rate Limits**:

  - Outbound and inbound rate limits control how tokens are transferred between chains. The capacity is the maximum allowed tokens, and the rate is the token flow per second.

### mintTokens

#### Description

Mints a specified amount of tokens to a receiver. If no receiver address is provided, the tokens will be minted to the signer's address. The task connects to a token contract and uses the mint function to issue new tokens.

#### Usage

```bash
npx hardhat mintTokens [parameters]
```

#### Parameters

- Required:
  - `--tokenaddress`: **string**
    - The address of the token contract to mint tokens from.
  - `--amount`: **string**
    - The amount of tokens to mint (in wei).
- Optional:
  - `--receiveraddress`: **string**
    - The address of the receiver for the minted tokens. If not provided, defaults to the signer's address.

#### Examples

- Mint tokens to the signer's address:

  ```bash
  npx hardhat mintTokens --tokenaddress 0xYourTokenAddress --amount 1000000000000000000 --network avalancheFuji
  ```

- Mint tokens to a specific receiver:

  ```bash
  npx hardhat mintTokens --tokenaddress 0xYourTokenAddress --amount 1000000000000000000 --receiveraddress 0xReceiverAddress --network avalancheFuji
  ```

##### Notes

- **Receiver Address**:

  - If `--receiveraddress` is not provided, the task will mint the tokens to the signer's address.

- **Amount**:

  - The amount of tokens to be minted should be provided in wei.

- **Minting**:
  - The task uses the `mint` function of the token contract to issue new tokens. Ensure that the signer has the appropriate minting permissions on the contract.

### transferTokens

#### Description

Transfers tokens from one blockchain to another using CCIP. This task allows you to specify the token, amount, destination chain, receiver address, and the fee token used for the transfer.

#### Usage

```bash
npx hardhat transferTokens [parameters]
```

#### Parameters

- Required:

  - `--tokenaddress`: **string**
    - The address of the token to be transferred.
  - `--amount`: **string**
    - The amount of tokens to transfer (in wei).
  - `--destinationchain`: **string**
    - The destination blockchain for the transfer.
  - `--receiveraddress`: **string**
    - The address of the receiver on the destination chain.

- Optional:
  - `--fee`: **string** (default: `"LINK"`)
    - The token used for paying CCIP fees. Options:
      - `"LINK"`: Uses LINK tokens for paying fees.
      - `"native"`: Uses the native gas token of the source chain (e.g., ETH, AVAX).

#### Examples

- Transfer tokens using LINK for fees:

  ```bash
  npx hardhat transferTokens \
  --tokenaddress 0xYourTokenAddress \
  --amount 1000000000000000000 \
  --destinationchain avalanche \
  --receiveraddress 0xReceiverAddress \
  --fee LINK \
  --network avalancheFuji
  ```

- Transfer tokens using native tokens (e.g., ETH or AVAX) for fees:

  ```bash
  npx hardhat transferTokens \
  --tokenaddress 0xYourTokenAddress \
  --amount 1000000000000000000 \
  --destinationchain avalanche \
  --receiveraddress 0xReceiverAddress \
  --fee native \
  --network avalancheFuji
  ```

##### Notes

- **Fee Options**:

  - You can choose to pay the CCIP fees using LINK tokens (`--fee LINK`) or the native gas token of the source chain (e.g., ETH, AVAX) (`--fee native`).

- **Cross-Chain Support**:

  - Ensure that the destination chain is supported by the router contract. The task checks whether the destination chain is compatible before proceeding with the transfer.

- **Message ID**:
  - Once the transfer is dispatched, the transaction logs include a message ID, which can be used to track the status of the transfer on Chainlink's CCIP platform.
  - You can track the status of the transfer on [CCIP Message Explorer](https://ccip.chain.link/msg/{messageId}).

### getPoolConfig

#### Description

Retrieves and displays the configuration for a specific token pool, including supported remote chains, remote pool and token addresses, and the state of inbound and outbound rate limiters. The task provides insights into how tokens are transferred between chains.

#### Usage

```bash
npx hardhat getPoolConfig --pooladdress <POOL_ADDRESS> --network <NETWORK>
```

#### Parameters

- Required:
  - `--pooladdress`: **string**
    - The address of the token pool whose configuration you want to retrieve.

#### Examples

- Fetch the configuration for a token pool:

  ```bash
  npx hardhat getPoolConfig --pooladdress 0xYourPoolAddress --network avalancheFuji
  ```

  This will:

  - Connect to the `TokenPool` contract at the specified address.
  - Retrieve the supported remote chains, remote pool, and token addresses.
  - Display the status of the outbound and inbound rate limiters.

#### Output

The task will output the configuration details for each supported remote chain. For each remote chain, the following details are displayed:

- **Remote Pool Address**: The address of the token pool on the remote chain.
- **Remote Token Address**: The address of the token on the remote chain.
- **Outbound Rate Limiter**:
  - **Enabled**: Whether the outbound rate limiter is enabled.
  - **Capacity**: The maximum number of tokens allowed in the outbound rate limiter.
  - **Rate**: The rate at which tokens are refilled in the outbound rate limiter (tokens per second).
- **Inbound Rate Limiter**:
  - **Enabled**: Whether the inbound rate limiter is enabled.
  - **Capacity**: The maximum number of tokens allowed in the inbound rate limiter.
  - **Rate**: The rate at which tokens are refilled in the inbound rate limiter (tokens per second).

Example output:

```bash
== Logs ==
Fetching configuration for pool at address: 0xYourPoolAddress

Configuration for Remote Chain: avalanche
  Allowed: true
  Remote Pool Address: 0xRemotePoolAddress
  Remote Token Address: 0xRemoteTokenAddress
  Outbound Rate Limiter:
    Enabled: true
    Capacity: 10000000000000000000
    Rate: 100000000000000000
  Inbound Rate Limiter:
    Enabled: true
    Capacity: 5000000000000000000
    Rate: 50000000000000000
```

### updateRateLimiters

#### Description

The `updateRateLimiters` task modifies the rate limiter settings for an existing token pool. This task allows you to configure both inbound and outbound rate limits for cross-chain token transfers. You can enable or disable rate limiting, set the capacity (max tokens), and configure the rate (tokens per second) for inbound and outbound transfers.

#### Usage

```bash
npx hardhat updateRateLimiters --pooladdress <POOL_ADDRESS> --remotechain <REMOTE_CHAIN> [parameters]
```

#### Parameters

- Required:
  - `--pooladdress`: **string**
    - The address of the token pool where the rate limiters will be updated.
  - `--remotechain`: **string**
    - The remote chain where the rate limiters should be applied. The remote chain is identified by its chain name (e.g., `avalancheFuji`, `arbitrumSepolia`).
- Optional:
  - `--ratelimiter`: **string** (default: `"both"`)
    - Specifies whether to update `"inbound"`, `"outbound"`, or `"both"` rate limiters.
  - `--outboundratelimitenabled`: **boolean** (default: `false`)
    - Whether to enable the outbound rate limiter.
  - `--outboundratelimitcapacity`: **number** (default: `0`)
    - Maximum number of tokens allowed in the outbound rate limiter (capacity, in wei).
  - `--outboundratelimitrate`: **number** (default: `0`)
    - Number of tokens per second refilled into the outbound rate limiter (rate, in wei).
  - `--inboundratelimitenabled`: **boolean** (default: `false`)
    - Whether to enable the inbound rate limiter.
  - `--inboundratelimitcapacity`: **number** (default: `0`)
    - Maximum number of tokens allowed in the inbound rate limiter (capacity, in wei).
  - `--inboundratelimitrate`: **number** (default: `0`)
    - Number of tokens per second refilled into the inbound rate limiter (rate, in wei).

#### Examples

- Update both inbound and outbound rate limiters for a pool on Avalanche Fuji:

  ```bash
  npx hardhat updateRateLimiters \
    --pooladdress 0xYourPoolAddress \
    --remotechain arbitrumSepolia \
    --ratelimiter both \
    --outboundratelimitenabled true \
    --outboundratelimitcapacity 10000000000000000000 \
    --outboundratelimitrate 100000000000000000 \
    --inboundratelimitenabled true \
    --inboundratelimitcapacity 20000000000000000000 \
    --inboundratelimitrate 100000000000000000 \
    --network avalancheFuji
  ```

- Update only the outbound rate limiter for a token pool:

  ```bash
  npx hardhat updateRateLimiters \
    --pooladdress 0xYourPoolAddress \
    --remotechain arbitrumSepolia \
    --ratelimiter outbound \
    --outboundratelimitenabled true \
    --outboundratelimitcapacity 15000000000000000000 \
    --outboundratelimitrate 50000000000000000 \
    --network avalancheFuji
  ```

#### Notes

- **Rate Limiter Selection**: You can specify whether to update only the `outbound`, `inbound`, or `both` rate limiters using the `--ratelimiter` parameter. Each limiter has its own `capacity` and `rate` settings.
- **Capacity and Rate**: The capacity represents the maximum number of tokens allowed in the rate limiter (bucket), while the rate represents how many tokens per second are added back into the bucket.
  - **Capacity**: Maximum tokens allowed in the bucket.
  - **Rate**: The number of tokens refilled per second.
- **Remote Chain Configuration**: The remote chain's selector is fetched based on the `remotechain` parameter, which identifies the remote chain by its name (e.g., `arbitrumSepolia`, `avalancheFuji`). Ensure the remote chain is supported in the network configuration.
- **Transaction Confirmation**: The task waits for the transaction to be confirmed on-chain, using the required number of confirmations specified for the network.

#### Output

The task logs the current rate limiter configurations before applying the updates, and it displays the transaction hash and confirmation that the rate limiters were successfully updated.

Example output:

```bash
== Logs ==
Current Rate Limiters for token pool: 0xYourPoolAddress

  Outbound Rate Limiter:
    Enabled: false
    Capacity: 0
    Rate: 0

  Inbound Rate Limiter:
    Enabled: false
    Capacity: 0
    Rate: 0

========== Updating Rate Limiters ==========

New Outbound Rate Limiter:
  Enabled: true
  Capacity: 10000000000000000000
  Rate: 100000000000000000

Transaction hash: 0xTransactionHash

Rate limiters updated successfully
```

#### Verification

After applying the new rate limiter settings, you can verify them using the `getPoolConfig` task.

## Safe Multisig

### deploySafe

#### Description

Deploys a new Safe (Gnosis Safe) multisig wallet. The task allows you to specify a list of owners and a threshold for the number of required signatures to authorize transactions.

#### Usage

```bash
npx hardhat deploySafe [parameters]
```

#### Parameters

- Required:
  - `--owners`: **string**
    - A comma-separated list of Ethereum addresses that will be the owners of the Safe.
  - `--threshold`: **integer**
    - The number of required signatures for transaction authorization. Must be between 1 and the number of owners.

#### Examples

- Deploy a Safe with two owners and a threshold of 1:

  ```bash
  npx hardhat deploySafe --owners "0xOwnerAddress1,0xOwnerAddress2" --threshold 1 --network avalancheFuji
  ```

- Deploy a Safe with three owners and a threshold of 2:

  ```bash
  npx hardhat deploySafe --owners "0xOwnerAddress1,0xOwnerAddress2,0xOwnerAddress3" --threshold 2 --network avalancheFuji
  ```

##### Notes

- **Threshold**:

  - The threshold must be at least 1 and cannot exceed the number of owners. For example, if you provide three owners, the threshold must be between 1 and 3.

### deployTokenWithSafe

#### Description

Deploys a new ERC-677 token contract and transfers ownership to a Safe multisig wallet. This task allows you to deploy a "standard" token or a token with CCIP administrative functionalities, and then assign ownership to the Safe account.

#### Usage

```bash
npx hardhat deployTokenWithSafe [parameters]
```

#### Parameters

- Required:
  - `--safeaddress`: **string**
    - The address of the Safe multisig wallet that will take ownership of the deployed token.
  - `--name`: **string**
    - The name of the token.
  - `--symbol`: **string**
    - The symbol of the token.
- Optional:
  - `--withgetccipadmin`: **boolean** (default: `false`)
    - Indicates whether the token contract includes a `getCCIPAdmin()` function.
  - `--ccipadminaddress`: **string**
    - The address of the CCIP admin. Required if `--withgetccipadmin` is `true`.
  - `--decimals`: **integer** (default: `18`)
    - The number of decimals the token uses.
  - `--initialsupply`: **bigint** (default: `0`)
    - The initial supply of tokens (in the smallest unit, according to `decimals`).
  - `--verifycontract`: **boolean** (default: `false`)
    - If set to `true`, the contract will be verified on a blockchain explorer like Etherscan.

#### Examples

- Deploy a standard token and transfer ownership to a Safe:

  ```bash
  npx hardhat deployTokenWithSafe --safeaddress 0xYourSafeAddress --name "My Token" --symbol "MTK" --network avalancheFuji
  ```

- Deploy a token with CCIP admin functionality and transfer ownership to a Safe:

  ```bash
  npx hardhat deployTokenWithSafe \
  --safeaddress 0xYourSafeAddress \
  --name "My Token" \
  --symbol "MTK" \
  --withgetccipadmin true \
  --ccipadminaddress 0xYourCCIPAdminAddress \
  --network avalancheFuji
  ```

- Deploy a token with an initial supply and verify the contract, and transfer ownership to a Safe:

  ```bash
  npx hardhat deployTokenWithSafe \
  --safeaddress 0xYourSafeAddress \
  --name "My Token" \
  --symbol "MTK" \
  --initialsupply 1000000000000000000000 \
  --verifycontract true \
  --network avalancheFuji
  ```

##### Notes

- **Safe Address**:

  - The Safe multisig wallet will take ownership of the deployed token after it has been successfully deployed.

- **CCIP Admin**:

  - If `--withgetccipadmin` is set to `true`, you must provide a valid `--ccipadminaddress`.

- **Initial Supply**:

  - The `--initialsupply` is specified in the smallest unit (wei). For a token with 18 decimals, 1 token equals `1e18` wei.

### acceptOwnershipFromSafe

#### Description

Accepts ownership of a contract using a Safe multisig wallet. This task allows you to securely transfer ownership of a contract by executing the `acceptOwnership` function through a Safe account.

#### Usage

```bash
npx hardhat acceptOwnershipFromSafe [parameters]
```

#### Parameters

- Required:
  - `--contractaddress`: **string**
    - The address of the contract for which ownership is being accepted.
  - `--safeaddress`: **string**
    - The address of the Safe multisig wallet that will execute the transaction.

#### Examples

- Accept ownership of a contract using Safe:

  ```bash
  npx hardhat acceptOwnershipFromSafe --contractaddress 0xYourContractAddress --safeaddress 0xYourSafeAddress --network avalancheFuji
  ```

##### Notes

- **Safe Address**:

  - The Safe multisig wallet must have multiple owners, and the task requires signatures from multiple owners to execute the transaction.

- **Meta-Transaction**:

  - The task creates a meta-transaction for the `acceptOwnership` function, which is signed by the Safe owners before being executed.

### deployTokenPoolWithSafe

#### Description

Deploys a new token pool (Burn & Mint) and transfers ownership to a Safe multisig wallet. This task allows you to deploy a token pool that manages a specific token and assign ownership to a Safe account.

#### Usage

```bash
npx hardhat deployTokenPoolWithSafe [parameters]
```

#### Parameters

- Required:
  - `--tokenaddress`: **string**
    - The address of the token to be managed by the pool.
  - `--safeaddress`: **string**
    - The address of the Safe multisig wallet that will take ownership of the deployed token pool.
- Optional:
  - `--verifycontract`: **boolean** (default: `false`)
    - If set to `true`, the contract will be verified on a blockchain explorer like Etherscan.

#### Examples

- Deploy a token pool and transfer ownership to a Safe:

  ```bash
  npx hardhat deployTokenPoolWithSafe --tokenaddress 0xYourTokenAddress --safeaddress 0xYourSafeAddress --network avalancheFuji
  ```

- Deploy and verify a token pool, then transfer ownership to a Safe:

  ```bash
  npx hardhat deployTokenPoolWithSafe \
  --tokenaddress 0xYourTokenAddress \
  --safeaddress 0xYourSafeAddress \
  --verifycontract true \
  --network avalancheFuji
  ```

### claimAndAcceptAdminRoleFromSafe

#### Description

Claims and accepts the admin role for a token contract using a Safe multisig wallet. The task supports contracts with or without CCIP admin functionality and executes the required transactions through a Safe.

#### Usage

```bash
npx hardhat claimAndAcceptAdminRoleFromSafe [parameters]
```

#### Parameters

- Required:
  - `--tokenaddress`: **string**
    - The address of the token for which the admin role is being claimed.
  - `--safeaddress`: **string**
    - The address of the Safe multisig wallet that will execute the transactions.
- Optional:
  - `--withccipadmin`: **boolean** (default: `false`)
    - Specifies whether the token contract uses the `getCCIPAdmin()` function for admin management. If `true`, the task claims the admin role via this function; otherwise, it claims via the `owner()` function.

#### Examples

- Claim and accept the admin role using the `owner()` function:

  ```bash
  npx hardhat claimAndAcceptAdminRoleFromSafe --tokenaddress 0xYourTokenAddress --safeaddress 0xYourSafeAddress --network avalancheFuji
  ```

- Claim and accept the admin role using the `getCCIPAdmin()` function:

  ```bash
  npx hardhat claimAndAcceptAdminRoleFromSafe \
  --tokenaddress 0xYourTokenAddress \
  --safeaddress 0xYourSafeAddress \
  --withccipadmin true \
  --network avalancheFuji
  ```

##### Notes

- **CCIP Admin**:

  - If `--withccipadmin` is set to `true`, the task will use the `getCCIPAdmin()` function to claim the admin role; otherwise, it will use the `owner()` function.

- **Meta-Transactions**:

  - The task creates multiple meta-transactions that are signed by the Safe owners before being executed. It includes both the claim and acceptance of the admin role.

### grantMintBurnRoleFromSafe

#### Description

Grants mint and burn roles to multiple addresses using a Safe multisig wallet. This task allows you to securely grant these roles through the Safe, requiring signatures from multiple owners.

#### Usage

```bash
npx hardhat grantMintBurnRoleFromSafe [parameters]
```

#### Parameters

- Required:
  - `--tokenaddress`: **string**
    - The address of the deployed token contract.
  - `--burnerminters`: **string**
    - A comma-separated list of addresses to be granted mint and burn roles.
  - `--safeaddress`: **string**
    - The address of the Safe multisig wallet that will execute the transaction.

#### Examples

- Grant mint and burn roles to two addresses:

  ```bash
  npx hardhat grantMintBurnRoleFromSafe \
  --tokenaddress 0xYourTokenAddress \
  --burnerminters "0xBurnerMinter1,0xBurnerMinter2" \
  --safeaddress 0xYourSafeAddress \
  --network avalancheFuji
  ```

##### Notes

- **Burner/Minter Addresses**:

  - The `--burnerminters` parameter must be a comma-separated list of valid addresses.

- **Meta-Transactions**:

  - The task creates a series of meta-transactions for each burner/minter address, which are signed by the Safe owners before being executed.

### setPoolFromSafe

#### Description

Sets the pool for a token contract using a Safe multisig wallet. This task allows you to securely link a token to a specific pool through a Safe account, requiring multiple owner signatures.

#### Usage

```bash
npx hardhat setPoolFromSafe [parameters]
```

#### Parameters

- Required:
  - `--tokenaddress`: **string**
    - The address of the token to be linked to the pool.
  - `--pooladdress`: **string**
    - The address of the pool to be set for the token.
  - `--safeaddress`: **string**
    - The address of the Safe multisig wallet that will execute the transaction.

#### Examples

- Set the pool for a token using Safe:

  ```bash
  npx hardhat setPoolFromSafe --tokenaddress 0xYourTokenAddress --pooladdress 0xYourPoolAddress --safeaddress 0xYourSafeAddress --network avalancheFuji
  ```

### applyChainUpdatesFromSafe

#### Description

Configures a token pool via a Safe multisig wallet. This task allows you to apply chain updates, including cross-chain rate limits and remote pool configurations, using a Safe account for secure execution.

#### Usage

```bash
npx hardhat applyChainUpdatesFromSafe [parameters]
```

#### Parameters

- Required:
  - `--pooladdress`: **string**
    - The address of the pool to be configured.
  - `--remotechain`: **string**
    - The identifier of the remote blockchain network.
  - `--remotepooladdress`: **string**
    - The address of the remote token pool.
  - `--remotetokenaddress`: **string**
    - The address of the token on the remote chain.
  - `--safeaddress`: **string**
    - The address of the Safe multisig wallet that will execute the transaction.
- Optional:
  - `--allowed`: **boolean** (default: `true`)
    - Specifies whether the remote chain is allowed for cross-chain token transfers.
  - `--outboundratelimitenabled`: **boolean** (default: `false`)
    - Enables or disables the outbound rate limiter.
  - `--outboundratelimitcapacity`: **integer** (default: `0`)
    - Maximum capacity for the outbound rate limiter.
  - `--outboundratelimitrate`: **integer** (default: `0`)
    - Refill rate for the outbound rate limiter bucket (tokens per second).
  - `--inboundratelimitenabled`: **boolean** (default: `false`)
    - Enables or disables the inbound rate limiter.
  - `--inboundratelimitcapacity`: **integer** (default: `0`)
    - Maximum capacity for the inbound rate limiter.
  - `--inboundratelimitrate`: **integer** (default: `0`)
    - Refill rate for the inbound rate limiter bucket (tokens per second).

#### Examples

- Configure a pool with default settings:

  ```bash
  npx hardhat applyChainUpdatesFromSafe \
  --pooladdress 0xYourPoolAddress \
  --remotechain avalanche \
  --remotepooladdress 0xRemotePoolAddress \
  --remotetokenaddress 0xRemoteTokenAddress \
  --safeaddress 0xYourSafeAddress \
  --network avalancheFuji
  ```

- Configure a pool with rate limits enabled:

  ```bash
  npx hardhat applyChainUpdatesFromSafe \
  --pooladdress 0xYourPoolAddress \
  --remotechain avalanche \
  --remotepooladdress 0xRemotePoolAddress \
  --remotetokenaddress 0xRemoteTokenAddress \
  --safeaddress 0xYourSafeAddress \
  --outboundratelimitenabled true \
  --outboundratelimitcapacity 10000 \
  --outboundratelimitrate 500 \
  --inboundratelimitenabled true \
  --inboundratelimitcapacity 5000 \
  --inboundratelimitrate 250 \
  --network avalancheFuji
  ```
