# Custom Logic Upkeep Interactions

### UpkeepInteractions.sol

A solidity contract showcasing the interaction with `AutomationRegistrar` and `KeeperRegistry` contracts, for **registration** of **Custom Logic Upkeep** and performing other operations like **pause upkeep**, **unpause upkeep**, **cancel upkeep**, **add funds to upkeep**, **withdraw funds from upkeep**, and **edit gas limit of upkeep**.

**Note:** The upkeep that will be registered using the contract won't be visible in the [Automation UI](https://automation.chain.link/) because the `adminAddress` is being set to the address of the contract (not to any wallet).

###  upkeepInteractions.js

A script in JS containing the functions to interact with the registered **Custom Logic Upkeep**.

Run the script using this command:

```js
node upkeepInteractions.js ${KEEPER_REGISTRY_ADDRESS} ${LINK_TOKEN_ADDRESS}
```