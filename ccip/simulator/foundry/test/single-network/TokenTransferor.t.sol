// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.19;

import {Test, console2} from "forge-std/Test.sol";
import {TokenTransferor} from "../../src/TokenTransferor.sol";
import {CCIPLocalSimulator, IRouterClient, LinkToken, BurnMintERC677Helper} from "@chainlink/local/src/ccip/CCIPLocalSimulator.sol";

contract TokenTransferorTest is Test {
    TokenTransferor public tokenTransferor;
    CCIPLocalSimulator public ccipLocalSimulator;

    uint64 chainSelector;
    BurnMintERC677Helper ccipBnM;

    function setUp() public {
        ccipLocalSimulator = new CCIPLocalSimulator();
        (
            uint64 chainSelector_,
            IRouterClient sourceRouter,
            ,
            ,
            LinkToken linkToken,
            BurnMintERC677Helper ccipBnM_,

        ) = ccipLocalSimulator.configuration();

        tokenTransferor = new TokenTransferor(
            address(sourceRouter),
            address(linkToken)
        );

        chainSelector = chainSelector_;
        ccipBnM = ccipBnM_;
    }

    function testTokenTransfer() public {
        uint256 amountToSend = 0.001 ether; // amount to send = 0.001 BnM
        uint256 amountForFees = 1 ether; // 1 LINK
        address receiver = msg.sender; // receiver of BnM tokens

        ccipBnM.drip(address(tokenTransferor)); // credit tokenTransferor with 1 BnM

        ccipLocalSimulator.requestLinkFromFaucet(
            address(tokenTransferor),
            amountForFees
        ); // credit tokenTransferor with 1 LINK

        tokenTransferor.allowlistDestinationChain(chainSelector, true);

        uint256 receiverBalanceBefore = ccipBnM.balanceOf(receiver);
        assertEq(receiverBalanceBefore, 0);
        uint256 tokenTransferorBalanceBefore = ccipBnM.balanceOf(
            address(tokenTransferor)
        );
        assertEq(tokenTransferorBalanceBefore, 1e18);

        tokenTransferor.transferTokensPayLINK(
            chainSelector,
            receiver,
            address(ccipBnM),
            amountToSend
        );

        uint256 receiverBalanceAfter = ccipBnM.balanceOf(receiver);
        uint256 tokenTransferorBalanceAfter = ccipBnM.balanceOf(
            address(tokenTransferor)
        );

        assertEq(receiverBalanceAfter, receiverBalanceBefore + amountToSend);
        assertEq(
            tokenTransferorBalanceAfter,
            tokenTransferorBalanceBefore - amountToSend
        );
    }
}
