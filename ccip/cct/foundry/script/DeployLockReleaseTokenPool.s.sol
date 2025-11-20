// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {HelperUtils} from "./utils/HelperUtils.s.sol"; // Utility functions for JSON parsing and chain info
import {HelperConfig} from "./HelperConfig.s.sol"; // Network configuration helper
import {ChainNameResolver} from "./utils/ChainNameResolver.s.sol"; // Chain name resolution utility
import {LockReleaseTokenPool} from "@chainlink/contracts-ccip/contracts/pools/LockReleaseTokenPool.sol";
import {IERC20} from "@chainlink/contracts/src/v0.8/vendor/openzeppelin-solidity/v4.8.3/contracts/token/ERC20/IERC20.sol";

contract DeployLockReleaseTokenPool is Script {
    function run() external {
        ChainNameResolver resolver = new ChainNameResolver();
        // Get the chain name based on the current chain ID
        string memory chainName = resolver.getChainNameSafe(block.chainid);

        // Construct the path to the deployed token JSON file
        string memory root = vm.projectRoot();
        string memory deployedTokenPath = string.concat(root, "/script/output/deployedToken_", chainName, ".json");

        // Extract the deployed token address from the JSON file
        address tokenAddress =
            HelperUtils.getAddressFromJson(vm, deployedTokenPath, string.concat(".deployedToken_", chainName));

        // Fetch network configuration (router and RMN proxy addresses)
        HelperConfig helperConfig = new HelperConfig();
        (, address router, address rmnProxy,,,,,) = helperConfig.activeNetworkConfig();

        // Ensure that the token address, router, and RMN proxy are valid
        require(tokenAddress != address(0), "Invalid token address");
        require(router != address(0) && rmnProxy != address(0), "Router or RMN Proxy not defined for this network");

        vm.startBroadcast();

        // Deploy the LockReleaseTokenPool contract associated with the token
        LockReleaseTokenPool tokenPool = new LockReleaseTokenPool(
            IERC20(tokenAddress),
            18, // The number of decimals of the token
            new address[](0), // Empty array for initial operators
            rmnProxy,
            router
        );

        console.log("Lock & Release token pool deployed to:", address(tokenPool));

        vm.stopBroadcast();

        // Serialize and write the token pool address to a new JSON file
        string memory jsonObj = "internal_key";
        string memory key = string(abi.encodePacked("deployedTokenPool_", chainName));
        string memory finalJson = vm.serializeAddress(jsonObj, key, address(tokenPool));

        string memory poolFileName = string(abi.encodePacked("./script/output/deployedTokenPool_", chainName, ".json"));
        console.log("Writing deployed token pool address to file:", poolFileName);
        vm.writeJson(finalJson, poolFileName);
    }
}
