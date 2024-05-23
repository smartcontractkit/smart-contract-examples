// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @notice This contract is provided "AS IS" without warranties of any kind, as an example and has not been audited.
 * Users are advised to thoroughly test and audit their own implementations
 * before deploying to mainnet or any production environment.
 *
 * @dev This code is intended for educational and illustrative purposes only.
 * Use it at your own risk. The authors are not responsible for any loss of
 * funds or other damages caused by the use of this code.
 */

import {IPool} from "../interfaces/IPool.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IConfiguration {
    struct ConfigOut {
        address receiverBridge;
        IERC20 destinationToken;
        IPool pool;
        bytes extraArgs;
    }

    struct ConfigIn {
        address senderBridge;
        IPool pool;
    }

    event RemoteBridgeSet(
        uint64 indexed chainSelector,
        address indexed remoteBridge,
        address indexed owner
    );

    event RemoteBridgeRemoved(
        uint64 indexed chainSelector,
        address indexed owner
    );

    event ExtraArgsSet(
        uint64 indexed destinationChainSelector,
        bytes extraArgs,
        address indexed owner
    );

    event DestinationTokenSet(
        IERC20 indexed sourceToken,
        uint64 indexed destinationChainSelector,
        IERC20 destinationToken,
        address indexed owner
    );

    event DestinationTokenRemoved(
        IERC20 indexed sourceToken,
        uint64 indexed destinationChainSelector,
        address indexed owner
    );

    event TokenPoolSet(
        IERC20 indexed token,
        IPool indexed pool,
        address indexed owner
    );
    event TokenPoolRemoved(IERC20 indexed token, address indexed owner);

    error PoolAddressIsZero();
    error TokenAddressIsZero();
    error BridgeAddressIsZero();

    function setRemoteBridge(
        uint64 chainSelector,
        address remoteBridge
    ) external;

    function removeRemoteBridge(uint64 chainSelector) external;

    function setExtraArgs(
        uint64 destinationChainSelector,
        bytes memory extraArgs
    ) external;

    function setTokenPool(IPool pool) external;

    function removeTokenPool(IERC20 token) external;

    function setDestinationToken(
        IERC20 sourceToken,
        uint64 destinationChainSelector,
        IERC20 destinationToken
    ) external;

    function removeDestinationToken(
        IERC20 sourceToken,
        uint64 destinationChainSelector
    ) external;

    function isTokenAvailableOnDestination(
        IERC20 token,
        uint64 destinationChainSelector
    ) external view returns (bool available);

    function isBridgeAvailableOnChain(
        uint64 chainSelector
    ) external view returns (bool available);

    function getRemoteBridge(
        uint64 chainSelector
    ) external view returns (address remoteBridge);

    function getExtraArgs(
        uint64 destinationChainSelector
    ) external view returns (bytes memory extraArgs);

    function getTokenPool(IERC20 token) external view returns (IPool pool);

    function getDestinationToken(
        IERC20 sourceToken,
        uint64 destinationChainSelector
    ) external view returns (IERC20 destinationToken);

    function isTokenPoolAvailable(
        IERC20 token
    ) external view returns (bool available);

    function getConfigOut(
        IERC20 token,
        uint64 destinationChainSelector
    ) external view returns (ConfigOut memory config);

    function getConfigIn(
        IERC20 token,
        uint64 sourceChainSelector
    ) external view returns (ConfigIn memory config);
}
