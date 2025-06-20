// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {HelperUtils} from "./utils/HelperUtils.s.sol"; // Utility functions for JSON parsing and chain info
import {BurnMintERC20} from "@chainlink/contracts/src/v0.8/shared/token/ERC20/BurnMintERC20.sol";

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
        uint256 preMint = HelperUtils.getUintFromJson(vm, configPath, ".BnMToken.preMint");

        vm.startBroadcast();

        address deployer = msg.sender;
        address tokenAddress;

        
        BurnMintERC20 token = new BurnMintERC20(name, symbol, decimals, maxSupply, preMint);
        tokenAddress = address(token);
        console.log("Deployed BurnMintERC20 at:", tokenAddress);
        
        // Grant mint and burn roles to the deployer address
        BurnMintERC20(tokenAddress).grantMintAndBurnRoles(deployer);
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
