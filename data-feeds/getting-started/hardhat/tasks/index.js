// This file serves as an aggregator for all Hardhat tasks defined in the project.
// It imports each task script and exports them as named exports.
// This organization facilitates easy inclusion of all tasks in the Hardhat environment
// by requiring just this single file in the Hardhat configuration.

exports.deploy = require("./deploy.js")

exports.getChainlinkDataFeedLatestAnswer = require("./getChainlinkDataFeedLatestAnswer.js")
