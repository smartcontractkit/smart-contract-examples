// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {TokenPool} from "@chainlink/contracts-ccip/src/v0.8/ccip/pools/TokenPool.sol";

contract SetRateLimitAdmin is Script {
    function run(address poolAddress, address adminAddress) external {
        // Validate the provided addresses
        require(poolAddress != address(0), "Invalid pool address");
        require(adminAddress != address(0), "Invalid admin address");

        // Get the signer address (the account running the script)
        address signer = vm.addr(uint256(vm.envBytes32("PRIVATE_KEY")));

        // Log the operation being performed
        console.log("Setting rate limit admin to", adminAddress, "for pool at", poolAddress);

        // Start broadcasting transactions
        vm.startBroadcast(signer);

        // Instantiate the TokenPool contract
        TokenPool poolContract = TokenPool(poolAddress);

        // Call setRateLimitAdmin on the pool contract
        poolContract.setRateLimitAdmin(adminAddress);

        // Log success
        console.log("Rate limit admin updated successfully");

        // Stop broadcasting
        vm.stopBroadcast();
    }
}
