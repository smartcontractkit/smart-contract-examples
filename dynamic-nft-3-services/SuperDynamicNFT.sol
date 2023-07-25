// SPDX-License-Identifier: MIT
// This is for DEMO purposes only and should not be used in production!
/**
 * THIS IS AN EXAMPLE CONTRACT THAT USES HARDCODED
 * VALUES FOR CLARITY.
 * THIS IS AN EXAMPLE CONTRACT THAT USES UN-AUDITED CODE.
 * DO NOT USE THIS CODE IN PRODUCTION.
 */
pragma solidity ^0.8.10;

// Importing other contracts
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";

// Define SuperDynamicNFT contract which inherits from ERC721, ERC721URIStorage and VRFConsumerBaseV2
contract SuperDynamicNFT is ERC721, ERC721URIStorage, VRFConsumerBaseV2 {
    // State variables for tracking ETH price and the corresponding emoji
    int256 previousEthPrice = 0;
    string ethIndicatorUp = unicode"😀";
    string ethIndicatorDown = unicode"😔";
    string ethIndicatorFlat = unicode"😑";
    string ethIndicator;

    // State variables for creating SVGs
    string[] public hexDigits = [
        "0",
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
        "a",
        "b",
        "c",
        "d",
        "e",
        "f"
    ];
    string public fillColor = "#000000";

    // Interfaces for getting price data and random numbers from Chainlink
    AggregatorV3Interface internal priceFeed;
    VRFCoordinatorV2Interface COORDINATOR;

    // VRF-related state variables
    uint64 private s_subscriptionId;
    uint32 private callbackGasLimit = 2500000;
    uint16 private requestConfirmations = 3;
    uint32 private numWords = 6;
    uint256[] public s_randomWords;

    // Contract owner's address
    address private s_owner;

    // VRF settings specific to Mumbai testnet
    address private vrfCoordinator = 0x7a1BaC17Ccc5b313516C5E16fb24f7659aA5ebed;
    bytes32 private keyHash =
        0x4b09e658ed251bcafeebbc69400383d49f344ace09b9576fe248bb02c003fe9f;

    // Constructor takes subscription ID and sets up the contract
    constructor(
        uint64 subscriptionId
    ) ERC721("ETH Watch SVG", "ewSVG") VRFConsumerBaseV2(vrfCoordinator) {
        priceFeed = AggregatorV3Interface(
            0x0715A7794a1dc8e42615F059dD6e406A6594651A
        );
        s_owner = msg.sender;
        COORDINATOR = VRFCoordinatorV2Interface(vrfCoordinator);
        s_subscriptionId = subscriptionId;
        _safeMint(s_owner, 0);
    }

    // Function to request random Numbers from the VRF
    function requestRandomWords() public {
        // Will revert if subscription is not set and funded.
        COORDINATOR.requestRandomWords(
            keyHash,
            s_subscriptionId,
            requestConfirmations,
            callbackGasLimit,
            numWords
        );
    }

    // Callback function used by VRF Coordinator
    function fulfillRandomWords(
        uint256 /* requestId */,
        uint256[] memory randomWords
    ) internal override {
        s_randomWords = randomWords;
        //Get new fill color
        updateFillColor();
        // Update NFT SVG
        updateETHPrice();
    }

    // Function to update fill color of SVG based on VRF-provided random numbers
    function updateFillColor() internal {
        fillColor = string(
            abi.encodePacked(
                "#",
                randomHexDigit(s_randomWords[0]),
                randomHexDigit(s_randomWords[1]),
                randomHexDigit(s_randomWords[2]),
                randomHexDigit(s_randomWords[3]),
                randomHexDigit(s_randomWords[4]),
                randomHexDigit(s_randomWords[5])
            )
        );
    }

    // Function to update ETH price and corresponding emoji
    function updateETHPrice() internal returns (string memory) {
        int256 currentEthPrice = getETHPrice();
        if (currentEthPrice > previousEthPrice) {
            ethIndicator = ethIndicatorUp;
        } else if (currentEthPrice < previousEthPrice) {
            ethIndicator = ethIndicatorDown;
        } else {
            ethIndicator = ethIndicatorFlat;
        }
        previousEthPrice = currentEthPrice;
        return ethIndicator;
    }

    // Helper function to generate a random hex digit
    function randomHexDigit(
        uint256 _randomNum
    ) internal view returns (string memory) {
        uint256 randomIndex = _randomNum % hexDigits.length;
        return hexDigits[randomIndex];
    }

    // Function to get the current price of ETH from Chainlink
    function getETHPrice() internal view returns (int256) {
        (, int256 price, , , ) = priceFeed.latestRoundData();
        return price;
    }

    // Overridden tokenURI function to produce SVG images as NFTs
    function tokenURI(
        uint256
    ) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        // Create SVG rectangle with color
        string memory imgSVG = string(
            abi.encodePacked(
                "<svg xmlns='http://www.w3.org/2000/svg' version='1.1' xmlns:xlink='http://www.w3.org/1999/xlink' xmlns:svgjs='http://svgjs.com/svgjs' width='500' height='500' preserveAspectRatio='none' viewBox='0 0 500 500'> <rect width='100%' height='100%' fill='",
                fillColor,
                "' />",
                "<text x='50%' y='50%' font-size='128' dominant-baseline='middle' text-anchor='middle'>",
                ethIndicator,
                "</text>",
                "</svg>"
            )
        );

        string memory json = Base64.encode(
            bytes(
                string(
                    abi.encodePacked(
                        '{"name": "ETH Watching SVG",',
                        '"description": "An Automated ETH tracking SVG",',
                        '"image": "data:image/svg+xml;base64,',
                        Base64.encode(bytes(imgSVG)),
                        '"}'
                    )
                )
            )
        );

        // Create token URI
        string memory finalTokenURI = string(
            abi.encodePacked("data:application/json;base64,", json)
        );
        return finalTokenURI;
    }

    // Overridden burn function to ensure ERC721 and ERC721URIStorage compatibility
    function _burn(
        uint256 tokenId
    ) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    // Modifier to restrict certain functions to contract owner
    modifier onlyOwner() {
        require(msg.sender == s_owner);
        _;
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
