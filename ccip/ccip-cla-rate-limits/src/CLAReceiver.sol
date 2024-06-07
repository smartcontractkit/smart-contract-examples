// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

import {AggregatorInterface} from "./interfaces/AggregatorInterface.sol";
import {Rate} from "./utils/Rate.sol";

import {OwnerIsCreator} from "@chainlink/contracts-ccip/src/v0.8/shared/access/OwnerIsCreator.sol";
import {CCIPReceiver} from "@chainlink/contracts-ccip/src/v0.8/ccip/applications/CCIPReceiver.sol";
import {Client} from "@chainlink/contracts-ccip/src/v0.8/ccip/libraries/Client.sol";

/**
 * THIS IS AN EXAMPLE CONTRACT THAT USES HARDCODED VALUES FOR CLARITY.
 * THIS IS AN EXAMPLE CONTRACT THAT USES UN-AUDITED CODE.
 * DO NOT USE THIS CODE IN PRODUCTION.
 */
contract CLAReceiver is CCIPReceiver, AggregatorInterface, OwnerIsCreator {
    string public constant description = "StaFi Staked ETH rETH-ETH Exchange Rate Receiver";

    uint80 private s_roundIdCounter;

    mapping(uint64 => bool) internal s_enabledChains;
    mapping(address => bool) internal s_enabledSenders;
    mapping(uint80 => Rate.RateDetailsV1) internal s_rates;

    error ReceivingFromChainNotAllowed(uint64 chainSelector);
    error ReceivingFromSenderNotAllowed(address sender);

    modifier onlyFromEnabledChains(uint64 sourceChainSelector) {
        if (!s_enabledChains[sourceChainSelector]) {
            revert ReceivingFromChainNotAllowed(sourceChainSelector);
        }
        _;
    }

    modifier onlyFromEnabledSenders(address sender) {
        if (!s_enabledSenders[sender]) {
            revert ReceivingFromSenderNotAllowed(sender);
        }
        _;
    }

    constructor(address ccipRouter) CCIPReceiver(ccipRouter) {}

    // ================================================================
    // │                      Admin functions                         │
    // ================================================================
    function toggleChainStatus(uint64 chainSelector, bool isEnabled) external onlyOwner {
        s_enabledChains[chainSelector] = isEnabled;
    }

    function toggleSenderStatus(address sender, bool isEnabled) external onlyOwner {
        s_enabledSenders[sender] = isEnabled;
    }

    // ================================================================
    // │                        Core logic                            │
    // ================================================================
    function _ccipReceive(Client.Any2EVMMessage memory message)
        internal
        virtual
        override
        onlyFromEnabledChains(message.sourceChainSelector)
        onlyFromEnabledSenders(abi.decode(message.sender, (address)))
    {
        (, Rate.RateDetailsV1[] memory rateDetails) = Rate.decodeRate(message.data);

        uint80 roundId = s_roundIdCounter++;

        s_rates[roundId] = rateDetails[0];

        emit NewReport(roundId, rateDetails[0]);
    }

    // ================================================================
    // │                        View functions                        │
    // ================================================================
    function decimals() external pure returns (uint8) {
        return 18;
    }

    function version() external pure returns (uint256) {
        return 1;
    }

    function getRoundData(uint80 _roundId) external view override returns (Rate.RateDetailsV1 memory) {
        return s_rates[_roundId];
    }

    function latestRoundData() external view override returns (Rate.RateDetailsV1 memory) {
        return s_rates[s_roundIdCounter - 1];
    }

    function latestRoundId() external view returns (uint80) {
        return s_roundIdCounter - 1;
    }
}
