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

import {IBridge} from "../interfaces/IBridge.sol";
import {IPool} from "../interfaces/IPool.sol";
import {IConfiguration} from "../interfaces/IConfiguration.sol";
import {IAny2EVMMessageReceiver} from "@chainlink/contracts-ccip/src/v0.8/ccip/interfaces/IAny2EVMMessageReceiver.sol";
import {Client} from "@chainlink/contracts-ccip/src/v0.8/ccip/libraries/Client.sol";
import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {IRouterClient} from "@chainlink/contracts-ccip/src/v0.8/ccip/interfaces/IRouterClient.sol";
import {Client} from "@chainlink/contracts-ccip/src/v0.8/ccip/libraries/Client.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {EnumerableMap} from "@openzeppelin/contracts/utils/structs/EnumerableMap.sol";

contract Bridge is
    IBridge,
    Ownable2Step,
    ReentrancyGuard,
    IAny2EVMMessageReceiver,
    IERC165
{
    using EnumerableMap for EnumerableMap.Bytes32ToUintMap;
    using SafeERC20 for IERC20;

    IConfiguration private s_configuration;
    address private s_ccipRouter;

    EnumerableMap.Bytes32ToUintMap private s_failedMessages;
    mapping(bytes32 messageId => FailedMessageContent contents)
        private s_messageContents;

    modifier validateToken(IERC20 token) {
        if (address(token) == address(0)) {
            revert TokenAddressIsZero();
        }
        _;
    }

    modifier onlyRouter() {
        if (msg.sender != address(s_ccipRouter))
            revert InvalidRouter(msg.sender);
        _;
    }

    modifier validateConfiguration() {
        if (address(s_configuration) == address(0)) {
            revert ConfigurationNotSet();
        }
        _;
    }

    modifier onlySelf() {
        if (msg.sender != address(this)) revert OnlySelf(msg.sender);
        _;
    }

    constructor(
        address router,
        IConfiguration configuration
    ) Ownable(msg.sender) {
        if (router == address(0)) revert InvalidRouter(address(0));
        if (address(configuration) == address(0)) revert ConfigurationIsZero();
        s_ccipRouter = router;
        s_configuration = configuration;
        emit RouterSet(address(0), router, msg.sender);
        emit ConfigurationSet(
            IConfiguration(address(0)),
            configuration,
            msg.sender
        );
    }

    function setConfiguration(IConfiguration configuration) external onlyOwner {
        if (address(configuration) == address(0)) {
            revert ConfigurationIsZero();
        }
        if (address(configuration) == address(s_configuration))
            revert ConfigurationAlreadySet(address(configuration));
        emit ConfigurationSet(s_configuration, configuration, msg.sender);
        s_configuration = configuration;
    }

    function getConfiguration()
        public
        view
        returns (IConfiguration configuration)
    {
        configuration = s_configuration;
    }

    function setRouter(address router) external onlyOwner {
        if (router == address(0)) revert InvalidRouter(address(0));
        emit RouterSet(s_ccipRouter, router, msg.sender);
        s_ccipRouter = router;
    }

    function getRouter() public view returns (address router) {
        router = s_ccipRouter;
    }

    function getFailedMessages(
        uint256 offset,
        uint256 limit
    ) external view returns (FailedMessage[] memory failedMessages) {
        uint256 length = s_failedMessages.length();
        uint256 returnLength = (offset + limit > length)
            ? length - offset
            : limit;
        failedMessages = new FailedMessage[](returnLength);
        for (uint256 i = 0; i < returnLength; ++i) {
            (bytes32 messageId, uint256 errorCode) = s_failedMessages.at(
                offset + i
            );
            failedMessages[i] = FailedMessage(messageId, ErrorCode(errorCode));
        }
    }

    function getFailedMessageContent(
        bytes32 messageId
    ) external view returns (FailedMessageContent memory content) {
        content = s_messageContents[messageId];
    }

    function getFee(
        uint64 destinationChainSelector,
        IERC20 token,
        uint256 amount,
        address receiver,
        IERC20 feeToken
    )
        external
        view
        validateConfiguration
        validateToken(token)
        returns (uint256 fees)
    {
        IConfiguration.ConfigOut memory configuration = s_configuration
            .getConfigOut(token, destinationChainSelector);

        if (address(configuration.destinationToken) == address(0)) {
            revert TokenNotSupported(token, destinationChainSelector);
        }
        if (address(configuration.pool) == address(0)) {
            revert TokenPoolNotSet(token);
        }

        if (address(configuration.receiverBridge) == address(0)) {
            revert NoBridgeOnDestination(destinationChainSelector);
        }

        if (configuration.extraArgs.length == 0) {
            revert NoExtraArgs(destinationChainSelector);
        }

        Client.EVM2AnyMessage memory message = _buildCCIPMessage(
            configuration.receiverBridge,
            receiver,
            configuration.destinationToken,
            amount,
            feeToken,
            configuration.extraArgs
        );

        IRouterClient router = IRouterClient(getRouter());
        fees = router.getFee(destinationChainSelector, message);
    }

    function transferTokensToDestinationChain(
        uint64 destinationChainSelector,
        IERC20 token,
        uint256 amount,
        address receiver,
        IERC20 feeToken
    )
        external
        payable
        validateConfiguration
        validateToken(token)
        nonReentrant
        returns (bytes32 messageId, uint256 fees)
    {
        if (receiver == address(0)) {
            revert ReceiverAddressIsZero();
        }

        if (destinationChainSelector == 0) {
            revert DestinationChainSelectorIsZero();
        }

        IConfiguration.ConfigOut memory configuration = s_configuration
            .getConfigOut(token, destinationChainSelector);

        if (address(configuration.destinationToken) == address(0)) {
            revert TokenNotSupported(token, destinationChainSelector);
        }
        if (address(configuration.pool) == address(0)) {
            revert TokenPoolNotSet(token);
        }

        if (address(configuration.receiverBridge) == address(0)) {
            revert NoBridgeOnDestination(destinationChainSelector);
        }

        if (configuration.extraArgs.length == 0) {
            revert NoExtraArgs(destinationChainSelector);
        }

        Client.EVM2AnyMessage memory message = _buildCCIPMessage(
            configuration.receiverBridge,
            receiver,
            configuration.destinationToken,
            amount,
            feeToken,
            configuration.extraArgs
        );

        IRouterClient router = IRouterClient(getRouter());
        fees = router.getFee(destinationChainSelector, message);

        token.safeTransferFrom(msg.sender, address(configuration.pool), amount);
        configuration.pool.lockOrBurn(amount);

        if (msg.value > 0) {
            if (address(feeToken) != address(0)) {
                revert CannotSetFeeTokenIfNativeGasNotZero(
                    msg.value,
                    address(feeToken)
                );
            }
            uint256 change;
            if (fees > msg.value) {
                revert InsufficientFees(msg.value, fees);
            } else if (msg.value > fees) {
                change = msg.value - fees;
            }
            messageId = router.ccipSend{value: fees}(
                destinationChainSelector,
                message
            );
            if (change > 0) {
                (bool sent, ) = msg.sender.call{value: change}("");
                if (!sent) revert FailedToSendChange(msg.sender, change);
            }
        } else {
            if (address(feeToken) == address(0)) {
                revert FeeTokenAddressIsZero();
            }
            if (fees > IERC20(feeToken).balanceOf(msg.sender)) {
                revert InsufficientFees(
                    IERC20(feeToken).balanceOf(msg.sender),
                    fees
                );
            }
            if (fees > IERC20(feeToken).allowance(msg.sender, address(this))) {
                revert InsufficientFeeAllowance(
                    feeToken,
                    fees,
                    IERC20(feeToken).allowance(msg.sender, address(this))
                );
            }

            feeToken.safeTransferFrom(msg.sender, address(this), fees);
            feeToken.approve(getRouter(), fees);
            messageId = router.ccipSend(destinationChainSelector, message);
        }

        emit CrossChainMessageSent(messageId, msg.sender, receiver);
        emit TokensTransferred(
            token,
            configuration.pool,
            destinationChainSelector,
            configuration.destinationToken,
            amount,
            fees
        );
    }

    function processMessage(
        bytes32 messageId,
        address senderBridge,
        uint64 sourceChainSelector,
        address receiver,
        TokenAmount memory tokenAmount
    ) external onlySelf {
        if (receiver == address(0)) {
            revert ReceiverAddressIsZero();
        }

        IConfiguration.ConfigIn memory configuration = s_configuration
            .getConfigIn(tokenAmount.token, sourceChainSelector);

        if (senderBridge != configuration.senderBridge) {
            revert InvalidSenderBridge(
                sourceChainSelector,
                configuration.senderBridge,
                senderBridge
            );
        }

        if (address(configuration.pool) == address(0)) {
            revert TokenPoolNotSet(tokenAmount.token);
        }

        configuration.pool.releaseOrMint(tokenAmount.amount, receiver);
        emit CrossChainMessageReceived(messageId, senderBridge, receiver);
        emit TokensReceived(
            tokenAmount.token,
            configuration.pool,
            sourceChainSelector,
            tokenAmount.amount
        );
    }

    /// @inheritdoc IAny2EVMMessageReceiver
    function ccipReceive(
        Client.Any2EVMMessage calldata message
    ) external override onlyRouter {
        address senderBridge = abi.decode(message.sender, (address));
        (address receiver, TokenAmount memory tokenAmount) = abi.decode(
            message.data,
            (address, TokenAmount)
        );
        if (address(tokenAmount.token) == address(0)) {
            revert TokenAddressIsZero();
        }

        if (tokenAmount.amount == 0) {
            revert ReceivedAmountIsZero();
        }
        /* solhint-disable no-empty-blocks */
        try
            this.processMessage(
                message.messageId,
                senderBridge,
                message.sourceChainSelector,
                receiver,
                tokenAmount
            )
        {
            // Intentionally empty in this example; no action needed if processMessage succeeds
        } catch (bytes memory err) {
            s_failedMessages.set(message.messageId, uint256(ErrorCode.FAILED));
            s_messageContents[message.messageId] = FailedMessageContent({
                receiver: receiver,
                tokenAmount: tokenAmount
            });

            emit MessageFailed(message.messageId, receiver, tokenAmount, err);

            return;
        }
    }

    function retryFailedMessage(
        bytes32 messageId,
        address tokenReceiver
    ) external onlyOwner {
        if (s_failedMessages.get(messageId) != uint256(ErrorCode.FAILED))
            revert MessageNotFailed(messageId);

        s_failedMessages.set(messageId, uint256(ErrorCode.RESOLVED));

        FailedMessageContent memory messageContent = s_messageContents[
            messageId
        ];

        IPool pool = s_configuration.getTokenPool(
            messageContent.tokenAmount.token
        );

        if (address(pool) == address(0)) {
            revert TokenPoolNotSet(messageContent.tokenAmount.token);
        }

        delete s_messageContents[messageId];

        pool.releaseOrMint(messageContent.tokenAmount.amount, tokenReceiver);
        emit MessageRecovered(
            messageId,
            msg.sender,
            tokenReceiver,
            messageContent.tokenAmount
        );
    }

    function _buildCCIPMessage(
        address receiverBridge,
        address receiver,
        IERC20 destinationToken,
        uint256 amount,
        IERC20 feeToken,
        bytes memory extraArgs
    ) private pure returns (Client.EVM2AnyMessage memory message) {
        TokenAmount memory tokenAmount = TokenAmount({
            token: destinationToken,
            amount: amount
        });
        message = Client.EVM2AnyMessage({
            receiver: abi.encode(receiverBridge),
            data: abi.encode(receiver, tokenAmount),
            tokenAmounts: new Client.EVMTokenAmount[](0),
            extraArgs: extraArgs,
            feeToken: address(feeToken)
        });
    }

    /// @notice IERC165 supports an interfaceId
    /// @param interfaceId The interfaceId to check
    /// @return true if the interfaceId is supported
    /// @dev Should indicate whether the contract implements IAny2EVMMessageReceiver
    /// e.g. return interfaceId == type(IAny2EVMMessageReceiver).interfaceId || interfaceId == type(IERC165).interfaceId
    /// This allows CCIP to check if ccipReceive is available before calling it.
    /// If this returns false or reverts, only tokens are transferred to the receiver.
    /// If this returns true, tokens are transferred and ccipReceive is called atomically.
    /// Additionally, if the receiver address does not have code associated with
    /// it at the time of execution (EXTCODESIZE returns 0), only tokens will be transferred.
    function supportsInterface(
        bytes4 interfaceId
    ) public pure virtual override returns (bool) {
        return
            interfaceId == type(IAny2EVMMessageReceiver).interfaceId ||
            interfaceId == type(IERC165).interfaceId;
    }
}
