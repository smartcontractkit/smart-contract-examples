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
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IPool} from "../interfaces/IPool.sol";
import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";

abstract contract Pool is IPool, Ownable2Step {
    IERC20 internal immutable i_token;
    TokenPoolType internal immutable i_tokenPoolType;
    address internal s_bridge;

    modifier onlyBridge() {
        if (msg.sender != s_bridge) {
            revert IsNotBridge(msg.sender, s_bridge);
        }
        _;
    }

    constructor(
        IERC20 token,
        TokenPoolType tokenPoolType,
        address bridge
    ) Ownable(msg.sender) {
        i_token = token;
        i_tokenPoolType = tokenPoolType;
        if (bridge != address(0)) {
            s_bridge = bridge;
            emit BridgeSet(address(0), bridge, msg.sender);
        }
    }

    /**
     * @inheritdoc IPool
     */
    function setBridge(address bridge) external onlyOwner {
        if (bridge == address(0)) {
            revert BridgeAddressZero();
        }
        address oldBridge = s_bridge;
        if (oldBridge != bridge) {
            s_bridge = bridge;
            emit BridgeSet(oldBridge, bridge, msg.sender);
        }
    }

    /**
     * @inheritdoc IPool
     */
    function removeBridge() external onlyOwner {
        address oldBridge = s_bridge;
        if (oldBridge != address(0)) {
            delete s_bridge;
            emit BridgeSet(oldBridge, address(0), msg.sender);
        }
    }

    /**
     * @inheritdoc IPool
     */
    function getBridge() external view returns (address bridge) {
        bridge = s_bridge;
    }

    /**
     * @inheritdoc IPool
     */
    function getToken() external view returns (IERC20 token) {
        token = i_token;
    }

    /**
     * @inheritdoc IPool
     */
    function getTokenPoolType()
        external
        view
        returns (TokenPoolType tokenPoolType)
    {
        tokenPoolType = i_tokenPoolType;
    }

    /**
     * @inheritdoc IPool
     */
    function lockOrBurn(uint256 amount) external onlyBridge {
        _lockOrBurn(amount);
    }

    /**
     * @inheritdoc IPool
     */
    function releaseOrMint(
        uint256 amount,
        address receiver
    ) external onlyBridge {
        _releaseOrMint(amount, receiver);
    }

    function _lockOrBurn(uint256 amount) internal virtual;

    function _releaseOrMint(uint256 amount, address receiver) internal virtual;
}
