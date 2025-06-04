const DataFeedReader = artifacts.require("./DataFeedReader.sol");

module.exports = function (deployer) {
  deployer.deploy(DataFeedReader);
};
