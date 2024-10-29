// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Script, console} from "forge-std/Script.sol";
import {TokenPool} from "@chainlink/contracts-ccip/src/v0.8/ccip/pools/TokenPool.sol";
import {RateLimiter} from "@chainlink/contracts-ccip/src/v0.8/ccip/libraries/RateLimiter.sol";

contract GetPoolConfig is Script {
    function run(address poolAddress) public view {
        // Instantiate the TokenPool contract
        TokenPool poolContract = TokenPool(poolAddress);

        // Fetch the list of supported chains
        uint64[] memory remoteChains = poolContract.getSupportedChains();

        console.log("Fetching configuration for pool at address:", poolAddress);

        for (uint256 i = 0; i < remoteChains.length; i++) {
            uint64 chainSelector = remoteChains[i];

            // Get remote pool and token addresses
            bytes memory remotePoolAddressEncoded = poolContract.getRemotePool(chainSelector);
            bytes memory remoteTokenAddressEncoded = poolContract.getRemoteToken(chainSelector);

            // Decode the remote pool and token addresses
            address remotePoolAddress = abi.decode(remotePoolAddressEncoded, (address));
            address remoteTokenAddress = abi.decode(remoteTokenAddressEncoded, (address));

            // Get rate limiter states
            RateLimiter.TokenBucket memory outboundRateLimiterState =
                poolContract.getCurrentOutboundRateLimiterState(chainSelector);
            RateLimiter.TokenBucket memory inboundRateLimiterState =
                poolContract.getCurrentInboundRateLimiterState(chainSelector);

            // Get human-readable chain name (if possible)
            console.log("\nConfiguration for Remote Chain:", uint256(chainSelector));

            console.log("  Allowed: true"); // Since all chains in getSupportedChains() are considered allowed
            console.log("  Remote Pool Address:", remotePoolAddress);
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
