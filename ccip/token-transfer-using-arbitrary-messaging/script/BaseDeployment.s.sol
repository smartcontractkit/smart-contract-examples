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

import {Script, console} from "forge-std/Script.sol";
import {Bridge} from "../src/bridge/Bridge.sol";
import {Configuration} from "../src/bridge/Configuration.sol";
import {LockReleaseTokenPool} from "../src/pools/LockReleaseTokenPool.sol";
import {BurnMintTokenPool} from "../src/pools/BurnMintTokenPool.sol";
import {MockERC20} from "../test/mocks/MockERC20.sol";
import {BurnMintERC20} from "@chainlink/contracts/src/v0.8/shared/token/ERC20/BurnMintERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

abstract contract BaseDeployment is Script {
    struct NetworkConfig {
        string name;
        uint64 chainSelector;
        address router;
        address link;
        string rpcEnvVar;
    }

    struct DeployedContracts {
        Bridge bridge;
        Configuration configuration;
        LockReleaseTokenPool lockReleasePool;
        BurnMintTokenPool burnMintPool;
        MockERC20 lockableToken;
        BurnMintERC20 burnMintToken;
    }

    function deployNetworkContracts(NetworkConfig memory config) 
        internal 
        returns (DeployedContracts memory deployed) 
    {
        // Deploy the lockable token (MockERC20)
        deployed.lockableToken = new MockERC20(
            string(abi.encodePacked("Mock Token ", config.name)),
            "MTKlnu",
            type(uint256).max
        );

        // Deploy the burn/mint token (BurnMintERC20)
        deployed.burnMintToken = new BurnMintERC20(
            string(abi.encodePacked("Mock Token ", config.name)),
            "MTKbnm",
            18,
            0, // unlimited max supply
            0  // no premint
        );

        // Deploy configuration contract
        deployed.configuration = new Configuration();

        // Deploy bridge contract
        deployed.bridge = new Bridge(config.router, deployed.configuration);

        // Deploy lock/release token pool
        deployed.lockReleasePool = new LockReleaseTokenPool(
            deployed.lockableToken,
            address(deployed.bridge),
            msg.sender
        );

        // Deploy burn/mint token pool
        deployed.burnMintPool = new BurnMintTokenPool(
            IERC20(address(deployed.burnMintToken)),
            address(deployed.bridge)
        );

        // Grant minter and burner roles to the pool
        deployed.burnMintToken.grantRole(
            deployed.burnMintToken.MINTER_ROLE(), 
            address(deployed.burnMintPool)
        );
        deployed.burnMintToken.grantRole(
            deployed.burnMintToken.BURNER_ROLE(), 
            address(deployed.burnMintPool)
        );

        // Set token pools in configuration
        deployed.configuration.setTokenPool(deployed.lockReleasePool);
        deployed.configuration.setTokenPool(deployed.burnMintPool);

        return deployed;
    }

    function logDeployedContracts(string memory networkName, DeployedContracts memory deployed) internal view {
        console.log(
            string(abi.encodePacked(networkName, " Bridge:")),
            address(deployed.bridge)
        );
        console.log(
            string(abi.encodePacked(networkName, " LockReleasePool:")),
            address(deployed.lockReleasePool)
        );
        console.log(
            string(abi.encodePacked(networkName, " BurnMintPool:")),
            address(deployed.burnMintPool)
        );
        console.log(
            string(abi.encodePacked(networkName, " LockableToken:")),
            address(deployed.lockableToken)
        );
        console.log(
            string(abi.encodePacked(networkName, " BurnMintToken:")),
            address(deployed.burnMintToken)
        );
    }

    function saveNetworkAddresses(string memory networkName, DeployedContracts memory deployed) internal {
        string memory deployedContractsObj = string(abi.encodePacked(networkName, "Contracts"));

        vm.serializeAddress(
            deployedContractsObj,
            "bridge",
            address(deployed.bridge)
        );

        vm.serializeAddress(
            deployedContractsObj,
            "configuration",
            address(deployed.configuration)
        );

        vm.serializeAddress(
            deployedContractsObj,
            "lockReleasePool",
            address(deployed.lockReleasePool)
        );

        vm.serializeAddress(
            deployedContractsObj,
            "burnMintPool",
            address(deployed.burnMintPool)
        );

        vm.serializeAddress(
            deployedContractsObj,
            "lockableToken",
            address(deployed.lockableToken)
        );

        string memory finalJson = vm.serializeAddress(
            deployedContractsObj,
            "burnMintToken",
            address(deployed.burnMintToken)
        );

        // Save to network-specific JSON file
        string memory fileName = string(abi.encodePacked("./script/addresses-", networkName, ".json"));
        vm.writeJson(finalJson, fileName);
    }

    function getNetworkConfig(string memory networkName) internal pure returns (NetworkConfig memory) {
        if (keccak256(bytes(networkName)) == keccak256(bytes("Sepolia"))) {
            return NetworkConfig({
                name: "Sepolia",
                chainSelector: 16015286601757825753,
                router: 0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59,
                link: 0x779877A7B0D9E8603169DdbD7836e478b4624789,
                rpcEnvVar: "ETHEREUM_SEPOLIA_RPC_URL"
            });
        } else if (keccak256(bytes(networkName)) == keccak256(bytes("ArbitrumSepolia"))) {
            return NetworkConfig({
                name: "ArbitrumSepolia",
                chainSelector: 3478487238524512106,
                router: 0x2a9C5afB0d0e4BAb2BCdaE109EC4b0c4Be15a165,
                link: 0xb1D4538B4571d411F07960EF2838Ce337FE1E80E,
                rpcEnvVar: "ARBITRUM_SEPOLIA_RPC_URL"
            });
        } else if (keccak256(bytes(networkName)) == keccak256(bytes("Fuji"))) {
            return NetworkConfig({
                name: "Fuji",
                chainSelector: 14767482510784806043,
                router: 0xF694E193200268f9a4868e4Aa017A0118C9a8177,
                link: 0x0b9d5D9136855f6FEc3c0993feE6E9CE8a297846,
                rpcEnvVar: "AVALANCHE_FUJI_RPC_URL"
            });
        } else {
            revert("Unknown network");
        }
    }
}
