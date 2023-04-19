const ethcrypto = require("eth-crypto");
const axios = require("axios");
const fs = require("fs").promises;
const prompt = require("prompt-sync")();

async function main() {
  // Provider config currently set for Polygon Mumbai
  // Optionally use one of the other ethers providers
  // https://docs.ethers.org/v6/api/providers/

  let provider;
  try {
    // Try Ethers v6 provider
    provider = new ethers.JsonRpcProvider(process.env.MUMBAI_RPC_URL);
  } catch (e) {
    if (e instanceof TypeError) {
      // Try Ethers v5 provider
      console.log("Using Ethers v5 provider format.");
      provider = new ethers.providers.JsonRpcProvider(
        process.env.MUMBAI_RPC_URL
      );
    } else {
      console.log(e);
    }
  }

  // Get private wallet key from the .env file
  const signerPrivateKey = process.env.PRIVATE_KEY;
  const signer = new ethers.Wallet(signerPrivateKey, provider);

  // Consumer contract
  const consumerAddress = "your-deployed-functions-consumer-address";
  const consumerAbiPath =
    "./artifacts/contracts/FunctionsConsumer.sol/FunctionsConsumer.json";
  const contractAbi = JSON.parse(
    await fs.readFile(consumerAbiPath, "utf8")
  ).abi;
  const consumerContract = new ethers.Contract(
    consumerAddress,
    contractAbi,
    signer
  );

  // Transaction config
  const gasLimit = 250000; // Transaction gas limit
  const verificationBlocks = 2; // Number of blocks to wait for transaction

  // Chainlink Functions request config
  // Chainlink Functions subscription ID
  const subscriptionId = "your-subscription-id";
  // Gas limit for the Chainlink Functions request
  const requestGas = 5500000;

  // Default example
  const source = await fs.readFile("./Functions-request-source.js", "utf8");
  const args = ["ETH", "USD"];

  // Tutorial 6
  //const source = await fs.readFile('./examples/Functions-source-inline-secrets.js', 'utf8')
  //const args = ["1", "bitcoin", "btc-bitcoin"]
  //const secretsLocation = 0
  //const secrets = { apiKey: process.env.COINMARKETCAP_API_KEY }

  // Tutorial 7
  //const source = await fs.readFile('./examples/Functions-source-inline-secrets.js', 'utf8')
  //const args = ["1", "bitcoin", "btc-bitcoin"]
  //const secretsLocation = 1
  //const secrets = ['https://gist.github.com/dwightjl/0c8b62fc0bc33a6743d3085379ef0ac9/raw/']

  // Create an oracle contract object.
  // Used in this script only to encrypt secrets.
  const oracleAddress = "0xeA6721aC65BCeD841B8ec3fc5fEdeA6141a0aDE4"; // Polygon Mumbai
  const oracleAbiPath =
    "./artifacts/contracts/dev/functions/FunctionsOracle.sol/FunctionsOracle.json";
  const oracleAbi = JSON.parse(await fs.readFile(oracleAbiPath, "utf8")).abi;
  const oracle = new ethers.Contract(oracleAddress, oracleAbi, signer);

  let encryptedSecrets;
  if (
    typeof secrets !== "undefined" &&
    typeof secretsLocation !== "undefined"
  ) {
    encryptedSecrets = await getEncryptedSecrets(
      secrets,
      secretsLocation,
      oracle,
      signerPrivateKey
    );
  } else {
    encryptedSecrets = "0x";
    secretsLocation = 0;
  }

  // Confirm request
  console.log("Request generated without errors");
  let proceed = prompt("Send request? (y/N) ");
  if (proceed != "y" && proceed != "Y") {
    console.log("Exiting without sending a request.");
    process.exit(0);
  }

  // Submit the request
  // Order of the parameters is critical
  const requestTx = await consumerContract.executeRequest(
    source,
    encryptedSecrets ?? "0x",
    args ?? [], // Chainlink Functions request args
    subscriptionId, // Subscription ID
    gasLimit, // Gas limit for the transaction
    (overrides = {
      //Gas limit for the Chainlink Functions request
      gasLimit: requestGas,
    })
  );

  // If a response is not received within 5 minutes, the request has failed
  setTimeout(
    () =>
      reject(
        "A response not received within 5 minutes of the request " +
          "being initiated and has been canceled. Your subscription " +
          "was not charged. Please make a new request."
      ),
    300_000
  );
  console.log(
    `Waiting ${verificationBlocks} blocks for transaction ` +
      `${requestTx.hash} to be confirmed...`
  );

  // TODO: Need a better way to print this. Works on some requests and not others
  // Doesn't handle subscription balance errors correctly
  const requestTxReceipt = await requestTx.wait(verificationBlocks);
  try {
    // Try ethers v6 logs
    requestId = requestTxReceipt.logs[2].args.id;
    console.log(`\nRequest ${requestId} initiated`);
  } catch (e) {
    if (e instanceof TypeError) {
      // Try ethers v5 events
      requestId = requestTxReceipt.events[2].args.id;
      console.log(requestId);
    } else {
      console.log(e);
      console.log("Could not read tx receipt. Skipping...");
    }
  }

  console.log(`Waiting for fulfillment...\n`);

  // TODO: Detect when the fulfillment is done rather than pausing
  await new Promise((r) => setTimeout(r, 30000));

  // Check for errors
  let latestError = await consumerContract.latestError();
  if (latestError.length > 0 && latestError !== "0x") {
    const errorString = Buffer.from(latestError.slice(2), "hex").toString();
    console.log(
      `\nOn-chain error message: ${Buffer.from(
        latestError.slice(2),
        "hex"
      ).toString()}`
    );
  }

  // Decode and print the latest response
  let latestResponse = await consumerContract.latestResponse();
  if (latestResponse.length > 0 && latestResponse !== "0x") {
    latestResponse = BigInt(await latestResponse).toString();
    console.log("Stored value is: " + latestResponse);
  }
}

// Encrypt the secrets as defined in requestConfig
// This is a modified version of buildRequest.js from the starter kit:
// ./FunctionsSandboxLibrary/buildRequest.js
// Expects one of the following:
//   - A JSON object with { apiKey: 'your_secret_here' }
//   - An array of secretsURLs
async function getEncryptedSecrets(
  secrets,
  secretsLocation,
  oracle,
  signerPrivateKey = null
) {
  // Fetch the DON public key from on-chain
  let DONPublicKey = await oracle.getDONPublicKey();
  // Remove the preceding 0x from the DON public key
  DONPublicKey = DONPublicKey.slice(2);

  // If the secrets object is empty, do nothing, else encrypt secrets
  if (secretsLocation == 0 && Object.keys(secrets).length > 0) {
    if (!signerPrivateKey) {
      throw Error("signerPrivateKey is required to encrypt inline secrets");
    }
    if (typeof secrets !== "object") {
      throw Error(
        "Unsupported inline secrets format. Inline secrets must be an object"
      );
    }
    return (
      "0x" +
      (await (0, encryptWithSignature)(
        signerPrivateKey,
        DONPublicKey,
        JSON.stringify(secrets)
      ))
    );
  }
  if (secretsLocation == 1 && secrets.length > 0) {
    if (secretsLocation !== 1) {
      throw Error(
        "secretsLocation is not correctly set for off-chain secrets. " +
          "Set secretsLocation to 1 to encrypt inline secrets."
      );
    }
    if (!Array.isArray(secrets)) {
      throw Error(
        "Unsupported remote secrets format.  Remote secrets must be an array."
      );
    }
    // Verify off-chain secrets and encrypt if verified
    if (await verifyOffchainSecrets(secrets, oracle)) {
      return "0x" + (await (0, encrypt)(DONPublicKey, secrets.join(" ")));
    } else {
      throw Error("Could not verify off-chain secrets.");
    }
  }

  // Return 0x if no secrets need to be encrypted
  return "0x";
}

// Check each URL in secretsURLs to make sure it is available
// Code is from ./tasks/Functions-client/buildRequestJSON.js
// in the starter kit.
async function verifyOffchainSecrets(secretsURLs, oracle) {
  const [nodeAddresses] = await oracle.getAllNodePublicKeys();
  const offchainSecretsResponses = [];
  for (const url of secretsURLs) {
    try {
      const response = await axios.request({
        url,
        timeout: 3000,
        responseType: "json",
        maxContentLength: 1000000,
      });
      offchainSecretsResponses.push({
        url,
        secrets: response.data,
      });
    } catch (error) {
      throw Error(`Failed to fetch off-chain secrets from ${url}\n${error}`);
    }
  }

  for (const { secrets, url } of offchainSecretsResponses) {
    if (
      JSON.stringify(secrets) !==
      JSON.stringify(offchainSecretsResponses[0].secrets)
    ) {
      throw Error(
        `Off-chain secrets URLs ${url} and ${offchainSecretsResponses[0].url} ` +
          `do not contain the same JSON object. All secrets URLs must have an ` +
          `identical JSON object.`
      );
    }

    for (const nodeAddress of nodeAddresses) {
      if (!secrets[nodeAddress.toLowerCase()]) {
        if (!secrets["0x0"]) {
          throw Error(
            `No secrets specified for node ${nodeAddress.toLowerCase()} and ` +
              `no default secrets found.`
          );
        }
        console.log(
          `WARNING: No secrets found for node ${nodeAddress.toLowerCase()}. ` +
            `That node will use default secrets specified by the "0x0" entry.`
        );
      }
    }
  }
  return true;
}

// Encrypt with the signer private key for sending secrets through an on-chain contract
// Code is from ./FunctionsSandboxLibrary/encryptSecrets.js
async function encryptWithSignature(
  signerPrivateKey,
  readerPublicKey,
  message
) {
  const signature = ethcrypto.default.sign(
    signerPrivateKey,
    ethcrypto.default.hash.keccak256(message)
  );
  const payload = {
    message,
    signature,
  };
  return await (0, encrypt)(readerPublicKey, JSON.stringify(payload));
}

// Encrypt with the DON public key
// Code is from ./FunctionsSandboxLibrary/encryptSecrets.js
async function encrypt(readerPublicKey, message) {
  const encrypted = await ethcrypto.default.encryptWithPublicKey(
    readerPublicKey,
    message
  );
  return ethcrypto.default.cipher.stringify(encrypted);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
