// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * @notice This contract is provided "AS IS" without warranties of any kind, as an example and has not been audited.
 * Users are advised to thoroughly test and audit their own implementations
 * before deploying to mainnet or any production environment.
 *
 * @dev This code is intended for educational and illustrative purposes only.
 * Use it at your own risk. The authors are not responsible for any loss of
 * funds or other damages caused by the use of this code.
 */

import {Script, console, stdJson} from "forge-std/Script.sol";
import {Configuration} from "../src/bridge/Configuration.sol";
import {MockERC20} from "../test/mocks/MockERC20.sol";
import {BurnMintERC20} from "@chainlink/contracts/src/v0.8/shared/token/ERC20/BurnMintERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Client} from "@chainlink/contracts-ccip/contracts/libraries/Client.sol";
import {BaseDeployment} from "./BaseDeployment.s.sol";

abstract contract BaseConfiguration is BaseDeployment {
    using stdJson for string;

    struct NetworkAddresses {
        address bridge;
        address configuration;
        address lockReleasePool;
        address burnMintPool;
        address lockableToken;
        address burnMintToken;
    }

    struct ChainInfo {
        uint64 chainSelector;
        NetworkAddresses addresses;
    }

    function loadNetworkAddresses(string memory networkName) internal view returns (NetworkAddresses memory) {
        string memory fileName = string(abi.encodePacked("./script/addresses-", networkName, ".json"));
        string memory json = vm.readFile(fileName);
        
        return NetworkAddresses({
            bridge: json.readAddress(".bridge"),
            configuration: json.readAddress(".configuration"),
            lockReleasePool: json.readAddress(".lockReleasePool"),
            burnMintPool: json.readAddress(".burnMintPool"),
            lockableToken: json.readAddress(".lockableToken"),
            burnMintToken: json.readAddress(".burnMintToken")
        });
    }

    function getAllChainInfo() internal view returns (ChainInfo[3] memory) {
        ChainInfo[3] memory chains;
        
        // Sepolia - use getNetworkConfig for chain selector
        chains[0] = ChainInfo({
            chainSelector: getNetworkConfig("Sepolia").chainSelector,
            addresses: loadNetworkAddresses("Sepolia")
        });
        
        // ArbitrumSepolia - use getNetworkConfig for chain selector
        chains[1] = ChainInfo({
            chainSelector: getNetworkConfig("ArbitrumSepolia").chainSelector,
            addresses: loadNetworkAddresses("ArbitrumSepolia")
        });
        
        // Fuji - use getNetworkConfig for chain selector
        chains[2] = ChainInfo({
            chainSelector: getNetworkConfig("Fuji").chainSelector,
            addresses: loadNetworkAddresses("Fuji")
        });
        
        return chains;
    }

    function setRemoteBridges(
        Configuration configuration, 
        string memory currentNetworkName,
        ChainInfo[3] memory allChains
    ) internal {
        // Get current chain selector from network config (single source of truth)
        uint64 currentChainSelector = getNetworkConfig(currentNetworkName).chainSelector;
        for (uint256 i = 0; i < allChains.length; i++) {
            // Skip self
            if (allChains[i].chainSelector != currentChainSelector) {
                configuration.setRemoteBridge(
                    allChains[i].chainSelector,
                    allChains[i].addresses.bridge
                );
                
                configuration.setExtraArgs(
                    allChains[i].chainSelector,
                    Client._argsToBytes(
                        Client.GenericExtraArgsV2({
                            gasLimit: 300_000,
                            allowOutOfOrderExecution: true
                        })
                    )
                );
            }
        }
    }

    function configureSepoliaDestinationTokens(
        Configuration sepoliaConfig,
        ChainInfo[3] memory allChains
    ) internal {
        console.log("Setting destination tokens for Sepolia");
        
        // Find indices for each chain
        uint256 sepoliaIndex = 0;
        uint256 arbitrumIndex = 1; 
        uint256 fujiIndex = 2;
        
        // Lock and Release with Fuji
        sepoliaConfig.setDestinationToken(
            MockERC20(allChains[sepoliaIndex].addresses.lockableToken),
            allChains[fujiIndex].chainSelector,
            MockERC20(allChains[fujiIndex].addresses.lockableToken)
        );
        
        // Burn and Mint with Fuji
        sepoliaConfig.setDestinationToken(
            IERC20(address(BurnMintERC20(allChains[sepoliaIndex].addresses.burnMintToken))),
            allChains[fujiIndex].chainSelector,
            IERC20(address(BurnMintERC20(allChains[fujiIndex].addresses.burnMintToken)))
        );
        
        // Lock and Mint with ArbitrumSepolia
        sepoliaConfig.setDestinationToken(
            IERC20(address(MockERC20(allChains[sepoliaIndex].addresses.lockableToken))),
            allChains[arbitrumIndex].chainSelector,
            IERC20(address(BurnMintERC20(allChains[arbitrumIndex].addresses.burnMintToken)))
        );
    }

    function configureArbitrumSepoliaDestinationTokens(
        Configuration arbitrumConfig,
        ChainInfo[3] memory allChains
    ) internal {
        console.log("Setting destination tokens for ArbitrumSepolia");
        
        // Find indices for each chain
        uint256 sepoliaIndex = 0;
        uint256 arbitrumIndex = 1;
        
        // Burn and Release with Sepolia
        arbitrumConfig.setDestinationToken(
            IERC20(address(BurnMintERC20(allChains[arbitrumIndex].addresses.burnMintToken))),
            allChains[sepoliaIndex].chainSelector,
            IERC20(address(MockERC20(allChains[sepoliaIndex].addresses.lockableToken)))
        );
    }

    function configureFujiDestinationTokens(
        Configuration fujiConfig,
        ChainInfo[3] memory allChains
    ) internal {
        console.log("Setting destination tokens for Fuji");
        
        // Find indices for each chain
        uint256 sepoliaIndex = 0;
        uint256 fujiIndex = 2;
        
        // Lock and Release with Sepolia
        fujiConfig.setDestinationToken(
            MockERC20(allChains[fujiIndex].addresses.lockableToken),
            allChains[sepoliaIndex].chainSelector,
            MockERC20(allChains[sepoliaIndex].addresses.lockableToken)
        );
        
        // Burn and Mint with Sepolia
        fujiConfig.setDestinationToken(
            IERC20(address(BurnMintERC20(allChains[fujiIndex].addresses.burnMintToken))),
            allChains[sepoliaIndex].chainSelector,
            IERC20(address(BurnMintERC20(allChains[sepoliaIndex].addresses.burnMintToken)))
        );
    }
} 