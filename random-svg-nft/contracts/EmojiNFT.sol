//SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";

contract EmojiNFT is ERC721URIStorage, VRFConsumerBaseV2 {
  using Counters for Counters.Counter;
  Counters.Counter private tokenIds;

  string[] private emojis = [
    unicode"😁",
    unicode"😂",
    unicode"😍",
    unicode"😭",
    unicode"😴",
    unicode"😎",
    unicode"🤑",
    unicode"🥳",
    unicode"😱",
    unicode"🙄"
  ];

  VRFCoordinatorV2Interface internal immutable vrfCoordinator;
  bytes32 internal immutable keyHash;
  uint64 internal immutable subscriptionId;
  uint32 internal immutable callbackGasLimit;
  uint32 internal immutable numWords;
  uint16 internal immutable requestConfirmations;

  mapping(uint256 => address) requestToSender;

  event RandomnessRequested(uint256 indexed requestId);

  constructor(
    address _vrfCoordinator,
    bytes32 _keyHash,
    uint64 _subscriptionId,
    uint32 _callbackGasLimit,
    uint16 _requestConfirmations
  ) VRFConsumerBaseV2(_vrfCoordinator) ERC721("EmojiNFT", "EMOJI") {
    vrfCoordinator = VRFCoordinatorV2Interface(_vrfCoordinator);
    keyHash = _keyHash;
    subscriptionId = _subscriptionId;
    callbackGasLimit = _callbackGasLimit;
    numWords = 4;
    requestConfirmations = _requestConfirmations;
  }

  function mint() public returns (uint256 requestId) {
    requestId = vrfCoordinator.requestRandomWords(
      keyHash,
      subscriptionId,
      requestConfirmations,
      callbackGasLimit,
      numWords
    );

    requestToSender[requestId] = msg.sender;

    emit RandomnessRequested(requestId);
  }

  function pickRandomColor(uint256 firstRandomNumber, uint256 secondRandomNumber, uint256 thirdRandomNumber)
    internal
    pure
    returns (string memory)
  {
    uint256 r = firstRandomNumber % 256;
    uint256 g = secondRandomNumber % 256;
    uint256 b = thirdRandomNumber % 256;

    return
      string(
        abi.encodePacked(
          "rgb(",
          Strings.toString(r),
          ", ",
          Strings.toString(g),
          ", ",
          Strings.toString(b),
          ");"
        )
      );
  }

  function createOnChainSvg(string memory emoji, string memory color) internal pure returns(string memory svg) {
    string memory baseSvg = "<svg xmlns='http://www.w3.org/2000/svg' preserveAspectRatio='xMinYMin meet' viewBox='0 0 350 350'><style>.base { font-size: 100px; }</style><rect width='100%' height='100%' style='fill:";
    string memory afterColorSvg = "' /><text x='50%' y='50%' class='base' dominant-baseline='middle' text-anchor='middle'>";

    svg = string(abi.encodePacked(baseSvg, color, afterColorSvg, emoji, "</text></svg>"));
  }

  function createTokenUri(string memory emoji, string memory svg) internal pure returns(string memory tokenUri) {
    string memory json = Base64.encode(
      bytes(
        string(
          abi.encodePacked(
            '{"name": "',
            emoji,
            '", "description": "Random Emoji NFT Collection Powered by Chainlink VRF", "image": "data:image/svg+xml;base64,',
            Base64.encode(bytes(svg)),
            '"}'
          )
        )
      )
    );

    tokenUri = string(
      abi.encodePacked("data:application/json;base64,", json)
    );
  }

  function fulfillRandomWords(uint256 requestId, uint256[] memory randomNumbers)
    internal
    override
  {
    uint256 tokenId = tokenIds.current();

    uint256 emojiIndex = (randomNumbers[0] % emojis.length) + 1;
    string memory emoji = emojis[emojiIndex];
    string memory color = pickRandomColor(randomNumbers[1], randomNumbers[2], randomNumbers[3]);
    string memory svg = createOnChainSvg(emoji, color);
    string memory tokenUri = createTokenUri(emoji, svg);

    _safeMint(requestToSender[requestId], tokenId);
    _setTokenURI(tokenId, tokenUri);

    tokenIds.increment();
  }
}
