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

import {Script, stdJson, console} from "forge-std/Script.sol";
import {IBridge} from "../src/bridge/Bridge.sol";
import {MockERC20} from "../test/mocks/MockERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract TestLockAndMintFromSepoliaToArbitrum is Script {
    using stdJson for string;

    struct NetworkDetails {
        address bridge;
        address lockReleasePool;
        address lockableToken;
        address linkToken;
        uint64 chainSelector;
        string rpcUrl;
    }

    function run() external {
        string memory json = vm.readFile("./script/addresses-Sepolia.json");

        NetworkDetails memory sepolia = NetworkDetails({
            bridge: json.readAddress(".bridge"),
            lockReleasePool: json.readAddress(".lockReleasePool"),
            lockableToken: json.readAddress(".lockableToken"),
            linkToken: 0x779877A7B0D9E8603169DdbD7836e478b4624789,
            chainSelector: 3478487238524512106,
            rpcUrl: vm.envString("ETHEREUM_SEPOLIA_RPC_URL")
        });

        IBridge bridge = IBridge(sepolia.bridge);
        MockERC20 lockableToken = MockERC20(sepolia.lockableToken);
        IERC20 linkToken = IERC20(sepolia.linkToken);

        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address senderAndReceiverAddress = vm.addr(deployerPrivateKey);

        vm.createSelectFork(sepolia.rpcUrl);
        vm.startBroadcast(deployerPrivateKey);

        uint256 amount = 1000;

        uint256 fees = bridge.getFee(
            sepolia.chainSelector,
            lockableToken,
            amount,
            senderAndReceiverAddress,
            linkToken
        );

        linkToken.approve(sepolia.bridge, fees);
        lockableToken.approve(sepolia.bridge, amount);
        uint256 initialPoolBalance = lockableToken.balanceOf(
            sepolia.lockReleasePool
        );
        (bytes32 messageId, uint256 actualFees) = bridge
            .transferTokensToDestinationChain(
                sepolia.chainSelector,
                lockableToken,
                amount,
                senderAndReceiverAddress,
                linkToken
            );

        // Check that the amount is locked in the pool
        uint256 poolBalance = lockableToken.balanceOf(sepolia.lockReleasePool);
        require(
            poolBalance - initialPoolBalance == amount,
            "The amount should be locked in the pool"
        );

        console.logBytes32(messageId);
        console.log("fees", actualFees);
        console.log("poolBalance", poolBalance);
        console.log(
            string.concat(
                unicode"👉 Track your CCIP message at: https://ccip.chain.link/#/side-drawer/msg/",
                vm.toString(messageId)
            )
        );

        vm.stopBroadcast();
    }
}
