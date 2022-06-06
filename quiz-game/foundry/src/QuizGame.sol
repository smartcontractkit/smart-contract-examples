// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

contract QuizGame {
    bytes32 public salt = bytes32("123123123");
    bytes32 public hashedAnswer;
    string public question;
    event QuizFunded(uint256 amount);
    event AnswerGuessed();

    constructor(string memory _question, bytes32 _hashedAnswer) {
        question = _question;
        hashedAnswer = _hashedAnswer;
    }

    function guess(string calldata answer) public {
        require(keccak256(abi.encodePacked(salt, answer)) == hashedAnswer);
        if (address(this).balance > 0) {
            emit AnswerGuessed();
            payable(msg.sender).transfer(address(this).balance);
        }
    }

    fallback() external payable {
        emit QuizFunded(address(this).balance);
    }

    receive() external payable {
        emit QuizFunded(address(this).balance);
    }
}
