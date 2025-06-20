// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

// Import the Chainlink Aggregator Interface
// This interface defines the functions we can call on Chainlink price feeds
import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

/**
 * @title DataFeedReader
 * @author Chainlink Learning Example
 * @notice This contract demonstrates how to read price data from Chainlink Data Feeds
 * @dev This is a simple example for educational purposes showing basic Chainlink integration
 * 
 * THIS IS AN EXAMPLE CONTRACT THAT USES HARDCODED VALUES FOR CLARITY.
 * THIS IS AN EXAMPLE CONTRACT THAT USES UN-AUDITED CODE.
 * DO NOT USE THIS CODE IN PRODUCTION.
 */
contract DataFeedReader {
    
    /**
     * @notice Reads the latest price data from a Chainlink price feed
     * @dev This function calls the latestRoundData() function on a Chainlink aggregator
     * @param aggregator The contract address of the Chainlink price feed you want to read from
     * @return roundId The round ID
     * @return answer The price (scaled to the feed's decimal places)
     * @return startedAt When the round started (timestamp)
     * @return updatedAt When the round was last updated (timestamp)
     * @return answeredInRound The round ID of the round in which the answer was computed
     * 
     * Example usage:
     * - For BTC/USD on Nile Testnet: TD3hrfAtPcnkLSsRh4UTgjXBo6KyRfT1AR
     * - For ETH/USD on Nile Testnet: TYaLVmqGzz33ghKEMTdC64dUnde5LZc6Y3
     */
    function getChainlinkDataFeedLatestAnswer(
        address aggregator
    ) public view returns (uint80, int256, uint256, uint256, uint80) {
        
        // Create an instance of the Chainlink aggregator contract
        // This allows us to call functions on the price feed
        AggregatorV3Interface dataFeed = AggregatorV3Interface(aggregator);
        
        // Call latestRoundData() to get the most recent price information
        // This function returns 5 values that give us complete information about the latest price update
        (
            uint80 roundId,        // Unique ID for this price round
            int256 answer,         // The actual price (may need to be divided by decimals)
            uint256 startedAt,     // When this price round started
            uint256 updatedAt,     // When this price was last updated
            uint80 answeredInRound // Round ID when the answer was computed
        ) = dataFeed.latestRoundData();
        
        // Return all the data we got from the price feed
        return (roundId, answer, startedAt, updatedAt, answeredInRound);
    }
    
    /**
     * @notice A simplified version that only returns the price
     * @dev This is a convenience function for when you only need the price value
     * @param aggregator The contract address of the Chainlink price feed
     * @return price The latest price from the feed
     */
    function getLatestPrice(address aggregator) public view returns (int256 price) {
        AggregatorV3Interface dataFeed = AggregatorV3Interface(aggregator);
        
        // We only care about the price (answer), so we ignore the other return values
        (
            /* uint80 roundId */,
            int256 answer,
            /* uint256 startedAt */,
            /* uint256 updatedAt */,
            /* uint80 answeredInRound */
        ) = dataFeed.latestRoundData();
        
        return answer;
    }
    
    /**
     * @notice Get the number of decimal places for a price feed
     * @dev Different price feeds use different decimal places (e.g., 8 for ETH/USD, 18 for some others)
     * @param aggregator The contract address of the Chainlink price feed
     * @return decimals The number of decimal places used by this feed
     * 
     * Example: If ETH/USD returns 300000000000 and decimals() returns 8,
     * the actual price is 300000000000 / 10^8 = 3000 USD per ETH
     */
    function getDecimals(address aggregator) public view returns (uint8) {
        AggregatorV3Interface dataFeed = AggregatorV3Interface(aggregator);
        return dataFeed.decimals();
    }
    
    /**
     * @notice Get a human-readable description of what this price feed represents
     * @dev This helps you confirm you're using the right price feed
     * @param aggregator The contract address of the Chainlink price feed
     * @return description A string describing the price pair (e.g., "ETH / USD")
     */
    function getDescription(address aggregator) public view returns (string memory) {
        AggregatorV3Interface dataFeed = AggregatorV3Interface(aggregator);
        return dataFeed.description();
    }
}
