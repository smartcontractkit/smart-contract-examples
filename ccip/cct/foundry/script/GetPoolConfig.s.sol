// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Script, console} from "forge-std/Script.sol";
import {TokenPool} from "@chainlink/contracts-ccip/src/v0.8/ccip/pools/TokenPool.sol";
import {RateLimiter} from "@chainlink/contracts-ccip/src/v0.8/ccip/libraries/RateLimiter.sol";

contract GetPoolConfig is Script {
    function run(address poolAddress) public view {
        // Instantiate the TokenPool contract
        TokenPool poolContract = TokenPool(poolAddress);

        console.log("Fetching configuration for pool at address:", poolAddress);

        // Get additional pool information
        address rateLimitAdmin = poolContract.getRateLimitAdmin();
        bool allowListEnabled = poolContract.getAllowListEnabled();
        address[] memory allowList = poolContract.getAllowList();
        address router = poolContract.getRouter();
        address token = address(poolContract.getToken());

        console.log("\nPool Basic Information:");
        console.log("  Rate Limit Admin:", rateLimitAdmin);
        console.log("  Router Address:", router);
        console.log("  Token Address:", token);
        console.log("  Allow List Enabled:", allowListEnabled);
        if (allowListEnabled) {
            console.log("  Allow List Addresses:");
            for (uint256 j = 0; j < allowList.length; j++) {
                console.log("    ", j + 1, ":", allowList[j]);
            }
        }

        // Fetch the list of supported chains
        uint64[] memory remoteChains = poolContract.getSupportedChains();

        for (uint256 i = 0; i < remoteChains.length; i++) {
            uint64 chainSelector = remoteChains[i];

            // Get remote pools and token addresses
            bytes[] memory remotePoolsEncoded = poolContract.getRemotePools(chainSelector);
            bytes memory remoteTokenAddressEncoded = poolContract.getRemoteToken(chainSelector);

            // Decode the remote pools addresses
            address[] memory remotePoolAddresses = new address[](remotePoolsEncoded.length);
            for (uint256 j = 0; j < remotePoolsEncoded.length; j++) {
                remotePoolAddresses[j] = abi.decode(remotePoolsEncoded[j], (address));
            }

            // Decode the remote token address
            address remoteTokenAddress = abi.decode(remoteTokenAddressEncoded, (address));

            // Get rate limiter states
            RateLimiter.TokenBucket memory outboundRateLimiterState =
                poolContract.getCurrentOutboundRateLimiterState(chainSelector);
            RateLimiter.TokenBucket memory inboundRateLimiterState =
                poolContract.getCurrentInboundRateLimiterState(chainSelector);

            // Display the configuration
            console.log("\nConfiguration for Remote Chain:", uint256(chainSelector));
            console.log("  Allowed: true"); // All chains in getSupportedChains() are considered allowed

            // Log all remote pool addresses
            console.log("  Remote Pool Addresses:");
            for (uint256 j = 0; j < remotePoolAddresses.length; j++) {
                console.log("    ", j + 1, ":", remotePoolAddresses[j]);
            }

            console.log("  Remote Token Address:", remoteTokenAddress);

            // Outbound Rate Limiter
            console.log("  Outbound Rate Limiter:");
            console.log("    Enabled:", outboundRateLimiterState.isEnabled);
            console.log("    Capacity:", uint256(outboundRateLimiterState.capacity));
            console.log("    Rate:", uint256(outboundRateLimiterState.rate));

            // Inbound Rate Limiter
            console.log("  Inbound Rate Limiter:");
            console.log("    Enabled:", inboundRateLimiterState.isEnabled);
            console.log("    Capacity:", uint256(inboundRateLimiterState.capacity));
            console.log("    Rate:", uint256(inboundRateLimiterState.rate));
        }
    }
}
