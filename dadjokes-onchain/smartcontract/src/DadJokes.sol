// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract DadJokes {
    struct Joke {
        string setup;
        string punchline;
        address creator;
        bool isDeleted;
    }

    mapping(uint256 => Joke) private jokes;
    uint256 private jokeCount;

    mapping(address => uint256) public creatorBalances;

    uint256 private constant CLASSIC_REWARD = 0.001 ether;
    uint256 private constant FUNNY_REWARD = 0.005 ether;
    uint256 private constant GROANER_REWARD = 0.01 ether;

    mapping(uint8 => uint256) private rewardAmounts;

    constructor() {
        rewardAmounts[1] = CLASSIC_REWARD;
        rewardAmounts[2] = FUNNY_REWARD;
        rewardAmounts[3] = GROANER_REWARD;
    }

    event JokeAdded(uint256 indexed jokeId, address indexed creator);
    event JokeRewarded(
        uint256 indexed jokeId,
        uint8 rewardType,
        uint256 rewardAmount
    );
    event JokeDeleted(uint256 indexed jokeId);
    event BalanceWithdrawn(address indexed creator, uint256 amount);

    function addJoke(string memory _setup, string memory _punchline) public {
        jokes[jokeCount] = Joke(_setup, _punchline, msg.sender, false);
        emit JokeAdded(jokeCount, msg.sender);
        jokeCount++;
    }

    function getJokes() public view returns (Joke[] memory) {
        Joke[] memory allJokes = new Joke[](jokeCount);
        uint256 counter = 0;
        // Assuming there's a mapping or some storage named `jokes` that holds all jokes
        for (uint256 i = 0; i < jokeCount; i++) {
            if (!jokes[i].isDeleted) {
                // Correctly access the `jokes` storage to check if a joke is deleted
                allJokes[counter] = jokes[i]; // Populate `allJokes` with non-deleted jokes
                counter++;
            }
        }
        if (counter == jokeCount) {
            return allJokes; // If no jokes were deleted, return all jokes
        } else {
            Joke[] memory filteredJokes = new Joke[](counter); // Create a new array for non-deleted jokes
            for (uint256 i = 0; i < counter; i++) {
                filteredJokes[i] = allJokes[i]; // Copy non-deleted jokes
            }
            return filteredJokes; // Return only non-deleted jokes
        }
    }

    function rewardJoke(uint256 jokeId, uint8 _rewardType) public payable {
        require(jokeId < jokeCount, "Invalid joke index");
        require(
            _rewardType >= 1 && _rewardType <= 3,
            "Reward type not between 1 and 3"
        );
        require(!jokes[jokeId].isDeleted, "Joke has been deleted");

        uint256 rewardAmount = rewardAmounts[_rewardType];
        require(msg.value == rewardAmount, "Incorrect reward amount");

        creatorBalances[jokes[jokeId].creator] += rewardAmount;
        emit JokeRewarded(jokeId, _rewardType, rewardAmount);
    }

    function deleteJoke(uint256 jokeId) public {
        require(jokeId < jokeCount, "Invalid joke index");
        require(
            jokes[jokeId].creator == msg.sender,
            "Only the joke creator can delete the joke"
        );
        require(!jokes[jokeId].isDeleted, "Joke has already been deleted");

        jokes[jokeId] = Joke("", "", address(0), true);

        emit JokeDeleted(jokeId);
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
