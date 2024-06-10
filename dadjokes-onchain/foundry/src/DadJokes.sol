// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract DadJokes {
    struct Joke {
        string setup;
        string punchline;
        address creator;
        uint256 classicRewards;
        uint256 funnyRewards;
        uint256 groanerRewards;
        bool isDeleted;
    }

    Joke[] private jokes;
    mapping(address => uint256) public creatorBalances;

    uint256 private constant CLASSIC_REWARD = 0.001 ether;
    uint256 private constant FUNNY_REWARD = 0.005 ether;
    uint256 private constant GROANER_REWARD = 0.01 ether;

    event JokeAdded(uint256 indexed jokeId, address indexed creator);
    event JokeRewarded(
        uint256 indexed jokeId,
        uint8 rewardType,
        uint256 rewardAmount
    );
    event JokeDeleted(uint256 indexed jokeId);
    event BalanceWithdrawn(address indexed creator, uint256 amount);

    function addJoke(string memory _setup, string memory _punchline) public {
        uint256 jokeId = jokes.length;
        jokes.push(Joke(_setup, _punchline, msg.sender, 0, 0, 0, false));
        emit JokeAdded(jokeId, msg.sender);
    }

    function getJokes() public view returns (Joke[] memory) {
        return jokes;
    }

    function rewardJoke(uint256 _index, uint8 _rewardType) public payable {
        require(_index < jokes.length, "Invalid joke index");
        require(_rewardType >= 1 && _rewardType <= 3, "Invalid reward type");
        require(!jokes[_index].isDeleted, "Joke has been deleted");

        Joke storage joke = jokes[_index];
        uint256 rewardAmount;

        if (_rewardType == 1) {
            require(
                msg.value == CLASSIC_REWARD,
                "Incorrect reward amount for classic"
            );
            joke.classicRewards++;
            rewardAmount = CLASSIC_REWARD;
        } else if (_rewardType == 2) {
            require(
                msg.value == FUNNY_REWARD,
                "Incorrect reward amount for funny"
            );
            joke.funnyRewards++;
            rewardAmount = FUNNY_REWARD;
        } else if (_rewardType == 3) {
            require(
                msg.value == GROANER_REWARD,
                "Incorrect reward amount for groaner"
            );
            joke.groanerRewards++;
            rewardAmount = GROANER_REWARD;
        }

        creatorBalances[joke.creator] += rewardAmount;
        emit JokeRewarded(_index, _rewardType, rewardAmount);
    }

    function deleteJoke(uint256 _index) public {
        require(_index < jokes.length, "Invalid joke index");
        require(
            jokes[_index].creator == msg.sender,
            "Only the joke creator can delete the joke"
        );
        require(!jokes[_index].isDeleted, "Joke has already been deleted");

        Joke storage joke = jokes[_index];
        joke.isDeleted = true;
        joke.setup = "";
        joke.punchline = "";
        joke.classicRewards = 0;
        joke.funnyRewards = 0;
        joke.groanerRewards = 0;

        emit JokeDeleted(_index);
    }

    function withdrawBalance() public {
        uint256 balance = creatorBalances[msg.sender];
        require(balance > 0, "No balance to withdraw");

        // Prevent reentrancy by setting the balance to zero before the transfer
        creatorBalances[msg.sender] = 0;

        // Use call to send the balance to the creator
        (bool success, ) = payable(msg.sender).call{value: balance}("");
        require(success, "Failed to withdraw balance");

        emit BalanceWithdrawn(msg.sender, balance);
    }
}
