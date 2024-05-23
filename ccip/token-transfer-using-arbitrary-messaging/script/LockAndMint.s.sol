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

import "forge-std/Script.sol";
import "../src/bridge/Bridge.sol";
import "../src/pools/LockReleaseTokenPool.sol";
import "../test/mocks/MockERC20.sol";

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
        string memory json = vm.readFile("./script/addresses.json");

        NetworkDetails memory sepolia = NetworkDetails({
            bridge: json.readAddress(".Sepolia_bridge"),
            lockReleasePool: json.readAddress(".Sepolia_lockReleasePool"),
            lockableToken: json.readAddress(".Sepolia_lockableToken"),
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

        console.logBytes32(messageId);
        console.log("fees", actualFees);

        // Check that the amount is locked in the pool
        uint256 poolBalance = lockableToken.balanceOf(sepolia.lockReleasePool);
        console.log("poolBalance", poolBalance);
        require(
            poolBalance - initialPoolBalance == amount,
            "The amount should be locked in the pool"
        );

        vm.stopBroadcast();
    }
}
