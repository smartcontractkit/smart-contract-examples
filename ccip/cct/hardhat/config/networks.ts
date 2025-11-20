import * as envEnc from "@chainlink/env-enc";
envEnc.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const PRIVATE_KEY_2 = process.env.PRIVATE_KEY_2;
const accounts: string[] = [];
if (PRIVATE_KEY) accounts.push(PRIVATE_KEY);
if (PRIVATE_KEY_2) accounts.push(PRIVATE_KEY_2);

export const configData: Record<string, {
    chainFamily: string;
    chainId: number | string;
    chainSelector: string;
    router?: string;
    rmnProxy?: string;
    tokenAdminRegistry?: string;
    registryModuleOwnerCustom?: string;
    link?: string;
    confirmations?: number;
    nativeCurrencySymbol?: string;
    chainType?: string; // Optional - will be auto-generated
}> = {
    avalancheFuji: {
        chainId: 43113,
        chainSelector: "14767482510784806043",
        router: "0xF694E193200268f9a4868e4Aa017A0118C9a8177",
        rmnProxy: "0xAc8CFc3762a979628334a0E4C1026244498E821b",
        tokenAdminRegistry: "0xA92053a4a3922084d992fD2835bdBa4caC6877e6",
        registryModuleOwnerCustom: "0x97300785aF1edE1343DB6d90706A35CF14aA3d81",
        link: "0x0b9d5D9136855f6FEc3c0993feE6E9CE8a297846",
        confirmations: 2,
        nativeCurrencySymbol: "AVAX",
        chainFamily: "evm"
    },
    arbitrumSepolia: {
        chainId: 421614,
        chainSelector: "3478487238524512106",
        router: "0x2a9C5afB0d0e4BAb2BCdaE109EC4b0c4Be15a165",
        rmnProxy: "0x9527E2d01A3064ef6b50c1Da1C0cC523803BCFF2",
        tokenAdminRegistry: "0x8126bE56454B628a88C17849B9ED99dd5a11Bd2f",
        registryModuleOwnerCustom: "0xE625f0b8b0Ac86946035a7729Aba124c8A64cf69",
        link: "0xb1D4538B4571d411F07960EF2838Ce337FE1E80E",
        confirmations: 2,
        nativeCurrencySymbol: "ETH",
        chainFamily: "evm"
    },
    ethereumSepolia: {
        chainId: 11155111,
        chainSelector: "16015286601757825753",
        router: "0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59",
        rmnProxy: "0xba3f6251de62dED61Ff98590cB2fDf6871FbB991",
        tokenAdminRegistry: "0x95F29FEE11c5C55d26cCcf1DB6772DE953B37B82",
        registryModuleOwnerCustom: "0x62e731218d0D47305aba2BE3751E7EE9E5520790",
        link: "0x779877A7B0D9E8603169DdbD7836e478b4624789",
        confirmations: 3,
        nativeCurrencySymbol: "ETH",
        chainFamily: "evm"
    },
    baseSepolia: {
        chainId: 84532,
        chainSelector: "10344971235874465080",
        router: "0xD3b06cEbF099CE7DA4AcCf578aaebFDBd6e88a93",
        rmnProxy: "0x99360767a4705f68CcCb9533195B761648d6d807",
        tokenAdminRegistry: "0x736D0bBb318c1B27Ff686cd19804094E66250e17",
        registryModuleOwnerCustom: "0x8A55C61227f26a3e2f217842eCF20b52007bAaBe",
        link: "0xE4aB69C077896252FAFBD49EFD26B5D171A32410",
        confirmations: 2,
        nativeCurrencySymbol: "ETH",
        chainFamily: "evm"
    },
    polygonAmoy: {
        chainId: 80002,
        chainSelector: "16281711391670634445",
        router: "0x9C32fCB86BF0f4a1A8921a9Fe46de3198bb884B2",
        rmnProxy: "0x7c1e545A40750Ee8761282382D51E017BAC68CBB",
        tokenAdminRegistry: "0x1e73f6842d7afDD78957ac143d1f315404Dd9e5B",
        registryModuleOwnerCustom: "0x84ad5890A63957C960e0F19b0448A038a574936B",
        link: "0x0Fd9e8d3aF1aaee056EB9e802c3A762a667b1904",
        confirmations: 3,
        nativeCurrencySymbol: "POL",
        chainFamily: "evm"
    },
    solanaDevnet: {
        chainId: "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG",
        chainSelector: "16423721717087811551",
        chainType: "generic",
        chainFamily: "svm"
    },
    bscTestnet: {
        chainFamily: "evm",
        chainId: 97,
        chainSelector: "13264668187771770619",
        router: "0xE1053aE1857476f36A3C62580FF9b016E8EE8F6f",
        rmnProxy: "0xA8C0c11bf64AF62CDCA6f93D3769B88BdD7cb93D",
        tokenAdminRegistry: "0xF8f2A4466039Ac8adf9944fD67DBb3bb13888f2B",
        registryModuleOwnerCustom: "0x763685240370758c5ac6C5F7c22AB36684c0570E",
        link: "0x84b9B910527Ad5C03A9Ca831909E21e236EA7b06",
        confirmations: 3,
        nativeCurrencySymbol: "BNB",
    }
};

// Smart defaults for chainType based on network characteristics
function getDefaultChainType(networkName: string): string {
    if (networkName.includes('base') || networkName.includes('optimism')) {
        return "op";
    }
    if (networkName.includes('solana') || networkName.includes('svm')) {
        return "generic";
    }
    return "l1"; // Default for most EVM chains
}

// Generate Hardhat networks from configData (EVM only)
const networks: Record<string, any> = {};

for (const [name, config] of Object.entries(configData)) {
    if (config.chainFamily === "evm") {
        const envVarName = `${name.replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase()}_RPC_URL`;
        networks[name] = {
            type: "http" as const,
            ...config,
            // Apply smart default for chainType if not specified
            chainType: config.chainType || getDefaultChainType(name),
            url: process.env[envVarName] || `https://UNSET-PLEASE-SET-${envVarName}`,
            gasPrice: undefined,
            nonce: undefined,
            accounts,
            // Add timeout and retry settings for better RPC reliability
            timeout: 60000, // 60 seconds timeout for requests
            httpHeaders: {},
        };
    }
}

export { networks };

