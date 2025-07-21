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

import {BaseDeployment} from "../BaseDeployment.s.sol";
import {console} from "forge-std/console.sol";

contract DeployFuji is BaseDeployment {
    function run() external {
        // Get network configuration for Fuji
        NetworkConfig memory config = getNetworkConfig("Fuji");
        
        // Create fork for Fuji network
        string memory rpcUrl = vm.envString(config.rpcEnvVar);
        vm.createSelectFork(rpcUrl);
        
        // Get deployer private key
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        // Start broadcasting transactions
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy all contracts for Fuji
        DeployedContracts memory deployed = deployNetworkContracts(config);
        
        // Stop broadcasting
        vm.stopBroadcast();
        
        // Log deployed contracts
        logDeployedContracts(config.name, deployed);
        
        // Save addresses to JSON file
        saveNetworkAddresses(config.name, deployed);
        
        console.log("=== Fuji Deployment Complete ===");
    }
} 