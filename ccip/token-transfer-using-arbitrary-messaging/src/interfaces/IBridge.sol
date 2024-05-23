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

import {IPool, IERC20} from "../interfaces/IPool.sol";
import {IConfiguration} from "../interfaces/IConfiguration.sol";

interface IBridge {
    enum ErrorCode {
        RESOLVED,
        FAILED
    }

    struct TokenAmount {
        IERC20 token;
        uint256 amount;
    }

    struct FailedMessageContent {
        address receiver;
        TokenAmount tokenAmount;
    }

    struct FailedMessage {
        bytes32 messageId;
        ErrorCode errorCode;
    }

    event CrossChainMessageSent(
        bytes32 indexed messageId,
        address indexed sender,
        address indexed receiver
    );
    event TokensTransferred(
        IERC20 indexed tokenSource,
        IPool indexed tokenSourcePool,
        uint64 indexed destinationChainSelector,
        IERC20 tokenDestination,
        uint256 amount,
        uint256 fees
    );

    event CrossChainMessageReceived(
        bytes32 indexed messageId,
        address indexed sender,
        address indexed receiver
    );

    event TokensReceived(
        IERC20 indexed tokenDestination,
        IPool indexed tokenDestinationPool,
        uint64 indexed sourceChainSelector,
        uint256 amount
    );
    event MessageFailed(
        bytes32 indexed messageId,
        address indexed receiver,
        TokenAmount tokenAmount,
        bytes reason
    );
    event MessageRecovered(
        bytes32 indexed messageId,
        address indexed recoverer,
        address indexed receiver,
        TokenAmount tokenAmount
    );
    event ConfigurationSet(
        IConfiguration indexed oldConfiguration,
        IConfiguration indexed newConfiguration,
        address indexed owner
    );
    event RouterSet(
        address indexed oldRouter,
        address indexed newRouter,
        address indexed owner
    );

    error InvalidRouter(address router);
    error DestinationChainSelectorIsZero();
    error OnlySelf(address caller);
    error TokenNotSupported(IERC20 token, uint64 destinationChainSelector);
    error TokenPoolNotSet(IERC20 token);
    error NoBridgeOnDestination(uint64 destinationChainSelector);
    error InvalidSenderBridge(
        uint64 sourceChainSelector,
        address configuredSenderBridge,
        address senderBridge
    );
    error ReceiverAddressIsZero();
    error CannotSetFeeTokenIfNativeGasNotZero(
        uint256 nativeGas,
        address feeToken
    );

    error ConfigurationNotSet();
    error ConfigurationIsZero();
    error TokenAddressIsZero();
    error FeeTokenAddressIsZero();
    error NoExtraArgs(uint64 destinationChainSelector);
    error InsufficientFees(uint256 nativeGas, uint256 fees);
    error InsufficientFeeAllowance(
        IERC20 feeToken,
        uint256 fees,
        uint256 allowance
    );
    error FailedToSendChange(address receiver, uint256 changeAmount);
    error ReceivedAmountIsZero();
    error MessageNotFailed(bytes32 messageId);
    error ConfigurationAlreadySet(address configuration);

    function setConfiguration(IConfiguration configuration) external;

    function getConfiguration()
        external
        view
        returns (IConfiguration configuration);

    function setRouter(address router) external;

    function getRouter() external view returns (address router);

    function getFee(
        uint64 destinationChainSelector,
        IERC20 token,
        uint256 amount,
        address receiver,
        IERC20 feeToken
    ) external view returns (uint256 fees);

    function transferTokensToDestinationChain(
        uint64 destinationChainSelector,
        IERC20 token,
        uint256 amount,
        address receiver,
        IERC20 feeToken
    ) external payable returns (bytes32 messageId, uint256 fees);

    function retryFailedMessage(
        bytes32 messageId,
        address tokenReceiver
    ) external;

    function getFailedMessages(
        uint256 offset,
        uint256 limit
    ) external view returns (FailedMessage[] memory failedMessages);

    function getFailedMessageContent(
        bytes32 messageId
    ) external view returns (FailedMessageContent memory messageContent);
}
