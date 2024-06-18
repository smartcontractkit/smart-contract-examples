# Setting a gas price threshold on Chainlink Automation upkeeps

This project provides a script you can use to configure and set a maximum gas price for your Automation upkeep.

## Installation

To set up the project, follow these steps:

1. Clone the repository.
   ```bash
   git clone https://github.com/smartcontractkit/automation-gas-threshold
   ```
1. Navigate to the directory for this script.
   ```bash
   cd automation-gas-threshold
   ```
1. Install the required dependencies.

   ```bash
   npm install
   ```

1. Set the following variables:

- YOUR_RPC_URL: The RPC URL for your provider (such as Alchemy or Infura)
- YOUR_PRIVATE_KEY: Your wallet's private key
- YOUR_UPKEEP_ID: The ID of the Automation upkeep you want to configure.