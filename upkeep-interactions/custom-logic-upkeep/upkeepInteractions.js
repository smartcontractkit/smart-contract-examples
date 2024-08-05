const { ethers } = require('ethers');
require("@chainlink/env-enc").config();

const rpcUrl = process.env.JSON_RPC_URL;
const provider = new ethers.JsonRpcProvider(rpcUrl);

const privateKey = process.env.PRIVATE_KEY; // should be of the wallet which has registered or created upkeep

if (!privateKey)
    throw new Error(
        "private key not provided - check your environment variables"
    );

if (!rpcUrl)
    throw new Error(`rpcUrl not provided  - check your environment variables`);

const wallet = new ethers.Wallet(privateKey, provider);

const commandLineArgs = process.argv.slice(2);

if (commandLineArgs.length == 0) {
    throw new Error('Values of keeperRegistryAddress and linkTokenAddress are not found in command line arguments.')
}

const keeperRegistryAddress = commandLineArgs[0];

const keeperRegistryAbi = [
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "id",
                "type": "uint256"
            },
            {
                "internalType": "uint96",
                "name": "amount",
                "type": "uint96"
            }
        ],
        "name": "addFunds",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "id",
                "type": "uint256"
            }
        ],
        "name": "cancelUpkeep",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "id",
                "type": "uint256"
            }
        ],
        "name": "pauseUpkeep",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "id",
                "type": "uint256"
            },
            {
                "internalType": "uint32",
                "name": "gasLimit",
                "type": "uint32"
            }
        ],
        "name": "setUpkeepGasLimit",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "id",
                "type": "uint256"
            }
        ],
        "name": "unpauseUpkeep",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];

const linkTokenAddress = commandLineArgs[1];
const linkApproveAbi = [
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "spender",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "value",
                "type": "uint256"
            }
        ],
        "name": "approve",
        "outputs": [
            {
                "internalType": "bool",
                "name": "success",
                "type": "bool"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    }
]

const keeperRegistry = new ethers.Contract(keeperRegistryAddress, keeperRegistryAbi, wallet);

async function pauseUpkeep(upkeepId) {
    try {
        const tx = await keeperRegistry.pauseUpkeep(upkeepId);
        const receipt = await tx.wait();
        console.log(`Upkeep is paused successfully. Tx hash: ${receipt.hash}`);
    } catch (error) {
        console.error("Error pausing upkeep:", error);
    }
}

async function unpauseUpkeep(upkeepId) {
    try {
        const tx = await keeperRegistry.unpauseUpkeep(upkeepId);
        const receipt = await tx.wait();
        console.log("Upkeep is unpaused successfully. Tx hash:", receipt.hash);
    } catch (error) {
        console.error("Error unpausing upkeep:", error);
    }
}

async function cancelUpkeep(upkeepId) {
    try {
        const tx = await keeperRegistry.cancelUpkeep(upkeepId);
        const receipt = await tx.wait();
        console.log("Upkeep is cancelled successfully. Tx hash:", receipt.hash);
    } catch (error) {
        console.error("Error cancelling upkeep:", error);
    }
}

async function editGasLimit(upkeepId, newGasLimit) {
    try {
        const tx = await keeperRegistry.setUpkeepGasLimit(upkeepId, newGasLimit);
        const receipt = await tx.wait();
        console.log(`Gas Limit of Upkeep has been edited to ${newGasLimit} successfully. Tx hash:`, receipt.hash);
    } catch (error) {
        console.error("Error editing gas limit:", error);
    }
}

async function addFunds(upkeepId, amount) {
    try {
        if (!linkTokenAddress)
            throw new Error('Value of linkTokenAddress is not found in command line arguments.')
        const linkTokenContract = new ethers.Contract(linkTokenAddress, linkApproveAbi, wallet);
        const approveTx = await linkTokenContract.approve(keeperRegistryAddress, amount);
        const approveReceipt = await approveTx.wait();
        console.log(`${keeperRegistryAddress} has been approved to spend ${ethers.formatUnits(amount)} LINK. Tx hash:`, approveReceipt.hash);

        const addFundsTx = await keeperRegistry.addFunds(upkeepId, amount);
        const addFundsReceipt = await addFundsTx.wait();
        console.log(`Added ${ethers.formatUnits(amount)} LINK to Upkeep. Tx hash:`, addFundsReceipt.hash);
    } catch (error) {
        console.error("Error adding funds to upkeep:", error);
    }
}


// pauseUpkeep("86502595128215309949157444372794354559242501188609088085547613594519497755184");
// unpauseUpkeep("86502595128215309949157444372794354559242501188609088085547613594519497755184");
// addFunds("86502595128215309949157444372794354559242501188609088085547613594519497755184", ethers.parseUnits("1"))
// editGasLimit("86502595128215309949157444372794354559242501188609088085547613594519497755184", "600000")
// cancelUpkeep("86502595128215309949157444372794354559242501188609088085547613594519497755184");