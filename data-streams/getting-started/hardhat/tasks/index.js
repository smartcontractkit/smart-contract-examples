// This file serves as an aggregator for all Hardhat tasks defined in the project.
// It imports each task script and exports them as named exports.
// This organization facilitates easy inclusion of all tasks in the Hardhat environment
// by requiring just this single file in the Hardhat configuration.

// Import and export the task for transferring LINK tokens.
exports.transferLink = require("./transfer-link.js")

// Import and export the task for registering a log upkeep with Chainlink Automation.
exports.registerAndFundLogUpkeep = require("./registerAndFundLogUpkeep.js")

// Import and export the task for emitting a log from the LogEmitter contract.
exports.emitLog = require("./emitLog.js")

// Import and export the task for retrieving the last price updated in the StreamsUpkeep contract.
exports.getLastRetrievedPrice = require("./getLastRetrievedPrice.js")

// Import and export the task for deploying the LogEmitter contract.
exports.deployLogEmitter = require("./deployment/deployLogEmitter.js")

// Import and export the task for deploying the StreamsUpkeepRegistrar contract.
exports.deployStreamsUpkeepRegistrar = require("./deployment/deployStreamsUpkeepRegistrar.js")

// Import and export the main deployment task that launches other deployment tasks.
exports.deployAll = require("./deployment/main.js")
