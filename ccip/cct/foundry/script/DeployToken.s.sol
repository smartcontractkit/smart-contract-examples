// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {HelperUtils} from "./utils/HelperUtils.s.sol"; // Utility functions for JSON parsing and chain info
import {HelperConfig} from "./HelperConfig.s.sol"; // Network configuration helper
import {BurnMintERC677WithCCIPAdmin} from "../src/BurnMintERC677WithCCIPAdmin.sol";
import {BurnMintERC677} from "@chainlink/contracts-ccip/src/v0.8/shared/token/ERC677/BurnMintERC677.sol";

contract DeployToken is Script {
    function run() external {
        // Get the chain name based on the current chain ID
        string memory chainName = HelperUtils.getChainName(block.chainid);

        // Define the path to the config.json file
        string memory root = vm.projectRoot();
        string memory configPath = string.concat(root, "/script/config.json");

        // Extract token parameters from the config.json file
        string memory name = HelperUtils.getStringFromJson(vm, configPath, ".BnMToken.name");
        string memory symbol = HelperUtils.getStringFromJson(vm, configPath, ".BnMToken.symbol");
        uint8 decimals = uint8(HelperUtils.getUintFromJson(vm, configPath, ".BnMToken.decimals"));
        uint256 maxSupply = HelperUtils.getUintFromJson(vm, configPath, ".BnMToken.maxSupply");
        bool withGetCCIPAdmin = HelperUtils.getBoolFromJson(vm, configPath, ".BnMToken.withGetCCIPAdmin");
        address ccipAdminAddress = HelperUtils.getAddressFromJson(vm, configPath, ".BnMToken.ccipAdminAddress");

        vm.startBroadcast();

        address deployer = msg.sender;
        address tokenAddress;

        // Check if the token uses getCCIPAdmin() function
        if (withGetCCIPAdmin) {
            // Deploy the token contract with CCIP admin functionality
            BurnMintERC677WithCCIPAdmin token = new BurnMintERC677WithCCIPAdmin(name, symbol, decimals, maxSupply);

            // If no CCIP admin address is specified, default to the deployer
            if (ccipAdminAddress == address(0)) {
                ccipAdminAddress = deployer;
            }
            // Set the CCIP admin for the token
            token.setCCIPAdmin(ccipAdminAddress);

            tokenAddress = address(token);
            console.log("Deployed BurnMintERC677WithCCIPAdmin at:", tokenAddress);
        } else {
            // Deploy the standard token contract without CCIP admin functionality
            BurnMintERC677 token = new BurnMintERC677(name, symbol, decimals, maxSupply);
            tokenAddress = address(token);
            console.log("Deployed BurnMintERC677 at:", tokenAddress);
        }

        // Grant mint and burn roles to the deployer address
        BurnMintERC677(tokenAddress).grantMintAndBurnRoles(deployer);
        console.log("Granted mint and burn roles to:", deployer);

        vm.stopBroadcast();

        // Prepare to write the deployed token address to a JSON file
        string memory jsonObj = "internal_key";
        string memory key = string(abi.encodePacked("deployedToken_", chainName));
        string memory finalJson = vm.serializeAddress(jsonObj, key, tokenAddress);

        // Define the output file path for the deployed token address
        string memory fileName = string(abi.encodePacked("./script/output/deployedToken_", chainName, ".json"));
        console.log("Writing deployed token address to file:", fileName);

        // Write the JSON file containing the deployed token address
        vm.writeJson(finalJson, fileName);
    }
}
