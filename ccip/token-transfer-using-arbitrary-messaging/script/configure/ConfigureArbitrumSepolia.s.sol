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

import {Configuration} from "../../src/bridge/Configuration.sol";
import {BaseConfiguration} from "../BaseConfiguration.s.sol";
import {console} from "forge-std/console.sol";

contract ConfigureArbitrumSepolia is BaseConfiguration {
    function run() external {
        // Create fork for ArbitrumSepolia network
        string memory rpcUrl = vm.envString("ARBITRUM_SEPOLIA_RPC_URL");
        vm.createSelectFork(rpcUrl);
        
        // Get deployer private key
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        // Load all chain information from addresses.json
        ChainInfo[3] memory allChains = getAllChainInfo();
        
        // Get ArbitrumSepolia configuration contract
        Configuration arbitrumConfig = Configuration(allChains[1].addresses.configuration);
        
        // Start broadcasting transactions
        vm.startBroadcast(deployerPrivateKey);
        
        // Set remote bridges for other chains
        setRemoteBridges(arbitrumConfig, "ArbitrumSepolia", allChains);
        
        // Configure destination tokens specific to ArbitrumSepolia
        configureArbitrumSepoliaDestinationTokens(arbitrumConfig, allChains);
        
        // Stop broadcasting
        vm.stopBroadcast();
        
        console.log("ArbitrumSepolia remote bridges set");
        console.log("=== ArbitrumSepolia Configuration Complete ===");
    }
} 