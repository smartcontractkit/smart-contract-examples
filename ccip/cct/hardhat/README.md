# CCIP Self-Serve Tokens

Find a list of available tutorials on the Chainlink documentation: [Cross-Chain Token (CCT) Tutorials](http://docs.chain.link/ccip/tutorials/cross-chain-tokens#overview).

## Getting Started

### Prerequisites

Before running any tasks, ensure you have:

1. **Environment Setup**: Set up encrypted environment variables using `@chainlink/env-enc` and configure your private keys and RPC URLs
2. **Network Configuration**: All tasks require the `--network` flag to specify which blockchain to use

### Global Options

All tasks in this project use Hardhat's global options. The most important one is:

- **`--network <network_name>`**: **Required** for all tasks
  - Specifies which blockchain network to execute the task on
  - Must be one of the supported networks listed below

### Supported Networks

The following networks are configured and available for use:

| Network Name      | Description              | Environment Variable       | Type    |
| ----------------- | ------------------------ | -------------------------- | ------- |
| `avalancheFuji`   | Avalanche Fuji Testnet   | `AVALANCHE_FUJI_RPC_URL`   | EVM     |
| `arbitrumSepolia` | Arbitrum Sepolia Testnet | `ARBITRUM_SEPOLIA_RPC_URL` | EVM     |
| `ethereumSepolia` | Ethereum Sepolia Testnet | `ETHEREUM_SEPOLIA_RPC_URL` | EVM     |
| `baseSepolia`     | Base Sepolia Testnet     | `BASE_SEPOLIA_RPC_URL`     | EVM     |
| `polygonAmoy`     | Polygon Amoy Testnet     | `POLYGON_AMOY_RPC_URL`     | EVM     |
| `solanaDevnet`    | Solana Devnet            | N/A (destination only)     | Non-EVM |

### Network Configuration

Network configurations use a **professional single source of truth architecture**:

- **All network settings**: `/config/networks.ts` (consolidated configuration)
- **Types auto-generated**: From the network configuration data
- **Zero maintenance**: No manual enum synchronization needed

To use a network, ensure:

1. The corresponding RPC URL environment variable is set in your encrypted environment variables
2. You have testnet tokens for gas fees on that network
3. Your private key is configured in the `PRIVATE_KEY` environment variable

### Environment Variable Setup

This project uses `@chainlink/env-enc` for encrypted environment variable management. This package stores your secrets in an encrypted `.env.enc` file instead of plain text `.env` files, providing better security for sensitive information like private keys and RPC URLs.

**Initial Setup:**

1. Set your encryption password (required at the start of each session):

```bash
npx env-enc set-pw
```

2. Add environment variables:

```bash
npx env-enc set
```

3. View your current variables:

```bash
npx env-enc view
```

4. Remove a specific variable:

```bash
npx env-enc remove VARIABLE_NAME
```

**Required Environment Variables:**

- `PRIVATE_KEY`: Your wallet's private key (without 0x prefix)
- `AVALANCHE_FUJI_RPC_URL`: RPC URL for Avalanche Fuji testnet
- `ARBITRUM_SEPOLIA_RPC_URL`: RPC URL for Arbitrum Sepolia testnet
- `ETHEREUM_SEPOLIA_RPC_URL`: RPC URL for Ethereum Sepolia testnet
- `BASE_SEPOLIA_RPC_URL`: RPC URL for Base Sepolia testnet
- `POLYGON_AMOY_RPC_URL`: RPC URL for Polygon Amoy testnet

**Optional (for contract verification):**

- `ETHERSCAN_API_KEY`: Single API key for all Etherscan-compatible explorers (Etherscan V2)
  - Works across Ethereum, Arbitrum, Base, Polygon, and other Etherscan-compatible networks
  - Get your API key from [Etherscan](https://etherscan.io/apis)
  - No need for separate API keys per network (Etherscan V2 improvement)

**Security Notes:**

- The `.env.enc` file should be included in `.gitignore`
- Your encryption password is required each time you start a new terminal session
- Never commit your `.env.enc` file to version control

## Adding New Networks

The network configuration system uses a single source of truth architecture that automatically generates TypeScript types and Hardhat network configurations from the network data.

### Adding a Network

To add a new CCIP-supported network, add the network configuration to the `configData` object in `config/networks.ts`:

```typescript
export const configData = {
  // ... existing networks
  newNetwork: {
    chainFamily: "evm", // or "svm" for non-EVM chains
    chainId: 12345,
    chainSelector: "1234567890123456789",
    router: "0xRouterAddress",
    rmnProxy: "0xRMNProxyAddress",
    tokenAdminRegistry: "0xTokenAdminRegistryAddress",
    registryModuleOwnerCustom: "0xRegistryModuleOwnerAddress",
    link: "0xLinkTokenAddress",
    confirmations: 2,
    nativeCurrencySymbol: "NEW",
    // chainType auto-defaults to "l1" for most chains, "op" for Base/Optimism
  },
};
```

The network becomes available in:

- All task `--network` options

### CCIP Configuration Sources

Obtain the required addresses and chain selectors from the official CCIP directories:

- **Mainnet Networks**: [https://docs.chain.link/ccip/directory/mainnet](https://docs.chain.link/ccip/directory/mainnet)
- **Testnet Networks**: [https://docs.chain.link/ccip/directory/testnet](https://docs.chain.link/ccip/directory/testnet)

Required information from these directories:

- Router contract addresses
- Chain selectors (unique CCIP identifiers)
- RMN Proxy addresses
- Token Admin Registry addresses
- LINK token addresses

### Environment Variable

The system automatically generates environment variable names from network names using this pattern:
- Convert camelCase to SNAKE_CASE
- Add `_RPC_URL` suffix

**Examples:**
- `newNetwork` → `NEW_NETWORK_RPC_URL`
- `optimismSepolia` → `OPTIMISM_SEPOLIA_RPC_URL`  
- `bscTestnet` → `BSC_TESTNET_RPC_URL`

Set the RPC URL environment variable:

```bash
npx env-enc set NEW_NETWORK_RPC_URL
```

**For the example network above:**
```bash
npx env-enc set OPTIMISM_SEPOLIA_RPC_URL
```

### Contract Verification (Optional)

**Automatic Verification (Natively Supported):**
Most standard networks are natively supported by Hardhat for contract verification. Check [Hardhat's chain descriptors](https://github.com/NomicFoundation/hardhat/blob/main/v-next/hardhat/src/internal/builtin-plugins/network-manager/chain-descriptors.ts) for the complete list of supported networks.

**Custom Chain Descriptors Required:**
For networks not natively supported by Hardhat, add a chain descriptor to `hardhat.config.ts`. This is particularly useful for:
- Newer networks not yet added to Hardhat
- Private/enterprise chains
- Custom testnets

```typescript
chainDescriptors: {
  12345: { // Your network's chainId
    name: "New Network",
    chainType: "generic",
    blockExplorers: {
      etherscan: {
        name: "NewScan",
        url: "https://newscan.io",
        apiUrl: "https://api.newscan.io/api",
      },
    },
  },
}
```

Note: With Etherscan V2, a single `ETHERSCAN_API_KEY` works across all Etherscan-compatible networks.

### Example: Adding Optimism Sepolia

```typescript
optimismSepolia: {
  chainFamily: "evm",
  chainId: 11155420,
  chainSelector: "5224473277236331295",
  router: "0x114A20A10b43D4115e5aeef7345a1A71d2a60C57",
  rmnProxy: "0x...",
  tokenAdminRegistry: "0x...",
  registryModuleOwnerCustom: "0x...",
  link: "0x...",
  confirmations: 2,
  nativeCurrencySymbol: "ETH",
  // chainType auto-defaults to "op" (detected from "optimism" in name)
}
```

All tasks will support `--network optimismSepolia` after adding this configuration.

### Example Usage

```bash
# Deploy a token on Avalanche Fuji
npx hardhat deployToken --name "My Token" --symbol "MTK" --network avalancheFuji

# Claim admin on Ethereum Sepolia
npx hardhat claimAdmin --tokenaddress 0x123... --network sepolia

# Transfer tokens on Arbitrum Sepolia
npx hardhat transferTokens --tokenaddress 0x123... --amount 1000 --destinationchain avalancheFuji --receiveraddress 0x456... --network arbitrumSepolia
```

## Table of Contents

**Getting Started**:

- [Prerequisites](#prerequisites)
- [Global Options](#global-options)
- [Supported Networks](#supported-networks)
- [Network Configuration](#network-configuration)
- [Environment Variable Setup](#environment-variable-setup)
- [Adding New Networks](#adding-new-networks)
- [Example Usage](#example-usage)

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
- [addRemotePool](#addremotepool)
- [removeRemotePool](#removeremotepool)
- [setRateLimitAdmin](#setratelimitadmin)
- [updateAllowList](#updateallowlist)
- [transferTokenAdminRole](#transfertokenadminrole)
- [getCurrentRateLimits](#getcurrentratelimits)
- [deployFaucet](#deployfaucet)

**Safe Multisig**:

- [deploySafe](#deploysafe)
- [deployTokenWithSafe](#deploytokenwithsafe)
- [acceptOwnershipFromSafe](#acceptownershipfromsafe)
- [deployTokenPoolWithSafe](#deploytokenpoolwithsafe)
- [claimAndAcceptAdminRoleFromSafe](#claimandacceptadminrolefromsafe)
- [grantMintBurnRoleFromSafe](#grantmintburnrolefromsafe)
- [mintTokensFromSafe](#minttokensfromsafe)
- [setPoolFromSafe](#setpoolfromsafe)
- [applyChainUpdatesFromSafe](#applychainupdatesfromsafe)

## EOA

### deployToken

#### Description

Deploys a new ERC-20 token contract. This task allows you to create a standard token with CCIP administrative functionalities.

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
- Optional:
  - `--decimals`: **integer** (default: `18`)
    - The number of decimals the token uses.
  - `--maxsupply`: **bigint** (default: `0`)
    - The maximum supply of tokens (in the smallest unit, according to `decimals`). When maxSupply is 0, the supply is unlimited.
  - `--premint`: **bigint** (default: `0`)
    - The amount of tokens to be minted to the owner at the time of deployment, specified (in the smallest unit, according to `decimals`). When preMint is 0, no tokens will be minted to the owner during deployment.
  - `--verifycontract`: **boolean** (default: `false`)
    - If set to `true`, the contract will be verified on a blockchain explorer like Etherscan.

#### Examples

- Deploy a token:

  ```bash
  npx hardhat deployToken --name "My Token" --symbol "MTK" --network avalancheFuji
  ```

- Deploy a token with a maximum supply and verify the contract:
  ```bash
  npx hardhat deployToken \
    --name "My Token" \
    --symbol "MTK" \
    --maxsupply 1000000000000000000000 \
    --verifycontract \
    --network avalancheFuji
  ```
- Deploy a token with a pre-mint amount and verify the contract:
  ```bash
  npx hardhat deployToken \
    --name "My Token" \
    --symbol "MTK" \
    --premint 10000000000000000000 \
    --verifycontract \
    --network avalancheFuji
  ```

##### Notes

- **Maximum Supply**:

  - The `--maxsupply` is specified in the smallest unit (wei). For a token with 18 decimals, 1 token equals `1e18` wei.

- **Contract Verification**:
  - The `--verifycontract` option verifies the contract on a blockchain explorer.

### deployTokenPool

#### Description

Deploys a new token pool, which can either be a Burn & Mint or a Lock & Release token pool. These pools enable token management features like burning, minting, or locking and releasing tokens.

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
  - `--localtokendecimals`: **integer** (default: `18`)
    - The number of decimals for the token on this chain.
  - `--verifycontract`: **boolean** (default: `false`)
    - If set to `true`, the contract will be verified on a blockchain explorer like Etherscan.

#### Examples

```bash
# Deploy with custom token decimals
npx hardhat deployTokenPool \
  --tokenaddress 0xYourTokenAddress \
  --localtokendecimals 8 \
  --network avalancheFuji

# Deploy a Lock & Release pool with liquidity acceptance
npx hardhat deployTokenPool \
  --tokenaddress 0xYourTokenAddress \
  --pooltype lockRelease \
  --network avalancheFuji
```

### claimAdmin

#### Description

Claims the admin role for a token contract using different registration methods. This task supports multiple modes to accommodate different token types and their access control mechanisms. The default mode uses `getCCIPAdmin()` for backward compatibility, while additional modes support tokens with standard ownership patterns or AccessControl-based permissions.

#### Usage

```bash
npx hardhat claimAdmin [parameters]
```

#### Parameters

- Required:
  - `--tokenaddress`: **string**
    - The address of the token for which the admin role is being claimed.
- Optional:
  - `--mode`: **string** (default: `"getCCIPAdmin"`)
    - The registration mode to use for claiming admin rights. Available options:
      - `"getCCIPAdmin"`: Uses the token's `getCCIPAdmin()` method (default, backward compatible)
      - `"owner"`: Uses the token's `owner()` method via IOwner interface
      - `"accessControl"`: Uses the token's `DEFAULT_ADMIN_ROLE` via AccessControl

#### Examples

- **Default mode** (getCCIPAdmin - backward compatible):

  ```bash
  npx hardhat claimAdmin \
    --tokenaddress 0xYourTokenAddress \
    --network avalancheFuji
  ```

- **Owner mode** for Ownable tokens:

  ```bash
  npx hardhat claimAdmin \
    --tokenaddress 0xYourTokenAddress \
    --mode owner \
    --network avalancheFuji
  ```

- **AccessControl mode** for tokens using OpenZeppelin's AccessControl:

  ```bash
  npx hardhat claimAdmin \
    --tokenaddress 0xYourTokenAddress \
    --mode accessControl \
    --network avalancheFuji
  ```

##### Notes

- **Registration Modes**:

  - **getCCIPAdmin**: For tokens that implement the `getCCIPAdmin()` method. The signer must be the current CCIP admin.
  - **owner**: For tokens that implement the standard `owner()` method (Ownable pattern). The signer must be the current owner.
  - **accessControl**: For tokens using OpenZeppelin's AccessControl with `DEFAULT_ADMIN_ROLE`. The signer must have the default admin role.

- **Mode Selection**:

  - Choose the mode that matches your token's access control implementation.
  - If unsure, try the default `getCCIPAdmin` mode first, then fallback to other modes if needed.
  - The task will provide clear error messages if the selected mode is incompatible with the token.

- **Backward Compatibility**:

  - Existing scripts and workflows continue to work without modification.
  - The default behavior remains unchanged (uses `getCCIPAdmin` mode).

- **Error Handling**:

  - Natural error propagation provides accurate debugging information across different chains and RPC providers.
  - Contract method compatibility is verified at runtime.
  - Clear error messages guide users to alternative modes when needed.

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

Configures a token pool's chain settings, including cross-chain rate limits and remote pool configurations. Adding a chain through this task automatically enables it for cross-chain transfers.

#### Parameters

- Required:
  - `--pooladdress`: **string**
    - The address of the pool to be configured.
  - `--remotechain`: **string**
    - The remote blockchain network.
  - `--remotepooladdresses`: **string**
    - Comma-separated list of remote pool addresses.
  - `--remotetokenaddress`: **string**
    - The address of the token on the remote chain.
- Optional:
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

```bash
# Configure a chain with multiple remote pools
npx hardhat applyChainUpdates \
  --pooladdress 0xYourPoolAddress \
  --remotechain avalanche \
  --remotepooladdresses "0xPool1,0xPool2" \
  --remotetokenaddress 0xRemoteTokenAddress \
  --outboundratelimitenabled true \
  --outboundratelimitcapacity 1000000000000000000000 \
  --outboundratelimitrate 100000000000000000 \
  --network avalancheFuji
```

##### Notes

- **Chain Activation**: Adding a chain through this task automatically enables it for cross-chain transfers.
- **Multiple Remote Pools**: You can specify multiple remote pool addresses for the same chain selector, which is useful for handling pool upgrades while maintaining support for inflight messages.
- **Rate Limiting**: Configure both inbound and outbound rate limits to control token flow between chains.
- **Remote Pool Management**: Use `addRemotePool` and `removeRemotePool` tasks for more granular control over remote pool configurations.

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

Gets the complete configuration of a token pool, including chain configurations, rate limits, and pool information. This task provides a comprehensive view of the pool's settings and supported chains.

#### Usage

```bash
npx hardhat getPoolConfig [parameters]
```

#### Parameters

- Required:
  - `--pooladdress`: **string**
    - The address of the token pool to query.

#### Examples

```bash
npx hardhat getPoolConfig --pooladdress 0xYourPoolAddress --network avalancheFuji
```

#### Output

The task displays:

- Basic Pool Information:

  - Rate Limit Admin address
  - Router address
  - Token address
  - Allow List status and addresses (if enabled)

- For Each Supported Chain:
  - Chain name and selector
  - Remote pool addresses (can be multiple per chain)
  - Remote token address
  - Outbound Rate Limiter:
    - Enabled status
    - Capacity
    - Rate
  - Inbound Rate Limiter:
    - Enabled status
    - Capacity
    - Rate

Example output:

```
Pool Basic Information:
  Rate Limit Admin: 0x1234...5678
  Router Address: 0xabcd...ef01
  Token Address: 0x9876...5432
  Allow List Enabled: true
  Allow List Addresses:
    1: 0xaaaa...bbbb
    2: 0xcccc...dddd

Configuration for Remote Chain: avalanche (14767482510784806043)
  Remote Pool Addresses:
    1: 0x1111...2222
    2: 0x3333...4444
  Remote Token Address: 0x5555...6666
  Outbound Rate Limiter:
    Enabled: true
    Capacity: 1000000000000000000000
    Rate: 100000000000000000
  Inbound Rate Limiter:
    Enabled: true
    Capacity: 1000000000000000000000
    Rate: 100000000000000000
```

##### Notes

- **Chain Names**:

  - The task attempts to resolve chain selectors to human-readable names using the network configuration.
  - Falls back to displaying the raw selector if the chain name is not found.

- **Rate Limits**:

  - All rate limit values are displayed in the token's smallest unit (wei).
  - The capacity represents the maximum amount that can be transferred at once.
  - The rate indicates how many tokens are added to the capacity per second.

- **Remote Pools**:
  - Multiple remote pools may be displayed for each chain if upgrades have occurred.
  - All listed pools are valid for handling cross-chain messages.

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

### addRemotePool

#### Description

Adds a new remote pool address for a specific chain selector. This is useful when a pool is upgraded on the remote chain, allowing multiple pools to be configured for the same chain selector to handle inflight messages.

#### Usage

```bash
npx hardhat addRemotePool [parameters]
```

#### Parameters

- Required:
  - `--pooladdress`: **string**
    - The address of the token pool to configure.
  - `--remotechain`: **string**
    - The remote blockchain that the pool will interact with.
  - `--remotepooladdress`: **string**
    - The address of the pool on the remote chain.

#### Examples

```bash
npx hardhat addRemotePool \
  --pooladdress 0xYourPoolAddress \
  --remotechain sepolia \
  --remotepooladdress 0xRemotePoolAddress \
  --network avalancheFuji
```

### removeRemotePool

#### Description

Removes a remote pool address for a specific chain selector. WARNING: All inflight transactions from the removed pool will be rejected. Ensure there are no inflight transactions before removing a pool.

#### Usage

```bash
npx hardhat removeRemotePool [parameters]
```

#### Parameters

- Required:
  - `--pooladdress`: **string**
    - The address of the token pool to configure.
  - `--remotechain`: **string**
    - The remote blockchain containing the pool to remove.
  - `--remotepooladdress`: **string**
    - The address of the pool to remove on the remote chain.

#### Examples

```bash
npx hardhat removeRemotePool \
  --pooladdress 0xYourPoolAddress \
  --remotechain sepolia \
  --remotepooladdress 0xRemotePoolAddress \
  --network avalancheFuji
```

### setRateLimitAdmin

#### Description

Sets the rate limit administrator for a token pool. The rate limit admin can update rate limits without being the pool owner.

#### Usage

```bash
npx hardhat setRateLimitAdmin [parameters]
```

#### Parameters

- Required:
  - `--pooladdress`: **string**
    - The address of the token pool to configure.
  - `--adminaddress`: **string**
    - The address of the new rate limit administrator.

#### Examples

```bash
npx hardhat setRateLimitAdmin \
  --pooladdress 0xYourPoolAddress \
  --adminaddress 0xNewAdminAddress \
  --network avalancheFuji
```

### updateAllowList

#### Description

Updates the allow list for a token pool by adding and/or removing addresses. The allow list controls which addresses can initiate cross-chain transfers.

#### Usage

```bash
npx hardhat updateAllowList [parameters]
```

#### Parameters

- Required:
  - `--pooladdress`: **string**
    - The address of the token pool to configure.
- Optional:
  - `--addaddresses`: **string**
    - Comma-separated list of addresses to add to the allowlist.
  - `--removeaddresses`: **string**
    - Comma-separated list of addresses to remove from the allowlist.

#### Examples

```bash
# Add addresses to allowlist
npx hardhat updateAllowList \
  --pooladdress 0xYourPoolAddress \
  --addaddresses "0xAddress1,0xAddress2" \
  --network avalancheFuji

# Remove addresses from allowlist
npx hardhat updateAllowList \
  --pooladdress 0xYourPoolAddress \
  --removeaddresses "0xAddress3,0xAddress4" \
  --network avalancheFuji

# Both add and remove addresses
npx hardhat updateAllowList \
  --pooladdress 0xYourPoolAddress \
  --addaddresses "0xAddress1,0xAddress2" \
  --removeaddresses "0xAddress3,0xAddress4" \
  --network avalancheFuji
```

### transferTokenAdminRole

#### Description

Initiates the transfer of administrator role for a token in the TokenAdminRegistry. This is the first step in a two-step process where the new admin must accept the role using `acceptAdminRole`.

#### Usage

```bash
npx hardhat transferTokenAdminRole [parameters]
```

#### Parameters

- Required:
  - `--tokenaddress`: **string**
    - The address of the token for which to transfer the admin role.
  - `--newadmin`: **string**
    - The address that will become the new administrator after accepting the role.

#### Examples

```bash
npx hardhat transferTokenAdminRole \
  --tokenaddress 0xYourTokenAddress \
  --newadmin 0xNewAdminAddress \
  --network avalancheFuji
```

##### Notes

- **Two-Step Process**:

  - This task only initiates the transfer. The new admin must call `acceptAdminRole` to complete the transfer.
  - The current admin remains in control until the new admin accepts the role.

- **TokenAdminRegistry**:
  - The task automatically uses the TokenAdminRegistry contract address configured for the network.
  - The registry maintains the administrator roles for all tokens in the system.

##### Notes

- **Pending Administrator**:

  - Only the address that was set as the new admin in `transferTokenAdminRole` can execute this task.
  - The task will fail if the signer is not the pending administrator for the token.

- **TokenAdminRegistry**:

  - The task automatically uses the TokenAdminRegistry contract address configured for the network.
  - The registry maintains the administrator roles for all tokens in the system.

- **Verification**:
  - The task verifies that the signer is the pending administrator before attempting to accept the role.
  - Once accepted, the role transfer is complete and cannot be reversed without another transfer process.

### getCurrentRateLimits

#### Description

Gets the current rate limiter states for a specific chain from a token pool. This task provides detailed information about both inbound and outbound rate limits, including current token amounts and last update times.

#### Usage

```bash
npx hardhat getCurrentRateLimits [parameters]
```

#### Parameters

- Required:
  - `--pooladdress`: **string**
    - The address of the token pool to query.
  - `--remotechain`: **string**
    - The remote blockchain to check rate limits for.

#### Examples

```bash
npx hardhat getCurrentRateLimits \
  --pooladdress 0xYourPoolAddress \
  --remotechain avalanche \
  --network avalancheFuji
```

#### Output Example

```
Rate Limiter States for Chain: avalanche
Pool Address: 0xYourPoolAddress
Chain Selector: 14767482510784806043

Outbound Rate Limiter:
  Enabled: true
  Capacity: 1000000000000000000000
  Rate: 100000000000000000
  Tokens: 950000000000000000000
  Last Updated: 1701555555

Inbound Rate Limiter:
  Enabled: true
  Capacity: 1000000000000000000000
  Rate: 100000000000000000
  Tokens: 980000000000000000000
  Last Updated: 1701555555
```

##### Notes

- **Rate Limits**:

  - All token amounts are displayed in the smallest unit (wei)
  - Capacity: Maximum amount that can be transferred at once
  - Rate: Tokens added to the capacity per second
  - Tokens: Currently available tokens for transfer
  - Last Updated: Unix timestamp of the last rate limit update

- **Chain Configuration**:

  - The task automatically resolves chain selectors from the network configuration
  - Supports all chains configured in the network settings

- **Error Handling**:
  - Validates both local and remote chain configurations
  - Provides clear error messages for invalid addresses or missing configurations

### deployFaucet

#### Description

Deploys a Faucet contract that manages token distribution. The faucet contract allows users to request tokens and dispenses a predetermined amount per request, useful for testing and development purposes.

#### Usage

```bash
npx hardhat deployFaucet [parameters]
```

#### Parameters

- Required:
  - `--tokenaddress`: **string**
    - The address of the IBurnMintERC20 token that the Faucet will manage.
  - `--initialdripamount`: **string**
    - The initial amount of tokens the Faucet will dispense per drip (in wei).
- Optional:
  - `--verifycontract`: **boolean** (default: `false`)
    - If set to `true`, the contract will be verified on a blockchain explorer like Etherscan.

#### Examples

- Deploy a basic faucet:

  ```bash
  npx hardhat deployFaucet \
    --tokenaddress 0xYourTokenAddress \
    --initialdripamount 1000000000000000000 \
    --network avalancheFuji
  ```

- Deploy a faucet and verify the contract:

  ```bash
  npx hardhat deployFaucet \
    --tokenaddress 0xYourTokenAddress \
    --initialdripamount 1000000000000000000 \
    --verifycontract \
    --network avalancheFuji
  ```

##### Notes

- **Initial Drip Amount**:

  - The `--initialdripamount` is specified in the smallest unit (wei). For a token with 18 decimals, 1 token equals `1e18` wei.
  - This amount determines how many tokens users will receive per faucet request.

- **Token Requirements**:

  - The token must implement the IBurnMintERC20 interface.
  - The faucet contract will need appropriate permissions to mint tokens or must be funded with tokens to distribute.

- **Testing and Development**:
  - Faucets are primarily used for testing and development environments.
  - Consider the drip amount carefully to balance usability and token economy in test environments.

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

Deploys a new ERC-20 token contract and transfers ownership to a Safe multisig wallet. This task allows you to deploy a "standard" token with CCIP administrative functionalities, and then assign ownership to the Safe account.

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
  - `--decimals`: **integer** (default: `18`)
    - The number of decimals the token uses.
  - `--maxsupply`: **bigint** (default: `0`)
    - The maximum supply of tokens (in the smallest unit, according to `decimals`). When maxSupply is 0, the supply is unlimited.
  - `--premint`: **bigint** (default: `0`)
    - The amount of tokens to be minted to the owner at the time of deployment, specified (in the smallest unit, according to `decimals`). When preMint is 0, no tokens will be minted to the owner during deployment.
  - `--verifycontract`: **boolean** (default: `false`)
    - If set to `true`, the contract will be verified on a blockchain explorer like Etherscan.

#### Examples

- Deploy a standard token and transfer ownership to a Safe:

  ```bash
  npx hardhat deployTokenWithSafe --safeaddress 0xYourSafeAddress --name "My Token" --symbol "MTK" --network avalancheFuji
  ```

- Deploy a token with a maximum supply and verify the contract, and transfer ownership to a Safe:

  ```bash
  npx hardhat deployTokenWithSafe \
    --safeaddress 0xYourSafeAddress \
    --name "My Token" \
    --symbol "MTK" \
    --maxsupply 1000000000000000000000 \
    --verifycontract \
    --network avalancheFuji
  ```

- Deploy a token with a pre-mint amount and verify the contract, and transfer ownership to a Safe:

  ```bash
  npx hardhat deployTokenWithSafe \
    --safeaddress 0xYourSafeAddress \
    --name "My Token" \
    --symbol "MTK" \
    --premint 10000000000000000000 \
    --verifycontract \
    --network avalancheFuji
  ```

##### Notes

- **Safe Address**:

  - The Safe multisig wallet will take ownership of the deployed token after it has been successfully deployed.

- **Maximum Supply**:

  - The `--maxsupply` is specified in the smallest unit (wei). For a token with 18 decimals, 1 token equals `1e18` wei.

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

Deploys a Burn & Mint token pool via a Safe multisig wallet and transfers ownership to the Safe.

#### Usage

```bash
npx hardhat deployTokenPoolWithSafe [parameters]
```

#### Parameters

- Required:
  - `--tokenaddress`: **string**
    - The address of the token to be associated with the pool.
  - `--safeaddress`: **string**
    - The address of the Safe that will own the pool.
- Optional:
  - `--localtokendecimals`: **integer** (default: `18`)
    - The number of decimals for the token on this chain.
  - `--verifycontract`: **boolean** (default: `false`)
    - If set to `true`, the contract will be verified on a blockchain explorer like Etherscan.

#### Examples

```bash
# Deploy a pool with default decimals
npx hardhat deployTokenPoolWithSafe \
  --tokenaddress 0xYourTokenAddress \
  --safeaddress 0xYourSafeAddress \
  --network avalancheFuji

# Deploy a pool with custom decimals and verify
npx hardhat deployTokenPoolWithSafe \
  --tokenaddress 0xYourTokenAddress \
  --safeaddress 0xYourSafeAddress \
  --localtokendecimals 8 \
  --verifycontract \
  --network avalancheFuji
```

##### Notes

- **Safe Transaction**:

  - The task creates and executes a Safe transaction to deploy the pool.
  - The Safe becomes the owner of the deployed pool.
  - Requires multiple signatures if the Safe's threshold is greater than 1.

- **Token Decimals**:

  - The `localtokendecimals` parameter must match the actual decimals of the token contract.
  - This is crucial for proper cross-chain token amount calculations.

- **Network Configuration**:
  - The task automatically uses the RMN proxy and router addresses configured for the network.
  - These addresses are fetched from the network configuration file.

### claimAndAcceptAdminRoleFromSafe

#### Description

Claims and accepts the admin role for a token contract using a Safe multisig wallet.

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
    --network avalancheFuji
  ```

##### Notes

- **CCIP Admin**:

  - The task will use the `getCCIPAdmin()` function to claim the admin role.

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

### mintTokensFromSafe

#### Description

Mints tokens to multiple receivers using a Safe multisig wallet. This task allows you to securely mint a specified amount of tokens to multiple addresses through the Safe, requiring signatures from multiple owners.

#### Usage

```bash
npx hardhat mintTokensFromSafe [parameters]
```

#### Parameters

- Required:
  - `--tokenaddress`: **string**
    - The address of the token contract to mint from.
  - `--amount`: **string**
    - The amount of tokens to mint to each address (in wei).
  - `--receiveraddresses`: **string**
    - Comma-separated list of addresses that will receive the minted tokens.
  - `--safeaddress`: **string**
    - The address of the Safe multisig wallet that will execute the transaction.

#### Examples

- Mint tokens to multiple addresses:

  ```bash
  npx hardhat mintTokensFromSafe \
    --tokenaddress 0xYourTokenAddress \
    --amount 1000000000000000000 \
    --receiveraddresses "0xReceiver1,0xReceiver2,0xReceiver3" \
    --safeaddress 0xYourSafeAddress \
    --network avalancheFuji
  ```

##### Notes

- **Receiver Addresses**:

  - The `--receiveraddresses` parameter must be a comma-separated list of valid Ethereum addresses.
  - Each address will receive the same amount of tokens as specified by the `--amount` parameter.

- **Amount**:

  - The amount is specified in the smallest unit (wei). For a token with 18 decimals, 1 token equals `1e18` wei.

- **Meta-Transactions**:

  - The task creates a series of meta-transactions for each receiver address, which are signed by the Safe owners before being executed.
  - All minting operations are batched together in a single Safe transaction for efficiency.

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
  - `--remotepooladdresses`: **string**
    - Comma-separated list of remote pool addresses.
  - `--remotetokenaddress`: **string**
    - The address of the token on the remote chain.
  - `--safeaddress`: **string**
    - The address of the Safe multisig wallet that will execute the transaction.
- Optional:
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

```bash
# Configure a pool with multiple remote pools and rate limits
npx hardhat applyChainUpdatesFromSafe \
  --pooladdress 0xYourPoolAddress \
  --remotechain avalanche \
  --remotepooladdresses "0xPool1,0xPool2" \
  --remotetokenaddress 0xRemoteTokenAddress \
  --safeaddress 0xYourSafeAddress \
  --outboundratelimitenabled true \
  --outboundratelimitcapacity 1000000000000000000000 \
  --outboundratelimitrate 100000000000000000 \
  --network avalancheFuji
```

##### Notes

- **Safe Transaction**:

  - The task creates a Safe transaction that requires multiple signatures.
  - Both PRIVATE_KEY and PRIVATE_KEY_2 environment variables must be set.
  - The transaction is signed by both owners before execution.

- **Multiple Remote Pools**:

  - You can specify multiple remote pool addresses using a comma-separated list.
  - This is useful for handling pool upgrades while maintaining support for inflight messages.

- **Rate Limiting**:

  - Configure both inbound and outbound rate limits to control token flow between chains.
  - Rate limits are specified in the smallest token unit (wei).

- **Network Configuration**:
  - Chain selectors and other network details are automatically fetched from the network configuration.
  - The task validates all addresses and chain configurations before creating the Safe transaction.
