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
import {IBurnMintERC20} from "@chainlink/contracts/src/v0.8/shared/token/ERC20/IBurnMintERC20.sol";
import {BurnMintERC20} from "@chainlink/contracts/src/v0.8/shared/token/ERC20/BurnMintERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract TestBurnAndReleaseFromArbitrumToSepolia is Script {
    using stdJson for string;

    struct NetworkDetails {
        address bridge;
        address burnMintPool;
        address burnMintToken;
        address linkToken;
        uint64 chainSelector;
        string rpcUrl;
    }

    function run() external {
        string memory json = vm.readFile("./script/addresses.json");

        NetworkDetails memory arbitrum = NetworkDetails({
            bridge: json.readAddress(".ArbitrumSepolia_bridge"),
            burnMintPool: json.readAddress(".ArbitrumSepolia_burnMintPool"),
            burnMintToken: json.readAddress(".ArbitrumSepolia_burnMintToken"),
            linkToken: 0xb1D4538B4571d411F07960EF2838Ce337FE1E80E,
            chainSelector: 16015286601757825753,
            rpcUrl: vm.envString("ARBITRUM_SEPOLIA_RPC_URL")
        });

        IBridge bridge = IBridge(arbitrum.bridge);
        IBurnMintERC20 burnMintToken = IBurnMintERC20(
            arbitrum.burnMintToken
        );
        IERC20 linkToken = IERC20(arbitrum.linkToken);

        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address senderAndReceiverAddress = vm.addr(deployerPrivateKey);

        vm.createSelectFork(arbitrum.rpcUrl);
        vm.startBroadcast(deployerPrivateKey);

        // Grant minter role to the sender address so they can mint tokens
        BurnMintERC20(arbitrum.burnMintToken).grantRole(
            BurnMintERC20(arbitrum.burnMintToken).MINTER_ROLE(), 
            senderAndReceiverAddress
        );

        uint256 amount = 1000;
        burnMintToken.mint(senderAndReceiverAddress, amount);

        uint256 fees = bridge.getFee(
            arbitrum.chainSelector,
            IERC20(address(burnMintToken)),
            amount,
            senderAndReceiverAddress,
            linkToken
        );

        linkToken.approve(arbitrum.bridge, fees);
        burnMintToken.approve(arbitrum.bridge, amount);
        (bytes32 messageId, uint256 actualFees) = bridge
            .transferTokensToDestinationChain(
                arbitrum.chainSelector,
                IERC20(address(burnMintToken)),
                amount,
                senderAndReceiverAddress,
                linkToken
            );

        console.logBytes32(messageId);
        console.log("fees", actualFees);

        vm.stopBroadcast();
    }
}
