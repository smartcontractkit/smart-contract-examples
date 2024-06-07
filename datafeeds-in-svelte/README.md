<div align="center">
<h3 align="center">Getting Cryptocurrency and Fiat Prices on the Frontend With Javascript or Solidity</h3>

  <p align="center">
    <a href="https://github.com/smartcontractkit/smart-contract-examples/issues">Report Bug</a>
    ·
    <a href="https://github.com/smartcontractkit/smart-contract-examples/issues">Request Feature</a>
  </p>
</div>



<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
      </ul>
    </li>
    <li><a href="#usage">Usage</a></li>
    <li><a href="#contributing">Contributing</a></li>
  </ol>
</details>



<!-- ABOUT THE PROJECT -->
## About The Project

This project is a sample SvelteKit Skeleton project that includes a util function to return the price of ETH in USD on the Kovan Network.

<p align="right">(<a href="#top">back to top</a>)</p>



### Built With
* [Ethers](https://ethers.org/)
* [Svelte](https://svelte.dev/)


<p align="right">(<a href="#top">back to top</a>)</p>



<!-- GETTING STARTED -->
## Getting Started

In order to run this code locally follow the steps below.

If you'd like to see the two relevant files for the example check out `src/routes/index.svelte` and `src/utils/getETHPrice.js`

### Prerequisites

Ensure you have Node.js and npm installed
   ```sh
   node -v
   npm -v
   ```

* npm is installed as part of Node. Instructions can be found at https://nodejs.org/en/


### Installation

1. Get a RPC API Key from a node provider such as [Alchemy](https://www.alchemy.com/), [Infura](https://infura.io/), [Moralis](https://moralis.io/), or [QuickNode](https://www.quicknode.com/). This example uses the KOVAN Ethereum test network.
1. Clone the repo
   ```sh
   git clone https://github.com/smartcontractkit/smart-contract-examples.git
   ```
1. Enter the directory
   ```sh
   cd smart-contract-examples/datafeeds-in-svelte
   ```
1. Install NPM packages
   ```sh
   npm install
   ```
1. Enter your RPC URL in `src/utils/getETHPrice.js`
   ```js
    const provider = new ethers.providers.JsonRpcProvider('RPC_URL_HERE');
   ```

<p align="right">(<a href="#top">back to top</a>)</p>



<!-- USAGE EXAMPLES -->
## Usage

Once you've installed dependencies with `npm install` and updated your RPC URL, start the server:
   ```bash
   npm run dev
    # or start the server and open the app in a new browser tab
   npm run dev -- --open
   ```

<p align="right">(<a href="#top">back to top</a>)</p>
