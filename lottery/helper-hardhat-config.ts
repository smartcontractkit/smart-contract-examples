export interface networkConfigItem {
    name?: string
    subscriptionId?: string 
    gasLane?: string 
    keepersUpdateInterval?: string 
    raffleEntranceFee?: string 
    callbackGasLimit?: string 
    vrfCoordinatorV2?: string
  }
  
export interface networkConfigInfo {
    [key: number]: networkConfigItem
}

export const networkConfig: networkConfigInfo = {
    31337: {
        name: "localhost",
        subscriptionId: "588",
        gasLane: "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc", // 30 gwei
        keepersUpdateInterval: "30",
        raffleEntranceFee: "100000000000000000", // 0.1 ETH
        callbackGasLimit: "500000", // 500,000 gas
    },
    4: {
        name: "rinkeby",
        subscriptionId: "588",
        gasLane: "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc", // 30 gwei
        keepersUpdateInterval: "30",
        raffleEntranceFee: "100000000000000000", // 0.1 ETH
        callbackGasLimit: "500000", // 500,000 gas
        vrfCoordinatorV2: "0x6168499c0cFfCaCD319c818142124B7A15E857ab"
    },
    1: {
        name: "mainnet",
        keepersUpdateInterval: "30",
    },
}

export const developmentChains = ["hardhat", "localhost"]
export const VERIFICATION_BLOCK_CONFIRMATIONS = 6
export const frontEndContractsFile = "../nextjs-smartcontract-lottery-fcc/constants/contractAddresses.json"

