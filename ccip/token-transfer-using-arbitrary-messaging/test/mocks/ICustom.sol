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

import {IPool} from "../../src/interfaces/IPool.sol";
import {IConfiguration} from "../../src/interfaces/IConfiguration.sol";
import {IBridge} from "../../src/interfaces/IBridge.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface ICustom {
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

    event BridgeSet(
        address indexed oldBridge,
        address indexed newBridge,
        address indexed owner
    );
    event Locked(address indexed sender, uint256 amount);
    event Burned(address indexed sender, uint256 amount);
    event Released(
        address indexed sender,
        address indexed receiver,
        uint256 amount
    );
    event Minted(
        address indexed sender,
        address indexed receiver,
        uint256 amount
    );
    event LiquidityProvided(address indexed provider, uint256 amount);
    event LiquidityWithdrawn(address indexed provider, uint256 amount);
    event LiquidityProviderSet(
        address indexed oldLiquidityProvider,
        address indexed newLiquidityProvider,
        address indexed owner
    );

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

    error InvalidRouter(address router);
    error OnlySelf(address caller);
    event MessageFailed(
        bytes32 indexed messageId,
        address indexed receiver,
        IBridge.TokenAmount tokenAmount,
        bytes reason
    );
    event MessageRecovered(
        bytes32 indexed messageId,
        address indexed recoverer,
        address indexed receiver,
        IBridge.TokenAmount tokenAmount
    );

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
    error FailedToSendChange(address receiver, uint256 changeAmount);
    error ReceivedAmountIsZero();

    error OwnableUnauthorizedAccount(address account);
    error ERC20InsufficientBalance(
        address sender,
        uint256 balance,
        uint256 needed
    );

    error NoAmountToLock(uint256 amount, address bridge);

    error NoMoreLiquidity(uint256 amountToRelease, uint256 liquidity);

    error IsNotBridge(address caller, address bridge);

    error BridgeAddressZero();

    error IsNotLiquidityProvider(address account, address liquidityProvider);
    error LiquidityProviderAddressZero();

    error PoolAddressIsZero();
    error BridgeAddressIsZero();

    enum TokenPoolType {
        LockRelease,
        BurnMint
    }
}
