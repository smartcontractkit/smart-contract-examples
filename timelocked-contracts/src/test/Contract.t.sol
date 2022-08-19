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

    // Ensure we can't double queue
    function testFailDoubleQueue() public {
        c.queueMint(
            0x1234567890123456789012345678901234567890,
            100,
            block.timestamp + 600
        );
    }

    // Ensure we can't queue in the past
    function testFailPastQueue() public {
        c.queueMint(
            0x1234567890123456789012345678901234567890,
            100,
            block.timestamp - 600
        );
    }

    // Minting should work after the time has passed
    function testMintAfterTen() public {
        uint256 targetTime = block.timestamp + 600;
        cheats.warp(block.timestamp + 600);
        c.executeMint(
            0x1234567890123456789012345678901234567890,
            100,
            targetTime
        );
    }

    // Minting should fail if we mint too soon
    function testFailMintNow() public {
        c.executeMint(
            0x1234567890123456789012345678901234567890,
            100,
            block.timestamp + 600
        );
    }

    // Minting should fail if we didn't queue
    function testFailMintNonQueued() public {
        c.executeMint(
            0x1234567890123456789012345678901234567890,
            999,
            block.timestamp + 600
        );
    }

    // Minitng should fail if try to mint twice
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

    // Minting should fail if we try to mint too late
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

    // We should be able to cancel a mint
    function testCancelMint() public {
        bytes32 txnHash = c.generateTxnHash(
            0x1234567890123456789012345678901234567890,
            100,
            block.timestamp + 600
        );
        c.cancelMint(txnHash);
    }

    // We should be able to cancel a mint once but not twice
    function testFailCancelMint() public {
        bytes32 txnHash = c.generateTxnHash(
            0x1234567890123456789012345678901234567890,
            999,
            block.timestamp + 600
        );
        c.cancelMint(txnHash);
        c.cancelMint(txnHash);
    }

    // We shouldn't be able to cancel a mint that doesn't exist
    function testFailCancelMintNonQueued() public {
        bytes32 txnHash = c.generateTxnHash(
            0x1234567890123456789012345678901234567890,
            999,
            block.timestamp + 600
        );
        c.cancelMint(txnHash);
    }
}
