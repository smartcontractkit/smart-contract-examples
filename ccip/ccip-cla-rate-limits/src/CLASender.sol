// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

import {ICLASender} from "./interfaces/ICLASender.sol";
import {Rate} from "./utils/Rate.sol";
import {Withdraw} from "./utils/Withdraw.sol";

import {AutomationCompatibleInterface} from "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";
import {IRouterClient} from "@chainlink/contracts-ccip/src/v0.8/ccip/interfaces/IRouterClient.sol";
import {OwnerIsCreator} from "@chainlink/contracts-ccip/src/v0.8/shared/access/OwnerIsCreator.sol";
import {Client} from "@chainlink/contracts-ccip/src/v0.8/ccip/libraries/Client.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// ================================================================
// │                      StaFi interface                         │
// ================================================================
interface IStaFi {
    // Get the current ETH : rETH exchange rate
    // Returns the amount of ETH backing 1 rETH
    function getExchangeRate() external view returns (uint256);
}

/**
 * THIS IS AN EXAMPLE CONTRACT THAT USES HARDCODED VALUES FOR CLARITY.
 * THIS IS AN EXAMPLE CONTRACT THAT USES UN-AUDITED CODE.
 * DO NOT USE THIS CODE IN PRODUCTION.
 */
contract CLASender is ICLASender, AutomationCompatibleInterface, ReentrancyGuard, OwnerIsCreator, Withdraw {
    string public constant description = "StaFi Staked ETH rETH-ETH Exchange Rate";

    address internal immutable i_target;
    IERC20 internal immutable i_linkToken;
    IRouterClient internal immutable i_ccipRouter;
    Rate.RateDetailsV1 internal s_latestRate;

    address internal s_automationForwarder;
    address internal s_claReceiver;
    uint64 s_destinationChainSelector;
    bytes internal s_extraArgs;

    modifier onlyAutomationForwarder() {
        if (msg.sender != s_automationForwarder) {
            revert OnlyAutomationForwarderCanCall();
        }
        _;
    }

    constructor(address target, address linkToken, address ccipRouter, bytes memory extraArgs) {
        i_target = target;
        i_linkToken = IERC20(linkToken);
        i_ccipRouter = IRouterClient(ccipRouter);
        s_extraArgs = extraArgs;
    }

    // ================================================================
    // │                        Core logic                            │
    // ================================================================
    function checkUpkeep(bytes calldata /* checkData */ )
        external
        view
        override
        returns (bool upkeepNeeded, bytes memory performData)
    {
        upkeepNeeded = s_latestRate.exchangeRate != IStaFi(i_target).getExchangeRate();

        // This logic can be expanded to include several different CLA receivers on different chains
        performData = abi.encode(s_claReceiver, s_destinationChainSelector, s_extraArgs);
    }

    function performUpkeep(bytes calldata performData) external override onlyAutomationForwarder nonReentrant {
        (address claReceiver, uint64 destinationChainSelector, bytes memory extraArgs) =
            abi.decode(performData, (address, uint64, bytes));

        uint256 latestExchangeRate = IStaFi(i_target).getExchangeRate();

        uint256 length = 1;
        Rate.RateDetailsV1[] memory latestRateDetails = new Rate.RateDetailsV1[](length);
        Rate.RateDetailsV1 memory latestRate = Rate.RateDetailsV1({
            exchangeRate: latestExchangeRate,
            srcTokenAddress: i_target,
            srcBlockTimestamp: SafeCast.toUint48(block.timestamp),
            srcBlockNumber: SafeCast.toUint48(block.number)
        });
        latestRateDetails[0] = latestRate;

        s_latestRate = latestRate;

        Client.EVM2AnyMessage memory message = Client.EVM2AnyMessage({
            receiver: abi.encode(claReceiver),
            data: abi.encode(length, latestRateDetails),
            tokenAmounts: new Client.EVMTokenAmount[](0),
            extraArgs: extraArgs,
            feeToken: address(i_linkToken)
        });

        uint256 ccipFee = i_ccipRouter.getFee(destinationChainSelector, message);

        if (ccipFee > i_linkToken.balanceOf(address(this))) {
            revert NotEnoughBalanceForCCIPFees(i_linkToken.balanceOf(address(this)), ccipFee);
        }

        i_linkToken.approve(address(i_ccipRouter), ccipFee);

        // Send CCIP Message
        bytes32 messageId = i_ccipRouter.ccipSend(destinationChainSelector, message);

        emit NewRateReported(
            messageId, latestExchangeRate, block.timestamp, block.number, claReceiver, destinationChainSelector
        );
    }

    // ================================================================
    // │                      Admin functions                         │
    // ================================================================
    function setAutomationForwarder(address automationForwarder) external onlyOwner {
        s_automationForwarder = automationForwarder;
    }

    function setCLAReceiver(address claReceiver) external onlyOwner {
        s_claReceiver = claReceiver;
    }

    function setDestinationChainSelector(uint64 destinationChainSelector) external onlyOwner {
        s_destinationChainSelector = destinationChainSelector;
    }

    function setExtraArgs(bytes memory extraArgs) external onlyOwner {
        s_extraArgs = extraArgs;
    }

    // ================================================================
    // │                        View functions                        │
    // ================================================================
    function getTarget() external view override returns (address) {
        return i_target;
    }

    function getLatestRate() external view override returns (Rate.RateDetailsV1 memory) {
        return s_latestRate;
    }

    function getClaReceiver() external view returns (address) {
        return s_claReceiver;
    }

    function getAutomationForwarder() external view returns (address) {
        return s_automationForwarder;
    }
}
