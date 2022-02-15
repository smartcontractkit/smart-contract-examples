//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.8/VRFConsumerBase.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";

contract EmojiNFT is ERC721URIStorage, VRFConsumerBase {
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

  bytes32 internal immutable keyHash;
  uint256 internal immutable fee;

  mapping(bytes32 => address) requestToSender;

  event RandomnessRequested(bytes32 indexed requestId);

  constructor(
    address _VRFCoordinator,
    address _linkToken,
    bytes32 _keyhash,
    uint256 _fee
  ) VRFConsumerBase(_VRFCoordinator, _linkToken) ERC721("EmojiNFT", "EMOJI") {
    keyHash = _keyhash;
    fee = _fee;
  }

  function mint() public returns (bytes32 requestId) {
    require(
      LINK.balanceOf(address(this)) >= fee,
      "Not enough LINK - fill contract with faucet"
    );

    requestId = requestRandomness(keyHash, fee);

    requestToSender[requestId] = msg.sender;

    emit RandomnessRequested(requestId);
  }

  function pickRandomColor(uint256 randomNumber)
    internal
    pure
    returns (string memory)
  {
    uint256 r = uint256(keccak256(abi.encode(randomNumber, 1))) % 256;
    uint256 g = uint256(keccak256(abi.encode(randomNumber, 2))) % 256;
    uint256 b = uint256(keccak256(abi.encode(randomNumber, 3))) % 256;

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

  function fulfillRandomness(bytes32 requestId, uint256 randomNumber)
    internal
    override
  {
    uint256 tokenId = tokenIds.current();

    uint256 emojiIndex = (randomNumber % emojis.length) + 1;
    string memory emoji = emojis[emojiIndex];

    string memory color = pickRandomColor(randomNumber);

    string
      memory baseSvg = "<svg xmlns='http://www.w3.org/2000/svg' preserveAspectRatio='xMinYMin meet' viewBox='0 0 350 350'><style>.base { fill: black; font-family: serif; font-size: 24px; }</style><rect width='100%' height='100%' style='fill:";
    string
      memory afterColorSvg = "' /><text x='50%' y='50%' class='base' dominant-baseline='middle' text-anchor='middle'>";

    string memory svg = string(
      abi.encodePacked(baseSvg, color, afterColorSvg, emoji, "</text></svg>")
    );

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

    string memory tokenUri = string(
      abi.encodePacked("data:application/json;base64,", json)
    );

    _safeMint(requestToSender[requestId], tokenId);
    _setTokenURI(tokenId, tokenUri);

    tokenIds.increment();
  }
}
