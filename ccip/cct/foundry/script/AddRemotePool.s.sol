// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {HelperUtils} from "./utils/HelperUtils.s.sol"; // Utility functions for JSON parsing and chain info
import {HelperConfig} from "./HelperConfig.s.sol"; // Network configuration helper
import {TokenPool} from "@chainlink/contracts-ccip/src/v0.8/ccip/pools/TokenPool.sol";

contract AddRemotePool is Script {
    function run(address poolAddress, uint256 remoteChainId, address remotePoolAddress) external {
        HelperConfig helperConfig = new HelperConfig();
        HelperConfig.NetworkConfig memory remoteNetworkConfig =
            HelperUtils.getNetworkConfig(helperConfig, remoteChainId);

        // Validate that configurations exist
        require(remoteNetworkConfig.chainSelector != 0, "Remote network configuration not found");

        uint64 remoteChainSelector = remoteNetworkConfig.chainSelector;

        // Validate the pool addresses
        require(poolAddress != address(0), "Invalid pool address");
        require(remotePoolAddress != address(0), "Invalid remote pool address");

        // Log the operation
        console.log("Adding remote pool", remotePoolAddress);
        console.log("For remote chain ID:", remoteChainId);
        console.log("Remote chain selector:", uint256(remoteChainSelector));
        console.log("To local pool:", poolAddress);

        // Start broadcasting
        vm.startBroadcast();

        // Instantiate the TokenPool contract
        TokenPool poolContract = TokenPool(poolAddress);

        // Encode the remote pool address
        bytes memory encodedRemotePoolAddress = abi.encode(remotePoolAddress);

        // Call addRemotePool
        poolContract.addRemotePool(remoteChainSelector, encodedRemotePoolAddress);

        // Log success
        console.log("Remote pool added successfully");

        vm.stopBroadcast();
    }
}
