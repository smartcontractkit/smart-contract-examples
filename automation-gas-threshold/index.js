const { ethers } = require('ethers');
const cbor = require('cbor');

// Replace with your own provider
const provider = new ethers.providers.JsonRpcProvider('YOUR_RPC_URL');
const privateKey = 'YOUR_PRIVATE_KEY'; // Replace with your wallet private key
const wallet = new ethers.Wallet('0x...privateKey', provider);

// Replace with the upkeep ID you want to use
const id = 'YOUR_UPKEEP_ID';

// The string to be encoded, representing your offchain config
// maxGasPrice is in wei. Do not use quotation marks around the value.
const offchainConfig = {"maxGasPrice":2000000000};


// The contract address and ABI
const contractAddress = 'RegistryAddress';
// Registry v2.1 ABI from NPM
const abi = [
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "id",
                "type": "uint256"
            },
            {
                "internalType": "bytes",
                "name": "config",
                "type": "bytes"
            }
        ],
        "name": "setUpkeepOffchainConfig",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];

// Initialize the contract
const contract = new ethers.Contract(contractAddress, abi, wallet);

// Encode the string to CBOR
const encodedConfig = cbor.encode(offchainConfig);
const hexConfig = encodedConfig.toString('hex');
    
// Add the 0x prefix
const hexConfigWithPrefix = '0x' + hexConfig;

console.log('hexConfigWithPrefix:', hexConfigWithPrefix);

// The function to call the contract
async function setUpkeepOffchainConfig() {
    try {
        const tx = await contract.setUpkeepOffchainConfig(id, hexConfigWithPrefix);
        console.log('Transaction hash:', tx.hash);

        // Wait for the transaction to be mined
        const receipt = await tx.wait();
        console.log('Transaction was mined in block:', receipt.blockNumber);
    } catch (error) {
        console.error('Error sending transaction:', error);
    }
}

// Call the function
setUpkeepOffchainConfig();