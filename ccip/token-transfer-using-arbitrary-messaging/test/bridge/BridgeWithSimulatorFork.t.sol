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

import {Test} from "forge-std/Test.sol";
import {ICustom} from "../mocks/ICustom.sol";
import {Bridge} from "../../src/bridge/Bridge.sol";
import {Configuration} from "../../src/bridge/Configuration.sol";
import {LockReleaseTokenPool} from "../../src/pools/LockReleaseTokenPool.sol";
import {MockERC20} from "../mocks/MockERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {BurnMintTokenPool} from "../../src/pools/BurnMintTokenPool.sol";
import {BurnMintERC20} from "@chainlink/contracts/src/v0.8/shared/token/ERC20/BurnMintERC20.sol";
import {CCIPLocalSimulatorFork, Register} from "@chainlink/local/src/ccip/CCIPLocalSimulatorFork.sol";
import {Client} from "@chainlink/contracts-ccip/contracts/libraries/Client.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract BridgeTestSimulatorFork is Test, ICustom {
    using SafeERC20 for IERC20;
    
    CCIPLocalSimulatorFork public ccipLocalSimulatorFork;
    Register.NetworkDetails sepoliaNetworkDetails;
    Register.NetworkDetails fujiNetworkDetails;
    Register.NetworkDetails arbSepoliaNetworkDetails;
    Bridge sepoliaBridge;
    Bridge fujiBridge;
    Bridge arbSepoliaBridge;
    Configuration sepoliaConfiguration;
    Configuration fujiConfiguration;
    Configuration arbSepoliaConfiguration;
    LockReleaseTokenPool sepoliaLockReleasePool;
    LockReleaseTokenPool fujiLockReleasePool;
    BurnMintTokenPool sepoliaBurnMintPool;
    BurnMintTokenPool fujiBurnMintPool;
    BurnMintTokenPool arbSepoliaBurnMintPool;
    BurnMintERC20 sepoliaBurnMintToken;
    BurnMintERC20 fujiBurnMintToken;
    BurnMintERC20 arbSepoliaBurnMintToken;
    MockERC20 sepoliaLockableToken;
    MockERC20 fujiLockableToken;
    address owner;
    address nonOwner = address(0x2);
    address liquidityProviderAddress = address(0x3);
    address senderAddress = address(0x4);
    address receiverAddress = address(0x5);

    uint256 sepoliaFork;
    uint256 fujiFork;
    uint256 arbSepoliaFork;

    function setUp() public {
        string memory ethereumSepoliaRpcUrl = vm.envString(
            "ETHEREUM_SEPOLIA_RPC_URL"
        );
        string memory avalancheFujiRpcUrl = vm.envString(
            "AVALANCHE_FUJI_RPC_URL"
        );
        string memory arbitrumSepoliaRpcUrl = vm.envString(
            "ARBITRUM_SEPOLIA_RPC_URL"
        );
        sepoliaFork = vm.createSelectFork(ethereumSepoliaRpcUrl);
        fujiFork = vm.createFork(avalancheFujiRpcUrl);
        arbSepoliaFork = vm.createFork(arbitrumSepoliaRpcUrl);

        ccipLocalSimulatorFork = new CCIPLocalSimulatorFork();
        vm.makePersistent(address(ccipLocalSimulatorFork));
        sepoliaNetworkDetails = ccipLocalSimulatorFork.getNetworkDetails(
            block.chainid
        );
        sepoliaLockableToken = new MockERC20(
            "Mock Token Sepolia",
            "MTKlnu",
            type(uint256).max
        );
        sepoliaBurnMintToken = new BurnMintERC20(
            "Mock Token Sepolia",
            "MTKbnm",
            18,
            0, // unlimited max supply
            0  // no premint
        );
        IERC20(address(sepoliaLockableToken)).safeTransfer(liquidityProviderAddress, 1_000_000);
        sepoliaConfiguration = new Configuration();
        sepoliaBridge = new Bridge(
            sepoliaNetworkDetails.routerAddress,
            sepoliaConfiguration
        );
        sepoliaLockReleasePool = new LockReleaseTokenPool(
            sepoliaLockableToken,
            address(sepoliaBridge),
            liquidityProviderAddress
        );
        sepoliaBurnMintPool = new BurnMintTokenPool(
            IERC20(address(sepoliaBurnMintToken)),
            address(sepoliaBridge)
        );
        
        // Grant minter and burner roles to the sepolia pool
        sepoliaBurnMintToken.grantRole(sepoliaBurnMintToken.MINTER_ROLE(), address(sepoliaBurnMintPool));
        sepoliaBurnMintToken.grantRole(sepoliaBurnMintToken.BURNER_ROLE(), address(sepoliaBurnMintPool));
        // Grant minter role to senderAddress for testing
        sepoliaBurnMintToken.grantRole(sepoliaBurnMintToken.MINTER_ROLE(), senderAddress);
        // Grant minter role to the test contract for testing
        sepoliaBurnMintToken.grantRole(sepoliaBurnMintToken.MINTER_ROLE(), address(this));
        
        sepoliaConfiguration.setTokenPool(sepoliaLockReleasePool);
        sepoliaConfiguration.setTokenPool(sepoliaBurnMintPool);
        vm.selectFork(fujiFork);
        fujiNetworkDetails = ccipLocalSimulatorFork.getNetworkDetails(
            block.chainid
        );
        fujiLockableToken = new MockERC20(
            "Mock Token Fuji",
            "MTKlnu",
            type(uint256).max
        );
        IERC20(address(fujiLockableToken)).safeTransfer(liquidityProviderAddress, 1_000_000);
        fujiBurnMintToken = new BurnMintERC20(
            "Mock Token Fuji",
            "MTKbnm",
            18,
            0, // unlimited max supply
            0  // no premint
        );
        fujiConfiguration = new Configuration();
        fujiBridge = new Bridge(
            fujiNetworkDetails.routerAddress,
            fujiConfiguration
        );
        fujiLockReleasePool = new LockReleaseTokenPool(
            fujiLockableToken,
            address(fujiBridge),
            liquidityProviderAddress
        );
        fujiBurnMintPool = new BurnMintTokenPool(
            IERC20(address(fujiBurnMintToken)),
            address(fujiBridge)
        );
        
        // Grant minter and burner roles to the fuji pool
        fujiBurnMintToken.grantRole(fujiBurnMintToken.MINTER_ROLE(), address(fujiBurnMintPool));
        fujiBurnMintToken.grantRole(fujiBurnMintToken.BURNER_ROLE(), address(fujiBurnMintPool));
        // Grant minter role to senderAddress for testing
        fujiBurnMintToken.grantRole(fujiBurnMintToken.MINTER_ROLE(), senderAddress);
        // Grant minter role to the test contract for testing
        fujiBurnMintToken.grantRole(fujiBurnMintToken.MINTER_ROLE(), address(this));
        
        fujiConfiguration.setRemoteBridge(
            sepoliaNetworkDetails.chainSelector,
            address(sepoliaBridge)
        );

        fujiConfiguration.setTokenPool(fujiLockReleasePool);
        fujiConfiguration.setTokenPool(fujiBurnMintPool);
        fujiConfiguration.setDestinationToken(
            fujiLockableToken,
            sepoliaNetworkDetails.chainSelector,
            sepoliaLockableToken
        );
        fujiConfiguration.setDestinationToken(
            IERC20(address(fujiBurnMintToken)),
            sepoliaNetworkDetails.chainSelector,
            IERC20(address(sepoliaBurnMintToken))
        );
        fujiConfiguration.setExtraArgs(
            sepoliaNetworkDetails.chainSelector,
            Client._argsToBytes(Client.GenericExtraArgsV2({
                gasLimit: 300_000,
                allowOutOfOrderExecution: true
            }))
        );

        vm.startPrank(liquidityProviderAddress);
        fujiLockableToken.approve(
            address(fujiLockReleasePool),
            type(uint256).max
        );
        fujiLockReleasePool.provideLiquidity(10_000);
        vm.stopPrank();
        vm.prank(senderAddress);
        IERC20(fujiNetworkDetails.linkAddress).approve(
            address(fujiBridge),
            type(uint256).max
        );
        ccipLocalSimulatorFork.requestLinkFromFaucet(
            address(senderAddress),
            25 ether
        );
        vm.selectFork(arbSepoliaFork);
        arbSepoliaNetworkDetails = ccipLocalSimulatorFork.getNetworkDetails(
            block.chainid
        );
        arbSepoliaConfiguration = new Configuration();
        arbSepoliaBridge = new Bridge(
            arbSepoliaNetworkDetails.routerAddress,
            arbSepoliaConfiguration
        );

        arbSepoliaBurnMintToken = new BurnMintERC20(
            "Mock Token ARbitrum Sepolia",
            "MTKbnm",
            18,
            0, // unlimited max supply
            0  // no premint
        );
        arbSepoliaBurnMintPool = new BurnMintTokenPool(
            IERC20(address(arbSepoliaBurnMintToken)),
            address(arbSepoliaBridge)
        );
        
        // Grant minter and burner roles to the arbitrum sepolia pool
        arbSepoliaBurnMintToken.grantRole(arbSepoliaBurnMintToken.MINTER_ROLE(), address(arbSepoliaBurnMintPool));
        arbSepoliaBurnMintToken.grantRole(arbSepoliaBurnMintToken.BURNER_ROLE(), address(arbSepoliaBurnMintPool));
        // Grant minter role to senderAddress for testing
        arbSepoliaBurnMintToken.grantRole(arbSepoliaBurnMintToken.MINTER_ROLE(), senderAddress);
        // Grant minter role to the test contract for testing
        arbSepoliaBurnMintToken.grantRole(arbSepoliaBurnMintToken.MINTER_ROLE(), address(this));
        
        arbSepoliaConfiguration.setTokenPool(arbSepoliaBurnMintPool);
        arbSepoliaConfiguration.setRemoteBridge(
            sepoliaNetworkDetails.chainSelector,
            address(sepoliaBridge)
        );
        arbSepoliaConfiguration.setDestinationToken(
            IERC20(address(arbSepoliaBurnMintToken)),
            sepoliaNetworkDetails.chainSelector,
            IERC20(address(sepoliaLockableToken))
        );
        arbSepoliaConfiguration.setExtraArgs(
            sepoliaNetworkDetails.chainSelector,
            Client._argsToBytes(Client.GenericExtraArgsV2({
                gasLimit: 300_000,
                allowOutOfOrderExecution: true
            }))
        );
        vm.prank(senderAddress);
        IERC20(arbSepoliaNetworkDetails.linkAddress).approve(
            address(arbSepoliaBridge),
            type(uint256).max
        );
        ccipLocalSimulatorFork.requestLinkFromFaucet(
            address(senderAddress),
            25 ether
        );

        vm.selectFork(sepoliaFork);
        sepoliaConfiguration.setRemoteBridge(
            fujiNetworkDetails.chainSelector,
            address(fujiBridge)
        );
        sepoliaConfiguration.setRemoteBridge(
            arbSepoliaNetworkDetails.chainSelector,
            address(arbSepoliaBridge)
        );
        sepoliaConfiguration.setDestinationToken(
            sepoliaLockableToken,
            fujiNetworkDetails.chainSelector,
            fujiLockableToken
        );
        sepoliaConfiguration.setDestinationToken(
            IERC20(address(sepoliaBurnMintToken)),
            fujiNetworkDetails.chainSelector,
            IERC20(address(fujiBurnMintToken))
        );
        sepoliaConfiguration.setDestinationToken(
            sepoliaLockableToken,
            arbSepoliaNetworkDetails.chainSelector,
            IERC20(address(arbSepoliaBurnMintToken))
        );
        sepoliaConfiguration.setExtraArgs(
            fujiNetworkDetails.chainSelector,
            Client._argsToBytes(Client.GenericExtraArgsV2({
                gasLimit: 300_000,
                allowOutOfOrderExecution: true
            }))
        );
        sepoliaConfiguration.setExtraArgs(
            arbSepoliaNetworkDetails.chainSelector,
            Client._argsToBytes(Client.GenericExtraArgsV2({
                gasLimit: 300_000,
                allowOutOfOrderExecution: true
            }))
        );
        vm.deal(senderAddress, 10 * 10 ** 18); // send 10 ETH to sender
        ccipLocalSimulatorFork.requestLinkFromFaucet(
            address(senderAddress),
            25 ether
        );
        vm.prank(senderAddress);
        IERC20(sepoliaNetworkDetails.linkAddress).approve(
            address(sepoliaBridge),
            type(uint256).max
        ); // approve LINK for sourceBridge
        vm.startPrank(liquidityProviderAddress);
        sepoliaLockableToken.approve(
            address(sepoliaLockReleasePool),
            type(uint256).max
        );
        sepoliaLockReleasePool.provideLiquidity(10_000);
        vm.stopPrank();
    }

    function testBurnAndMintFromSepoliaToFujiPayLINK() public {
        uint256 amount = 1000;
        sepoliaBurnMintToken.mint(senderAddress, amount);
        uint256 senderLinkBalance = IERC20(sepoliaNetworkDetails.linkAddress)
            .balanceOf(address(senderAddress));
        vm.startPrank(senderAddress);
        sepoliaBurnMintToken.approve(address(sepoliaBridge), amount);

        vm.expectEmit(false, true, true, true); // don't check messageId
        emit CrossChainMessageSent(
            bytes32("123"),
            senderAddress,
            receiverAddress
        );
        vm.expectEmit(true, true, true, false);
        emit TokensTransferred(
            IERC20(address(sepoliaBurnMintToken)),
            sepoliaBurnMintPool,
            fujiNetworkDetails.chainSelector,
            IERC20(address(fujiBurnMintToken)),
            amount,
            0 // don't check fees
        );
        emit Burned(address(sepoliaBridge), amount);
        (, uint256 fees) = sepoliaBridge.transferTokensToDestinationChain(
            fujiNetworkDetails.chainSelector,
            IERC20(address(sepoliaBurnMintToken)),
            amount,
            receiverAddress,
            IERC20(sepoliaNetworkDetails.linkAddress)
        );
        vm.stopPrank();
        assertEq(
            sepoliaBurnMintToken.balanceOf(senderAddress),
            0,
            "Source should have burned the tokens"
        );
        assertEq(
            senderLinkBalance -
                IERC20(sepoliaNetworkDetails.linkAddress).balanceOf(
                    address(senderAddress)
                ),
            fees,
            "Source should have paid the fees"
        );

        ccipLocalSimulatorFork.switchChainAndRouteMessage(fujiFork);
        assertEq(
            fujiBurnMintToken.balanceOf(receiverAddress),
            amount,
            "Destination should have received the minted tokens"
        );
    }

    function testBurnAndMintFromSepoliaToFujiPayNative() public {
        uint256 amount = 1000;
        sepoliaBurnMintToken.mint(senderAddress, amount);
        uint256 senderBalance = senderAddress.balance;
        vm.startPrank(senderAddress);
        sepoliaBurnMintToken.approve(address(sepoliaBridge), amount);

        vm.expectEmit(false, true, true, true); // don't check messageId
        emit CrossChainMessageSent(
            bytes32("123"),
            senderAddress,
            receiverAddress
        );
        vm.expectEmit(true, true, true, false);
        emit TokensTransferred(
            IERC20(address(sepoliaBurnMintToken)),
            sepoliaBurnMintPool,
            fujiNetworkDetails.chainSelector,
            IERC20(address(fujiBurnMintToken)),
            amount,
            0 // don't check fees
        );
        emit Burned(address(sepoliaBridge), amount);
        (, uint256 fees) = sepoliaBridge.transferTokensToDestinationChain{
            value: senderBalance
        }(
            fujiNetworkDetails.chainSelector,
            IERC20(address(sepoliaBurnMintToken)),
            amount,
            receiverAddress,
            IERC20(address(0))
        );
        vm.stopPrank();
        assertEq(
            sepoliaBurnMintToken.balanceOf(senderAddress),
            0,
            "Source should have burned the tokens"
        );
        assertEq(
            senderBalance - senderAddress.balance,
            fees,
            "Source should have paid the fees"
        );

        ccipLocalSimulatorFork.switchChainAndRouteMessage(fujiFork);
        assertEq(
            fujiBurnMintToken.balanceOf(receiverAddress),
            amount,
            "Destination should have received the minted tokens"
        );
    }

    function testBurnAndMintFromFujiToSepoliaPayLINK() public {
        vm.selectFork(fujiFork);
        uint256 amount = 1000;
        fujiBurnMintToken.mint(senderAddress, amount);
        uint256 senderLinkBalance = IERC20(fujiNetworkDetails.linkAddress)
            .balanceOf(address(senderAddress));
        vm.startPrank(senderAddress);
        fujiBurnMintToken.approve(address(fujiBridge), amount);

        vm.expectEmit(false, true, true, true); // don't check messageId
        emit CrossChainMessageSent(
            bytes32("123"),
            senderAddress,
            receiverAddress
        );
        vm.expectEmit(true, true, true, false);
        emit TokensTransferred(
            IERC20(address(fujiBurnMintToken)),
            fujiBurnMintPool,
            sepoliaNetworkDetails.chainSelector,
            IERC20(address(sepoliaBurnMintToken)),
            amount,
            0 // don't check fees
        );
        emit Burned(address(fujiBridge), amount);
        (, uint256 fees) = fujiBridge.transferTokensToDestinationChain(
            sepoliaNetworkDetails.chainSelector,
            IERC20(address(fujiBurnMintToken)),
            amount,
            receiverAddress,
            IERC20(fujiNetworkDetails.linkAddress)
        );
        vm.stopPrank();
        assertEq(
            fujiBurnMintToken.balanceOf(senderAddress),
            0,
            "Source should have burned the tokens"
        );
        assertEq(
            senderLinkBalance -
                IERC20(fujiNetworkDetails.linkAddress).balanceOf(
                    address(senderAddress)
                ),
            fees,
            "Source should have paid the fees"
        );

        ccipLocalSimulatorFork.switchChainAndRouteMessage(sepoliaFork);
        assertEq(
            sepoliaBurnMintToken.balanceOf(receiverAddress),
            amount,
            "Destination should have received the minted tokens"
        );
        assertEq(
            sepoliaBurnMintToken.balanceOf(address(sepoliaBurnMintPool)),
            0,
            "Destination Token pool should have minted the tokens"
        );
    }

    function testLockAndReleaseFromSepoliaToFujiPayLINK() public {
        uint256 amount = 1000;
        IERC20(address(sepoliaLockableToken)).safeTransfer(senderAddress, amount);
        uint256 senderLinkBalance = IERC20(sepoliaNetworkDetails.linkAddress)
            .balanceOf(address(senderAddress));
        vm.startPrank(senderAddress);
        sepoliaLockableToken.approve(address(sepoliaBridge), amount);

        vm.expectEmit(false, true, true, true); // don't check messageId
        emit CrossChainMessageSent(
            bytes32("123"),
            senderAddress,
            receiverAddress
        );
        vm.expectEmit(true, true, true, false);
        emit TokensTransferred(
            sepoliaLockableToken,
            sepoliaLockReleasePool,
            fujiNetworkDetails.chainSelector,
            fujiLockableToken,
            amount,
            0 // don't check fees
        );
        emit Locked(address(sepoliaBridge), amount);
        (, uint256 fees) = sepoliaBridge.transferTokensToDestinationChain(
            fujiNetworkDetails.chainSelector,
            sepoliaLockableToken,
            amount,
            receiverAddress,
            IERC20(sepoliaNetworkDetails.linkAddress)
        );
        vm.stopPrank();
        assertEq(
            sepoliaLockableToken.balanceOf(senderAddress),
            0,
            "Source should have locked the tokens"
        );
        assertEq(
            senderLinkBalance -
                IERC20(sepoliaNetworkDetails.linkAddress).balanceOf(
                    address(senderAddress)
                ),
            fees,
            "Source should have paid the fees"
        );
        assertEq(
            sepoliaLockableToken.balanceOf(address(sepoliaLockReleasePool)),
            10_000 + amount,
            "Source should have locked the tokens"
        );
        ccipLocalSimulatorFork.switchChainAndRouteMessage(fujiFork);
        assertEq(
            fujiLockableToken.balanceOf(receiverAddress),
            amount,
            "Destination should have received the released tokens"
        );

        assertEq(
            fujiLockableToken.balanceOf(address(fujiLockReleasePool)),
            10_000 - amount,
            "Destination Token pool should have released the tokens"
        );
    }

    function testLockAndReleaseFromSepoliaToFujiPayNative() public {
        uint256 amount = 1000;
        IERC20(address(sepoliaLockableToken)).safeTransfer(senderAddress, amount);
        uint256 senderBalance = senderAddress.balance;
        vm.startPrank(senderAddress);
        sepoliaLockableToken.approve(address(sepoliaBridge), amount);

        vm.expectEmit(false, true, true, true); // don't check messageId
        emit CrossChainMessageSent(
            bytes32("123"),
            senderAddress,
            receiverAddress
        );
        vm.expectEmit(true, true, true, false);
        emit TokensTransferred(
            sepoliaLockableToken,
            sepoliaLockReleasePool,
            fujiNetworkDetails.chainSelector,
            fujiLockableToken,
            amount,
            0 // don't check fees
        );
        emit Locked(address(sepoliaBridge), amount);
        (, uint256 fees) = sepoliaBridge.transferTokensToDestinationChain{
            value: senderBalance
        }(
            fujiNetworkDetails.chainSelector,
            sepoliaLockableToken,
            amount,
            receiverAddress,
            IERC20(address(0))
        );
        vm.stopPrank();
        assertEq(
            sepoliaLockableToken.balanceOf(senderAddress),
            0,
            "Source should have locked the tokens"
        );
        assertEq(
            senderBalance - senderAddress.balance,
            fees,
            "Source should have paid the fees"
        );
        assertEq(
            sepoliaLockableToken.balanceOf(address(sepoliaLockReleasePool)),
            10_000 + amount,
            "Source should have locked the tokens"
        );
        ccipLocalSimulatorFork.switchChainAndRouteMessage(fujiFork);
        assertEq(
            fujiLockableToken.balanceOf(receiverAddress),
            amount,
            "Destination should have received the released tokens"
        );

        assertEq(
            fujiLockableToken.balanceOf(address(fujiLockReleasePool)),
            10_000 - amount,
            "Destination Token pool should have released the tokens"
        );
    }

    function testLockReleaseFromFujiToSepoliaPayLINK() public {
        vm.selectFork(fujiFork);
        uint256 amount = 1000;
        IERC20(address(fujiLockableToken)).safeTransfer(senderAddress, amount);
        uint256 senderLinkBalance = IERC20(fujiNetworkDetails.linkAddress)
            .balanceOf(address(senderAddress));
        vm.startPrank(senderAddress);
        fujiLockableToken.approve(address(fujiBridge), amount);

        vm.expectEmit(false, true, true, true); // don't check messageId
        emit CrossChainMessageSent(
            bytes32("123"),
            senderAddress,
            receiverAddress
        );
        vm.expectEmit(true, true, true, false);
        emit TokensTransferred(
            fujiLockableToken,
            fujiLockReleasePool,
            sepoliaNetworkDetails.chainSelector,
            sepoliaLockableToken,
            amount,
            0 // don't check fees
        );
        emit Locked(address(fujiBridge), amount);
        (, uint256 fees) = fujiBridge.transferTokensToDestinationChain(
            sepoliaNetworkDetails.chainSelector,
            fujiLockableToken,
            amount,
            receiverAddress,
            IERC20(fujiNetworkDetails.linkAddress)
        );
        vm.stopPrank();
        assertEq(
            fujiLockableToken.balanceOf(senderAddress),
            0,
            "Source should have locked the tokens"
        );
        assertEq(
            senderLinkBalance -
                IERC20(fujiNetworkDetails.linkAddress).balanceOf(
                    address(senderAddress)
                ),
            fees,
            "Source should have paid the fees"
        );
        assertEq(
            fujiLockableToken.balanceOf(address(fujiLockReleasePool)),
            10_000 + amount,
            "Source should have locked the tokens"
        );
        ccipLocalSimulatorFork.switchChainAndRouteMessage(sepoliaFork);
        assertEq(
            sepoliaLockableToken.balanceOf(receiverAddress),
            amount,
            "Destination should have received the released tokens"
        );

        assertEq(
            sepoliaLockableToken.balanceOf(address(sepoliaLockReleasePool)),
            10_000 - amount,
            "Destination Token pool should have released the tokens"
        );
    }

    function testLockAndMintFromSepoliaToArbSepoliaPayLINK() public {
        uint256 amount = 1000;
        IERC20(address(sepoliaLockableToken)).safeTransfer(senderAddress, amount);
        uint256 senderLinkBalance = IERC20(sepoliaNetworkDetails.linkAddress)
            .balanceOf(address(senderAddress));
        vm.startPrank(senderAddress);
        sepoliaLockableToken.approve(address(sepoliaBridge), amount);

        vm.expectEmit(false, true, true, true); // don't check messageId
        emit CrossChainMessageSent(
            bytes32("123"),
            senderAddress,
            receiverAddress
        );
        vm.expectEmit(true, true, true, false);
        emit TokensTransferred(
            sepoliaLockableToken,
            sepoliaLockReleasePool,
            arbSepoliaNetworkDetails.chainSelector,
            IERC20(address(arbSepoliaBurnMintToken)),
            amount,
            0 // don't check fees
        );
        emit Locked(address(sepoliaBridge), amount);
        (, uint256 fees) = sepoliaBridge.transferTokensToDestinationChain(
            arbSepoliaNetworkDetails.chainSelector,
            sepoliaLockableToken,
            amount,
            receiverAddress,
            IERC20(sepoliaNetworkDetails.linkAddress)
        );
        vm.stopPrank();
        assertEq(
            sepoliaLockableToken.balanceOf(senderAddress),
            0,
            "Source should have locked the tokens"
        );
        assertEq(
            senderLinkBalance -
                IERC20(sepoliaNetworkDetails.linkAddress).balanceOf(
                    address(senderAddress)
                ),
            fees,
            "Source should have paid the fees"
        );
        assertEq(
            sepoliaLockableToken.balanceOf(address(sepoliaLockReleasePool)),
            10_000 + amount,
            "Source should have locked the tokens"
        );
        ccipLocalSimulatorFork.switchChainAndRouteMessage(arbSepoliaFork);
        assertEq(
            arbSepoliaBurnMintToken.balanceOf(receiverAddress),
            amount,
            "Destination should have received the minted tokens"
        );
        assertEq(
            arbSepoliaBurnMintToken.balanceOf(address(arbSepoliaBurnMintPool)),
            0,
            "Destination Token pool should have minted the tokens"
        );
    }

    function testBurnAndReleaseFromArbSepoliaToSepoliaPayLINK() public {
        vm.selectFork(arbSepoliaFork);
        uint256 amount = 1000;
        arbSepoliaBurnMintToken.mint(senderAddress, amount);
        uint256 senderLinkBalance = IERC20(arbSepoliaNetworkDetails.linkAddress)
            .balanceOf(address(senderAddress));
        vm.startPrank(senderAddress);
        arbSepoliaBurnMintToken.approve(address(arbSepoliaBridge), amount);

        vm.expectEmit(false, true, true, true); // don't check messageId
        emit CrossChainMessageSent(
            bytes32("123"),
            senderAddress,
            receiverAddress
        );
        vm.expectEmit(true, true, true, false);
        emit TokensTransferred(
            IERC20(address(arbSepoliaBurnMintToken)),
            arbSepoliaBurnMintPool,
            sepoliaNetworkDetails.chainSelector,
            sepoliaLockableToken,
            amount,
            0 // don't check fees
        );
        emit Burned(address(arbSepoliaBridge), amount);
        (, uint256 fees) = arbSepoliaBridge.transferTokensToDestinationChain(
            sepoliaNetworkDetails.chainSelector,
            IERC20(address(arbSepoliaBurnMintToken)),
            amount,
            receiverAddress,
            IERC20(arbSepoliaNetworkDetails.linkAddress)
        );
        vm.stopPrank();
        assertEq(
            arbSepoliaBurnMintToken.balanceOf(senderAddress),
            0,
            "Source should have burned the tokens"
        );
        assertEq(
            senderLinkBalance -
                IERC20(arbSepoliaNetworkDetails.linkAddress).balanceOf(
                    address(senderAddress)
                ),
            fees,
            "Source should have paid the fees"
        );

        ccipLocalSimulatorFork.switchChainAndRouteMessage(sepoliaFork);
        assertEq(
            sepoliaLockableToken.balanceOf(receiverAddress),
            amount,
            "Destination should have received the released tokens"
        );

        assertEq(
            sepoliaLockableToken.balanceOf(address(sepoliaLockReleasePool)),
            10_000 - amount,
            "Destination Token pool should have released the tokens"
        );
    }

    function testLockAndReleaseFromSepoliaToArbSepoliaAndBackPayLINK() public {
        uint256 amount = 1000;
        IERC20(address(sepoliaLockableToken)).safeTransfer(senderAddress, amount);
        uint256 senderLinkBalance = IERC20(sepoliaNetworkDetails.linkAddress)
            .balanceOf(address(senderAddress));
        vm.startPrank(senderAddress);
        sepoliaLockableToken.approve(address(sepoliaBridge), amount);

        vm.expectEmit(false, true, true, true); // don't check messageId
        emit CrossChainMessageSent(
            bytes32("123"),
            senderAddress,
            receiverAddress
        );
        vm.expectEmit(true, true, true, false);
        emit TokensTransferred(
            sepoliaLockableToken,
            sepoliaLockReleasePool,
            arbSepoliaNetworkDetails.chainSelector,
            IERC20(address(arbSepoliaBurnMintToken)),
            amount,
            0 // don't check fees
        );
        emit Locked(address(sepoliaBridge), amount);
        (, uint256 fees) = sepoliaBridge.transferTokensToDestinationChain(
            arbSepoliaNetworkDetails.chainSelector,
            sepoliaLockableToken,
            amount,
            receiverAddress,
            IERC20(sepoliaNetworkDetails.linkAddress)
        );
        vm.stopPrank();
        assertEq(
            sepoliaLockableToken.balanceOf(senderAddress),
            0,
            "Source should have locked the tokens"
        );
        assertEq(
            senderLinkBalance -
                IERC20(sepoliaNetworkDetails.linkAddress).balanceOf(
                    address(senderAddress)
                ),
            fees,
            "Source should have paid the fees"
        );
        assertEq(
            sepoliaLockableToken.balanceOf(address(sepoliaLockReleasePool)),
            10_000 + amount,
            "Source should have locked the tokens"
        );
        ccipLocalSimulatorFork.switchChainAndRouteMessage(arbSepoliaFork);
        assertEq(
            arbSepoliaBurnMintToken.balanceOf(receiverAddress),
            amount,
            "Destination should have received the minted tokens"
        );
        assertEq(
            arbSepoliaBurnMintToken.balanceOf(address(arbSepoliaBurnMintPool)),
            0,
            "Destination Token pool should have minted the tokens"
        );

        // Now send back tokens from arbSpolia to Sepolia
        ccipLocalSimulatorFork.requestLinkFromFaucet(
            address(receiverAddress),
            25 ether
        ); // provide 25 LINK to pay fees
        uint256 receiverLinkBalance = IERC20(
            arbSepoliaNetworkDetails.linkAddress
        ).balanceOf(address(receiverAddress));
        vm.startPrank(receiverAddress);
        IERC20(arbSepoliaNetworkDetails.linkAddress).approve(
            address(arbSepoliaBridge),
            type(uint256).max
        );
        arbSepoliaBurnMintToken.approve(address(arbSepoliaBridge), amount);

        vm.expectEmit(false, true, true, true); // don't check messageId
        emit CrossChainMessageSent(
            bytes32("123"),
            receiverAddress,
            senderAddress
        );
        vm.expectEmit(true, true, true, false);
        emit TokensTransferred(
            IERC20(address(arbSepoliaBurnMintToken)),
            arbSepoliaBurnMintPool,
            sepoliaNetworkDetails.chainSelector,
            sepoliaLockableToken,
            amount,
            0 // don't check fees
        );
        emit Burned(address(arbSepoliaBridge), amount);
        (, fees) = arbSepoliaBridge.transferTokensToDestinationChain(
            sepoliaNetworkDetails.chainSelector,
            IERC20(address(arbSepoliaBurnMintToken)),
            amount,
            senderAddress,
            IERC20(arbSepoliaNetworkDetails.linkAddress)
        );
        vm.stopPrank();
        assertEq(
            arbSepoliaBurnMintToken.balanceOf(receiverAddress),
            0,
            "Source should have burned the tokens"
        );
        assertEq(
            receiverLinkBalance -
                IERC20(arbSepoliaNetworkDetails.linkAddress).balanceOf(
                    address(receiverAddress)
                ),
            fees,
            "Source should have paid the fees"
        );

        ccipLocalSimulatorFork.switchChainAndRouteMessage(sepoliaFork);
        assertEq(
            sepoliaLockableToken.balanceOf(senderAddress),
            amount,
            "Destination should have received the released tokens"
        );

        assertEq(
            sepoliaLockableToken.balanceOf(address(sepoliaLockReleasePool)),
            10_000,
            "Destination Token pool should have released the tokens"
        );
    }
}
