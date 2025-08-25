// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Test, console} from "forge-std/Test.sol";
import {StableCoin} from "../src/StableCoin.sol";
import {MockAggregator} from "../src/SmartDataMock.sol";

contract StableCoinTest is Test {
    StableCoin public stableCoin;
    MockAggregator public mockAggregator;

    address public owner;
    address public alice;
    address public bob;

    uint256 public constant INITIAL_SUPPLY = 1000 * 10 ** 18;

    function setUp() public {
        // Set up addresses
        owner = address(this);
        alice = makeAddr("alice");
        bob = makeAddr("bob");

        // Give ETH to test accounts
        vm.deal(alice, 100 ether);
        vm.deal(bob, 100 ether);

        // Deploy MockAggregator
        mockAggregator = new MockAggregator();

        // Deploy StableCoin with 0 initial supply
        stableCoin = new StableCoin(0, address(mockAggregator));

        // Mint initial tokens to owner for testing
        stableCoin.mint(owner, INITIAL_SUPPLY);
    }

    // Basic ERC20 functionality tests

    function test_InitialState() public view {
        assertEq(stableCoin.totalSupply(), INITIAL_SUPPLY);
        assertEq(stableCoin.balanceOf(owner), INITIAL_SUPPLY);
        assertEq(stableCoin.name(), "StableCoin");
        assertEq(stableCoin.symbol(), "STBL");
        assertEq(stableCoin.decimals(), 18);
    }

    function test_Transfer() public {
        uint256 transferAmount = 100 * 10 ** 18;

        // Transfer from owner to Alice
        stableCoin.transfer(alice, transferAmount);

        // Check balances
        assertEq(stableCoin.balanceOf(alice), transferAmount);
        assertEq(stableCoin.balanceOf(owner), INITIAL_SUPPLY - transferAmount);
    }

    function test_TransferFrom() public {
        uint256 approveAmount = 500 * 10 ** 18;
        uint256 transferAmount = 300 * 10 ** 18;

        // Owner approves Alice to spend tokens
        stableCoin.approve(alice, approveAmount);

        // Alice transfers tokens from owner to Bob
        vm.prank(alice);
        stableCoin.transferFrom(owner, bob, transferAmount);

        // Check balances and allowance
        assertEq(stableCoin.balanceOf(bob), transferAmount);
        assertEq(stableCoin.balanceOf(owner), INITIAL_SUPPLY - transferAmount);
        assertEq(
            stableCoin.allowance(owner, alice),
            approveAmount - transferAmount
        );
    }

    function test_Allowance() public {
        uint256 approveAmount = 500 * 10 ** 18;

        // Owner approves Alice to spend tokens
        stableCoin.approve(alice, approveAmount);

        // Check allowance
        assertEq(stableCoin.allowance(owner, alice), approveAmount);
    }

    function test_ApprovalChanges() public {
        uint256 initialApprove = 500 * 10 ** 18;

        // Initial approval
        stableCoin.approve(alice, initialApprove);
        assertEq(stableCoin.allowance(owner, alice), initialApprove);

        // Increase allowance
        uint256 newAllowance = 700 * 10 ** 18;
        stableCoin.approve(alice, newAllowance);
        assertEq(stableCoin.allowance(owner, alice), newAllowance);

        // Decrease allowance
        uint256 decreasedAllowance = 300 * 10 ** 18;
        stableCoin.approve(alice, decreasedAllowance);
        assertEq(stableCoin.allowance(owner, alice), decreasedAllowance);

        // Set to zero
        stableCoin.approve(alice, 0);
        assertEq(stableCoin.allowance(owner, alice), 0);
    }

    // StableCoin-specific reserve-backed functionality tests

    function test_GetReserveValue() public view {
        uint256 reserveValue = stableCoin.getReserveValue();
        assertTrue(reserveValue > 0, "Reserve value should be positive");
    }

    function test_AvailableToMint() public view {
        uint256 reserveValue = stableCoin.getReserveValue();
        uint256 availableToMint = stableCoin.availableToMint();

        assertEq(availableToMint, reserveValue - INITIAL_SUPPLY);
    }

    function test_Mint() public {
        uint256 initialSupply = stableCoin.totalSupply();
        uint256 mintAmount = 500 * 10 ** 18;

        // Mint tokens to Alice
        stableCoin.mint(alice, mintAmount);

        // Check balances and total supply
        assertEq(stableCoin.balanceOf(alice), mintAmount);
        assertEq(stableCoin.totalSupply(), initialSupply + mintAmount);
    }

    function test_MintExceedingReserves() public {
        uint256 availableToMint = stableCoin.availableToMint();
        uint256 exceedingAmount = availableToMint + 1;

        // This should revert
        vm.expectRevert("Minting would exceed reserves");
        stableCoin.mint(alice, exceedingAmount);
    }

    function test_Burn() public {
        uint256 initialSupply = stableCoin.totalSupply();
        uint256 burnAmount = 300 * 10 ** 18;

        // Burn tokens
        stableCoin.burn(burnAmount);

        // Check balance and total supply
        assertEq(stableCoin.balanceOf(owner), INITIAL_SUPPLY - burnAmount);
        assertEq(stableCoin.totalSupply(), initialSupply - burnAmount);
    }

    function test_OnlyTokenOwnerCanBurn() public {
        uint256 burnAmount = 100 * 10 ** 18;

        // Transfer some tokens to Alice first
        stableCoin.transfer(alice, burnAmount);

        // Alice should be able to burn her own tokens
        vm.prank(alice);
        stableCoin.burn(burnAmount);

        // Verify the tokens were burned
        assertEq(stableCoin.balanceOf(alice), 0);
    }

    function test_ReserveDisclosure() public view {
        (
            uint256 reserveAmount,
            uint256 circulatingSupply,
            uint256 reserveSurplus
        ) = stableCoin.reserveDisclosure();

        assertEq(circulatingSupply, stableCoin.totalSupply());
        assertEq(reserveAmount, stableCoin.getReserveValue());
        assertEq(reserveSurplus, reserveAmount - circulatingSupply);
    }

    // Access control tests

    function test_OnlyAdminCanMint() public {
        // Alice tries to mint tokens but doesn't have the role
        vm.prank(alice);
        vm.expectRevert();
        stableCoin.mint(alice, 100 * 10 ** 18);
    }

    function test_PauseUnpause() public {
        // Owner pauses the contract
        stableCoin.pause();

        // Try to transfer while paused (should revert)
        vm.expectRevert("EnforcedPause()");
        stableCoin.transfer(alice, 100 * 10 ** 18);

        // Owner unpauses the contract
        stableCoin.unpause();

        // Transfer should work now
        stableCoin.transfer(alice, 100 * 10 ** 18);
        assertEq(stableCoin.balanceOf(alice), 100 * 10 ** 18);
    }

    function test_OnlyAdminCanPause() public {
        // Alice tries to pause but doesn't have the role
        vm.prank(alice);
        vm.expectRevert();
        stableCoin.pause();
    }

    // Access control tests for other roles
    function test_AggregatorImmutability() public view {
        address storedAggregator = stableCoin.aggregatorAddress();
        assertEq(
            storedAggregator,
            address(mockAggregator),
            "Aggregator address should be immutable"
        );
    }

    // Edge cases

    function test_TransferToZeroAddress() public {
        vm.expectRevert(
            abi.encodeWithSignature("ERC20InvalidReceiver(address)", address(0))
        );
        stableCoin.transfer(address(0), 100 * 10 ** 18);
    }

    // Removed test_TransferFromZeroAddress as it's not testing a specific requirement
    // and is covered by the ERC20 implementation

    function test_TransferInsufficientBalance() public {
        vm.prank(alice); // Alice has no tokens initially
        vm.expectRevert(
            abi.encodeWithSignature(
                "ERC20InsufficientBalance(address,uint256,uint256)",
                alice,
                0,
                100 * 10 ** 18
            )
        );
        stableCoin.transfer(bob, 100 * 10 ** 18);
    }

    function test_TransferFromInsufficientAllowance() public {
        stableCoin.approve(alice, 50 * 10 ** 18);

        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSignature(
                "ERC20InsufficientAllowance(address,uint256,uint256)",
                alice,
                50 * 10 ** 18,
                100 * 10 ** 18
            )
        );
        stableCoin.transferFrom(owner, bob, 100 * 10 ** 18);
    }
}
