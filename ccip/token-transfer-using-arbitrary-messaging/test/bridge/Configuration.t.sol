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
import {Configuration} from "../../src/bridge/Configuration.sol";
import {LockReleaseTokenPool} from "../../src/pools/LockReleaseTokenPool.sol";
import {MockERC20, IERC20} from "../mocks/MockERC20.sol";
import {ICustom} from "../mocks/ICustom.sol";

contract ConfigurationTest is Test, ICustom {
    Configuration config;
    LockReleaseTokenPool pool;
    MockERC20 token;
    address owner;
    address nonOwner = address(0x2);
    uint64 chainSelector = 123;
    address bridgeAddress = address(0x3);
    address liquidityProviderAddress = address(0x4);

    function setUp() public {
        owner = address(this);
        token = new MockERC20("Mock Token", "MTK", type(uint256).max);
        pool = new LockReleaseTokenPool(
            token,
            bridgeAddress,
            liquidityProviderAddress
        );
        config = new Configuration();
    }

    function testSetRemoteBridgeSuccess() public {
        vm.expectEmit(true, true, true, true);
        emit RemoteBridgeSet(chainSelector, bridgeAddress, owner);
        config.setRemoteBridge(chainSelector, bridgeAddress);
        assertEq(config.getRemoteBridge(chainSelector), bridgeAddress);
    }

    function testSetRemoteBridgeOnlyOwner() public {
        vm.prank(nonOwner);
        vm.expectRevert(
            abi.encodeWithSelector(
                OwnableUnauthorizedAccount.selector,
                nonOwner
            )
        );
        config.setRemoteBridge(chainSelector, bridgeAddress);
    }

    function testRemoveRemoteBridgeSuccess() public {
        config.setRemoteBridge(chainSelector, bridgeAddress);
        vm.expectEmit(true, true, true, true);
        emit RemoteBridgeRemoved(chainSelector, owner);
        config.removeRemoteBridge(chainSelector);
        assertEq(config.getRemoteBridge(chainSelector), address(0));
    }

    function testRemoveRemoteBridgeOnyOwner() public {
        config.setRemoteBridge(chainSelector, bridgeAddress);
        vm.prank(nonOwner);
        vm.expectRevert(
            abi.encodeWithSelector(
                OwnableUnauthorizedAccount.selector,
                nonOwner
            )
        );
        config.removeRemoteBridge(chainSelector);
    }

    function testSetArgsSuccess() public {
        bytes memory extraArgs = "ExtraArgs";
        vm.expectEmit(true, true, true, true);
        emit ExtraArgsSet(chainSelector, extraArgs, owner);
        config.setExtraArgs(chainSelector, extraArgs);
        assertEq(config.getExtraArgs(chainSelector), extraArgs);
    }

    function testSetArgsOnlyOwner() public {
        bytes memory extraArgs = "ExtraArgs";
        vm.prank(nonOwner);
        vm.expectRevert(
            abi.encodeWithSelector(
                OwnableUnauthorizedAccount.selector,
                nonOwner
            )
        );
        config.setExtraArgs(chainSelector, extraArgs);
    }

    function testSetTokenPoolSuccess() public {
        vm.expectEmit(true, true, true, true);
        emit TokenPoolSet(token, pool, owner);
        config.setTokenPool(pool);
        assertEq(address(config.getTokenPool(token)), address(pool));
    }

    function testSetTokenPoolOnlyOwner() public {
        vm.prank(nonOwner);
        vm.expectRevert(
            abi.encodeWithSelector(
                OwnableUnauthorizedAccount.selector,
                nonOwner
            )
        );
        config.setTokenPool(pool);
    }

    function testRemoveTokenPoolSuccess() public {
        config.setTokenPool(pool);
        vm.expectEmit(true, true, true, true);
        emit TokenPoolRemoved(token, owner);
        config.removeTokenPool(token);
        assertEq(address(config.getTokenPool(token)), address(0));
    }

    function testRemoveTokenPoolOnlyOwner() public {
        config.setTokenPool(pool);
        vm.prank(nonOwner);
        vm.expectRevert(
            abi.encodeWithSelector(
                OwnableUnauthorizedAccount.selector,
                nonOwner
            )
        );
        config.removeTokenPool(token);
    }

    function testSetDestinationTokenSuccess() public {
        IERC20 destinationToken = new MockERC20(
            "Mock Destination Token",
            "MDT",
            type(uint256).max
        );
        vm.expectEmit(true, true, true, true);
        emit DestinationTokenSet(token, chainSelector, destinationToken, owner);
        config.setDestinationToken(token, chainSelector, destinationToken);
        assertEq(
            address(config.getDestinationToken(token, chainSelector)),
            address(destinationToken)
        );
    }

    function testSetDestinationTokenOnlyOwner() public {
        IERC20 destinationToken = new MockERC20(
            "Mock Destination Token",
            "MDT",
            type(uint256).max
        );
        vm.prank(nonOwner);
        vm.expectRevert(
            abi.encodeWithSelector(
                OwnableUnauthorizedAccount.selector,
                nonOwner
            )
        );
        config.setDestinationToken(token, chainSelector, destinationToken);
    }

    function testSetDestinationTokenNonZero() public {
        IERC20 destinationToken = new MockERC20(
            "Mock Destination Token",
            "MDT",
            type(uint256).max
        );
        vm.expectRevert(abi.encodeWithSelector(TokenAddressIsZero.selector));
        config.setDestinationToken(
            IERC20(address(0)),
            chainSelector,
            destinationToken
        );
        vm.expectRevert(abi.encodeWithSelector(TokenAddressIsZero.selector));
        config.setDestinationToken(token, chainSelector, IERC20(address(0)));
    }

    function testRemoveDestinationTokenSuccess() public {
        IERC20 destinationToken = new MockERC20(
            "Mock Destination Token",
            "MDT",
            type(uint256).max
        );
        config.setDestinationToken(token, chainSelector, destinationToken);
        vm.expectEmit(true, true, true, true);
        emit DestinationTokenRemoved(token, chainSelector, owner);
        config.removeDestinationToken(token, chainSelector);
        assertEq(
            address(config.getDestinationToken(token, chainSelector)),
            address(0)
        );
    }

    function testIsTokenAvailableOnDestination() public {
        IERC20 destinationToken = new MockERC20(
            "Mock Destination Token",
            "MDT",
            type(uint256).max
        );
        assertEq(
            config.isTokenAvailableOnDestination(token, chainSelector),
            false
        );
        config.setDestinationToken(token, chainSelector, destinationToken);
        assertEq(
            config.isTokenAvailableOnDestination(token, chainSelector),
            true
        );
        config.removeDestinationToken(token, chainSelector);
        assertEq(
            config.isTokenAvailableOnDestination(token, chainSelector),
            false
        );
    }

    function testIsBridgeAvailableOnChain() public {
        assertEq(config.isBridgeAvailableOnChain(chainSelector), false);
        config.setRemoteBridge(chainSelector, bridgeAddress);
        assertEq(config.isBridgeAvailableOnChain(chainSelector), true);
        config.removeRemoteBridge(chainSelector);
        assertEq(config.isBridgeAvailableOnChain(chainSelector), false);
    }

    function testIsTokenPoolAvailable() public {
        assertEq(config.isTokenPoolAvailable(token), false);
        config.setTokenPool(pool);
        assertEq(config.isTokenPoolAvailable(token), true);
        config.removeTokenPool(token);
        assertEq(config.isTokenPoolAvailable(token), false);
    }

    function testGetConfigOut() public {
        IERC20 destinationToken = new MockERC20(
            "Mock Destination Token",
            "MDT",
            type(uint256).max
        );
        config.setRemoteBridge(chainSelector, bridgeAddress);
        config.setExtraArgs(chainSelector, "ExtraArgs");
        config.setTokenPool(pool);
        config.setDestinationToken(token, chainSelector, destinationToken);
        Configuration.ConfigOut memory configOut = config.getConfigOut(
            token,
            chainSelector
        );
        assertEq(configOut.receiverBridge, bridgeAddress);
        assertEq(
            address(configOut.destinationToken),
            address(destinationToken)
        );
        assertEq(configOut.extraArgs, "ExtraArgs");
        assertEq(address(configOut.pool), address(pool));
    }

    function testGetConfigIn() public {
        IERC20 destinationToken = new MockERC20(
            "Mock Destination Token",
            "MDT",
            type(uint256).max
        );
        config.setRemoteBridge(chainSelector, bridgeAddress);
        config.setExtraArgs(chainSelector, "ExtraArgs");
        config.setTokenPool(pool);
        config.setDestinationToken(token, chainSelector, destinationToken);
        Configuration.ConfigIn memory configIn = config.getConfigIn(
            token,
            chainSelector
        );
        assertEq(configIn.senderBridge, bridgeAddress);
        assertEq(address(configIn.pool), address(pool));
    }
}
