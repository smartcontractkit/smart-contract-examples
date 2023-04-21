const ethcrypto = require("eth-crypto");
const axios = require("axios");
const fs = require("fs").promises;

async function main() {
  // Provider config currently set for Polygon Mumbai

  const provider = new ethers.providers.JsonRpcProvider(
    process.env.MUMBAI_RPC_URL
  );

  // Get private wallet key from the .env file
  const signerPrivateKey = process.env.PRIVATE_KEY;
  const signer = new ethers.Wallet(signerPrivateKey, provider);

  // Consumer contract
  const consumerAddress = "your_consumer_address";
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
  const subscriptionId = "your_subscription_id";
  // Gas limit for the Chainlink Functions request
  const requestGas = 5500000;

  // Default example
  const source = await fs.readFile("./Functions-request-source.js", "utf8");
  const args = ["ETH", "USD"];

  // Tutorial 6
  //   const source = await fs.readFile(
  //     "./examples/Functions-source-inline-secrets.js",
  //     "utf8"
  //   );
  //   const args = ["1", "bitcoin", "btc-bitcoin"];
  //   const secrets = { apiKey: process.env.COINMARKETCAP_API_KEY };

  // Tutorial 7
  //   const source = await fs.readFile(
  //     "./examples/Functions-source-inline-secrets.js",
  //     "utf8"
  //   );
  //   const args = ["1", "bitcoin", "btc-bitcoin"];
  //   const secrets = [
  //     "https://clfunctions.s3.eu-north-1.amazonaws.com/offchain-secrets.json",
  //   ];

  // Create an oracle contract object.
  // Used in this script only to encrypt secrets.
  const oracleAddress = "0xeA6721aC65BCeD841B8ec3fc5fEdeA6141a0aDE4"; // Polygon Mumbai
  const oracleAbiPath =
    "./artifacts/contracts/dev/functions/FunctionsOracle.sol/FunctionsOracle.json";
  const oracleAbi = JSON.parse(await fs.readFile(oracleAbiPath, "utf8")).abi;
  const oracle = new ethers.Contract(oracleAddress, oracleAbi, signer);

  let encryptedSecrets;
  let doGistCleanup;
  let gistUrl;
  if (typeof secrets !== "undefined") {
    const result = await getEncryptedSecrets(secrets, oracle, signerPrivateKey);
    if (isObject(secrets)) {
      // inline secrets are uploaded to gist by the script so they must be cleanup at the end of the script
      doGistCleanup = true;
      encryptedSecrets = result.encrypted;
      gistUrl = result.gistUrl;
    } else {
      doGistCleanup = false;
      encryptedSecrets = result;
    }
  } else {
    encryptedSecrets = "0x";
  }

  await new Promise(async (resolve, reject) => {
    let cleanupInProgress = false;
    const cleanup = async () => {
      if (doGistCleanup) {
        if (!cleanupInProgress) {
          cleanupInProgress = true;
          await deleteGist(process.env["GITHUB_API_TOKEN"], gistUrl);
          return resolve();
        }
        return;
      }
      return resolve();
    };

    oracle.on("UserCallbackError", async (eventRequestId, msg) => {
      if (requestId == eventRequestId) {
        console.error(
          "Error encountered when calling fulfillRequest in client contract.\n" +
            "Ensure the fulfillRequest function in the client contract is correct and the --gaslimit is sufficient."
        );
        console.log(`${msg}\n`);
        await cleanup();
      }
    });
    oracle.on("UserCallbackRawError", async (eventRequestId, msg) => {
      if (requestId == eventRequestId) {
        console.error(
          "Raw error in contract request fulfillment. Please contact Chainlink support."
        );
        console.log(Buffer.from(msg, "hex").toString());
        await cleanup();
      }
    });

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

    let requestId;
    consumerContract.on(
      "OCRResponse",
      async (eventRequestId, response, err) => {
        if (requestId === eventRequestId) {
          if (response !== "0x") {
            console.log(
              `Response returned to client contract represented as a hex string: ${BigInt(
                response
              ).toString()}`
            );
          }
          if (err !== "0x") {
            console.log(
              `Error message returned to client contract: "${Buffer.from(
                err.slice(2),
                "hex"
              )}"\n`
            );
          }

          await cleanup();
        }
      }
    );

    console.log(
      `Waiting ${verificationBlocks} blocks for transaction ` +
        `${requestTx.hash} to be confirmed...`
    );

    // TODO: Need a better way to print this. Works on some requests and not others
    // Doesn't handle subscription balance errors correctly
    const requestTxReceipt = await requestTx.wait(verificationBlocks);

    const requestEvent = requestTxReceipt.events.filter(
      (event) => event.event === "RequestSent"
    )[0];

    requestId = requestEvent.args.id;
    console.log(`\nRequest ${requestId} initiated`);

    console.log(`Waiting for fulfillment...\n`);

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
  });
}

// Encrypt the secrets as defined in requestConfig
// This is a modified version of buildRequest.js from the starter kit:
// ./FunctionsSandboxLibrary/buildRequest.js
// Expects one of the following:
//   - A JSON object with { apiKey: 'your_secret_here' }
//   - An array of secretsURLs
async function getEncryptedSecrets(secrets, oracle, signerPrivateKey = null) {
  // Fetch the DON public key from on-chain
  let DONPublicKey = await oracle.getDONPublicKey();
  // Remove the preceding 0x from the DON public key
  DONPublicKey = DONPublicKey.slice(2);

  // If the secrets object is empty, do nothing, else encrypt secrets
  if (isObject(secrets) && secrets) {
    if (!signerPrivateKey) {
      throw Error("signerPrivateKey is required to encrypt inline secrets");
    }

    const offchainSecrets = {};
    offchainSecrets["0x0"] = Buffer.from(
      await (0, encryptWithSignature)(
        signerPrivateKey,
        DONPublicKey,
        JSON.stringify(secrets)
      ),
      "hex"
    ).toString("base64");

    if (
      !process.env["GITHUB_API_TOKEN"] ||
      process.env["GITHUB_API_TOKEN"] === ""
    ) {
      throw Error("GITHUB_API_TOKEN environment variable not set");
    }

    const secretsURL = await createGist(
      process.env["GITHUB_API_TOKEN"],
      offchainSecrets
    );
    console.log(`Successfully created encrypted secrets Gist: ${secretsURL}`);
    return {
      gistUrl: secretsURL,
      encrypted: "0x" + (await (0, encrypt)(DONPublicKey, `${secretsURL}/raw`)),
    };

    //  return [`${secretsURL}/raw`];
  }
  if (secrets.length > 0) {
    // Remote secrets managed by the user
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

// create gist
// code from ./tasks/utils
const createGist = async (githubApiToken, encryptedOffchainSecrets) => {
  await checkTokenGistScope(githubApiToken);

  const content = JSON.stringify(encryptedOffchainSecrets);

  const headers = {
    Authorization: `token ${githubApiToken}`,
  };

  // construct the API endpoint for creating a Gist
  const url = "https://api.github.com/gists";
  const body = {
    public: false,
    files: {
      [`encrypted-functions-request-data-${Date.now()}.json`]: {
        content,
      },
    },
  };

  try {
    const response = await axios.post(url, body, { headers });
    const gistUrl = response.data.html_url;
    return gistUrl;
  } catch (error) {
    console.error("Failed to create Gist", error);
    throw new Error("Failed to create Gist");
  }
};

// code from ./tasks/utils
const checkTokenGistScope = async (githubApiToken) => {
  const headers = {
    Authorization: `Bearer ${githubApiToken}`,
  };

  const response = await axios.get("https://api.github.com/user", { headers });

  if (response.status !== 200) {
    throw new Error(
      `Failed to get user data: ${response.status} ${response.statusText}`
    );
  }
  // Github's newly-added fine-grained token do not currently allow for verifying that the token scope is restricted to Gists.
  // This verification feature only works with classic Github tokens and is otherwise ignored
  const scopes = response.headers["x-oauth-scopes"]?.split(", ");

  if (scopes && scopes?.[0] !== "gist") {
    throw Error(
      "The provided Github API token does not have permissions to read and write Gists"
    );
  }

  if (scopes && scopes.length > 1) {
    console.log(
      "WARNING: The provided Github API token has additional permissions beyond reading and writing to Gists"
    );
  }

  return true;
};

// code from ./tasks/utils
const deleteGist = async (githubApiToken, gistURL) => {
  const headers = {
    Authorization: `Bearer ${githubApiToken}`,
  };

  const gistId = gistURL.match(/\/([a-fA-F0-9]+)$/)[1];

  try {
    const response = await axios.delete(
      `https://api.github.com/gists/${gistId}`,
      { headers }
    );

    if (response.status !== 204) {
      throw new Error(
        `Failed to delete Gist: ${response.status} ${response.statusText}`
      );
    }

    console.log(`Off-chain secrets Gist ${gistURL} deleted successfully`);
    return true;
  } catch (error) {
    console.error(`Error deleting Gist ${gistURL}`, error.response);
    return false;
  }
};

function isObject(value) {
  return (
    value !== null && typeof value === "object" && value.constructor === Object
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
