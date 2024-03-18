// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.19;

// Importing necessary components from the Chainlink and Forge Standard libraries for testing.
import {Test, console, Vm} from "forge-std/Test.sol";
import {BurnMintERC677} from "@chainlink/contracts-ccip/src/v0.8/shared/token/ERC677/BurnMintERC677.sol";
import {MockCCIPRouter} from "@chainlink/contracts-ccip/src/v0.8/ccip/test/mocks/MockRouter.sol";
import {Client} from "@chainlink/contracts-ccip/src/v0.8/ccip/libraries/Client.sol";
import {Sender} from "../src/Sender.sol";
import {Receiver} from "../src/Receiver.sol";

/// @title A test suite for Sender and Receiver contracts to estimate ccipReceive gas usage.
contract SenderReceiverTest is Test {
    // Declaration of contracts and variables used in the tests.
    Sender public sender;
    Receiver public receiver;
    BurnMintERC677 public link;
    MockCCIPRouter public router;
    // A specific chain selector for identifying the chain.
    uint64 public chainSelector = 16015286601757825753;

    /// @dev Sets up the testing environment by deploying necessary contracts and configuring their states.
    function setUp() public {
        // Mock router and LINK token contracts are deployed to simulate the network environment.
        router = new MockCCIPRouter();
        link = new BurnMintERC677("ChainLink Token", "LINK", 18, 10 ** 27);
        // Sender and Receiver contracts are deployed with references to the router and LINK token.
        sender = new Sender(address(router), address(link));
        receiver = new Receiver(address(router));
        // Configuring allowlist settings for testing cross-chain interactions.
        sender.allowlistDestinationChain(chainSelector, true);
        receiver.allowlistSourceChain(chainSelector, true);
        receiver.allowlistSender(address(sender), true);
    }

    /// @dev Helper function to simulate sending a message from Sender to Receiver.
    /// @param iterations The variable to simulate varying loads in the message.
    function sendMessage(uint256 iterations) private {
        vm.recordLogs(); // Starts recording logs to capture events.
        sender.sendMessagePayLINK(
            chainSelector,
            address(receiver),
            iterations,
            400000 // A predefined gas limit for the transaction.
        );
        // Fetches recorded logs to check for specific events and their outcomes.
        Vm.Log[] memory logs = vm.getRecordedLogs();
        bytes32 msgExecutedSignature = keccak256(
            "MsgExecuted(bool,bytes,uint256)"
        );

        for (uint i = 0; i < logs.length; i++) {
            if (logs[i].topics[0] == msgExecutedSignature) {
                (, , uint256 gasUsed) = abi.decode(
                    logs[i].data,
                    (bool, bytes, uint256)
                );
                console.log(
                    "Number of iterations %d - Gas used: %d",
                    iterations,
                    gasUsed
                );
            }
        }
    }

    /// @notice Test case for the minimum number of iterations.
    function test_SendReceiveMin() public {
        sendMessage(0);
    }

    /// @notice Test case for an average number of iterations.
    function test_SendReceiveAverage() public {
        sendMessage(50);
    }

    /// @notice Test case for the maximum number of iterations.
    function test_SendReceiveMax() public {
        sendMessage(99);
    }
}
