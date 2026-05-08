# Keepers Minimal

> **Warning**
>
> None of the contracts are audited! This repo is not production ready!

This project demonstrates how Chainlink Keepers can be used in various types of DeFi projects. For the sake of simplicity, it automates some of the contracts from the [defi-minimal repository](https://github.com/smartcontractkit/defi-minimal).

Read more [here](https://blog.chain.link/keepers-minimal).

## Getting started

### Prerequisites

Be sure to have installed the following

- [Git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)
- [Node.js](https://nodejs.org/en/download/)
- [Yarn](https://yarnpkg.com/getting-started/install)

### Installation

1. Clone the repo

```
git clone https://github.com/smartcontractkit/smart-contract-examples.git
```

2. Enter the directory

```
cd smart-contract-examples/keepers-minimal
```

### Build and Deploy

1. Install packages

```shell
yarn
```

2. Compile contracts

```shell
yarn compile
```

3. Run tests

```shell
yarn test
```

or

```shell
yarn test --parallel
```

or

```shell
REPORT_GAS=true yarn test
```

#### Performance optimizations

For faster runs of your tests and scripts, consider skipping ts-node's type checking by setting the environment variable `TS_NODE_TRANSPILE_ONLY` to `1` in hardhat's environment. For more details see [the documentation](https://hardhat.org/guides/typescript.html#performance-optimizations).

## Usage

The project comes with three different smart contracts.

### Passive Income Claimer

This smart contract automates `Staking.sol` from [defi-minimal](https://github.com/smartcontractkit/defi-minimal), which itself is based off Synthetix protocol.

It allows you to stake tokens and forget about them. It will automaticaly claim any passive income your stake earns over time and send it back to your wallet address.

```mermaid
sequenceDiagram
    actor User as User's EOA
    participant Contract as PassiveIncomeClaimer.sol
    participant Keepers as Chainlink Keepers
    participant Staking as Staking.sol

    User->>Contract: Deploy and Set Reward Target

    User->>Contract: stake(amount)
    Contract-->>User: Staked

    Note right of User: User can optionally adjust reward target any time
    User->>Contract: adjustRewardTarget(rewardTarget)
    Contract-->>User: TargetRewardAdjusted

    loop On each block, if earned > rewardTarget
        Keepers->>Contract: checkUpkeep()
        activate Contract
        Contract->>Staking: earned(address(this))
        deactivate Contract
        alt false
            Contract-->>Keepers: Don't need an Upkeep
        else true
            Contract-->>Keepers: Upkeep Needed!
            Keepers->>Contract: performUpkeep()
            activate Contract
            Contract->>Staking: claimReward()
            Contract->>User: transfer(beneficary, reward)
            Contract-->>User: PassiveIncomeClaimed
            deactivate Contract
        end
    end

    User->>Contract: withdraw(amount)
    Contract-->>User: Withdrawn
```

### Liquidation Saver

This smart contract automates `Lending.sol` from [defi-minimal](https://github.com/smartcontractkit/defi-minimal), which itself is based off Aave protocol.

It will save you from potentially liqiudations either by repaying your loan or depositing more collateral assets.

```mermaid
sequenceDiagram
    actor User as User's EOA
    participant Contract as LiquidationSaver.sol
    participant Keepers as Chainlink Keepers
    participant Lending as Lending.sol

    User->>Contract: Deploy & Set minHealthFactor

    User->>Contract: depositTokenToSaver(tokenAddress, amount)
    Contract-->>User: TokenDeposited

    Note right of User: User can Deposit
    User->>Contract: deposit(tokenAddress, amount)
    Contract->>Lending: deposit(tokenAddress, amount)
    Lending-->>User: Deposit

    Note right of User: User can Withdraw
    User->>Contract: withdraw(tokenAddress, amount)
    Contract->>Lending: withdraw(tokenAddress, amount)
    Lending-->>User: Withdraw

    Note right of User: User can Borrow
    User->>Contract: borrow(tokenAddress, amount)
    Contract->>Lending: borrow(tokenAddress, amount)
    Lending-->>User: Borrow

    Note right of User: User can Repay
    User->>Contract: repay(tokenAddress, amount)
    Contract->>Lending: repay(tokenAddress, amount)
    Lending-->>User: Repay

    loop On each block, if healthFactor < minHealthFactor

        Keepers->>Contract: checkUpkeep()
        activate Contract
        Contract->>Lending: healthFactor(address(this))
        deactivate Contract

        alt false
            Contract-->>Keepers: Don't need an Upkeep
        else true
            Contract-->>Keepers: Upkeep Needed!
            Keepers->>Contract: performUpkeep()
            activate Contract
            Contract->>Lending: getAccountInformation(address(this))
            Lending-->>Contract: (borrowedValueInETH, collateralValueInETH)

            Note right of Contract: To avoid liquidation one needs to either repay its loan or deposit more collateral

            alt Check do it has funds to repay loan
                Contract->>Contract: _tryToRepay(borrowedValueInETH, borrowedTokenBalanceInSaver)
                activate Contract
                alt _borrowedTokenBalanceInSaver >= amountToRepay
                    Note right of Contract: Repay full Debt
                    Contract->>Lending: repay(tokenAddress, amountToRepay)
                    Lending-->Contract: Repay
                else
                    Note right of Contract: Try to Repay Part of Debt
                    Contract->>Lending: repay(tokenAddress, _borrowedTokenBalanceInSaver)
                    Lending-->Contract: Repay
                end
                deactivate Contract
            else Check do it has funds to deposit more
                Contract->>Contract: _tryToDepositMore(collateralValueInETH, collateralTokenBalanceInSaver)
                activate Contract
                alt _collateralTokenBalanceInSaver >= 2 * collateralAmount
                    Note right of Contract: Try to Double the Collateral Value
                    Contract->>Lending: deposit(tokenAddress, 2 * collateralAmount)
                    Lending-->>Contract: Deposit
                else
                    Note right of Contract: Deposit what's left in Saver
                    Contract->>Lending: deposit(tokenAddress, _collateralTokenBalanceInSaver)
                    Lending-->>Contract: Deposit
                end
                deactivate Contract
            end
            deactivate Contract
        end
    end

    User->>Contract: withdrawTokenFromSaver(tokenAddress, amount)
    Contract-->>User: TokenWithdrawn
```

### Trading Bot

This contract serves as an example of a fully on-chain trading bot of any given asset in terms of USD, supported by Chainlink Data Feeds. As an User you need to set token address, buying & selling price, and address of Chainlink Price Feeds Aggregator for a given asset in terms of USD. Also, you will need to deposit initial amount of both trading token and some stable token.

If the price of a token in terms of USD is lower than a buying price, this contract will buy more tokens by swapping the stable tokens it poses for a token on Uniswap V3. If the price of a token in terms of USD is greater than selling price, this contract will sell tokens by swapping amount it poses for a defined stable token on Uniswap V3.

```shell
                buying price                        selling price
 -∞ ----------------- | ---------------------------------- | ----------------- ∞
  ////// upkeep ///////                                    ////// upkeep ///////
```

```mermaid
sequenceDiagram
    actor User as User's EOA
    participant Contract as TradingBot.sol
    participant Keepers as Chainlink Keepers
    participant PriceFeeds as Chainlink Data Feeds
    participant UniswapV3 as Uniswap SwapRouter.sol

    User->>Contract: Deposit & Set Trading Token Address, Stable Token Address, Buying Price, Selling Price, Aggregator Address

    Note right of User: User should deposit initial amount of Trading Token
    User->>Contract: deposit(tokenAddress, amount)
    Contract-->>User: TokenDeposited

    Note right of User: User should deposit initial amount of Stable Token
    User->>Contract: deposit(tokenAddress, amount)
    Contract-->>User: TokenDeposited

    loop On each block, if currentPrice > sellingPrice || currentPrice < buyingPrice
        Keepers->>Contract: checkUpkeep()
        activate Contract
        Contract->>Contract: getPrice()
        Contract->>PriceFeeds: latestRoundData()
        PriceFeeds->>Contract: currentPrice
        deactivate Contract
        alt false
            Contract-->>Keepers: Don't need an Upkeep
        else true
            Contract-->>Keepers: Upkeep Needed!
            Keepers->>Contract: performUpkeep()
            activate Contract
            alt currentPrice < buyingPrice
                Note right of Contract: Buy
                Contract->>UniswapV3: swap(tokenIn = stableToken, tokenOut = tradingToken)
            else currentPrice > sellingPrice
                Note right of Contract: Sell
                Contract->>UniswapV3: swap(tokenIn = tradingToken, tokenOut = stableToken)
            end
            deactivate Contract
        end
    end

    User->>Contract: withdraw(tokenAddress, amount)
    Contract-->>User: TokenWithdrawn
```
