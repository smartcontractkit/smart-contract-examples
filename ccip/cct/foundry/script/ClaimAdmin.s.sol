// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {HelperUtils} from "./utils/HelperUtils.s.sol"; // Utility functions for JSON parsing and chain info
import {HelperConfig} from "./HelperConfig.s.sol"; // Network configuration helper
import {RegistryModuleOwnerCustom} from
    "@chainlink/contracts-ccip/src/v0.8/ccip/tokenAdminRegistry/RegistryModuleOwnerCustom.sol";
import {BurnMintERC677WithCCIPAdmin} from "../src/BurnMintERC677WithCCIPAdmin.sol";
import {BurnMintERC677} from "@chainlink/contracts-ccip/src/v0.8/shared/token/ERC677/BurnMintERC677.sol";

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
        bool withCCIPAdmin = HelperUtils.getBoolFromJson(vm, configPath, ".BnMToken.withGetCCIPAdmin");
        address tokenAdmin = HelperUtils.getAddressFromJson(vm, configPath, ".BnMToken.ccipAdminAddress");

        // Fetch the network configuration
        HelperConfig helperConfig = new HelperConfig();
        (,,,, address registryModuleOwnerCustom,,,) = helperConfig.activeNetworkConfig();

        require(tokenAddress != address(0), "Invalid token address");
        require(registryModuleOwnerCustom != address(0), "Registry module owner custom is not defined for this network");

        vm.startBroadcast();

        // Choose the appropriate admin claim method based on whether the token uses CCIP admin
        if (withCCIPAdmin) {
            claimAdminWithCCIPAdmin(tokenAddress, tokenAdmin, registryModuleOwnerCustom);
        } else {
            claimAdminWithOwner(tokenAddress, registryModuleOwnerCustom);
        }

        vm.stopBroadcast();
    }

    // Claim admin role using the token's CCIP admin
    function claimAdminWithCCIPAdmin(address tokenAddress, address tokenAdmin, address registryModuleOwnerCustom)
        internal
    {
        // Instantiate the token contract with CCIP admin functionality
        BurnMintERC677WithCCIPAdmin tokenContract = BurnMintERC677WithCCIPAdmin(tokenAddress);
        // Instantiate the registry contract
        RegistryModuleOwnerCustom registryContract = RegistryModuleOwnerCustom(registryModuleOwnerCustom);

        // Get the current CCIP admin of the token
        address tokenContractCCIPAdmin = tokenContract.getCCIPAdmin();
        console.log("Current token admin:", tokenContractCCIPAdmin);

        // Ensure the CCIP admin matches the expected token admin address
        require(
            tokenContractCCIPAdmin == tokenAdmin, "CCIP admin of token does not match the token admin address provided."
        );

        // Register the admin via getCCIPAdmin() function
        console.log("Claiming admin of the token via getCCIPAdmin() for CCIP admin:", tokenAdmin);
        registryContract.registerAdminViaGetCCIPAdmin(tokenAddress);
        console.log("Admin claimed successfully for token:", tokenAddress);
    }

    // Claim admin role using the token's owner() function
    function claimAdminWithOwner(address tokenAddress, address registryModuleOwnerCustom) internal {
        // Instantiate the standard token contract
        BurnMintERC677 tokenContract = BurnMintERC677(tokenAddress);
        // Instantiate the registry contract
        RegistryModuleOwnerCustom registryContract = RegistryModuleOwnerCustom(registryModuleOwnerCustom);

        console.log("Current token owner:", tokenContract.owner());
        console.log("Claiming admin of the token via owner() for signer:", msg.sender);
        // Register the admin via owner() function
        registryContract.registerAdminViaOwner(tokenAddress);
        console.log("Admin claimed successfully for token:", tokenAddress);
    }
}
