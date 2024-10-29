// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {HelperUtils} from "./utils/HelperUtils.s.sol"; // Utility functions for JSON parsing and chain info
import {HelperConfig} from "./HelperConfig.s.sol"; // Network configuration helper
import {IERC20} from
    "@chainlink/contracts-ccip/src/v0.8/vendor/openzeppelin-solidity/v4.8.3/contracts/token/ERC20/IERC20.sol";
import {IRouterClient} from "@chainlink/contracts-ccip/src/v0.8/ccip/interfaces/IRouterClient.sol";
import {Client} from "@chainlink/contracts-ccip/src/v0.8/ccip/libraries/Client.sol";

contract TransferTokens is Script {
    enum Fee {
        Native,
        Link
    }

    function run() external {
        // Get the chain name based on the current chain ID
        string memory chainName = HelperUtils.getChainName(block.chainid);

        // Construct paths to the configuration and token JSON files
        string memory root = vm.projectRoot();
        string memory configPath = string.concat(root, "/script/config.json");
        string memory tokenPath = string.concat(root, "/script/output/deployedToken_", chainName, ".json");

        // Extract the token address from the JSON file
        address tokenAddress =
            HelperUtils.getAddressFromJson(vm, tokenPath, string.concat(".deployedToken_", chainName));

        // Read the amount to transfer and feeType from config.json
        uint256 amount = HelperUtils.getUintFromJson(vm, configPath, ".tokenAmountToTransfer");
        string memory feeType = HelperUtils.getStringFromJson(vm, configPath, ".feeType");

        // Get the destination chain ID based on the current chain ID
        uint256 destinationChainId = HelperUtils.getUintFromJson(
            vm, configPath, string.concat(".remoteChains.", HelperUtils.uintToStr(block.chainid))
        );

        // Fetch the network configuration for the current chain
        HelperConfig helperConfig = new HelperConfig();
        (, address router,,,, address link,,) = helperConfig.activeNetworkConfig();

        // Retrieve the remote network configuration
        HelperConfig.NetworkConfig memory remoteNetworkConfig =
            HelperUtils.getNetworkConfig(helperConfig, destinationChainId);
        uint64 destinationChainSelector = remoteNetworkConfig.chainSelector;

        require(tokenAddress != address(0), "Invalid token address");
        require(amount > 0, "Invalid amount to transfer");
        require(destinationChainSelector != 0, "Chain selector not defined for the destination chain");

        // Determine the fee token to use based on feeType
        address feeTokenAddress;
        if (keccak256(bytes(feeType)) == keccak256(bytes("native"))) {
            feeTokenAddress = address(0); // Use native token (e.g., ETH, AVAX)
        } else if (keccak256(bytes(feeType)) == keccak256(bytes("link"))) {
            feeTokenAddress = link; // Use LINK token
        } else {
            console.log("Invalid fee token:", feeType);
            revert();
        }

        vm.startBroadcast();

        // Connect to the CCIP router contract
        IRouterClient routerContract = IRouterClient(router);

        // Check if the destination chain is supported by the router
        require(routerContract.isChainSupported(destinationChainSelector), "Destination chain not supported");

        // Prepare the CCIP message
        Client.EVM2AnyMessage memory message = Client.EVM2AnyMessage({
            receiver: abi.encode(msg.sender), // Receiver address on the destination chain
            data: abi.encode(), // No additional data
            tokenAmounts: new Client.EVMTokenAmount[](1), // Array of tokens to transfer
            feeToken: feeTokenAddress, // Fee token (native or LINK)
            extraArgs: abi.encodePacked(
                bytes4(keccak256("CCIP EVMExtraArgsV1")), // Extra arguments for CCIP (versioned)
                abi.encode(uint256(0)) // Placeholder for future use
            )
        });

        // Set the token and amount to transfer
        message.tokenAmounts[0] = Client.EVMTokenAmount({token: tokenAddress, amount: amount});

        // Approve the router to transfer tokens on behalf of the sender
        IERC20(tokenAddress).approve(router, amount);

        // Estimate the fees required for the transfer
        uint256 fees = routerContract.getFee(destinationChainSelector, message);
        console.log("Estimated fees:", fees);

        // Send the CCIP message and handle fee payment
        bytes32 messageId;
        if (feeTokenAddress == address(0)) {
            // Pay fees with native token
            messageId = routerContract.ccipSend{value: fees}(destinationChainSelector, message);
        } else {
            // Approve the router to spend LINK tokens for fees
            IERC20(feeTokenAddress).approve(router, fees);
            messageId = routerContract.ccipSend(destinationChainSelector, message);
        }

        // Log the Message ID
        console.log("Message ID:");
        console.logBytes32(messageId);

        // Provide a URL to check the status of the message
        string memory messageUrl = string(
            abi.encodePacked(
                "Check status of the message at https://ccip.chain.link/msg/", HelperUtils.bytes32ToHexString(messageId)
            )
        );
        console.log(messageUrl);

        vm.stopBroadcast();
    }
}
