const fs = require("fs");
const path = require("path");
const { SecretsManager } = require("@chainlink/functions-toolkit");
const ethers = require("ethers");
require("@chainlink/env-enc").config();

const generateOffchainSecretsFile = async () => {
  // hardcoded for Ethereum Sepolia
  const routerAddress = "0xb83E47C2bC239B3bf370bc41e1459A34b41238D0";
  const donId = "fun-ethereum-sepolia-1";

  const secrets = { apiKey: process.env.COINMARKETCAP_API_KEY };

  // Initialize ethers signer and provider to interact with the contracts onchain
  const privateKey = process.env.PRIVATE_KEY; // fetch PRIVATE_KEY
  if (!privateKey)
    throw new Error(
      "private key not provided - check your environment variables"
    );

  const rpcUrl = process.env.ETHEREUM_SEPOLIA_RPC_URL; // fetch Sepolia RPC URL

  if (!rpcUrl)
    throw new Error(`rpcUrl not provided  - check your environment variables`);

  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);

  const wallet = new ethers.Wallet(privateKey);
  const signer = wallet.connect(provider); // create ethers signer for signing transactions
  // Initialize SecretsManager instance
  const secretsManager = new SecretsManager({
    signer: signer,
    functionsRouterAddress: routerAddress,
    donId: donId,
  });
  await secretsManager.initialize();
  // secrets file path
  const rootDir = process.cwd();
  const secretsFilePath = path.resolve(rootDir, "offchain-secrets.json");

  // Encrypt secrets
  const encryptedSecretsObj = await secretsManager.encryptSecrets(
    secrets
  );

  // Write the JSON string to a file
  try {
    fs.writeFileSync(secretsFilePath, JSON.stringify(encryptedSecretsObj));
    console.log("Encrypted secrets object written to " + secretsFilePath);
  } catch (error) {
    console.error(error);
  }
};

generateOffchainSecretsFile().catch((e) => {
  console.error(e);
  process.exit(1);
});
