// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "ds-test/test.sol";

import "../QuizGame.sol";

interface CheatCodes {
    function deal(address, uint256) external;
}

contract QuizGameTest is DSTest {
    QuizGame public game;
    CheatCodes constant cheats = CheatCodes(HEVM_ADDRESS);

    function setUp() public {
        // Create a question
        string
            memory question = "What is the answer to life, the universe, and everything?";
        string memory answer = "42";
        bytes32 salt = bytes32("123123123");
        bytes32 hashedAnswer = keccak256(abi.encodePacked(salt, answer));
        emit log_bytes32(hashedAnswer);
        game = new QuizGame(question, hashedAnswer);
        emit log(game.question());
    }

    function testQuizFail() public {
        try game.guess("1") {
            assertTrue(false);
        } catch {
            assertTrue(true);
        }
    }

    function testQuizPass() public {
        uint256 beginBalance = address(this).balance;
        cheats.deal(address(game), 10000);
        game.guess("42");
        assertEq(address(this).balance, beginBalance + 10000);
    }

    fallback() external payable {}

    receive() external payable {}
}
