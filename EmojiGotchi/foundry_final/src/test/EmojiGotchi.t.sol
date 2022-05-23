// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.10;

import "ds-test/test.sol";
import "../EmojiGotchi.sol";

interface CheatCodes {
    function warp(uint256) external;
}

contract EmojiGotchiTest is DSTest {
    CheatCodes constant cheats = CheatCodes(HEVM_ADDRESS);

    EmojiGotchi public eg;

    function setUp() public {
        eg = new EmojiGotchi();
        address addr = 0x1234567890123456789012345678901234567890;
        eg.safeMint(addr);
    }

    function testMint() public {
        address addr = 0x1234567890123456789012345678901234567890;
        address owner = eg.ownerOf(0);
        assertEq(addr, owner);
    }

    function testUri() public {
        (
            uint256 happiness,
            uint256 hunger,
            uint256 enrichment,
            uint256 checked,

        ) = eg.gotchiStats(0);
        assertEq(happiness, (hunger + enrichment) / 2);
        assertEq(hunger, 100);
        assertEq(enrichment, 100);
        assertEq(checked, block.timestamp);
    }

    function testPassTime() public {
        eg.passTime(0);
        (uint256 happiness, uint256 hunger, uint256 enrichment, , ) = eg
            .gotchiStats(0);
        assertEq(hunger, 90);
        assertEq(enrichment, 90);
        assertEq(happiness, (90 + 90) / 2);
    }

    function testFeed() public {
        eg.passTime(0);
        eg.feed();
        (uint256 happiness, uint256 hunger, , , ) = eg.gotchiStats(0);
        assertEq(hunger, 100);
        assertEq(happiness, (100 + 90) / 2);
    }

    function testPlay() public {
        eg.passTime(0);
        eg.play();
        (uint256 happiness, , uint256 enrichment, , ) = eg.gotchiStats(0);
        assertEq(enrichment, 100);
        assertEq(happiness, (90 + 100) / 2);
    }

    function testImgURI() public {
        string memory tokenURI = "";
        (, , , , tokenURI) = eg.gotchiStats(0);
        string memory firstURI = tokenURI;
        eg.passTime(0);
        eg.passTime(0);
        eg.passTime(0);
        (, , , , tokenURI) = eg.gotchiStats(0);
        string memory secondURI = tokenURI;
        assertTrue(compareStringsNot(firstURI, secondURI));
    }

    function testUpkeep() public {
        bytes memory data = "";
        bool upkeepNeeded = false;
        (upkeepNeeded, ) = eg.checkUpkeep(data);
        assertTrue(upkeepNeeded == false);
        cheats.warp(block.timestamp + 100);
        (upkeepNeeded, ) = eg.checkUpkeep(data);
        assertTrue(upkeepNeeded);
    }

    function compareStringsNot(string memory a, string memory b)
        public
        pure
        returns (bool)
    {
        return (keccak256(abi.encodePacked((a))) !=
            keccak256(abi.encodePacked((b))));
    }
}
