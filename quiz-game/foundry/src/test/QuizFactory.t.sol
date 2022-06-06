// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "ds-test/test.sol";

import "../QuizFactory.sol";

contract QuizFactoryTest is DSTest {
    QuizFactory public factory;

    function setUp() public {
        factory = new QuizFactory();
    }

    function testCreateQuiz() public {
        string
            memory question = "What is the answer to life, the universe, and everything?";
        string memory answer = "42";
        bytes32 salt = bytes32("123123123");
        bytes32 hashedAnswer = keccak256(abi.encodePacked(salt, answer));
        factory.createQuiz(question, hashedAnswer);
        QuizGame quiz = factory.quizzes(0);
        assertEq(
            keccak256(abi.encodePacked(quiz.question())),
            keccak256(abi.encodePacked(question))
        );
    }

    function testCountQuizzes() public {
        string
            memory question = "What is the answer to life, the universe, and everything?";
        string memory answer = "42";
        bytes32 salt = bytes32("123123123");
        bytes32 hashedAnswer = keccak256(abi.encodePacked(salt, answer));
        factory.createQuiz(question, hashedAnswer);
        factory.createQuiz(question, hashedAnswer);
        QuizGame[] memory quizzes = factory.getQuizzes();
        assertEq(quizzes.length, 2);
    }
}
