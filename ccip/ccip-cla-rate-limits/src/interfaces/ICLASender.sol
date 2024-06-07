// SPDX-Licene-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import {Rate} from "../utils/Rate.sol";

/**
 * THIS IS AN EXAMPLE CONTRACT THAT USES HARDCODED VALUES FOR CLARITY.
 * THIS IS AN EXAMPLE CONTRACT THAT USES UN-AUDITED CODE.
 * DO NOT USE THIS CODE IN PRODUCTION.
 */
interface ICLASender {
    error OnlyAutomationForwarderCanCall();
    error NotEnoughBalanceForCCIPFees(uint256 currentBalance, uint256 requiredFees);

    event NewRateReported(
        bytes32 indexed ccipMessageId,
        uint256 indexed latestExchangeRate,
        uint256 blockTimestamp,
        uint256 blockNumber,
        address claReceiver,
        uint64 destinationChainSelector
    );

    function getTarget() external view returns (address);

    function getLatestRate() external view returns (Rate.RateDetailsV1 memory);

    function description() external view returns (string memory);
}
