// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "../src/DadJokes.sol";

contract DadJokesTest is Test {
    DadJokes private dadJokes;
    address private creator1 = address(1);
    address private user1 = address(2);

    function setUp() public {
        dadJokes = new DadJokes();
        vm.deal(user1, 1 ether);
        vm.prank(creator1);
        dadJokes.addJoke(
            "Why don't scientists trust atoms?",
            "Because they make up everything."
        );
    }

    function testAddJoke() public view {
        DadJokes.Joke[] memory jokes = dadJokes.getJokes();
        assertEq(jokes.length, 1);
        assertEq(jokes[0].setup, "Why don't scientists trust atoms?");
        assertEq(jokes[0].punchline, "Because they make up everything.");
        assertEq(jokes[0].creator, creator1);
        assertEq(jokes[0].isDeleted, false);
    }

    function testRewardJoke() public {
        vm.prank(user1);
        dadJokes.rewardJoke{value: 0.001 ether}(0, 1);
        assertEq(dadJokes.creatorBalances(creator1), 0.001 ether);
    }

    function testRewardJokeInvalidIndex() public {
        vm.prank(user1);
        vm.expectRevert("Invalid joke index");
        dadJokes.rewardJoke{value: 0.001 ether}(1, 1);
    }

    function testRewardJokeInvalidRewardType() public {
        vm.prank(user1);
        vm.expectRevert("Reward type not between 1 and 3");
        dadJokes.rewardJoke{value: 0.001 ether}(0, 4);
    }

    function testRewardJokeIncorrectRewardAmount() public {
        vm.prank(user1);
        vm.expectRevert("Incorrect reward amount");
        dadJokes.rewardJoke{value: 0.002 ether}(0, 1);
    }

    function testDeleteJoke() public {
        vm.prank(creator1);
        dadJokes.deleteJoke(0);
        DadJokes.Joke[] memory jokes = dadJokes.getJokes();
        assertEq(jokes.length, 0);
    }

    function testDeleteJokeInvalidIndex() public {
        vm.prank(creator1);
        vm.expectRevert("Invalid joke index");
        dadJokes.deleteJoke(1);
    }

    function testDeleteJokeUnauthorized() public {
        vm.prank(user1);
        vm.expectRevert("Only the joke creator can delete the joke");
        dadJokes.deleteJoke(0);
    }

    function testWithdrawBalance() public {
        vm.prank(user1);
        dadJokes.rewardJoke{value: 0.001 ether}(0, 1);

        vm.prank(creator1);
        dadJokes.withdrawBalance();

        assertEq(dadJokes.creatorBalances(creator1), 0);
        assertEq(creator1.balance, 0.001 ether);
    }

    function testWithdrawBalanceNoBalance() public {
        vm.prank(creator1);
        vm.expectRevert("No balance to withdraw");
        dadJokes.withdrawBalance();
    }

    function testRewardJokeDeleted() public {
        vm.prank(creator1);
        dadJokes.deleteJoke(0);

        vm.prank(user1);
        vm.expectRevert("Joke has been deleted");
        dadJokes.rewardJoke{value: 0.001 ether}(0, 1);
    }
}
