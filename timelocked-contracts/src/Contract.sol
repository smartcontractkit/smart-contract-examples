// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.10;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Contract is ERC20, Ownable {
    // Error Messages for the contract
    error ErrorAlreadyQueued(bytes32 txnHash);
    error ErrorNotQueued(bytes32 txnHash);
    error ErrorTimeNotInRange(uint256 blockTimestmap, uint256 timestamp);
    error ErrorNotReady(uint256 blockTimestmap, uint256 timestamp);
    error ErrorTimeExpired(uint256 blockTimestamp, uint256 expiresAt);

    // Queue Minting Event
    event QueueMint(
        bytes32 indexed txnHash,
        address indexed to,
        uint256 amount,
        uint256 timestamp
    );
    // Mint Event
    event ExecuteMint(
        bytes32 indexed txnHash,
        address indexed to,
        uint256 amount,
        uint256 timestamp
    );
    // Cancel Mint Event
    event CancelMint(bytes32 indexed txnHash);

    // Constants for minting window
    uint256 public constant MIN_DELAY = 60; // 1 minute
    uint256 public constant MAX_DELAY = 3600; // 1 hour
    uint256 public constant GRACE_PERIOD = 1800; // 30 minutes

    // Minting Queue
    mapping(bytes32 => bool) public mintQueue;

    constructor() ERC20("TimeLock Token", "TLT") {}

    // Create hash of transaction data for use in the queue
    function generateTxnHash(
        address _to,
        uint256 _amount,
        uint256 _timestamp
    ) public pure returns (bytes32) {
        return keccak256(abi.encode(_to, _amount, _timestamp));
    }

    // Queue a mint for a given address amount, and timestamp
    function queueMint(
        address _to,
        uint256 _amount,
        uint256 _timestamp
    ) public onlyOwner {
        // Generate the transaction hash
        bytes32 txnHash = generateTxnHash(_to, _amount, _timestamp);
        // Check if the transaction is already in the queue
        if (mintQueue[txnHash]) {
            revert ErrorAlreadyQueued(txnHash);
        }
        // Check if the time is in the range
        if (
            _timestamp < block.timestamp + MIN_DELAY ||
            _timestamp > block.timestamp + MAX_DELAY
        ) {
            revert ErrorTimeNotInRange(_timestamp, block.timestamp);
        }
        // Queue the transaction
        mintQueue[txnHash] = true;
        // Emit the QueueMint event
        emit QueueMint(txnHash, _to, _amount, _timestamp);
    }

    // Execute a mint for a given address, amount, and timestamp
    function executeMint(
        address _to,
        uint256 _amount,
        uint256 _timestamp
    ) external onlyOwner {
        // Generate the transaction hash
        bytes32 txnHash = generateTxnHash(_to, _amount, _timestamp);
        // Check if the transaction is in the queue
        if (!mintQueue[txnHash]) {
            revert ErrorNotQueued(txnHash);
        }
        // Check if the time has passed
        if (block.timestamp < _timestamp) {
            revert ErrorNotReady(block.timestamp, _timestamp);
        }
        // Check if the window has expired
        if (block.timestamp > _timestamp + GRACE_PERIOD) {
            revert ErrorTimeExpired(block.timestamp, _timestamp);
        }
        // Remove the transaction from the queue
        mintQueue[txnHash] = false;
        // Execute the mint
        mint(_to, _amount);
        // Emit the ExecuteMint event
        emit ExecuteMint(txnHash, _to, _amount, _timestamp);
    }

    // Cancel a mint for a given transaction hash
    function cancelMint(bytes32 _txnHash) external onlyOwner {
        // Check if the transaction is in the queue
        if (!mintQueue[_txnHash]) {
            revert ErrorNotQueued(_txnHash);
        }
        // Remove the transaction from the queue
        mintQueue[_txnHash] = false;
        // Emit the CancelMint event
        emit CancelMint(_txnHash);
    }

    // Mint tokens to a given address
    function mint(address to, uint256 amount) internal {
        _mint(to, amount);
    }
}
