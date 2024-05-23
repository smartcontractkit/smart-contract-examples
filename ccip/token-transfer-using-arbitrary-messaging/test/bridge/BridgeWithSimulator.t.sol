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
import {ICustom} from "../mocks/ICustom.sol";
import {LockReleaseTokenPool} from "../../src/pools/LockReleaseTokenPool.sol";
import {MockERC20, IERC20} from "../mocks/MockERC20.sol";
import {BurnMintTokenPool} from "../../src/pools/BurnMintTokenPool.sol";
import {MockBurnMintERC20} from "../mocks/MockBurnMintERC20.sol";
import {IRouterClient, WETH9, LinkToken, BurnMintERC677Helper} from "@chainlink/local/src/ccip/CCIPLocalSimulator.sol";
import {CCIPLocalSimulator} from "@chainlink/local/src/ccip/CCIPLocalSimulator.sol";
import {Client} from "@chainlink/contracts-ccip/src/v0.8/ccip/libraries/Client.sol";

contract BridgeTestSimulator is Test, ICustom {
    CCIPLocalSimulator public ccipLocalSimulator;
    Bridge sourceBridge;
    Bridge destinationBridge;
    Configuration sourceConfiguration;
    Configuration destinationConfiguration;
    LockReleaseTokenPool sourceLockReleasePool;
    LockReleaseTokenPool destinationLockReleasePool;
    BurnMintTokenPool sourceBurnMintPool;
    BurnMintTokenPool destinationBurnMintPool;
    MockBurnMintERC20 sourceBurnMintToken;
    MockBurnMintERC20 destinationBurnMintToken;
    MockERC20 sourceLockableToken;
    MockERC20 destinationLockableToken;
    address owner;
    address nonOwner = address(0x2);
    uint64 chainSelector;
    uint64 destinationChainSelector;
    uint64 sourceChainSelector;
    address liquidityProviderAddress = address(0x2); // owner is liquidity provider for ismplicity
    address senderAddress = address(0x3);
    address receiverAddress = address(0x4);
    address routerAddress;
    address destinationRouterAddress;
    LinkToken linkToken;

    function setUp() public {
        owner = address(this);
        ccipLocalSimulator = new CCIPLocalSimulator();

        (
            uint64 _chainSelector,
            IRouterClient _sourceRouter,
            IRouterClient _destinationRouter,
            ,
            /* WETH9 */ LinkToken _linkToken /* BurnMintERC677Helper ccipBnM */ /* BurnMintERC677Helper ccipLnM */,
            ,

        ) = ccipLocalSimulator.configuration();

        chainSelector = _chainSelector;
        destinationChainSelector = _chainSelector;
        sourceChainSelector = _chainSelector;
        routerAddress = address(_sourceRouter);
        destinationRouterAddress = address(_destinationRouter);
        linkToken = _linkToken;

        ccipLocalSimulator.requestLinkFromFaucet(owner, 10 ** 25);
        // Set tokens
        sourceLockableToken = new MockERC20(
            "Mock Token Src",
            "MTKlnu",
            type(uint256).max
        );
        sourceLockableToken.transfer(liquidityProviderAddress, 1_000_000);
        destinationLockableToken = new MockERC20(
            "Mock Token Dest",
            "MTKlnu",
            type(uint256).max
        );
        destinationLockableToken.transfer(liquidityProviderAddress, 1_000_000);
        sourceBurnMintToken = new MockBurnMintERC20(
            "Mock Token Src",
            "MTKbnm",
            18
        );
        destinationBurnMintToken = new MockBurnMintERC20(
            "Mock Token Dest",
            "MTKbnm",
            18
        );
        // Set bridges
        sourceConfiguration = new Configuration();
        sourceBridge = new Bridge(routerAddress, sourceConfiguration);
        destinationConfiguration = new Configuration();
        destinationBridge = new Bridge(
            destinationRouterAddress,
            destinationConfiguration
        );
        // Set pools
        sourceLockReleasePool = new LockReleaseTokenPool(
            sourceLockableToken,
            address(sourceBridge),
            liquidityProviderAddress
        );
        destinationLockReleasePool = new LockReleaseTokenPool(
            destinationLockableToken,
            address(destinationBridge),
            liquidityProviderAddress
        );
        sourceBurnMintPool = new BurnMintTokenPool(
            sourceBurnMintToken,
            address(sourceBridge)
        );
        destinationBurnMintPool = new BurnMintTokenPool(
            destinationBurnMintToken,
            address(destinationBridge)
        );
        // Set configuration
        sourceConfiguration.setRemoteBridge(
            destinationChainSelector,
            address(destinationBridge)
        );
        destinationConfiguration.setRemoteBridge(
            sourceChainSelector,
            address(sourceBridge)
        );
        sourceConfiguration.setTokenPool(sourceLockReleasePool);
        destinationConfiguration.setTokenPool(destinationLockReleasePool);
        sourceConfiguration.setTokenPool(sourceBurnMintPool);
        destinationConfiguration.setTokenPool(destinationBurnMintPool);
        sourceConfiguration.setDestinationToken(
            sourceLockableToken,
            destinationChainSelector,
            destinationLockableToken
        );
        destinationConfiguration.setDestinationToken(
            destinationLockableToken,
            sourceChainSelector,
            sourceLockableToken
        );
        sourceConfiguration.setDestinationToken(
            sourceBurnMintToken,
            destinationChainSelector,
            destinationBurnMintToken
        );
        destinationConfiguration.setDestinationToken(
            destinationBurnMintToken,
            sourceChainSelector,
            sourceBurnMintToken
        );
        // Set args
        sourceConfiguration.setExtraArgs(
            destinationChainSelector,
            Client._argsToBytes(Client.EVMExtraArgsV1({gasLimit: 300_000}))
        );
        destinationConfiguration.setExtraArgs(
            sourceChainSelector,
            Client._argsToBytes(Client.EVMExtraArgsV1({gasLimit: 300_000}))
        );
    }

    function testTransferBurnAndMintTokensPayLINKSuccess() public {
        uint256 amount = 1000;
        sourceBurnMintToken.mint(senderAddress, amount);
        vm.startPrank(senderAddress);
        sourceBurnMintToken.approve(address(sourceBridge), amount);
        linkToken.approve(address(sourceBridge), type(uint256).max);
        vm.expectEmit(false, true, true, true); // don't check messageId
        emit CrossChainMessageSent(
            bytes32("123"),
            senderAddress,
            receiverAddress
        );
        vm.expectEmit(true, true, true, true);
        emit TokensTransferred(
            sourceBurnMintToken,
            sourceBurnMintPool,
            destinationChainSelector,
            destinationBurnMintToken,
            amount,
            0
        );
        emit Burned(address(sourceBridge), amount);
        emit Minted(address(destinationBridge), receiverAddress, amount);
        sourceBridge.transferTokensToDestinationChain(
            destinationChainSelector,
            sourceBurnMintToken,
            amount,
            receiverAddress,
            IERC20(address(linkToken))
        );
        assertEq(
            destinationBurnMintToken.balanceOf(receiverAddress),
            amount,
            "Destination should have received the minted tokens"
        );

        vm.stopPrank();
    }

    function testTransferBurnAndMintTokensPayNativeSuccess() public {
        uint256 amount = 1000;
        sourceBurnMintToken.mint(senderAddress, amount);
        vm.deal(senderAddress, 100);
        vm.startPrank(senderAddress);
        sourceBurnMintToken.approve(address(sourceBridge), amount);
        vm.expectEmit(false, true, true, true); // don't check messageId
        emit CrossChainMessageSent(
            bytes32("123"),
            senderAddress,
            receiverAddress
        );
        vm.expectEmit(true, true, true, true);
        emit TokensTransferred(
            sourceBurnMintToken,
            sourceBurnMintPool,
            destinationChainSelector,
            destinationBurnMintToken,
            amount,
            0
        );
        emit Burned(address(sourceBridge), amount);
        emit Minted(address(destinationBridge), receiverAddress, amount);
        sourceBridge.transferTokensToDestinationChain{value: 100}(
            destinationChainSelector,
            sourceBurnMintToken,
            amount,
            receiverAddress,
            IERC20(address(0))
        );
        assertEq(
            destinationBurnMintToken.balanceOf(receiverAddress),
            amount,
            "Destination should have received the minted tokens"
        );

        vm.stopPrank();
    }

    function testBurnAndMintTokensNotEnoughTokens() public {
        uint256 amount = 1000;
        sourceBurnMintToken.mint(senderAddress, amount);
        vm.startPrank(senderAddress);
        sourceBurnMintToken.approve(address(sourceBridge), amount + 1);

        vm.expectRevert(
            abi.encodeWithSelector(
                ERC20InsufficientBalance.selector,
                senderAddress,
                amount,
                amount + 1
            )
        );
        sourceBridge.transferTokensToDestinationChain(
            destinationChainSelector,
            sourceBurnMintToken,
            amount + 1,
            receiverAddress,
            IERC20(address(linkToken))
        );
        assertEq(
            destinationBurnMintToken.balanceOf(receiverAddress),
            0,
            "Destination should have received the minted tokens"
        );

        vm.stopPrank();
    }

    function testLockAndReleaseTokensPayLINKSuccess() public {
        uint256 amount = 1000;
        sourceLockableToken.transfer(senderAddress, amount);
        // provide some liquidity to the destination pool
        vm.startPrank(liquidityProviderAddress);
        destinationLockableToken.approve(
            address(destinationLockReleasePool),
            amount
        );
        destinationLockReleasePool.provideLiquidity(amount);
        vm.startPrank(senderAddress);
        sourceLockableToken.approve(address(sourceBridge), amount);
        linkToken.approve(address(sourceBridge), type(uint256).max);
        vm.expectEmit(false, true, true, true); // don't check messageId
        emit CrossChainMessageSent(
            bytes32("123"),
            senderAddress,
            receiverAddress
        );
        vm.expectEmit(true, true, true, true);
        emit TokensTransferred(
            sourceLockableToken,
            sourceLockReleasePool,
            destinationChainSelector,
            destinationLockableToken,
            amount,
            0
        );
        emit Locked(senderAddress, amount);
        emit Released(senderAddress, receiverAddress, amount);
        sourceBridge.transferTokensToDestinationChain(
            destinationChainSelector,
            sourceLockableToken,
            amount,
            receiverAddress,
            IERC20(address(linkToken))
        );
        assertEq(
            destinationLockableToken.balanceOf(receiverAddress),
            amount,
            "Destination should have received the released tokens"
        );
        assertEq(
            sourceLockableToken.balanceOf(senderAddress),
            0,
            "Source should have no tokens left"
        );
        assertEq(
            sourceLockableToken.balanceOf(address(sourceLockReleasePool)),
            amount,
            "Pool should have no tokens left"
        );
        assertEq(
            destinationLockableToken.balanceOf(
                address(destinationLockReleasePool)
            ),
            0,
            "Destination pool should have no tokens left"
        );

        vm.stopPrank();
    }
}
