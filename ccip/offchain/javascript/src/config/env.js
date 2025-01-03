const { supportedNetworks } = require("./ccip");

const getRpcUrlName = (network) =>
  network.replace(/([A-Z])/g, "_$1").toUpperCase() + "_RPC_URL";

const getProviderRpcUrl = (network) => {
  require("@chainlink/env-enc").config();
  if (!supportedNetworks.includes(network))
    throw new Error(
      `[ERROR] Network '${network}' is not supported. Supported networks: ${supportedNetworks.join(", ")}`
    );

  const environmentVariableName = getRpcUrlName(network);
  const rpcUrl = process.env[environmentVariableName];

  if (!rpcUrl)
    throw new Error(
      `[ERROR] RPC URL not found for network '${network}'. Please set ${environmentVariableName} in your environment variables`
    );
  return rpcUrl;
};

const getPrivateKey = () => {
  require("@chainlink/env-enc").config();
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey)
    throw new Error(
      `[ERROR] PRIVATE_KEY not found in environment variables. Please set PRIVATE_KEY using chainlink env-enc`
    );
  return privateKey;
};

module.exports = {
  getPrivateKey,
  getProviderRpcUrl,
};
