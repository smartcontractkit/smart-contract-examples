// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

/**
 * THIS IS AN EXAMPLE CONTRACT THAT USES HARDCODED VALUES FOR CLARITY.
 * THIS IS AN EXAMPLE CONTRACT THAT USES UN-AUDITED CODE.
 * DO NOT USE THIS CODE IN PRODUCTION.
 */
library Rate {
    struct RateDetailsV1 {
        uint256 exchangeRate;
        address srcTokenAddress;
        uint48 srcBlockTimestamp;
        uint48 srcBlockNumber;
    }

    /**
     * @notice Decodes the received bytes data into the Rate details array
     * @param receivedData - The encoded data received from the CLASender contract
     * @return length - The length of the rate details array
     * @return rate - The array of decoded rate details
     */
    function decodeRate(bytes memory receivedData) internal pure returns (uint256, RateDetailsV1[] memory) {
        (uint256 length, RateDetailsV1[] memory rate) = abi.decode(receivedData, (uint256, RateDetailsV1[]));

        return (length, rate);
    }
}
