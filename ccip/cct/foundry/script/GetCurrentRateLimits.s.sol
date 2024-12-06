// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {HelperConfig} from "./HelperConfig.s.sol";
import {HelperUtils} from "./utils/HelperUtils.s.sol";

library RateLimiter {
    struct State {
        uint128 tokens;
        uint32 lastUpdated;
        bool isEnabled;
        uint128 capacity;
        uint128 rate;
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
    function run(address poolAddress, uint256 remoteChainId) external {
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

        // Fetch outbound rate limiter state
        RateLimiter.State memory outboundState;
        try poolContract.getCurrentOutboundRateLimiterState(remoteChainSelector) returns (
            RateLimiter.State memory _outboundState
        ) {
            outboundState = _outboundState;
        } catch {
            console.log("Error fetching outbound rate limits for chain selector:", uint256(remoteChainSelector));
            return;
        }

        // Fetch inbound rate limiter state
        RateLimiter.State memory inboundState;
        try poolContract.getCurrentInboundRateLimiterState(remoteChainSelector) returns (
            RateLimiter.State memory _inboundState
        ) {
            inboundState = _inboundState;
        } catch {
            console.log("Error fetching inbound rate limits for chain selector:", uint256(remoteChainSelector));
            return;
        }

        // Display the rate limiter configurations
        console.log("\nRate Limiter States for Chain Selector:", uint256(remoteChainSelector));
        console.log("Pool Address:", poolAddress);

        // Display outbound rate limiter configuration
        console.log("\nOutbound Rate Limiter:");
        console.log("  Tokens:", uint256(outboundState.tokens));
        console.log("  Last Updated:", uint256(outboundState.lastUpdated));
        console.log("  Enabled:", outboundState.isEnabled);
        console.log("  Capacity:", uint256(outboundState.capacity));
        console.log("  Rate:", uint256(outboundState.rate));

        // Display inbound rate limiter configuration
        console.log("\nInbound Rate Limiter:");
        console.log("  Tokens:", uint256(inboundState.tokens));
        console.log("  Last Updated:", uint256(inboundState.lastUpdated));
        console.log("  Enabled:", inboundState.isEnabled);
        console.log("  Capacity:", uint256(inboundState.capacity));
        console.log("  Rate:", uint256(inboundState.rate));
    }
}
