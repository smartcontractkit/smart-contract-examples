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
import "forge-std/console.sol";
import {BurnMintTokenPool} from "../../src/pools/BurnMintTokenPool.sol";
import {MockBurnMintERC20} from "../mocks/MockBurnMintERC20.sol";
import {ICustom} from "../mocks/ICustom.sol";

contract BurnMintTokenPoolTest is Test, ICustom {
    BurnMintTokenPool pool;
    MockBurnMintERC20 token;
    address owner;
    address bridgeAddress = address(0x1);
    address nonOwner = address(0x2);

    function setUp() public {
        owner = address(this);
        token = new MockBurnMintERC20("MockBurnMintERC20", "MBM", 18);
        pool = new BurnMintTokenPool(token, address(0));
    }

    function testGetToken() public view {
        assertEq(
            address(pool.getToken()),
            address(token),
            "getToken should return the correct token address"
        );
    }

    function testCurrentOwner() public view {
        assertEq(pool.owner(), owner, "Owner should be the current address");
    }

    function testGetTokenPoolType() public view {
        assertEq(
            uint(pool.getTokenPoolType()),
            uint(TokenPoolType.BurnMint),
            "getTokenPoolType should return the correct type"
        );
    }

    function testOwnershipTransferProcess() public {
        address newOwner = address(3);
        vm.prank(owner);
        pool.transferOwnership(newOwner);

        vm.prank(newOwner);
        pool.acceptOwnership();

        assertEq(
            pool.owner(),
            newOwner,
            "Ownership should have transferred to new owner"
        );
    }

    function testMintFunctionality() public {
        uint256 amount = 1000;
        token.mint(nonOwner, amount);
        assertEq(
            token.balanceOf(nonOwner),
            amount,
            "Mint function failed to update balance correctly"
        );
    }

    function testBurnFunctionality() public {
        uint256 initialBalance = 1000;
        token.mint(nonOwner, initialBalance);
        vm.prank(nonOwner);
        token.burn(500);
        assertEq(
            token.balanceOf(nonOwner),
            500,
            "Burn function failed to update balance correctly"
        );
    }

    function testSetBridgeSuccess() public {
        vm.expectEmit(true, true, true, true);
        emit BridgeSet(address(0), bridgeAddress, address(this));
        pool.setBridge(bridgeAddress);
        assertEq(
            pool.getBridge(),
            bridgeAddress,
            "Bridge address should be updated correctly"
        );
    }

    function testSetBridgeOnlyOwner() public {
        vm.startPrank(nonOwner);
        vm.expectRevert(
            abi.encodeWithSelector(
                OwnableUnauthorizedAccount.selector,
                nonOwner
            )
        );
        pool.setBridge(bridgeAddress);
        vm.stopPrank();
    }

    function testSetBridgeZeroAddress() public {
        vm.expectRevert(abi.encodeWithSelector(BridgeAddressZero.selector));
        pool.setBridge(address(0));
    }

    function testRemoveBridgeSuccess() public {
        pool.setBridge(bridgeAddress);
        vm.expectEmit(true, true, true, true);
        emit BridgeSet(bridgeAddress, address(0), address(this));
        pool.removeBridge();
        assertEq(
            pool.getBridge(),
            address(0),
            "Bridge address should be reset to zero"
        );
    }

    function testRemoveBridgeOnlyOwner() public {
        vm.startPrank(nonOwner);
        vm.expectRevert(
            abi.encodeWithSelector(
                OwnableUnauthorizedAccount.selector,
                nonOwner
            )
        );
        pool.removeBridge();
        vm.stopPrank();
    }

    function testLockOrBurnSuccess() public {
        uint256 amount = 500;
        token.mint(address(pool), amount);

        pool.setBridge(bridgeAddress);
        vm.prank(bridgeAddress);

        vm.expectEmit(true, true, true, true);
        emit Burned(address(bridgeAddress), amount);
        pool.lockOrBurn(amount);

        assertEq(token.balanceOf(address(pool)), 0, "Tokens should be burned");
    }

    function testLockOrBurnOnlyBridge() public {
        pool.setBridge(bridgeAddress);
        vm.prank(nonOwner);
        vm.expectRevert(
            abi.encodeWithSelector(
                IsNotBridge.selector,
                nonOwner,
                bridgeAddress
            )
        );
        pool.lockOrBurn(500);
        vm.stopPrank();
    }

    function testLockOrBurnNotEnoughBalance() public {
        uint256 amount = 500;

        pool.setBridge(bridgeAddress);
        vm.prank(bridgeAddress);

        vm.expectRevert(
            abi.encodeWithSelector(
                ERC20InsufficientBalance.selector,
                pool,
                0,
                amount
            )
        );
        pool.lockOrBurn(amount);
    }

    function testReleaseOrMintSuccess() public {
        pool.setBridge(bridgeAddress);
        vm.prank(bridgeAddress);
        uint256 amount = 500;

        vm.expectEmit(true, true, true, true);
        emit Minted(bridgeAddress, nonOwner, amount);
        pool.releaseOrMint(amount, nonOwner);

        assertEq(
            token.balanceOf(nonOwner),
            amount,
            "Tokens should be minted to the receiver"
        );
    }

    function testReleaseOrMintOnlyBridge() public {
        pool.setBridge(bridgeAddress);
        vm.expectRevert(
            abi.encodeWithSelector(IsNotBridge.selector, owner, bridgeAddress)
        );
        pool.releaseOrMint(500, nonOwner);
        vm.stopPrank();
    }
}
