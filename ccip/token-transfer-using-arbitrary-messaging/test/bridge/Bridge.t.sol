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

import "forge-std/Test.sol";
import {IBridge, Bridge} from "../../src/bridge/Bridge.sol";
import {IConfiguration, Configuration} from "../../src/bridge/Configuration.sol";
import {LockReleaseTokenPool} from "../../src/pools/LockReleaseTokenPool.sol";
import {MockERC20, IERC20} from "../mocks/MockERC20.sol";
import {ICustom} from "../mocks/ICustom.sol";
import {Client} from "@chainlink/contracts-ccip/src/v0.8/ccip/libraries/Client.sol";
import {IAny2EVMMessageReceiver} from "@chainlink/contracts-ccip/src/v0.8/ccip/interfaces/IAny2EVMMessageReceiver.sol";

contract BridgeTest is Test, ICustom {
    Bridge bridge;
    Configuration configuration;
    LockReleaseTokenPool pool;
    MockERC20 token;
    MockERC20 destinationToken;
    address owner;
    address nonOwner = address(0x2);
    uint64 destinationChainSelector = 123;
    uint64 sourceChainSelector = 456;
    address liquidityProviderAddress = address(0x4);
    address sourceBridgeAddress = address(0x5);
    address receiverAddress = address(0x6);
    address routerAddress = address(0x7);
    address receiverBridgeAddress = address(0x8);

    function setUp() public {
        owner = address(this);
        token = new MockERC20("Mock Token", "MTK", type(uint256).max);
        token.transfer(liquidityProviderAddress, 1_000_000);
        destinationToken = new MockERC20(
            "Mock Token",
            "MTK",
            type(uint256).max
        );
        configuration = new Configuration();
        bridge = new Bridge(routerAddress, configuration);
        pool = new LockReleaseTokenPool(
            token,
            address(bridge),
            liquidityProviderAddress
        );
        configuration.setTokenPool(pool);
        configuration.setDestinationToken(
            token,
            destinationChainSelector,
            destinationToken
        );
        configuration.setRemoteBridge(
            destinationChainSelector,
            receiverBridgeAddress
        );
        configuration.setRemoteBridge(sourceChainSelector, sourceBridgeAddress);
    }

    function testSetConfigurationSuccess() public {
        Configuration newConfiguration = new Configuration();
        bridge.setConfiguration(newConfiguration);
        assertEq(address(newConfiguration), address(bridge.getConfiguration()));
    }

    function testSetConfigurationOnlyOwner() public {
        Configuration newConfiguration = new Configuration();
        vm.prank(nonOwner);
        vm.expectRevert(
            abi.encodeWithSelector(
                OwnableUnauthorizedAccount.selector,
                nonOwner
            )
        );
        bridge.setConfiguration(newConfiguration);
    }

    function testSetConfigurationNonZero() public {
        vm.expectRevert(abi.encodeWithSelector(ConfigurationIsZero.selector));
        bridge.setConfiguration(IConfiguration(address(0)));
    }

    function testSetRouterSuccess() public {
        address newRouter = address(0x6);
        bridge.setRouter(newRouter);
        assertEq(newRouter, bridge.getRouter());
    }

    function testSetRouterOnlyOwner() public {
        vm.prank(nonOwner);
        vm.expectRevert(
            abi.encodeWithSelector(
                OwnableUnauthorizedAccount.selector,
                nonOwner
            )
        );
        bridge.setRouter(address(0x6));
    }

    function testSetRouterNonZero() public {
        vm.expectRevert(
            abi.encodeWithSelector(InvalidRouter.selector, address(0))
        );
        bridge.setRouter(address(0));
    }

    function testSupportInterface() public view {
        assertTrue(
            bridge.supportsInterface(type(IAny2EVMMessageReceiver).interfaceId)
        );
    }

    function testCCIPReceiveSuccess() public {
        vm.startPrank(liquidityProviderAddress);
        token.approve(address(pool), 1000);
        LockReleaseTokenPool(pool).provideLiquidity(1000);
        uint256 amount = 100;
        vm.stopPrank();
        IBridge.TokenAmount memory tokenAmount = IBridge.TokenAmount({
            token: token,
            amount: amount
        });

        bytes memory data = abi.encode(receiverAddress, tokenAmount);
        bytes32 messageId = bytes32("123");

        // Prepare the CCIP message
        Client.Any2EVMMessage memory message = Client.Any2EVMMessage({
            messageId: messageId,
            sourceChainSelector: sourceChainSelector,
            sender: abi.encode(sourceBridgeAddress),
            data: data,
            destTokenAmounts: new Client.EVMTokenAmount[](0)
        });

        vm.prank(routerAddress);
        vm.expectEmit(true, true, true, true);
        emit CrossChainMessageReceived(
            messageId,
            sourceBridgeAddress,
            receiverAddress
        );
        emit TokensReceived(
            tokenAmount.token,
            pool,
            sourceChainSelector,
            tokenAmount.amount
        );
        bridge.ccipReceive(message);

        assertEq(
            token.balanceOf(address(pool)),
            1000 - amount,
            "Token balance of pool should be 1000"
        );
        assertEq(
            token.balanceOf(receiverAddress),
            amount,
            "Token balance of receiver should be 100"
        );
    }

    function testCCIPReceiveWithReceiverAddressZeroThenRetry() public {
        vm.startPrank(liquidityProviderAddress);
        token.approve(address(pool), 1000);
        LockReleaseTokenPool(pool).provideLiquidity(1000);
        uint256 amount = 100;
        vm.stopPrank();
        IBridge.TokenAmount memory tokenAmount = IBridge.TokenAmount({
            token: token,
            amount: amount
        });

        bytes memory data = abi.encode(address(0), tokenAmount);
        bytes32 messageId = bytes32("123");

        Client.Any2EVMMessage memory message = Client.Any2EVMMessage({
            messageId: messageId,
            sourceChainSelector: sourceChainSelector,
            sender: abi.encode(routerAddress),
            data: data,
            destTokenAmounts: new Client.EVMTokenAmount[](0)
        });

        vm.prank(routerAddress);
        vm.expectEmit(true, true, true, true);
        emit MessageFailed(
            messageId,
            address(0),
            tokenAmount,
            abi.encodeWithSelector(ReceiverAddressIsZero.selector)
        );
        bridge.ccipReceive(message);

        IBridge.FailedMessageContent memory failedContent = bridge
            .getFailedMessageContent(messageId);
        assertEq(failedContent.receiver, address(0));
        assertEq(failedContent.tokenAmount.amount, amount);
        assertEq(address(failedContent.tokenAmount.token), address(token));

        IBridge.FailedMessage[] memory failedMessages = bridge
            .getFailedMessages(0, 1);
        assertEq(
            uint256(failedMessages[0].errorCode),
            uint256(IBridge.ErrorCode.FAILED)
        );
        assertEq(failedMessages[0].messageId, messageId);
        vm.prank(nonOwner);
        vm.expectRevert(
            abi.encodeWithSelector(
                OwnableUnauthorizedAccount.selector,
                nonOwner
            )
        );
        bridge.retryFailedMessage(messageId, receiverAddress);
        // retry as owner
        vm.prank(owner);
        vm.expectEmit(true, true, true, true);
        emit MessageRecovered(
            messageId,
            owner,
            receiverAddress,
            IBridge.TokenAmount({token: token, amount: amount})
        );
        bridge.retryFailedMessage(messageId, receiverAddress);
        assertEq(
            token.balanceOf(address(pool)),
            1000 - amount,
            "Token balance of pool should be 1000"
        );
        assertEq(
            token.balanceOf(receiverAddress),
            amount,
            "Token balance of receiver should be 100"
        );
        failedMessages = bridge.getFailedMessages(0, 1);
        assertEq(
            uint256(failedMessages[0].errorCode),
            uint256(IBridge.ErrorCode.RESOLVED)
        );
        assertEq(failedMessages[0].messageId, messageId);
        failedContent = bridge.getFailedMessageContent(messageId);
        assertEq(failedContent.receiver, address(0));
        assertEq(failedContent.tokenAmount.amount, 0);
        assertEq(address(failedContent.tokenAmount.token), address(0));
    }
}
