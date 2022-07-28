// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/KeeperCompatibleInterface.sol";

error CharityRaffle__NotJackpotValue();
error CharityRaffle__FundingContractFailed();
error CharityRaffle__UpkeepNotNeeded(
    uint256 currentBalance,
    uint256 numPlayers,
    uint256 raffleState
);
error CharityRaffle__CharityTransferFailed(address charity);
error CharityRaffle__SendMoreToEnterRaffle();
error CharityRaffle__RaffleNotOpen();
error CharityRaffle__NotValidCharityChoice();
error CharityRaffle__JackpotTransferFailed();
error CharityRaffle__MustBeFunder();
error CharityRaffle__NoCharityWinner();
error CharityRaffle__RaffleNotClosed();
error CharityRaffle__MatchAlreadyFunded();
error CharityRaffle__IncorrectMatchValue();
error CharityRaffle__FundingToMatchTransferFailed();
error CharityRaffle__ContractNotFunded();
error CharityRaffle__DonationMatchFailed();

/**@title A sample Charity Raffle Contract originally @author Patrick Collins
 * @notice This contract creates a lottery in which players enter by donating to 1 of 3 charities
 * @dev This implements the Chainlink VRF Version 2
 */

contract CharityRaffle is VRFConsumerBaseV2, KeeperCompatibleInterface {
    /* Type declarations */
    enum RaffleState {
        OPEN,
        CALCULATING,
        CLOSED
    }
    enum CharityChoice {
        CHARITY1,
        CHARITY2,
        CHARITY3
    }
    /* State variables */
    // Chainlink VRF Variables
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 4;
    uint32 private immutable i_callbackGasLimit;
    uint64 private immutable i_subscriptionId;
    bytes32 private immutable i_gasLane;

    // Lottery Variables
    uint256 private immutable i_duration;
    uint256 private s_startTime;
    uint256 private immutable i_entranceFee;
    uint256 private immutable i_jackpot;
    uint256 private s_highestDonations;
    address private s_recentWinner;
    address private immutable i_charity1;
    address private immutable i_charity2;
    address private immutable i_charity3;
    address private immutable i_fundingWallet;
    address private s_charityWinner;
    bool private s_matchFunded;

    address[] private s_players;
    RaffleState private s_raffleState;

    mapping(address => uint256) donations;

    /* Events */
    event RequestedRaffleWinner(uint256 indexed requestId);
    event RaffleEnter(address indexed player);
    event WinnerPicked(address indexed player);
    event CharityWinnerPicked(address indexed charity);

    /* Modifiers */
    modifier onlyFunder() {
        if (msg.sender != i_fundingWallet) {
            revert CharityRaffle__MustBeFunder();
        }
        _;
    }

    modifier charityWinnerPicked() {
        if (s_charityWinner == address(0)) {
            revert CharityRaffle__NoCharityWinner();
        }
        _;
    }

    /* Functions */
    constructor(
        address vrfCoordinatorV2,
        uint64 subscriptionId,
        bytes32 gasLane, // keyHash
        uint256 entranceFee,
        uint256 jackpot,
        uint256 duration,
        uint32 callbackGasLimit,
        address charity1,
        address charity2,
        address charity3,
        address fundingWallet
    ) payable VRFConsumerBaseV2(vrfCoordinatorV2) {
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_duration = duration;
        i_gasLane = gasLane;
        i_subscriptionId = subscriptionId;
        i_entranceFee = entranceFee;
        i_jackpot = jackpot;
        s_raffleState = RaffleState.OPEN;
        s_startTime = block.timestamp;
        i_callbackGasLimit = callbackGasLimit;
        i_charity1 = charity1;
        i_charity2 = charity2;
        i_charity3 = charity3;
        i_fundingWallet = fundingWallet;
        (bool success, ) = payable(address(this)).call{value: jackpot}("");
        if (!success) {
            revert CharityRaffle__FundingContractFailed();
        }
    }

    /*
     * @dev function to enter raffle
     * @param charityChoice - should be 0,1,2 to represent CharityChoice enum
     */

    function enterRaffle(CharityChoice charityChoice) external payable {
        if (msg.value < i_entranceFee) {
            revert CharityRaffle__SendMoreToEnterRaffle();
        }
        if (s_raffleState != RaffleState.OPEN) {
            revert CharityRaffle__RaffleNotOpen();
        }
        if (charityChoice == CharityChoice.CHARITY1) {
            (bool success, ) = i_charity1.call{value: msg.value}("");
            if (!success) {
                revert CharityRaffle__CharityTransferFailed(i_charity1);
            }
            donations[i_charity1]++;
        }
        if (charityChoice == CharityChoice.CHARITY2) {
            (bool success, ) = i_charity2.call{value: msg.value}("");
            if (!success) {
                revert CharityRaffle__CharityTransferFailed(i_charity2);
            }
            donations[i_charity2]++;
        }
        if (charityChoice == CharityChoice.CHARITY3) {
            (bool success, ) = i_charity3.call{value: msg.value}("");
            if (!success) {
                revert CharityRaffle__CharityTransferFailed(i_charity3);
            }
            donations[i_charity3]++;
        }
        s_players.push(payable(msg.sender));
        emit RaffleEnter(msg.sender);
    }

    /*
     * This is the function that the Chainlink Keeper nodes call
     * they look for `upkeepNeeded` to return True.
     * the following should be true for this to return true:
     * 1. The lottery is open.
     * 2. Lottery duration time has elapsed
     * 3. The contract has ETH.
     * 4. Implicity, your subscription is funded with LINK.
     */
    function checkUpkeep(
        bytes memory /* checkData */
    )
        public
        view
        override
        returns (
            bool upkeepNeeded,
            bytes memory /* performData */
        )
    {
        bool isOpen = RaffleState.OPEN == s_raffleState;
        bool timeOver = (block.timestamp - s_startTime) >= i_duration;
        bool hasPlayers = s_players.length > 0;
        bool hasBalance = address(this).balance > 0;
        upkeepNeeded = (isOpen && timeOver && hasBalance && hasPlayers);
    }

    function performUpkeep(
        bytes calldata /* performData */
    ) external override {
        (bool upkeepNeeded, ) = checkUpkeep("");
        if (!upkeepNeeded) {
            revert CharityRaffle__UpkeepNotNeeded(
                address(this).balance,
                s_players.length,
                uint256(s_raffleState)
            );
        }
        s_raffleState = RaffleState.CALCULATING;
        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_gasLane,
            i_subscriptionId,
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            NUM_WORDS
        );
        emit RequestedRaffleWinner(requestId);
    }

    /*
     * @dev function to handle raffle winner
     * picks player winner
     * closes raffle
     * checks if there is a tie in highest charity donations
     * if tie, handleTie is called, else, winner declared
     */
    function fulfillRandomWords(
        uint256,
        /* requestId */
        uint256[] memory randomWords
    ) internal override {
        // declare player winner
        uint256 indexOfWinner = randomWords[0] % s_players.length;
        address recentWinner = s_players[indexOfWinner];
        s_recentWinner = recentWinner;
        s_players = new address[](0);
        s_raffleState = RaffleState.CLOSED;
        // handle if there is charity donations tie
        bool tie = checkForTie();
        uint256 charity1Total = donations[i_charity1];
        donations[i_charity1] = 0;
        uint256 charity2Total = donations[i_charity2];
        donations[i_charity2] = 0;
        uint256 charity3Total = donations[i_charity3];
        donations[i_charity3] = 0;
        if (tie) {
            handleTie(randomWords, charity1Total, charity2Total, charity3Total);
        }
        // not a tie
        if (charity1Total > charity2Total && charity1Total > charity3Total) {
            // charity1 wins
            s_highestDonations = charity1Total;
            s_charityWinner = i_charity1;
        }
        if (charity2Total > charity1Total && charity2Total > charity3Total) {
            // charity2 wins
            s_highestDonations = charity2Total;
            s_charityWinner = i_charity2;
        }
        if (charity3Total > charity1Total && charity3Total > charity2Total) {
            // charity3 wins
            s_highestDonations = charity3Total;
            s_charityWinner = i_charity3;
        }
        (bool success, ) = payable(recentWinner).call{value: address(this).balance}(""); // should be i_jackpot
        if (!success) {
            revert CharityRaffle__JackpotTransferFailed();
        }
        emit WinnerPicked(recentWinner);
        if (s_charityWinner != address(0)) {
            emit CharityWinnerPicked(s_charityWinner);
        }
    }

    function checkForTie() internal view returns (bool) {
        return (donations[i_charity1] == donations[i_charity2] ||
            donations[i_charity1] == donations[i_charity3] ||
            donations[i_charity2] == donations[i_charity3]);
    }

    /*
     * @dev function to use Chainlink VRF to break tie and declare Charity Winner
     * optional - instead of requesting 4 random words from Chainlink VRF,
     * could get "sudo" random numbers by taking the hash and abi.encode of one random number
     */
    function handleTie(
        uint256[] memory randomWords,
        uint256 charity1Total,
        uint256 charity2Total,
        uint256 charity3Total
    ) internal {
        // find top two winners
        uint256[] memory data = new uint256[](3);
        data[0] = charity1Total;
        data[1] = charity2Total;
        data[2] = charity3Total;
        uint256[] memory sortedData = sort(data); // sortedData[2] = highest value
        s_highestDonations = sortedData[2];
        // three-way-tie
        if (charity1Total == charity2Total && charity1Total == charity3Total) {
            charity1Total += randomWords[1];
            charity2Total += randomWords[2];
            charity3Total += randomWords[3];
            uint256[] memory newData = new uint256[](3);
            newData[0] = charity1Total;
            newData[1] = charity2Total;
            newData[2] = charity3Total;
            uint256[] memory newSortedData = sort(newData);
            if (newSortedData[2] == charity1Total) {
                // charity1 wins
                s_charityWinner = i_charity1;
            } else if (newSortedData[2] == charity2Total) {
                //charity2 wins
                s_charityWinner = i_charity2;
            } else {
                // charity3 wins
                s_charityWinner = i_charity3;
            }
        }
        // charity1 and charity2 tie
        if (sortedData[2] == charity1Total && sortedData[2] == charity2Total) {
            charity1Total += randomWords[1];
            charity2Total += randomWords[2];
            if (charity1Total > charity2Total) {
                // charity1 wins
                s_charityWinner = i_charity1;
            } else {
                //charity2 wins
                s_charityWinner = i_charity2;
            }
        }
        // charity1 and charity3 tie
        if (sortedData[2] == charity1Total && sortedData[2] == charity3Total) {
            charity1Total += randomWords[1];
            charity3Total += randomWords[2];
            if (charity1Total > charity3Total) {
                // charity1 wins
                s_charityWinner = i_charity1;
            } else {
                //charity3 wins
                s_charityWinner = i_charity3;
            }
        }
        // charity2 and charity3 tie
        if (sortedData[2] == charity2Total && sortedData[2] == charity3Total) {
            charity2Total += randomWords[1];
            charity3Total += randomWords[2];
            if (charity2Total > charity3Total) {
                // charity2 wins
                s_charityWinner = i_charity2;
            } else {
                //charity3 wins
                s_charityWinner = i_charity3;
            }
        }
        if (s_charityWinner != address(0)) {
            emit CharityWinnerPicked(s_charityWinner);
        }
    }

    /*
     * @dev Internal function to find highest scores
     */
    function sort(uint256[] memory data) internal returns (uint256[] memory) {
        quickSort(data, int256(0), int256(data.length - 1));
        return data;
    }

    function quickSort(
        uint256[] memory arr,
        int256 left,
        int256 right
    ) internal {
        int256 i = left;
        int256 j = right;
        if (i == j) return;
        uint256 pivot = arr[uint256(left + (right - left) / 2)];
        while (i <= j) {
            while (arr[uint256(i)] < pivot) i++;
            while (pivot < arr[uint256(j)]) j--;
            if (i <= j) {
                (arr[uint256(i)], arr[uint256(j)]) = (arr[uint256(j)], arr[uint256(i)]);
                i++;
                j--;
            }
        }
        if (left < j) quickSort(arr, left, j);
        if (i < right) quickSort(arr, i, right);
    }

    /*
     * @dev Funding wallet has option to match donations of winning charity
     * fundDonationMatch must be called before donationMatch to transfer funds into contract
     */
    function fundDonationMatch() external payable onlyFunder charityWinnerPicked {
        if (s_raffleState != RaffleState.CLOSED) {
            revert CharityRaffle__RaffleNotClosed();
        }
        if (s_matchFunded) {
            revert CharityRaffle__MatchAlreadyFunded();
        }
        uint256 mostDonations = s_highestDonations;
        if (msg.value < mostDonations * i_entranceFee) {
            revert CharityRaffle__IncorrectMatchValue();
        }
        s_highestDonations = 0;
        s_matchFunded = true;
    }

    /*
     * @dev function to transfer donation match from contract to winner
     */
    function donationMatch() external onlyFunder charityWinnerPicked {
        if (s_raffleState != RaffleState.CLOSED) {
            revert CharityRaffle__RaffleNotClosed();
        }
        if (!s_matchFunded) {
            revert CharityRaffle__FundingToMatchTransferFailed();
        }
        if (address(this).balance <= 0) {
            revert CharityRaffle__ContractNotFunded();
        }
        address charityWinner = s_charityWinner;
        s_charityWinner = address(0);
        s_recentWinner = address(0);
        s_matchFunded = false;
        (bool donationMatched, ) = payable(charityWinner).call{value: address(this).balance}("");
        if (!donationMatched) {
            revert CharityRaffle__DonationMatchFailed();
        }
    }

    /** Getter Functions */

    function getRaffleState() external view returns (RaffleState) {
        return s_raffleState;
    }

    function getNumWords() external pure returns (uint256) {
        return NUM_WORDS;
    }

    function getRequestConfirmations() external pure returns (uint256) {
        return REQUEST_CONFIRMATIONS;
    }

    function getRecentWinner() external view returns (address) {
        return s_recentWinner;
    }

    function getCharityWinner() external view returns (address) {
        return s_charityWinner;
    }

    function getPlayer(uint256 index) external view returns (address) {
        return s_players[index];
    }

    function getAllPlayers() external view returns (address[] memory) {
        return s_players;
    }

    function getCharities() external view returns (address[] memory) {
        address[] memory charities = new address[](3);
        charities[0] = i_charity1;
        charities[1] = i_charity2;
        charities[2] = i_charity3;
        return charities;
    }

    function getDonations(address charity) external view returns (uint256) {
        return donations[charity];
    }

    function getEntranceFee() external view returns (uint256) {
        return i_entranceFee;
    }

    function getNumberOfPlayers() external view returns (uint256) {
        return s_players.length;
    }

    function getFundingWallet() external view returns (address) {
        return i_fundingWallet;
    }

    function getHighestDonations() external view returns (uint256) {
        return s_highestDonations;
    }

    function getJackpot() external view returns (uint256) {
        return i_jackpot;
    }

    function getStartTime() external view returns (uint256) {
        return s_startTime;
    }

    function getDuration() external view returns (uint256) {
        return i_duration;
    }
}
