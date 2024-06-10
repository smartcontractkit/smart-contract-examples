// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "../src/DadJokes.sol";

contract DadJokesTest is Test {
    DadJokes private dadJokes;
    address private creator1 = address(1);
    address private creator2 = address(2);

    function setUp() public {
        dadJokes = new DadJokes();
        vm.deal(creator2, 1 ether);
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
        assertEq(jokes[0].classicRewards, 0);
        assertEq(jokes[0].funnyRewards, 0);
        assertEq(jokes[0].groanerRewards, 0);
        assertEq(jokes[0].isDeleted, false);
    }

    function testRewardJoke() public {
        vm.prank(creator2);
        dadJokes.rewardJoke{value: 0.001 ether}(0, 1);

        DadJokes.Joke[] memory jokes = dadJokes.getJokes();
        assertEq(jokes[0].classicRewards, 1);
        assertEq(dadJokes.creatorBalances(creator1), 0.001 ether);
    }

    function testRewardJokeInvalidIndex() public {
        vm.prank(creator2);
        vm.expectRevert("Invalid joke index");
        dadJokes.rewardJoke{value: 0.001 ether}(1, 1);
    }

    function testRewardJokeInvalidRewardType() public {
        vm.prank(creator2);
        vm.expectRevert("Invalid reward type");
        dadJokes.rewardJoke{value: 0.001 ether}(0, 4);
    }

    function testRewardJokeIncorrectRewardAmount() public {
        vm.prank(creator2);
        vm.expectRevert("Incorrect reward amount for classic");
        dadJokes.rewardJoke{value: 0.002 ether}(0, 1);
    }

    function testDeleteJoke() public {
        vm.prank(creator1);
        dadJokes.deleteJoke(0);

        DadJokes.Joke[] memory jokes = dadJokes.getJokes();
        assertEq(jokes[0].isDeleted, true);
        assertEq(jokes[0].setup, "");
        assertEq(jokes[0].punchline, "");
        assertEq(jokes[0].classicRewards, 0);
        assertEq(jokes[0].funnyRewards, 0);
        assertEq(jokes[0].groanerRewards, 0);
    }

    function testDeleteJokeInvalidIndex() public {
        vm.prank(creator1);
        vm.expectRevert("Invalid joke index");
        dadJokes.deleteJoke(1);
    }

    function testDeleteJokeUnauthorized() public {
        vm.prank(creator2);
        vm.expectRevert("Only the joke creator can delete the joke");
        dadJokes.deleteJoke(0);
    }

    function testWithdrawBalance() public {
        vm.prank(creator2);
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

        vm.prank(creator2);
        vm.expectRevert("Joke has been deleted");
        dadJokes.rewardJoke{value: 0.001 ether}(0, 1);
    }
}
