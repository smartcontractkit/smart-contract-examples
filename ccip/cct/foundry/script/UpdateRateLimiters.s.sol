// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script} from "forge-std/Script.sol";
import {TokenPool} from "@chainlink/contracts-ccip/src/v0.8/ccip/pools/TokenPool.sol";
import {RateLimiter} from "@chainlink/contracts-ccip/src/v0.8/ccip/libraries/RateLimiter.sol";
import {HelperConfig} from "./HelperConfig.s.sol";
import {HelperUtils} from "./utils/HelperUtils.s.sol";

contract UpdateRateLimiters is Script {
    function run(
        address poolAddress,
        uint256 remoteChainId,
        uint8 rateLimiterToUpdate, // 0: outbound, 1: inbound, 2: both
        bool outboundRateLimitEnabled,
        uint128 outboundRateLimitCapacity, // if outboundRateLimitEnabled is false, this value is ignored
        uint128 outboundRateLimitRate, // if outboundRateLimitEnabled is false, this value is ignored
        bool inboundRateLimitEnabled,
        uint128 inboundRateLimitCapacity, // if inboundRateLimitEnabled is false, this value is ignored
        uint128 inboundRateLimitRate // if inboundRateLimitEnabled is false, this value is ignored
    ) public {
        // Retrieve the remote chain selector from the chain ID
        HelperConfig helperConfig = new HelperConfig();
        HelperConfig.NetworkConfig memory remoteNetworkConfig =
            HelperUtils.getNetworkConfig(helperConfig, remoteChainId);
        require(remoteNetworkConfig.chainSelector != 0, "Remote network configuration not found");

        uint64 remoteChainSelector = remoteNetworkConfig.chainSelector;

        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // Instantiate the TokenPool contract
        TokenPool poolContract = TokenPool(poolAddress);

        // Fetch current rate limiter states
        RateLimiter.TokenBucket memory currentOutboundRateLimiterState =
            poolContract.getCurrentOutboundRateLimiterState(remoteChainSelector);
        RateLimiter.TokenBucket memory currentInboundRateLimiterState =
            poolContract.getCurrentInboundRateLimiterState(remoteChainSelector);

        // Prepare current configurations
        RateLimiter.Config memory currentOutboundRateLimiterConfig = RateLimiter.Config({
            isEnabled: currentOutboundRateLimiterState.isEnabled,
            capacity: currentOutboundRateLimiterState.capacity,
            rate: currentOutboundRateLimiterState.rate
        });

        RateLimiter.Config memory currentInboundRateLimiterConfig = RateLimiter.Config({
            isEnabled: currentInboundRateLimiterState.isEnabled,
            capacity: currentInboundRateLimiterState.capacity,
            rate: currentInboundRateLimiterState.rate
        });

        // Modify existing configurations based on the rateLimiterToUpdate
        if (rateLimiterToUpdate == 0) {
            // Update outbound configuration
            currentOutboundRateLimiterConfig.isEnabled = outboundRateLimitEnabled;
            currentOutboundRateLimiterConfig.capacity = outboundRateLimitCapacity;
            currentOutboundRateLimiterConfig.rate = outboundRateLimitRate;
        } else if (rateLimiterToUpdate == 1) {
            // Update inbound configuration
            currentInboundRateLimiterConfig.isEnabled = inboundRateLimitEnabled;
            currentInboundRateLimiterConfig.capacity = inboundRateLimitCapacity;
            currentInboundRateLimiterConfig.rate = inboundRateLimitRate;
        } else if (rateLimiterToUpdate == 2) {
            // Update both configurations
            currentOutboundRateLimiterConfig.isEnabled = outboundRateLimitEnabled;
            currentOutboundRateLimiterConfig.capacity = outboundRateLimitCapacity;
            currentOutboundRateLimiterConfig.rate = outboundRateLimitRate;

            currentInboundRateLimiterConfig.isEnabled = inboundRateLimitEnabled;
            currentInboundRateLimiterConfig.capacity = inboundRateLimitCapacity;
            currentInboundRateLimiterConfig.rate = inboundRateLimitRate;
        } else {
            revert("Invalid rateLimiterToUpdate value. Use 0 for outbound, 1 for inbound, or 2 for both.");
        }

        // Update the rate limiter configurations
        poolContract.setChainRateLimiterConfig(
            remoteChainSelector, currentOutboundRateLimiterConfig, currentInboundRateLimiterConfig
        );

        vm.stopBroadcast();
    }
}
