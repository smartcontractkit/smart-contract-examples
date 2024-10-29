// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {HelperUtils} from "./utils/HelperUtils.s.sol"; // Utility functions for JSON parsing and chain info
import {HelperConfig} from "./HelperConfig.s.sol"; // Network configuration helper
import {TokenAdminRegistry} from "@chainlink/contracts-ccip/src/v0.8/ccip/tokenAdminRegistry/TokenAdminRegistry.sol";

// Script contract to set the token pool in the TokenAdminRegistry
contract SetPool is Script {
    function run() external {
        // Get the chain name based on the current chain ID
        string memory chainName = HelperUtils.getChainName(block.chainid);

        // Construct paths to the JSON files containing deployed token and pool addresses
        string memory root = vm.projectRoot();
        string memory deployedTokenPath = string.concat(root, "/script/output/deployedToken_", chainName, ".json");
        string memory deployedPoolPath = string.concat(root, "/script/output/deployedTokenPool_", chainName, ".json");

        // Extract the deployed token and pool addresses from the JSON files
        address tokenAddress =
            HelperUtils.getAddressFromJson(vm, deployedTokenPath, string.concat(".deployedToken_", chainName));
        address poolAddress =
            HelperUtils.getAddressFromJson(vm, deployedPoolPath, string.concat(".deployedTokenPool_", chainName));

        // Fetch the network configuration to get the TokenAdminRegistry address
        HelperConfig helperConfig = new HelperConfig();
        (,,, address tokenAdminRegistry,,,,) = helperConfig.activeNetworkConfig();

        require(tokenAddress != address(0), "Invalid token address");
        require(poolAddress != address(0), "Invalid pool address");
        require(tokenAdminRegistry != address(0), "TokenAdminRegistry is not defined for this network");

        vm.startBroadcast();

        // Instantiate the TokenAdminRegistry contract
        TokenAdminRegistry tokenAdminRegistryContract = TokenAdminRegistry(tokenAdminRegistry);

        // Fetch the token configuration to get the administrator's address
        TokenAdminRegistry.TokenConfig memory config = tokenAdminRegistryContract.getTokenConfig(tokenAddress);
        address tokenAdministratorAddress = config.administrator;

        console.log("Setting pool for token:", tokenAddress);
        console.log("New pool address:", poolAddress);
        console.log("Action performed by admin:", tokenAdministratorAddress);

        // Use the administrator's address to set the pool for the token
        tokenAdminRegistryContract.setPool(tokenAddress, poolAddress);

        console.log("Pool set for token", tokenAddress, "to", poolAddress);

        vm.stopBroadcast();
    }
}
