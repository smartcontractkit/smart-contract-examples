import { ethers } from 'ethers';

export async function getETHPrice() {
    // Create provider for interacting with the Ethereum network
    // REPLACE RPC_URL_HERE WITH THE URL OF THE ETHEREUM NETWORK YOU ARE USING
    const provider = new ethers.providers.JsonRpcProvider('RPC_URL_HERE');
    // This constant describes the ABI interface of the contract which will provide the price of ETH
    // It looks like alot, and it is, but this information is generated when we compile the contract
    // We need to let ethers know how to interact with this contract.
    const aggregatorV3InterfaceABI = [
        {
            inputs: [],
            name: 'decimals',
            outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
            stateMutability: 'view',
            type: 'function'
        },
        {
            inputs: [],
            name: 'description',
            outputs: [{ internalType: 'string', name: '', type: 'string' }],
            stateMutability: 'view',
            type: 'function'
        },
        {
            inputs: [{ internalType: 'uint80', name: '_roundId', type: 'uint80' }],
            name: 'getRoundData',
            outputs: [
                { internalType: 'uint80', name: 'roundId', type: 'uint80' },
                { internalType: 'int256', name: 'answer', type: 'int256' },
                { internalType: 'uint256', name: 'startedAt', type: 'uint256' },
                { internalType: 'uint256', name: 'updatedAt', type: 'uint256' },
                { internalType: 'uint80', name: 'answeredInRound', type: 'uint80' }
            ],
            stateMutability: 'view',
            type: 'function'
        },
        {
            inputs: [],
            name: 'latestRoundData',
            outputs: [
                { internalType: 'uint80', name: 'roundId', type: 'uint80' },
                { internalType: 'int256', name: 'answer', type: 'int256' },
                { internalType: 'uint256', name: 'startedAt', type: 'uint256' },
                { internalType: 'uint256', name: 'updatedAt', type: 'uint256' },
                { internalType: 'uint80', name: 'answeredInRound', type: 'uint80' }
            ],
            stateMutability: 'view',
            type: 'function'
        },
        {
            inputs: [],
            name: 'version',
            outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
            stateMutability: 'view',
            type: 'function'
        }
    ];
    // The address of the contract which will provide the price of ETH on Kovan
    const addr = '0x9326BFA02ADD2366b30bacB125260Af641031331';
    // We create an instance of the contract which we can interact with
    const priceFeed = new ethers.Contract(addr, aggregatorV3InterfaceABI, provider);
    // We get the data from the last round of the contract 
    let roundData = await priceFeed.latestRoundData();
    // Determine how many decimals the price feed has (10**decimals)
    let decimals = await priceFeed.decimals();
    // We convert the price to a number and return it
    return Number((roundData.answer.toString() / Math.pow(10, decimals)).toFixed(2));
}