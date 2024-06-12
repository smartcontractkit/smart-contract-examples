// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Script.sol";
import "../src/DadJokes.sol";

contract DeployDadJokes is Script {
    function run() public {
        // Start broadcasting transactions
        vm.startBroadcast();

        // Deploy the DadJokes contract
        DadJokes dadJokes = new DadJokes();

        // Print the address of the deployed contract
        console.log("DadJokes contract deployed at:", address(dadJokes));

        // Stop broadcasting transactions
        vm.stopBroadcast();
    }
}
