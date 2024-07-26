const { ethers } = require('ethers');
const url = "https://polygon-amoy.g.alchemy.com/v2/ALCHEMY_API_KEY";
const provider = new ethers.JsonRpcProvider(url);

const privateKey = "PRIVATE_KEY"; // should be of the wallet which has registered or created upkeep

const wallet = new ethers.Wallet(privateKey, provider);

// hardcoded for Polygon Amoy network
const keeperRegistryAddress = "0x93C0e201f7B158F503a1265B6942088975f92ce7";

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

const linkTokenAddress = "0x0Fd9e8d3aF1aaee056EB9e802c3A762a667b1904";
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

const linkTokenContract = new ethers.Contract(linkTokenAddress, linkApproveAbi, wallet);

function pauseUpkeep(upkeepId) {
    keeperRegistry.pauseUpkeep(upkeepId).then(async (tx) => {
        const receipt = await tx.wait();
        console.log("Upkeep is paused successfully. Tx hash:", receipt.hash);
    });
}

function unpauseUpkeep(upkeepId) {
    keeperRegistry.unpauseUpkeep(upkeepId).then(async (tx) => {
        const receipt = await tx.wait();
        console.log("Upkeep is unpaused successfully. Tx hash:", receipt.hash);
    });
}

function cancelUpkeep(upkeepId) {
    keeperRegistry.cancelUpkeep(upkeepId).then(async (tx) => {
        const receipt = await tx.wait();
        console.log("Upkeep is cancelled successfully. Tx hash:", receipt.hash);
    });
}

function editGasLimit(upkeepId, newGasLimit) {
    keeperRegistry.setUpkeepGasLimit(upkeepId, newGasLimit).then(async (tx) => {
        const receipt = await tx.wait();
        console.log(`Gas Limit of Upkeep has been edited to ${newGasLimit} successfully. Tx hash:`, receipt.hash);
    });
}

function addFunds(upkeepId, amount) {

    linkTokenContract.approve(keeperRegistryAddress, amount).then(async (tx) => {
        const receipt = await tx.wait();
        console.log(`${keeperRegistryAddress} has been approved to spend ${ethers.formatUnits(amount)} LINK. Tx hash:`, receipt.hash);

        keeperRegistry.addFunds(upkeepId, amount).then(async (tx) => {
            const receipt = await tx.wait();
            console.log(`Added ${ethers.formatUnits(amount)} LINK to Upkeep. Tx hash:`, receipt.hash);
        });
    })

}

// pauseUpkeep("37911478868312250226697535921893891768210554547006807512283982890866473575540");
// unpauseUpkeep("37911478868312250226697535921893891768210554547006807512283982890866473575540");
// addFunds("37911478868312250226697535921893891768210554547006807512283982890866473575540", ethers.parseUnits("0.1"))
// editGasLimit("37911478868312250226697535921893891768210554547006807512283982890866473575540", "600000")
// cancelUpkeep("37911478868312250226697535921893891768210554547006807512283982890866473575540");