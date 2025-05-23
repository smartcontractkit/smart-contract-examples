// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {HelperUtils} from "./utils/HelperUtils.s.sol"; // Utility functions for JSON parsing and chain info
import {HelperConfig} from "./HelperConfig.s.sol"; // Network configuration helper
import {TokenPool} from "@chainlink/contracts-ccip/contracts/pools/TokenPool.sol";

contract RemoveRemotePool is Script {
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

        // Log the operation with a warning
        console.log("WARNING: Removing a remote pool will reject all inflight transactions from that pool");
        console.log("Removing remote pool:", remotePoolAddress);
        console.log("For remote chain ID:", remoteChainId);
        console.log("Remote chain selector:", uint256(remoteChainSelector));
        console.log("From local pool:", poolAddress);

        // Get the signer address (the account running the script)
        address signer = vm.addr(uint256(vm.envBytes32("PRIVATE_KEY")));

        // Instantiate the TokenPool contract
        TokenPool poolContract = TokenPool(poolAddress);

        // Check if the signer is the owner of the TokenPool
        address owner = poolContract.owner();
        console.log("Owner of the TokenPool contract:", owner);
        require(owner == signer, "Caller is not the owner of the TokenPool contract");

        // Start broadcasting
        vm.startBroadcast();

        // Encode the remote pool address
        bytes memory encodedRemotePoolAddress = abi.encode(remotePoolAddress);

        // Call removeRemotePool
        poolContract.removeRemotePool(remoteChainSelector, encodedRemotePoolAddress);

        // Log success
        console.log("Remote pool removed successfully");

        // Stop broadcasting
        vm.stopBroadcast();
    }
}
