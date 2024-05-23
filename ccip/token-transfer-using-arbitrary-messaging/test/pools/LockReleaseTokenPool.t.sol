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
import {LockReleaseTokenPool} from "../../src/pools/LockReleaseTokenPool.sol";
import {MockERC20} from "../mocks/MockERC20.sol";
import {ICustom} from "../mocks/ICustom.sol";

contract LockReleaseTokenPoolTest is Test, ICustom {
    LockReleaseTokenPool pool;
    MockERC20 token;
    address owner;
    address nonOwner = address(0x2);
    address bridge = address(0x1);
    address liquidityProvider = address(0x3);
    address nonLiquidityProvider = address(0x4);

    function setUp() public {
        owner = address(this);
        token = new MockERC20("Mock Token", "MTK", type(uint256).max);
        pool = new LockReleaseTokenPool(token, bridge, liquidityProvider);
        assertEq(
            pool.getLiquidityProvider(),
            liquidityProvider,
            "Liquidity provider not correct"
        );
        assertEq(pool.getBridge(), bridge, "Bridge not correct");
    }

    function testSetLiquidityProviderSuccess() public {
        vm.prank(owner);
        vm.expectEmit(true, true, true, true);
        emit LiquidityProviderSet(liquidityProvider, nonOwner, owner);
        pool.setLiquidityProvider(nonOwner);
        assertEq(
            pool.getLiquidityProvider(),
            nonOwner,
            "Liquidity provider not updated"
        );
    }

    function testSetLiquidityProviderOnlyOwner() public {
        vm.startPrank(nonOwner);
        vm.expectRevert(
            abi.encodeWithSelector(
                OwnableUnauthorizedAccount.selector,
                nonOwner
            )
        );
        pool.setLiquidityProvider(nonOwner);
        vm.stopPrank();
    }

    function testRemoveLiquidityProviderSuccess() public {
        vm.prank(owner);
        vm.expectEmit(true, true, true, true);
        emit LiquidityProviderSet(liquidityProvider, address(0), owner);
        pool.removeLiquidityProvider();
        assertEq(
            pool.getLiquidityProvider(),
            address(0),
            "Liquidity provider not removed"
        );
    }

    function testRemoveLiquidityProviderOnlyOwner() public {
        vm.startPrank(nonOwner);
        vm.expectRevert(
            abi.encodeWithSelector(
                OwnableUnauthorizedAccount.selector,
                nonOwner
            )
        );
        pool.removeLiquidityProvider();
        vm.stopPrank();
    }

    function testLockOrBurn() public {
        uint256 amount = 500;
        token.transfer(address(pool), amount);
        vm.prank(bridge);
        vm.expectEmit(true, true, false, false);
        emit Locked(bridge, amount);
        pool.lockOrBurn(amount);
        assertEq(
            token.balanceOf(address(pool)),
            amount,
            "Tokens should be locked in the pool"
        );
    }

    function testLockOrBurnOnlyBridge() public {
        vm.startPrank(nonOwner);
        vm.expectRevert(
            abi.encodeWithSelector(IsNotBridge.selector, nonOwner, bridge)
        );
        pool.lockOrBurn(500);
        vm.stopPrank();
    }

    function testLockOrBurnNothingToLock() public {
        uint256 amount = 500;
        vm.prank(bridge);
        vm.expectRevert(
            abi.encodeWithSelector(NoAmountToLock.selector, amount, bridge)
        );
        pool.lockOrBurn(amount);
    }

    function testReleaseOrMint() public {
        uint256 amount = 500;
        token.transfer(address(pool), amount);
        vm.prank(bridge);
        vm.expectEmit(true, true, true, true);
        emit Released(bridge, nonOwner, amount);
        pool.releaseOrMint(amount, nonOwner);
        assertEq(
            token.balanceOf(nonOwner),
            amount,
            "Tokens should be minted to the receiver"
        );
        assertEq(
            token.balanceOf(address(pool)),
            0,
            "Tokens should be transferred from the pool"
        );
    }

    function testReleaseOrMintOnlyBridge() public {
        vm.startPrank(nonOwner);
        vm.expectRevert(
            abi.encodeWithSelector(IsNotBridge.selector, nonOwner, bridge)
        );
        pool.releaseOrMint(500, nonOwner);
        vm.stopPrank();
    }

    function testReleaseOrMintNotEnoughLiquidty() public {
        uint256 amount = 500;
        vm.prank(bridge);
        vm.expectRevert(
            abi.encodeWithSelector(NoMoreLiquidity.selector, amount, 0)
        );
        pool.releaseOrMint(amount, nonOwner);
    }

    function testProvideLiquidity() public {
        uint256 amount = 500;
        token.transfer(liquidityProvider, amount);
        vm.startPrank(liquidityProvider);
        token.approve(address(pool), amount);
        vm.expectEmit(true, true, true, true);
        emit LiquidityProvided(liquidityProvider, amount);
        pool.provideLiquidity(amount);
        assertEq(
            token.balanceOf(address(pool)),
            amount,
            "Tokens should be transferred to the pool"
        );
        assertEq(
            token.balanceOf(liquidityProvider),
            0,
            "Tokens should be transferred from the liquidity provider"
        );
        vm.stopPrank();
    }

    function testProviderLiquidityOnlyLiquidityProvider() public {
        vm.startPrank(nonOwner);
        vm.expectRevert(
            abi.encodeWithSelector(
                IsNotLiquidityProvider.selector,
                nonOwner,
                liquidityProvider
            )
        );
        pool.provideLiquidity(500);
        vm.stopPrank();
    }

    function testWithdrawLiquidity() public {
        uint256 amount = 500;
        token.transfer(liquidityProvider, amount);
        vm.startPrank(liquidityProvider);
        token.approve(address(pool), amount);
        pool.provideLiquidity(amount);
        vm.expectEmit(true, true, true, true);
        emit LiquidityWithdrawn(liquidityProvider, amount);
        pool.withdrawLiquidity(amount);
        assertEq(
            token.balanceOf(address(pool)),
            0,
            "Tokens should be transferred from the pool"
        );
        assertEq(
            token.balanceOf(liquidityProvider),
            amount,
            "Tokens should be transferred to the liquidity provider"
        );
        vm.stopPrank();
    }

    function testWithdrawLiquidityOnlyLiquidityProvider() public {
        vm.startPrank(nonOwner);
        vm.expectRevert(
            abi.encodeWithSelector(
                IsNotLiquidityProvider.selector,
                nonOwner,
                liquidityProvider
            )
        );
        pool.withdrawLiquidity(500);
        vm.stopPrank();
    }

    function testWithdrawLiquidityNotEnoughLiquidity() public {
        vm.startPrank(liquidityProvider);
        vm.expectRevert(
            abi.encodeWithSelector(NoMoreLiquidity.selector, 500, 0)
        );
        pool.withdrawLiquidity(500);
        vm.stopPrank();
    }
}
