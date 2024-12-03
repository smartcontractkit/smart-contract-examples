// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {HelperConfig} from "./HelperConfig.s.sol";
import {HelperUtils} from "./utils/HelperUtils.s.sol";

library RateLimiter {
    struct State {
        bool isEnabled;
        uint256 capacity;
        uint256 rate;
        uint256 tokens;
        uint256 lastUpdated;
    }
}

interface ITokenPool {
    function getCurrentOutboundRateLimiterState(uint64 remoteChainSelector)
        external
        view
        returns (RateLimiter.State memory);

    function getCurrentInboundRateLimiterState(uint64 remoteChainSelector)
        external
        view
        returns (RateLimiter.State memory);
}

contract GetCurrentRateLimits is Script {
    function run(address poolAddress) external {
        // Construct the path to the configuration file
        string memory root = vm.projectRoot();
        string memory configPath = string.concat(root, "/script/config.json");

        // Read the remoteChainId from config.json based on the current chain ID
        uint256 remoteChainId = HelperUtils.getUintFromJson(
            vm, configPath, string.concat(".remoteChains.", HelperUtils.uintToStr(block.chainid))
        );

        // Instantiate HelperConfig
        HelperConfig helperConfig = new HelperConfig();

        // Retrieve the remote network configuration using HelperUtils
        HelperConfig.NetworkConfig memory remoteNetworkConfig =
            HelperUtils.getNetworkConfig(helperConfig, remoteChainId);

        // Ensure that configurations exist
        require(remoteNetworkConfig.chainSelector != 0, "Remote network configuration not found");

        uint64 remoteChainSelector = remoteNetworkConfig.chainSelector;

        // Validate the pool address
        require(poolAddress != address(0), "Invalid pool address");

        // Instantiate the TokenPool contract
        ITokenPool poolContract = ITokenPool(poolAddress);

        // Fetch both rate limiter states
        try poolContract.getCurrentOutboundRateLimiterState(remoteChainSelector) returns (
            RateLimiter.State memory outboundState
        ) {
            // Fetch inbound rate limiter state
            RateLimiter.State memory inboundState = poolContract.getCurrentInboundRateLimiterState(remoteChainSelector);

            // Display the rate limiter configurations
            console.log("\nRate Limiter States for Chain Selector:", uint256(remoteChainSelector));
            console.log("Pool Address:", poolAddress);

            // Display outbound rate limiter configuration
            console.log("\nOutbound Rate Limiter:");
            console.log("  Enabled:", outboundState.isEnabled);
            console.log("  Capacity:", uint256(outboundState.capacity));
            console.log("  Rate:", uint256(outboundState.rate));
            console.log("  Tokens:", uint256(outboundState.tokens));
            console.log("  Last Updated:", uint256(outboundState.lastUpdated));

            // Display inbound rate limiter configuration
            console.log("\nInbound Rate Limiter:");
            console.log("  Enabled:", inboundState.isEnabled);
            console.log("  Capacity:", uint256(inboundState.capacity));
            console.log("  Rate:", uint256(inboundState.rate));
            console.log("  Tokens:", uint256(inboundState.tokens));
            console.log("  Last Updated:", uint256(inboundState.lastUpdated));
        } catch {
            console.log("Error fetching rate limits for chain selector:", uint256(remoteChainSelector));
        }
    }
}
