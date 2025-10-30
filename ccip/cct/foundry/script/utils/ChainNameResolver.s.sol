// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script} from "forge-std/Script.sol";

/**
 * @title ChainNameResolver
 * @notice Provides safe access to StdChains functionality without constructor dependencies
 * @dev This contract acts as a resolver,
 * and can be used independently to get chain information for any chain,
 * with graceful fallback.
 */
contract ChainNameResolver is Script {
    /// @dev External function to call getChain (needed for try/catch)
    function getChainAlias(uint256 chainId) external returns (string memory) {
        return getChain(chainId).chainAlias;
    }

    /// @dev Safely get chain alias with fallback to "custom_network" if not found in StdChains
    function getChainNameSafe(uint256 chainId) public returns (string memory) {
        try this.getChainAlias(chainId) returns (string memory chainAlias) {
            return chainAlias;
        } catch {
            // Fallback to "custom_network" for chains not in StdChains
            return "custom_network";
        }
    }
}
