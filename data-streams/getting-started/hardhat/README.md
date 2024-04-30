# Getting Started with Data Streams

This guide shows you how to read data from a Data Streams feed, verify the answer onchain, and store the answer onchain. This example uses the [Streams Trade](https://docs.chain.link/data-streams#streams-trade-using-data-streams-with-chainlink-automation) implementation of Data Streams and a [Chainlink Automation Log Trigger](https://docs.chain.link/chainlink-automation/guides/log-trigger) to check for events that require data. For this example:

- The log trigger comes from a simple emitter contract.
- Chainlink Automation then uses `StreamsLookup` to retrieve a signed report from the Data Streams Engine, return the data in a callback, and run the [`performUpkeep` function](https://docs.chain.link/chainlink-automation/reference/automation-interfaces#performupkeep-function-for-log-triggers) on your registered upkeep contract.
- The `performUpkeep` function calls the `verify` function on the verifier contract.

> :warning: **Disclaimer**: "This tutorial represents an educational example to use a Chainlink system, product, or service and is provided to demonstrate how to interact with Chainlink’s systems, products, and services to integrate them into your own. This template is provided “AS IS” and “AS AVAILABLE” without warranties of any kind, it has not been audited, and it may be missing key checks or error handling to make the usage of the system, product or service more clear. Do not use the code in this example in a production environment without completing your own audits and application of best practices. Neither Chainlink Labs, the Chainlink Foundation, nor Chainlink node operators are responsible for unintended outputs that are generated due to errors in code."

## Before you begin

This guide uses the [Hardhat](https://hardhat.org/) development environment to deploy and interact with the contracts. To learn more about Hardhat, read the [Hardhat Documentation](https://hardhat.org/hardhat-runner/docs/getting-started).

### Requirements

- **Git**: Make sure you have Git installed. You can check your current version by running <CopyText text="git --version" code/> in your terminal and download the latest version from the official [Git website](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git) if necessary.
- **Nodejs** and **npm**: [Install the latest release of Node.js 20](https://nodejs.org/en/download/). Optionally, you can use the nvm package to switch between Node.js versions with <CopyText text="nvm use 20" code/>. To ensure you are running the correct version in a terminal, type <CopyText text="node -v" code/>.
  ```bash
   $ node -v
   v20.11.0
  ```
- **RPC URL**: You need a Remote Procedure Call (RPC) URL for the Arbitrum Sepolia network. You can obtain one by creating an account on [Alchemy](https://www.alchemy.com/) or [Infura](https://www.infura.io/) and setting up an Arbitrum Sepolia project.
- **Private key**: You need the private key of the account that will deploy and interact with the contracts. You can use the private key of your [MetaMask wallet](https://metamask.io/).
- **Testnet funds**: This guide requires testnet ETH and LINK on Arbitrum Sepolia. Both are available at [faucets.chain.link](https://faucets.chain.link/arbitrum-sepolia).

## Tutorial

### Setup

1. Clone the repository that contains the Hardhat project setup for this guide. This repository contains the Solidity contracts and the Hardhat configuration files you need to deploy and interact with the contracts.

   ```bash
   git clone https://github.com/smartcontractkit/smart-contract-examples.git
   cd smart-contract-examples/data-streams/getting-started/hardhat
   ```

1. Install all the dependencies:

   ```bash
   npm install
   ```

1. Set an encryption password for your environment variables. This password needs to be set each time you create or restart a terminal shell session.

   ```bash
   npx env-enc set-pw
   ```

1. Set the required environment variables using the following command:

   ```bash
   npx env-enc set
   ```

   - `PRIVATE_KEY`: The private key for your testnet wallet. If you use MetaMask, follow the instructions to [Export a Private Key](https://support.metamask.io/hc/en-us/articles/360015289632-How-to-export-an-account-s-private-key).
   - `ARBITRUM_SEPOLIA_RPC_URL`: The RPC URL for the Arbitrum Sepolia network.

### Deploy the upkeep and the log emitter contracts

Deploy an upkeep contract that is enabled to retrieve data from Data Streams. For this example, you will read from the ETH/USD Data Streams feed with ID `0x000359843a543ee2fe414dc14c7e7920ef10f4372990b79d6361cdc0dd1ba782` on Arbitrum Sepolia. See the [Data Streams Feed IDs](https://docs.chain.link/data-streams/stream-ids) page for a complete list of available assets, IDs, and verifier proxy addresses.

Execute the following command to deploy the Chainlink Automation upkeep contract and the Log Emitter contract to the Arbitrum Sepolia network.

```bash
npx hardhat deployAll --network arbitrumSepolia
```

Expect output similar to the following in your terminal:

```bash
ℹ Deploying StreamsUpkeepRegistrar contract...
✔ StreamsUpkeepRegistrar deployed at: 0x48403478Aa021A9BC30Da0BDE47cbc155CcA8916
ℹ Deploying LogEmitter contract...
✔ LogEmitter deployed at: 0xD721337a827F9D814daEcCc3c7e72300af914BFE
✔ All contracts deployed successfully.
```

Save the deployed contract addresses for both contracts. You will use these addresses later.

### Fund the upkeep contract

In this example, the upkeep contract pays for onchain verification of reports from Data Streams. The Automation subscription does not cover the cost. Transfer `1.5` testnet LINK to the upkeep contract address you saved earlier. You can retrieve unused LINK later.

```bash
npx hardhat transfer-link --recipient <StreamsUpkeepRegistrarAddress> --amount 1500000000000000000 --network arbitrumSepolia
```

Replace `<StreamsUpkeepRegistrarAddress>` with the address of the `StreamsUpkeepRegistrar` contract you saved earlier.

Expect output similar to the following in your terminal:

```bash
ℹ Starting LINK transfer from <YOUR_ADDRESS> to the streams upkeep contract at 0xD721337a827F9D814daEcCc3c7e72300af914BFE
ℹ LINK token address: 0xb1D4538B4571d411F07960EF2838Ce337FE1E80E
ℹ LINK balance of sender 0x45C90FBb5acC1a5c156a401B56Fea55e69E7669d is 6.5 LINK
✔ 1.5 LINK were sent from 0x45C90FBb5acC1a5c156a401B56Fea55e69E7669d to 0xD721337a827F9D814daEcCc3c7e72300af914BFE. Transaction Hash: 0xf241bf4415ec081325ccd8ec3d54432e424afd16f1c81fa78b291ae9a0c03ce2
```

### Register and fund the upkeep

Programmatically register and fund a new `Log Trigger` upkeep with 1 LINK:

```bash
npx hardhat registerAndFundUpkeep --streams-upkeep <StreamsUpkeepRegistrarAddress> --log-emitter <LogEmitterAddress> --network arbitrumSepolia
```

Replace `<StreamsUpkeepRegistrarAddress>` and `<LogEmitterAddress>` with the addresses of your `StreamsUpkeepRegistrar` and `LogEmitter` contracts.

Expect output similar to the following in your terminal:

```bash
✔ Upkeep registered and funded with 1 LINK successfully.
```

### Emit a log

Now, you can use your emitter contract to emit a log and initiate the upkeep, which retrieves data for the specified Data Streams feed ID.

```bash
npx hardhat emitLog --log-emitter <LogEmitterAddress> --network arbitrumSepolia
```

Replace `<LogEmitterAddress>` with the address of your `LogEmitter` contract.

Expect output similar to the following in your terminal:

```bash
✔ Log emitted successfully in transaction: 0x236ee95faade12d1b6d497ee2e51ddf957f7d4986ffe51d784b923081ed440ff
```

After the transaction is complete, the log is emitted, and the upkeep is triggered.

### View the retrieved price

The retrieved price is stored in the `s_last_retrieved_price` contract variable and emitted in the logs. To see the price retrieved by the `StreamsUpkeepRegistrar` contract:

```bash
npx hardhat getLastRetrievedPrice --streams-upkeep <StreamsUpkeepRegistrarAddress> --network arbitrumSepolia
```

Replace `<StreamsUpkeepRegistrarAddress>` with the address of your `StreamsUpkeepRegistrar` contract.

Expect output similar to the following in your terminal:

```bash
✔ Last Retrieved Price: 2945878120219995000000
```

The answer on the ETH/USD feed uses 18 decimal places, so an answer of `2945878120219995000000` indicates an ETH/USD price of 2945.878120219995. Each Data Streams feed uses a different number of decimal places for answers. See the [Data Streams Feed IDs](https://docs.chain.link/data-streams/stream-ids) page for more information.

Alternatively, you can view the price emitted in the logs for your upkeep transaction.

You can find the upkeep transaction hash at [Chainlink Automation UI](https://automation.chain.link/arbitrum-sepolia) and view the transaction logs in the [Arbitrum Sepolia explorer](https://sepolia.arbiscan.io/).
