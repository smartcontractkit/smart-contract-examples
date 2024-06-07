// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

import {AggregatorInterface} from "./interfaces/AggregatorInterface.sol";

/**
 * THIS IS AN EXAMPLE CONTRACT THAT USES HARDCODED VALUES FOR CLARITY.
 * THIS IS AN EXAMPLE CONTRACT THAT USES UN-AUDITED CODE.
 * DO NOT USE THIS CODE IN PRODUCTION.
 */
contract ExampleConsumer {
    AggregatorInterface immutable i_aggregator;

    constructor(address aggregator) {
        i_aggregator = AggregatorInterface(aggregator);
    }

    function getLatestExchangeRate() public view returns (uint256) {
        return i_aggregator.latestRoundData().exchangeRate;
    }
}
