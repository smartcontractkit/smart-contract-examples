// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

interface AggregatorV3Interface {
    function decimals() external view returns (uint8);

    function latestRoundData()
        external
        view
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound);
}

contract MockAggregator is AggregatorV3Interface {
    int256 private constant MOCK_ANSWER = 1_000_000 * 10 ** 8; // $1,000,000 with 8 decimals
    uint8 private constant DECIMALS = 8;
    uint80 private constant FIXED_ROUND_ID = 42;

    function decimals() external pure override returns (uint8) {
        return DECIMALS;
    }

    function latestRoundData()
        external
        view
        override
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
    {
        return (FIXED_ROUND_ID, MOCK_ANSWER, block.timestamp, block.timestamp, FIXED_ROUND_ID);
    }
}
