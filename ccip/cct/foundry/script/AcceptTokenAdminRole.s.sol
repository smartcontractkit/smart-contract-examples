// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {HelperConfig} from "./HelperConfig.s.sol"; // Network configuration helper

interface ITokenAdminRegistry {
    struct TokenConfig {
        address currentAdministrator;
        address pendingAdministrator;
    }

    function getTokenConfig(address token) external view returns (TokenConfig memory);
    function acceptAdminRole(address token) external;
}

contract AcceptTokenAdminRole is Script {
    function run(address tokenAddress) external {
        // Instantiate HelperConfig
        HelperConfig helperConfig = new HelperConfig();

        // Get the TokenAdminRegistry address from the active network configuration
        (,,, address tokenAdminRegistry,,,,) = helperConfig.activeNetworkConfig();
        require(tokenAdminRegistry != address(0), "TokenAdminRegistry address not found for this network");

        console.log("TokenAdminRegistry address:", tokenAdminRegistry);

        // Start broadcasting transactions
        vm.startBroadcast();

        // Get the signer address (the account running the script)
        address signer = vm.addr(uint256(vm.envBytes32("PRIVATE_KEY")));

        // Instantiate the TokenAdminRegistry contract
        ITokenAdminRegistry registryContract = ITokenAdminRegistry(tokenAdminRegistry);

        // Verify that the signer is the pending administrator for this token
        ITokenAdminRegistry.TokenConfig memory tokenConfig = registryContract.getTokenConfig(tokenAddress);
        require(tokenConfig.pendingAdministrator == signer, "Signer is not the pending administrator for this token");

        // Log the operation
        console.log("Accepting admin role for token:", tokenAddress);

        // Call acceptAdminRole on the registry contract
        registryContract.acceptAdminRole(tokenAddress);

        // Log success
        console.log("Admin role accepted successfully");

        // Stop broadcasting
        vm.stopBroadcast();
    }
}
