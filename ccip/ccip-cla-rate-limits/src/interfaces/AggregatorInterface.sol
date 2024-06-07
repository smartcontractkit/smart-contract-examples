// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Rate} from "../utils/Rate.sol";

/**
 * THIS IS AN EXAMPLE CONTRACT THAT USES HARDCODED VALUES FOR CLARITY.
 * THIS IS AN EXAMPLE CONTRACT THAT USES UN-AUDITED CODE.
 * DO NOT USE THIS CODE IN PRODUCTION.
 */
interface AggregatorInterface {
    event NewReport(uint80 roundId, Rate.RateDetailsV1 rateDetails);

    function decimals() external view returns (uint8);

    function description() external view returns (string memory);

    function version() external view returns (uint256);

    function getRoundData(uint80 _roundId) external view returns (Rate.RateDetailsV1 memory);

    function latestRoundData() external view returns (Rate.RateDetailsV1 memory);
}
