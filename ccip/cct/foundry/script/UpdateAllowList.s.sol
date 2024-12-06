// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {TokenPool} from "@chainlink/contracts-ccip/src/v0.8/ccip/pools/TokenPool.sol";

contract UpdateAllowList is Script {
    function run(address poolAddress, address[] memory addressesToAdd, address[] memory addressesToRemove) external {
        // Validate the pool address
        require(poolAddress != address(0), "Invalid pool address");

        // Instantiate the TokenPool contract
        TokenPool poolContract = TokenPool(poolAddress);

        // Check if allow list is enabled for this pool
        bool allowListEnabled = poolContract.getAllowListEnabled();
        if (!allowListEnabled) {
            console.log("Allow list is not enabled for pool at", poolAddress);
            console.log("This pool was deployed without allow list functionality.");
            console.log("To use allow list, you need to deploy a new pool with initial allow list addresses.");
            return;
        }

        // Validate all addresses in both lists
        for (uint256 i = 0; i < addressesToAdd.length; i++) {
            require(addressesToAdd[i] != address(0), "Invalid address in add list");
        }
        for (uint256 i = 0; i < addressesToRemove.length; i++) {
            require(addressesToRemove[i] != address(0), "Invalid address in remove list");
        }

        // Log the operations being performed
        console.log("Updating allow list for pool at", poolAddress);
        if (addressesToAdd.length > 0) {
            console.log("Adding addresses:");
            for (uint256 i = 0; i < addressesToAdd.length; i++) {
                console.log("  ", addressesToAdd[i]);
            }
        }
        if (addressesToRemove.length > 0) {
            console.log("Removing addresses:");
            for (uint256 i = 0; i < addressesToRemove.length; i++) {
                console.log("  ", addressesToRemove[i]);
            }
        }

        // Start broadcasting transactions
        vm.startBroadcast();

        // Execute the transaction to update the allow list
        poolContract.applyAllowListUpdates(addressesToRemove, addressesToAdd);

        // Stop broadcasting
        vm.stopBroadcast();

        // Log success
        console.log("Allow list updated successfully");
    }
}
