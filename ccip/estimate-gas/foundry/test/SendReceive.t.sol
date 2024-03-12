// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.19;

import {Test, console, Vm} from "forge-std/Test.sol";
import {BurnMintERC677} from "@chainlink/contracts-ccip/src/v0.8/shared/token/ERC677/BurnMintERC677.sol";
import {MockCCIPRouter} from "@chainlink/contracts-ccip/src/v0.8/ccip/test/mocks/MockRouter.sol";
import {Client} from "@chainlink/contracts-ccip/src/v0.8/ccip/libraries/Client.sol";
import {Sender} from "../src/Sender.sol";
import {Receiver} from "../src/Receiver.sol";

contract SenderReceiverTest is Test {
    Sender public sender;
    Receiver public receiver;
    BurnMintERC677 public link;
    MockCCIPRouter public router;
    uint64 public chainSelector = 16015286601757825753;

    function setUp() public {
        router = new MockCCIPRouter();
        link = new BurnMintERC677("ChainLink Token", "LINK", 18, 10 ** 27);
        sender = new Sender(address(router), address(link));
        receiver = new Receiver(address(router));
        sender.allowlistDestinationChain(chainSelector, true);
        receiver.allowlistSourceChain(chainSelector, true);
        receiver.allowlistSender(address(sender), true);
    }

    function sendMessage(uint256 iterations) private {
        vm.recordLogs();
        sender.sendMessagePayLINK(
            chainSelector,
            address(receiver),
            iterations,
            400000
        );
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

    function test_SendReceiveMin() public {
        sendMessage(0);
    }

    function test_SendReceiveAverage() public {
        sendMessage(50);
    }

    function test_SendReceiveMax() public {
        sendMessage(99);
    }

    /*
    function test_SendReceiveDirect() public {
        Client.Any2EVMMessage memory executableMsg = Client.Any2EVMMessage({
            messageId: bytes32(uint256(123)),
            sourceChainSelector: chainSelector,
            sender: abi.encode(address(sender)),
            data: abi.encode(10),
            destTokenAmounts: new Client.EVMTokenAmount[](0)
        });
        uint256 intrinsicGas = calculateIntrinsicGas(abi.encode(executableMsg));

        vm.prank(address(router));
        receiver.ccipReceive(executableMsg);

        console.log("Intrinsic Gas:", intrinsicGas);
    }

    function calculateIntrinsicGas(
        bytes memory data
    ) public pure returns (uint256) {
        uint256 gas = 0;
        for (uint i = 0; i < data.length; i++) {
            // 4 gas for a zero byte, 16 gas for a non-zero byte
            gas += data[i] == bytes1(0) ? 4 : 16;
        }
        return 21000 + gas;
    }
    */
}
