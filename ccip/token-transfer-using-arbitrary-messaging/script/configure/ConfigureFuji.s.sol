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

import {BaseConfiguration} from "../BaseConfiguration.s.sol";
import {console} from "forge-std/console.sol";
import {Configuration} from "../../src/bridge/Configuration.sol";

contract ConfigureFuji is BaseConfiguration {
    function run() external {
        // Create fork for Fuji network
        string memory rpcUrl = vm.envString("AVALANCHE_FUJI_RPC_URL");
        vm.createSelectFork(rpcUrl);
        
        // Get deployer private key
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        // Load all chain information from addresses.json
        ChainInfo[3] memory allChains = getAllChainInfo();
        
        // Get Fuji configuration contract
        Configuration fujiConfig = Configuration(allChains[2].addresses.configuration);
        
        // Start broadcasting transactions
        vm.startBroadcast(deployerPrivateKey);
        
        // Set remote bridges for other chains
        setRemoteBridges(fujiConfig, "Fuji", allChains);
        
        // Configure destination tokens specific to Fuji
        configureFujiDestinationTokens(fujiConfig, allChains);
        
        // Stop broadcasting
        vm.stopBroadcast();
        
        console.log("Fuji remote bridges set");
        console.log("=== Fuji Configuration Complete ===");
    }
} 