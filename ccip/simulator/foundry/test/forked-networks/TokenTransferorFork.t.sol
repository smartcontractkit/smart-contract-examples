// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import {Test, Vm} from "forge-std/Test.sol";
import {TokenTransferor} from "../../src/TokenTransferor.sol";
import {BurnMintERC677Helper, IERC20} from "@chainlink/local/src/ccip/CCIPLocalSimulator.sol";
import {CCIPLocalSimulatorFork, Register} from "@chainlink/local/src/ccip/CCIPLocalSimulatorFork.sol";

contract TokenTransferorFork is Test {
    CCIPLocalSimulatorFork public ccipLocalSimulatorFork;
    TokenTransferor public sender;
    BurnMintERC677Helper public ccipBnM;
    IERC20 public linkToken;
    address alice;

    uint256 sepoliaFork;
    uint256 arbSepoliaFork;

    Register.NetworkDetails arbSepoliaNetworkDetails;

    function setUp() public {
        string memory ETHEREUM_SEPOLIA_RPC_URL = vm.envString(
            "ETHEREUM_SEPOLIA_RPC_URL"
        );
        string memory ARBITRUM_SEPOLIA_RPC_URL = vm.envString(
            "ARBITRUM_SEPOLIA_RPC_URL"
        );
        sepoliaFork = vm.createFork(ETHEREUM_SEPOLIA_RPC_URL);
        arbSepoliaFork = vm.createSelectFork(ARBITRUM_SEPOLIA_RPC_URL);

        uint256 arbSepoliaChainId = block.chainid;
        vm.selectFork(sepoliaFork);

        uint256 sepoliaChainId = block.chainid;

        ccipLocalSimulatorFork = new CCIPLocalSimulatorFork();
        vm.makePersistent(address(ccipLocalSimulatorFork));

        Register.NetworkDetails
            memory sepoliaNetworkDetails = ccipLocalSimulatorFork
                .getNetworkDetails(sepoliaChainId);

        sender = new TokenTransferor(
            sepoliaNetworkDetails.routerAddress,
            sepoliaNetworkDetails.linkAddress
        );

        arbSepoliaNetworkDetails = ccipLocalSimulatorFork.getNetworkDetails(
            arbSepoliaChainId
        );

        sender.allowlistDestinationChain(
            arbSepoliaNetworkDetails.chainSelector,
            true
        );

        ccipBnM = BurnMintERC677Helper(sepoliaNetworkDetails.ccipBnMAddress);

        linkToken = IERC20(sepoliaNetworkDetails.linkAddress);

        alice = makeAddr("alice");

        ccipLocalSimulatorFork.requestLinkFromFaucet(address(sender), 25 ether);
        ccipBnM.drip(address(sender));
        assertEq(ccipBnM.balanceOf(address(sender)), 1e18);
        assertEq(linkToken.balanceOf(address(sender)), 25 ether);
    }

    function test_forkTokenTransfer() external {
        uint256 amountToSend = 100;

        uint256 balanceBefore = ccipBnM.balanceOf(address(sender));
        uint256 balanceAliceBefore = ccipBnM.balanceOf(alice);

        sender.transferTokensPayLINK(
            arbSepoliaNetworkDetails.chainSelector,
            alice,
            address(ccipBnM),
            amountToSend
        );

        uint256 balanceAfer = ccipBnM.balanceOf(address(sender));
        assertEq(balanceAfer, balanceBefore - amountToSend);

        ccipLocalSimulatorFork.switchChainAndRouteMessage(arbSepoliaFork);

        BurnMintERC677Helper ccipBnMArbSepolia = BurnMintERC677Helper(
            arbSepoliaNetworkDetails.ccipBnMAddress
        );

        assertEq(ccipBnMArbSepolia.balanceOf(alice), balanceAliceBefore + amountToSend);
    }
}
