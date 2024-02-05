// Imports
const ethers = await import("npm:ethers@6.10.0");

// Constants
const RPC_URL = "https://ethereum.publicnode.com";
const CONTRACT_ADDRESS = "0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c";

// Data Feeds ABI
const abi = [
  {
    inputs: [],
    name: "decimals",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "description",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint80", name: "_roundId", type: "uint80" }],
    name: "getRoundData",
    outputs: [
      { internalType: "uint80", name: "roundId", type: "uint80" },
      { internalType: "int256", name: "answer", type: "int256" },
      { internalType: "uint256", name: "startedAt", type: "uint256" },
      { internalType: "uint256", name: "updatedAt", type: "uint256" },
      { internalType: "uint80", name: "answeredInRound", type: "uint80" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "latestRoundData",
    outputs: [
      { internalType: "uint80", name: "roundId", type: "uint80" },
      { internalType: "int256", name: "answer", type: "int256" },
      { internalType: "uint256", name: "startedAt", type: "uint256" },
      { internalType: "uint256", name: "updatedAt", type: "uint256" },
      { internalType: "uint80", name: "answeredInRound", type: "uint80" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "version",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
];

// Chainlink Functions compatible Ethers JSON RPC provider class
// (this is required for making Ethers RPC calls with Chainlink Functions)
class FunctionsJsonRpcProvider extends ethers.JsonRpcProvider {
  constructor(url) {
    super(url);
    this.url = url;
  }
  async _send(payload) {
    let resp = await fetch(this.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return resp.json();
  }
}

const provider = new FunctionsJsonRpcProvider(RPC_URL);
const dataFeedContract = new ethers.Contract(CONTRACT_ADDRESS, abi, provider);
const dataFeedResponse = await dataFeedContract.latestRoundData();
const decimals = await dataFeedContract.decimals();
const description = await dataFeedContract.description();

console.log(`Fetched BTC / USD price: dataFeedResponse.answer`);
console.log(`Updated at: ${dataFeedResponse.updatedAt}`);
console.log(`Decimals: ${decimals}`);
console.log(`Description: ${description}`);

// ABI encoding
const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
  ["uint256", "uint256", "uint8", "string"],
  [dataFeedResponse.answer, dataFeedResponse.updatedAt, decimals, description]
);

// return the encoded data as Uint8Array
return ethers.getBytes(encoded);
