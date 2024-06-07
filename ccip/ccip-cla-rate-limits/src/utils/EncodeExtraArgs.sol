// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import {Client} from "@chainlink/contracts-ccip/src/v0.8/ccip/libraries/Client.sol";

/**
 * THIS IS AN EXAMPLE CONTRACT THAT USES HARDCODED VALUES FOR CLARITY.
 * THIS IS AN EXAMPLE CONTRACT THAT USES UN-AUDITED CODE.
 * DO NOT USE THIS CODE IN PRODUCTION.
 */
contract EncodeExtraArgs {
    // Below is a simplistic example (same params for all messages) of using storage to allow for new options without
    // upgrading the dapp. Note that extra args are chain family specific (e.g. gasLimit is EVM specific etc.).
    // and will always be backwards compatible i.e. upgrades are opt-in.
    // Offchain we can compute the V1 extraArgs:
    //    Client.EVMExtraArgsV1 memory extraArgs = Client.EVMExtraArgsV1({gasLimit: 300_000});
    //    bytes memory encodedV1ExtraArgs = Client._argsToBytes(extraArgs);
    // Then later compute V2 extraArgs, for example if a refund feature was added:
    //    Client.EVMExtraArgsV2 memory extraArgs = Client.EVMExtraArgsV2({gasLimit: 300_000, destRefundAddress: 0x1234});
    //    bytes memory encodedV2ExtraArgs = Client._argsToBytes(extraArgs);
    // and update storage with the new args.
    // If different options are required for different messages, for example different gas limits,
    // one can simply key based on (chainSelector, messageType) instead of only chainSelector.

    function encode(uint256 gasLimit) external pure returns (bytes memory extraArgsBytes) {
        Client.EVMExtraArgsV1 memory extraArgs = Client.EVMExtraArgsV1({gasLimit: gasLimit});
        extraArgsBytes = Client._argsToBytes(extraArgs);
    }
}
