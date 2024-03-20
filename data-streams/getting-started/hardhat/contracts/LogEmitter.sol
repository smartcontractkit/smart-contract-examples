// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

/**
 * @title Log Emitter Contract
 * @dev This contract is designed to emit an event whenever the `emitLog` function is called.
 */
contract LogEmitter {
    // Define an event that logs the address of the sender who triggered the event.
    event Log(address indexed msgSender);

    /**
     * @dev Emits a `Log` event with the sender's address.
     */
    function emitLog() public {
        emit Log(msg.sender);
    }
}
