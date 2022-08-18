// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.10;

import "ds-test/test.sol";
import "../Contract.sol";

interface CheatCodes {
    function warp(uint256) external;
}

contract ContractTest is DSTest {
    CheatCodes constant cheats = CheatCodes(HEVM_ADDRESS);

    Contract public c;

    function setUp() public {
        c = new Contract();
        c.queueMint(
            0x1234567890123456789012345678901234567890,
            100,
            block.timestamp + 600
        );
    }

    function testFailMintNow() public {
        c.executeMint(
            0x1234567890123456789012345678901234567890,
            100,
            block.timestamp + 600
        );
    }

    function testFailDoubleQueue() public {
        c.queueMint(
            0x1234567890123456789012345678901234567890,
            100,
            block.timestamp + 600
        );
    }

    function testFailMintNonQueued() public {
        c.executeMint(
            0x1234567890123456789012345678901234567890,
            999,
            block.timestamp + 600
        );
    }

    function testMintAfterTen() public {
        uint256 targetTime = block.timestamp + 600;
        cheats.warp(block.timestamp + 600);
        c.executeMint(
            0x1234567890123456789012345678901234567890,
            100,
            targetTime
        );
    }

    function testFailDoubleMint() public {
        uint256 targetTime = block.timestamp + 600;
        cheats.warp(block.timestamp + 600);
        c.executeMint(
            0x1234567890123456789012345678901234567890,
            100,
            targetTime
        );
        c.executeMint(
            0x1234567890123456789012345678901234567890,
            100,
            block.timestamp + 600
        );
    }

    function testFailLateMint() public {
        uint256 targetTime = block.timestamp + 600;
        cheats.warp(block.timestamp + 600 + 1801);
        emit log_uint(block.timestamp);
        c.executeMint(
            0x1234567890123456789012345678901234567890,
            100,
            targetTime
        );
    }

    function testCancelMint() public {
        bytes32 txnHash = c.generateTxnHash(
            0x1234567890123456789012345678901234567890,
            100,
            block.timestamp + 600
        );
        c.cancelMint(txnHash);
    }

    function testFailCancelMint() public {
        bytes32 txnHash = c.generateTxnHash(
            0x1234567890123456789012345678901234567890,
            999,
            block.timestamp + 600
        );
        c.cancelMint(txnHash);
        c.cancelMint(txnHash);
    }

    function testFailCancelMintNonQueued() public {
        bytes32 txnHash = c.generateTxnHash(
            0x1234567890123456789012345678901234567890,
            999,
            block.timestamp + 600
        );
        c.cancelMint(txnHash);
    }

    function testFailPastQueue() public {
        c.queueMint(
            0x1234567890123456789012345678901234567890,
            100,
            block.timestamp - 600
        );
    }
}
