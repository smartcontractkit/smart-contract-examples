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
import "../src/pools/LockReleaseTokenPool.sol";
import "../src/pools/BurnMintTokenPool.sol";
import "../test/mocks/MockERC20.sol";
import "../test/mocks/MockBurnMintERC20.sol";

contract Deploy is Script {
    struct NetworkDetails {
        string name;
        string rpcUrl;
        uint256 fork;
        uint64 chainSelector;
        address router;
        address link;
        Bridge bridge;
        Configuration configuration;
        LockReleaseTokenPool lockReleasePool;
        BurnMintTokenPool burnMintPool;
        MockERC20 lockableToken;
        MockBurnMintERC20 burnMintToken;
    }

    function run() external {
        NetworkDetails[] memory networks = new NetworkDetails[](3);

        // Ethereum Sepolia
        networks[0] = NetworkDetails({
            name: "Sepolia",
            rpcUrl: vm.envString("ETHEREUM_SEPOLIA_RPC_URL"),
            fork: 0,
            chainSelector: 16015286601757825753,
            router: 0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59,
            link: 0x779877A7B0D9E8603169DdbD7836e478b4624789,
            bridge: Bridge(address(0)),
            configuration: Configuration(address(0)),
            lockReleasePool: LockReleaseTokenPool(address(0)),
            burnMintPool: BurnMintTokenPool(address(0)),
            lockableToken: MockERC20(address(0)),
            burnMintToken: MockBurnMintERC20(address(0))
        });

        // Arbitrum Sepolia
        networks[1] = NetworkDetails({
            name: "ArbitrumSepolia",
            rpcUrl: vm.envString("ARBITRUM_SEPOLIA_RPC_URL"),
            fork: 0,
            chainSelector: 3478487238524512106,
            router: 0x2a9C5afB0d0e4BAb2BCdaE109EC4b0c4Be15a165,
            link: 0xb1D4538B4571d411F07960EF2838Ce337FE1E80E,
            bridge: Bridge(address(0)),
            configuration: Configuration(address(0)),
            lockReleasePool: LockReleaseTokenPool(address(0)),
            burnMintPool: BurnMintTokenPool(address(0)),
            lockableToken: MockERC20(address(0)),
            burnMintToken: MockBurnMintERC20(address(0))
        });

        // Avalanche Fuji
        networks[2] = NetworkDetails({
            name: "Fuji",
            rpcUrl: vm.envString("AVALANCHE_FUJI_RPC_URL"),
            fork: 0,
            chainSelector: 14767482510784806043,
            router: 0xF694E193200268f9a4868e4Aa017A0118C9a8177,
            link: 0x0b9d5D9136855f6FEc3c0993feE6E9CE8a297846,
            bridge: Bridge(address(0)),
            configuration: Configuration(address(0)),
            lockReleasePool: LockReleaseTokenPool(address(0)),
            burnMintPool: BurnMintTokenPool(address(0)),
            lockableToken: MockERC20(address(0)),
            burnMintToken: MockBurnMintERC20(address(0))
        });

        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        // Deploy contracts on each network
        for (uint256 i = 0; i < networks.length; i++) {
            NetworkDetails memory network = networks[i];
            network.fork = vm.createSelectFork(network.rpcUrl);
            vm.startBroadcast(deployerPrivateKey);

            network.lockableToken = new MockERC20(
                string(abi.encodePacked("Mock Token ", network.name)),
                "MTKlnu",
                type(uint256).max
            );
            network.burnMintToken = new MockBurnMintERC20(
                string(abi.encodePacked("Mock Token ", network.name)),
                "MTKbnm",
                18
            );
            network.configuration = new Configuration();
            network.bridge = new Bridge(network.router, network.configuration);
            network.lockReleasePool = new LockReleaseTokenPool(
                network.lockableToken,
                address(network.bridge),
                msg.sender
            );
            network.burnMintPool = new BurnMintTokenPool(
                network.burnMintToken,
                address(network.bridge)
            );

            network.configuration.setTokenPool(network.lockReleasePool);
            network.configuration.setTokenPool(network.burnMintPool);

            networks[i] = network;

            vm.stopBroadcast();

            console.log(
                string(abi.encodePacked(network.name, " Bridge:")),
                address(network.bridge)
            );
            console.log(
                string(abi.encodePacked(network.name, " LockReleasePool:")),
                address(network.lockReleasePool)
            );
            console.log(
                string(abi.encodePacked(network.name, " BurnMintPool:")),
                address(network.burnMintPool)
            );
            console.log(
                string(abi.encodePacked(network.name, " LockableToken:")),
                address(network.lockableToken)
            );
            console.log(
                string(abi.encodePacked(network.name, " BurnMintToken:")),
                address(network.burnMintToken)
            );
        }

        // Set remote bridges
        for (uint256 i = 0; i < networks.length; i++) {
            NetworkDetails memory network = networks[i];
            vm.selectFork(network.fork);
            vm.startBroadcast(deployerPrivateKey);

            for (uint256 j = 0; j < networks.length; j++) {
                if (i != j) {
                    network.configuration.setRemoteBridge(
                        networks[j].chainSelector,
                        address(networks[j].bridge)
                    );
                    network.configuration.setExtraArgs(
                        networks[j].chainSelector,
                        Client._argsToBytes(
                            Client.EVMExtraArgsV1({gasLimit: 300_000})
                        )
                    );
                }
            }

            // Custom destination token to test different combination of token pools

            if (keccak256(bytes(network.name)) == keccak256(bytes("Fuji"))) {
                console.log("Setting destination tokens for Fuji");
                Configuration(network.configuration).setDestinationToken(
                    MockERC20(network.lockableToken),
                    networks[0].chainSelector,
                    MockERC20(networks[0].lockableToken) // lock and Release with Sepolia
                );
                Configuration(network.configuration).setDestinationToken(
                    MockBurnMintERC20(network.burnMintToken),
                    networks[0].chainSelector,
                    MockBurnMintERC20(networks[0].burnMintToken) // Burn and Mint with Sepolia
                );
            } else if (
                keccak256(bytes(network.name)) ==
                keccak256(bytes("ArbitrumSepolia"))
            ) {
                console.log("Setting destination tokens for ArbitrumSepolia");
                Configuration(network.configuration).setDestinationToken(
                    MockBurnMintERC20(network.burnMintToken),
                    networks[0].chainSelector,
                    MockERC20(networks[0].lockableToken)
                ); // Burn and Release with Sepolia
            } else if (
                keccak256(bytes(network.name)) == keccak256(bytes("Sepolia"))
            ) {
                console.log("Setting destination tokens for Sepolia");
                Configuration(network.configuration).setDestinationToken(
                    MockERC20(network.lockableToken),
                    networks[2].chainSelector,
                    MockERC20(networks[2].lockableToken)
                ); // lock and Release with Fuji
                Configuration(network.configuration).setDestinationToken(
                    MockBurnMintERC20(network.burnMintToken),
                    networks[2].chainSelector,
                    MockBurnMintERC20(networks[2].burnMintToken)
                ); // Burn and Mint with Fuji
                Configuration(network.configuration).setDestinationToken(
                    MockERC20(network.lockableToken),
                    networks[1].chainSelector,
                    MockBurnMintERC20(networks[1].burnMintToken)
                ); // lock and Mint with ArbitrumSepolia
            }

            vm.stopBroadcast();

            console.log(
                string(abi.encodePacked(network.name, " remote bridges set"))
            );
        }
        // Save the addresses to a file
        saveAddresses(networks);
    }

    function saveAddresses(NetworkDetails[] memory networks) internal {
        string memory deployedContractsObj = "deployedContracts";

        for (uint256 i = 0; i < networks.length; i++) {
            NetworkDetails memory network = networks[i];
            string memory networkName = network.name;

            vm.serializeAddress(
                deployedContractsObj,
                string(abi.encodePacked(networkName, "_bridge")),
                address(network.bridge)
            );

            vm.serializeAddress(
                deployedContractsObj,
                string(abi.encodePacked(networkName, "_configuration")),
                address(network.configuration)
            );

            vm.serializeAddress(
                deployedContractsObj,
                string(abi.encodePacked(networkName, "_lockReleasePool")),
                address(network.lockReleasePool)
            );

            vm.serializeAddress(
                deployedContractsObj,
                string(abi.encodePacked(networkName, "_burnMintPool")),
                address(network.burnMintPool)
            );

            vm.serializeAddress(
                deployedContractsObj,
                string(abi.encodePacked(networkName, "_lockableToken")),
                address(network.lockableToken)
            );

            vm.serializeAddress(
                deployedContractsObj,
                string(abi.encodePacked(networkName, "_burnMintToken")),
                address(network.burnMintToken)
            );
        }

        string memory finalJson = vm.serializeBool(
            deployedContractsObj,
            "completed",
            true
        );
        vm.writeJson(finalJson, "./script/addresses.json");
    }
}
