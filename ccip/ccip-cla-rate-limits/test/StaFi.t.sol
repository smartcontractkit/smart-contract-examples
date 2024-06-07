// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import {Test, console} from "forge-std/Test.sol";
import {CLASender} from "../src/CLASender.sol";
import {CLAReceiver} from "../src/CLAReceiver.sol";
import {ExampleConsumer} from "../src/ExampleConsumer.sol";
import {EncodeExtraArgs} from "../src/utils/EncodeExtraArgs.sol";
import {CCIPLocalSimulatorFork, Register} from "@chainlink/local/src/ccip/CCIPLocalSimulatorFork.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract StaFiTest is Test {
    CLASender public claSender;
    CLAReceiver public claReceiver;

    address public owner;
    address public mockAutomationForwarder;

    ExampleConsumer public exampleConsumer;

    EncodeExtraArgs public encodeExtraArgs;
    uint256 public ethereumMainnetForkId;
    uint256 public polygonMainnetForkId;
    CCIPLocalSimulatorFork public ccipLocalSimulatorFork;

    function setUp() public {
        owner = makeAddr("owner");
        mockAutomationForwarder = makeAddr("mockAutomationForwarder");

        uint256 gasLimit = 100_000;
        encodeExtraArgs = new EncodeExtraArgs();
        bytes memory extraArgs = encodeExtraArgs.encode(gasLimit);

        string memory ETHEREUM_MAINNET_RPC_URL = vm.envString("ETHEREUM_MAINNET_RPC_URL");
        string memory POLYGON_MAINNET_RPC_URL = vm.envString("POLYGON_MAINNET_RPC_URL");
        ethereumMainnetForkId = vm.createFork(ETHEREUM_MAINNET_RPC_URL);
        polygonMainnetForkId = vm.createFork(POLYGON_MAINNET_RPC_URL);

        ccipLocalSimulatorFork = new CCIPLocalSimulatorFork();
        vm.makePersistent(address(ccipLocalSimulatorFork));
        vm.makePersistent(owner);

        uint64 ethereumMainnetChainSelector = 5009297550715157269;
        address ethereumMainnetCcipRouterAddress = 0x80226fc0Ee2b096224EeAc085Bb9a8cba1146f7D;
        address ethereumMainnetLinkTokenAddress = 0x514910771AF9Ca656af840dff83E8264EcF986CA;
        uint64 polygonMainnetChainSelector = 4051577828743386545;
        address polygonMainnetCcipRouterAddress = 0x849c5ED5a80F5B408Dd4969b78c2C8fdf0565Bfe;

        // select ethereum fork
        vm.selectFork(ethereumMainnetForkId);

        address staFiTokenAddress = 0x9559Aaa82d9649C7A7b220E7c461d2E74c9a3593;

        vm.startPrank(owner);
        claSender = new CLASender(
            staFiTokenAddress, ethereumMainnetLinkTokenAddress, ethereumMainnetCcipRouterAddress, extraArgs
        );

        claSender.setAutomationForwarder(mockAutomationForwarder);
        claSender.setDestinationChainSelector(polygonMainnetChainSelector);

        // select polygon fork
        vm.selectFork(polygonMainnetForkId);

        claReceiver = new CLAReceiver(polygonMainnetCcipRouterAddress);

        claReceiver.toggleChainStatus(ethereumMainnetChainSelector, true);
        claReceiver.toggleSenderStatus(address(claSender), true);

        ccipLocalSimulatorFork.setNetworkDetails(
            block.chainid,
            Register.NetworkDetails({
                chainSelector: polygonMainnetChainSelector,
                routerAddress: polygonMainnetCcipRouterAddress,
                linkAddress: address(0), // not used
                wrappedNativeAddress: address(0), // not used
                ccipBnMAddress: address(0), // not used
                ccipLnMAddress: address(0) // not used
            })
        );

        exampleConsumer = new ExampleConsumer(address(claReceiver));

        // select ethereum fork
        vm.selectFork(ethereumMainnetForkId);
        claSender.setCLAReceiver(address(claReceiver));

        vm.stopPrank();

        // fund the CLA sender with LINK tokens for CCIP fees
        address binance8 = 0xF977814e90dA44bFA03b6295A0616a897441aceC;
        vm.startPrank(binance8);
        IERC20(ethereumMainnetLinkTokenAddress).transfer(address(claSender), 5 ether);
        vm.stopPrank();
    }

    function test_smoke() public {
        vm.selectFork(ethereumMainnetForkId);

        vm.startPrank(mockAutomationForwarder);
        (bool upkeepNeeded, bytes memory performData) = claSender.checkUpkeep("");

        assertTrue(upkeepNeeded);
        claSender.performUpkeep(performData);

        vm.stopPrank();

        ccipLocalSimulatorFork.switchChainAndRouteMessage(polygonMainnetForkId);

        uint256 latestExchangeRate = exampleConsumer.getLatestExchangeRate();
        console.log("Latest Exchange Rate:", latestExchangeRate);
        assertTrue(latestExchangeRate > 0, "Latest Exchange Rate is 0");
    }
}
