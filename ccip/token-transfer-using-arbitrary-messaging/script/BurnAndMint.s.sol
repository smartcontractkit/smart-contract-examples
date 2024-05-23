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
import "../src/bridge/Configuration.sol";
import "../src/pools/BurnMintTokenPool.sol";
import "../test/mocks/MockBurnMintERC20.sol";

contract TestBurnAndMintFromFujiToSepolia is Script {
    using stdJson for string;

    function run() external {
        string memory json = vm.readFile("./script/addresses.json");

        address bridgeAddress = json.readAddress(".Fuji_bridge");
        address burnMintTokenAddress = json.readAddress(".Fuji_burnMintToken");
        uint64 sepoliaChainSelector = 16015286601757825753;
        address linkTokenAddress = 0x0b9d5D9136855f6FEc3c0993feE6E9CE8a297846;

        IBridge bridge = IBridge(bridgeAddress);
        MockBurnMintERC20 burnMintToken = MockBurnMintERC20(
            burnMintTokenAddress
        );
        IERC20 linkToken = IERC20(linkTokenAddress);

        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address senderAndReceiverAddress = vm.addr(deployerPrivateKey);
        string memory rpcUrl = vm.envString("AVALANCHE_FUJI_RPC_URL");

        vm.createSelectFork(rpcUrl);
        vm.startBroadcast(deployerPrivateKey);

        uint256 amount = 1000;
        burnMintToken.mint(senderAndReceiverAddress, amount);

        uint256 fees = bridge.getFee(
            sepoliaChainSelector,
            burnMintToken,
            amount,
            senderAndReceiverAddress,
            linkToken
        );

        linkToken.approve(bridgeAddress, fees);
        burnMintToken.approve(bridgeAddress, amount);
        (bytes32 messageId, uint256 actualFees) = bridge
            .transferTokensToDestinationChain(
                sepoliaChainSelector,
                burnMintToken,
                amount,
                senderAndReceiverAddress,
                linkToken
            );

        console.logBytes32(messageId);
        console.log("fees", actualFees);

        vm.stopBroadcast();
    }
}
