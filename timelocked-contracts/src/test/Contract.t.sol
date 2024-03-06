// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "ds-test/test.sol";
import "../Contract.sol";

interface CheatCodes {
    function warp(uint256) external;
}

contract ContractTest is DSTest {
    // HEVM_ADDRESS is the pre-defined contract that contains the cheatcodes
    CheatCodes constant cheats = CheatCodes(HEVM_ADDRESS);

    Contract public c;
    address toAddr = 0x1234567890123456789012345678901234567890;

    function setUp() public {
        c = new Contract();
        c.queueMint(toAddr, 100, block.timestamp + 600);
    }

    // Ensure you can't double queue
    function testFailDoubleQueue() public {
        c.queueMint(toAddr, 100, block.timestamp + 600);
    }

    // Ensure you can't queue in the past
    function testFailPastQueue() public {
        c.queueMint(toAddr, 100, block.timestamp - 600);
    }

    // Minting should work after the time has passed
    function testMintAfterTen() public {
        uint256 targetTime = block.timestamp + 600;
        cheats.warp(targetTime);
        c.executeMint(toAddr, 100, targetTime);
    }

    // Minting should fail if you mint too soon
    function testFailMintNow() public {
        c.executeMint(toAddr, 100, block.timestamp + 600);
    }

    // Minting should fail if you didn't queue
    function testFailMintNonQueued() public {
        c.executeMint(toAddr, 999, block.timestamp + 600);
    }

    // Minting should fail if try to mint twice
    function testFailDoubleMint() public {
        uint256 targetTime = block.timestamp + 600;
        cheats.warp(block.timestamp + 600);
        c.executeMint(toAddr, 100, targetTime);
        c.executeMint(toAddr, 100, block.timestamp + 600);
    }

    // Minting should fail if you try to mint too late
    function testFailLateMint() public {
        uint256 targetTime = block.timestamp + 600;
        cheats.warp(block.timestamp + 600 + 1801);
        emit log_uint(block.timestamp);
        c.executeMint(toAddr, 100, targetTime);
    }

    // you should be able to cancel a mint
    function testCancelMint() public {
        bytes32 txnHash = c.generateTxnHash(toAddr, 100, block.timestamp + 600);
        c.cancelMint(txnHash);
    }

    // you should be able to cancel a mint once but not twice
    function testFailCancelMint() public {
        bytes32 txnHash = c.generateTxnHash(toAddr, 999, block.timestamp + 600);
        c.cancelMint(txnHash);
        c.cancelMint(txnHash);
    }

    // you shouldn't be able to cancel a mint that doesn't exist
    function testFailCancelMintNonQueued() public {
        bytes32 txnHash = c.generateTxnHash(toAddr, 999, block.timestamp + 600);
        c.cancelMint(txnHash);
    }
}
