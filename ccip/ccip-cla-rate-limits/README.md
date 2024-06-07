## CCIP + CLA Rate Limits

Showcase example that combines Chainlink CCIP and Chainlink Automation to deliver exchange rates of StaFi Staked ETH (rETH).

## Usage

Create an `.env` file and provide the following variables:

```
ETHEREUM_MAINNET_RPC_URL = https://eth-mainnet.g.alchemy.com/v2/<KEY>
POLYGON_MAINNET_RPC_URL = https://polygon-mainnet.g.alchemy.com/v2/<KEY>
```

### Build

```shell
$ forge build
```

### Test

```shell
$ forge test
```

### Format

```shell
$ forge fmt
```

<br />

> _This tutorial represents an educational example to use a Chainlink system, product, or service and is provided to demonstrate how to interact with Chainlink’s systems, products, and services to integrate them into your own. This template is provided “AS IS” and “AS AVAILABLE” without warranties of any kind, it has not been audited, and it may be missing key checks or error handling to make the usage of the system, product or service more clear. Do not use the code in this example in a production environment without completing your own audits and application of best practices. Neither Chainlink Labs, the Chainlink Foundation, nor Chainlink node operators are responsible for unintended outputs that are generated due to errors in code._
