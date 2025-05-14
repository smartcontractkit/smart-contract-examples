// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {HelperUtils} from "./utils/HelperUtils.s.sol"; // Utility functions for JSON parsing and chain info
import {HelperConfig} from "./HelperConfig.s.sol"; // Network configuration helper
import {RegistryModuleOwnerCustom} from
    "@chainlink/contracts-ccip/contracts/tokenAdminRegistry/RegistryModuleOwnerCustom.sol";
import {BurnMintERC20} from "@chainlink/contracts/src/v0.8/shared/token/ERC20/BurnMintERC20.sol";


contract ClaimAdmin is Script {
    function run() external {
        // Get the chain name based on the current chain ID
        string memory chainName = HelperUtils.getChainName(block.chainid);

        // Define paths to the necessary JSON files
        string memory root = vm.projectRoot();
        string memory deployedTokenPath = string.concat(root, "/script/output/deployedToken_", chainName, ".json");
        string memory configPath = string.concat(root, "/script/config.json");

        // Extract values from the JSON files
        address tokenAddress =
            HelperUtils.getAddressFromJson(vm, deployedTokenPath, string.concat(".deployedToken_", chainName));
        address tokenAdmin = HelperUtils.getAddressFromJson(vm, configPath, ".BnMToken.ccipAdminAddress");

        // Fetch the network configuration
        HelperConfig helperConfig = new HelperConfig();
        (,,,, address registryModuleOwnerCustom,,,) = helperConfig.activeNetworkConfig();

        require(tokenAddress != address(0), "Invalid token address");
        require(registryModuleOwnerCustom != address(0), "Registry module owner custom is not defined for this network");

        vm.startBroadcast();
        
        claimAdminWithCCIPAdmin(tokenAddress, tokenAdmin, registryModuleOwnerCustom);
        
        vm.stopBroadcast();
    }

    // Claim admin role using the token's CCIP admin
    function claimAdminWithCCIPAdmin(address tokenAddress, address tokenAdmin, address registryModuleOwnerCustom)
        internal
    {
        // Instantiate the token contract with CCIP admin functionality
        BurnMintERC20 tokenContract = BurnMintERC20(tokenAddress);
        // Instantiate the registry contract
        RegistryModuleOwnerCustom registryContract = RegistryModuleOwnerCustom(registryModuleOwnerCustom);

        // Get the current CCIP admin of the token
        address tokenContractCCIPAdmin = tokenContract.getCCIPAdmin();
        console.log("Current token admin:", tokenContractCCIPAdmin);

        // Ensure the CCIP admin matches the expected token admin address
        require(
            tokenContractCCIPAdmin == tokenAdmin, "CCIP admin of token doesn't match the token admin address."
        );

        // Register the admin via getCCIPAdmin() function
        console.log("Claiming admin of the token via getCCIPAdmin() for CCIP admin:", tokenAdmin);
        registryContract.registerAdminViaGetCCIPAdmin(tokenAddress);
        console.log("Admin claimed successfully for token:", tokenAddress);
    }

}
