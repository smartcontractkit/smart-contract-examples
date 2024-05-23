// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * @notice This contract is provided "AS IS" without warranties of any kind, as an example and has not been audited.
 * Users are advised to thoroughly test and audit their own implementations
 * before deploying to mainnet or any production environment.
 *
 * @dev This code is intended for educational and illustrative purposes only.
 * Use it at your own risk. The authors are not responsible for any loss of
 * funds or other damages caused by the use of this code.
 */

import {IConfiguration} from "../interfaces/IConfiguration.sol";
import {IPool} from "../interfaces/IPool.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";

contract Configuration is IConfiguration, Ownable2Step {
    mapping(uint64 => address) private s_bridges;
    mapping(uint64 => bytes) private s_extraArgs;
    mapping(IERC20 => IPool) private s_tokenPools;
    mapping(IERC20 => mapping(uint64 => IERC20)) private s_destinationTokens;

    modifier validateBridgeAddress(address bridge) {
        if (bridge == address(0)) {
            revert BridgeAddressIsZero();
        }
        _;
    }

    modifier validateToken(IERC20 token) {
        if (address(token) == address(0)) {
            revert TokenAddressIsZero();
        }
        _;
    }

    modifier validateTokenPool(IPool pool) {
        if (address(pool) == address(0)) {
            revert PoolAddressIsZero();
        }
        _;
    }

    constructor() Ownable(msg.sender) {}

    function setRemoteBridge(
        uint64 chainSelector,
        address remoteBridge
    ) external onlyOwner validateBridgeAddress(remoteBridge) {
        s_bridges[chainSelector] = remoteBridge;
        emit RemoteBridgeSet(chainSelector, remoteBridge, msg.sender);
    }

    function removeRemoteBridge(uint64 chainSelector) external onlyOwner {
        delete s_bridges[chainSelector];
        emit RemoteBridgeRemoved(chainSelector, msg.sender);
    }

    function setExtraArgs(
        uint64 destinationChainSelector,
        bytes memory extraArgs
    ) external onlyOwner {
        s_extraArgs[destinationChainSelector] = extraArgs;
        emit ExtraArgsSet(destinationChainSelector, extraArgs, msg.sender);
    }

    function setTokenPool(
        IPool pool
    )
        external
        onlyOwner
        validateTokenPool(pool)
        validateToken(pool.getToken())
    {
        IERC20 token = pool.getToken();
        s_tokenPools[token] = pool;
        emit TokenPoolSet(token, pool, msg.sender);
    }

    function removeTokenPool(IERC20 token) external onlyOwner {
        delete s_tokenPools[token];
        emit TokenPoolRemoved(token, msg.sender);
    }

    function setDestinationToken(
        IERC20 sourceToken,
        uint64 destinationChainSelector,
        IERC20 destinationToken
    )
        external
        onlyOwner
        validateToken(sourceToken)
        validateToken(destinationToken)
    {
        s_destinationTokens[sourceToken][
            destinationChainSelector
        ] = destinationToken;
        emit DestinationTokenSet(
            sourceToken,
            destinationChainSelector,
            destinationToken,
            msg.sender
        );
    }

    function removeDestinationToken(
        IERC20 sourceToken,
        uint64 destinationChainSelector
    ) external onlyOwner {
        delete s_destinationTokens[sourceToken][destinationChainSelector];
        emit DestinationTokenRemoved(
            sourceToken,
            destinationChainSelector,
            msg.sender
        );
    }

    function isTokenAvailableOnDestination(
        IERC20 token,
        uint64 destinationChainSelector
    ) external view returns (bool available) {
        return
            address(getDestinationToken(token, destinationChainSelector)) !=
            address(0);
    }

    function getExtraArgs(
        uint64 destinationChainSelector
    ) public view returns (bytes memory extraArgs) {
        return s_extraArgs[destinationChainSelector];
    }

    function getTokenPool(IERC20 token) public view returns (IPool pool) {
        return s_tokenPools[token];
    }

    function getDestinationToken(
        IERC20 sourceToken,
        uint64 destinationChainSelector
    ) public view returns (IERC20 destinationToken) {
        return s_destinationTokens[sourceToken][destinationChainSelector];
    }

    function isBridgeAvailableOnChain(
        uint64 chainSelector
    ) public view returns (bool available) {
        return getRemoteBridge(chainSelector) != address(0);
    }

    function getRemoteBridge(
        uint64 chainSelector
    ) public view returns (address remoteBridge) {
        return s_bridges[chainSelector];
    }

    function isTokenPoolAvailable(
        IERC20 token
    ) public view returns (bool available) {
        return address(getTokenPool(token)) != address(0);
    }

    function getConfigOut(
        IERC20 token,
        uint64 destinationChainSelector
    ) external view returns (ConfigOut memory config) {
        config = ConfigOut({
            receiverBridge: getRemoteBridge(destinationChainSelector),
            destinationToken: getDestinationToken(
                token,
                destinationChainSelector
            ),
            extraArgs: getExtraArgs(destinationChainSelector),
            pool: getTokenPool(token)
        });
    }

    function getConfigIn(
        IERC20 token,
        uint64 sourceChainSelector
    ) external view returns (ConfigIn memory config) {
        config = ConfigIn({
            senderBridge: getRemoteBridge(sourceChainSelector),
            pool: getTokenPool(token)
        });
    }
}
