// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {HelperUtils} from "./utils/HelperUtils.s.sol"; // Utility functions for JSON parsing and chain info
import {HelperConfig} from "./HelperConfig.s.sol"; // Network configuration helper

interface ITokenAdminRegistry {
    function transferAdminRole(address token, address newAdmin) external;
}

contract TransferTokenAdminRole is Script {
    function run(address tokenAddress, address newAdmin) external {
        // Instantiate HelperConfig
        HelperConfig helperConfig = new HelperConfig();

        // Retrieve the TokenAdminRegistry address from the network configuration
        (,,, address tokenAdminRegistry,,,,) = helperConfig.activeNetworkConfig();

        require(tokenAdminRegistry != address(0), "TokenAdminRegistry is not defined for this network");

        // Validate addresses
        require(tokenAddress != address(0), "Invalid token address");
        require(newAdmin != address(0), "Invalid new admin address");

        // Log the operation being performed
        console.log("Transferring admin role for token:", tokenAddress, "to", newAdmin);

        // Start broadcasting transactions
        vm.startBroadcast();

        // Instantiate the TokenAdminRegistry contract
        ITokenAdminRegistry registryContract = ITokenAdminRegistry(tokenAdminRegistry);

        // Execute the transaction to transfer the admin role
        registryContract.transferAdminRole(tokenAddress, newAdmin);

        // Log success
        console.log("Admin role transfer initiated successfully");
        console.log("New admin", newAdmin, "must call acceptAdminRole to complete the transfer");

        // Stop broadcasting
        vm.stopBroadcast();
    }
}
