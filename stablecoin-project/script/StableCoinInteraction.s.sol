// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Script.sol";
import {StableCoin} from "../src/StableCoin.sol";
import {MockAggregator} from "../src/SmartDataMock.sol";

/**
 * @title StableCoinInteraction
 * @dev Script to demonstrate StableCoin functionality with 1:1 reserve backing
 */
contract StableCoinInteraction is Script {
    // Constants
    uint256 private constant STANDARD_MINT_AMOUNT = 1_000;
    uint256 private constant STANDARD_TRANSFER_AMOUNT = 100;
    uint256 private constant SMALL_TRANSFER_AMOUNT = 10;
    uint256 private constant TEST_MINT_AFTER_UNPAUSE = 50;
    address public constant THIRD_WALLET =
        0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC;

    // Contract references
    StableCoin public stableCoin;
    MockAggregator public mockAggregator;

    // Wallet addresses
    address public ownerWallet;
    address public secondWallet;

    // Token configuration
    uint8 public decimals;
    uint256 public decimalFactor;

    // Logging
    uint256 private stepCounter = 0;

    // Test state
    enum TestStage {
        INITIAL,
        AFTER_MINT,
        AFTER_TRANSFER,
        AFTER_PAUSE,
        FINAL
    }

    /**
     * @dev Main entry point for the script
     */
    function run() external {
        // Use the private keys from environment variables or default ones for testing
        uint256 deployerPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
        uint256 secondWalletPrivateKey = 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d;

        // Set up wallet addresses
        ownerWallet = vm.addr(deployerPrivateKey);
        secondWallet = vm.addr(secondWalletPrivateKey);

        printHeader("STABLECOIN INTERACTION SCRIPT");
        printWalletInfo();

        // Execute test sequence with owner wallet
        executeOwnerTests(deployerPrivateKey);

        // Execute test sequence with second wallet
        executeSecondWalletTests(secondWalletPrivateKey);

        printFooter("SCRIPT EXECUTION COMPLETED");
    }

    /**
     * @dev Execute tests using the owner wallet
     */
    function executeOwnerTests(uint256 deployerPrivateKey) internal {
        vm.startBroadcast(deployerPrivateKey);

        // Setup and initial tests
        deployContracts();
        setupDecimals();
        checkInitialState();

        // Core functionality tests
        testMinting();
        testMintingLimits();
        testTransferToSecondWallet();
        testPauseFunctionality();

        vm.stopBroadcast();
    }

    /**
     * @dev Execute tests using the second wallet
     */
    function executeSecondWalletTests(uint256 secondWalletPrivateKey) internal {
        vm.startBroadcast(secondWalletPrivateKey);
        testTransferToThirdWallet();
        vm.stopBroadcast();
    }

    /**
     * @dev Deploy the MockAggregator and StableCoin contracts
     */
    function deployContracts() internal {
        printStep("CONTRACT DEPLOYMENT");

        // Deploy MockAggregator first
        mockAggregator = new MockAggregator();
        printSuccess(
            "MockAggregator deployed",
            vm.toString(address(mockAggregator))
        );

        // Deploy StableCoin with initial supply 0
        stableCoin = new StableCoin(0, address(mockAggregator));
        printSuccess("StableCoin deployed", vm.toString(address(stableCoin)));

        printInfo("Owner wallet roles", "DEFAULT_ADMIN_ROLE granted");
        printSeparator();
    }

    /**
     * @dev Set up decimals and decimal factor
     */
    function setupDecimals() internal {
        decimals = stableCoin.decimals();
        decimalFactor = 10 ** uint256(decimals);
        printInfo("Token decimals", vm.toString(decimals));
    }

    /**
     * @dev Check the initial state of the contracts
     */
    function checkInitialState() internal {
        printStep("INITIAL STATE VERIFICATION");

        uint256 initialSupply = stableCoin.totalSupply();
        uint256 reserveValue = stableCoin.getReserveValue();
        uint256 availableToMint = stableCoin.availableToMint();

        printMetric("Initial Supply", formatTokens(initialSupply));
        printMetric(
            "Reserve Value (MockAggregator)",
            formatTokens(reserveValue)
        );
        printMetric("Available to Mint", formatTokens(availableToMint));

        printReserveDisclosure("INITIAL");
        printSeparator();
    }

    /**
     * @dev Test minting functionality
     */
    function testMinting() internal {
        printStep("MINTING FUNCTIONALITY TEST");

        uint256 requestedMint = STANDARD_MINT_AMOUNT * decimalFactor;
        uint256 availableToMint = stableCoin.availableToMint();
        uint256 actualMint = requestedMint <= availableToMint
            ? requestedMint
            : availableToMint;

        printInfo("Mint Request", formatTokens(requestedMint));
        printInfo("Available Reserves", formatTokens(availableToMint));

        if (actualMint == 0) {
            printWarning("Cannot mint any tokens", "No reserves available");
            printSeparator();
            return;
        }

        if (actualMint < requestedMint) {
            printWarning(
                "Partial mint only",
                string.concat(
                    "Minting ",
                    formatTokens(actualMint),
                    " instead of ",
                    formatTokens(requestedMint)
                )
            );
        }

        // Perform the mint
        performMint(ownerWallet, actualMint);

        // Post-mint state
        printInfo("New Total Supply", formatTokens(stableCoin.totalSupply()));
        printInfo(
            "Remaining Mintable",
            formatTokens(stableCoin.availableToMint())
        );

        printSeparator();
    }

    /**
     * @dev Perform a mint operation and log results
     */
    function performMint(
        address recipient,
        uint256 amount
    ) internal returns (bool) {
        uint256 balanceBefore = stableCoin.balanceOf(recipient);
        bool success = stableCoin.mint(recipient, amount);
        uint256 balanceAfter = stableCoin.balanceOf(recipient);

        if (success) {
            printSuccess("Mint completed", formatTokens(amount));
            printBalanceChange(
                getWalletName(recipient),
                balanceBefore,
                balanceAfter
            );
        } else {
            printError("Mint failed", "Unknown error");
        }

        return success;
    }

    /**
     * @dev Test minting limits by trying to mint more than available
     */
    function testMintingLimits() internal {
        printStep("MINTING LIMITS TEST");

        uint256 availableAfterMint = stableCoin.availableToMint();

        if (availableAfterMint == 0) {
            printInfo("Reserve Status", "Fully utilized - no excess reserves");
            printSeparator();
            return;
        }

        uint256 overMintAmount = availableAfterMint + 1;
        printInfo("Attempting over-mint", formatTokens(overMintAmount));
        printInfo("Available reserves", formatTokens(availableAfterMint));

        // This should fail
        try stableCoin.mint(ownerWallet, overMintAmount) {
            printError(
                "Over-mint test FAILED",
                "Mint succeeded when it should have failed!"
            );
        } catch Error(string memory reason) {
            printSuccess("Over-mint protection working", reason);
        } catch {
            printSuccess(
                "Over-mint protection working",
                "Reverted as expected"
            );
        }

        printReserveDisclosure("AFTER MINTING");
        printSeparator();
    }

    /**
     * @dev Test transferring tokens from owner to second wallet
     */
    function testTransferToSecondWallet() internal {
        printStep("TRANSFER TEST: Owner -> Second Wallet");

        uint256 transferAmount = STANDARD_TRANSFER_AMOUNT * decimalFactor;
        transferAmount = validateTransferAmount(
            ownerWallet,
            secondWallet,
            transferAmount
        );

        if (transferAmount == 0) {
            printInfo("Skipping transfer", "Owner has no tokens to transfer");
            printSeparator();
            return;
        }

        printAllBalances("BEFORE TRANSFER");
        performTransfer(ownerWallet, secondWallet, transferAmount);
        printAllBalances("AFTER TRANSFER");

        printSeparator();
    }

    /**
     * @dev Validate and adjust transfer amount based on sender balance
     */
    function validateTransferAmount(
        address sender,
        address,
        /* recipient */
        uint256 requestedAmount
    ) internal view returns (uint256) {
        uint256 senderBalance = stableCoin.balanceOf(sender);
        if (senderBalance < requestedAmount) {
            printWarning(
                "Insufficient balance",
                string.concat(
                    getWalletName(sender),
                    " has ",
                    formatTokens(senderBalance),
                    " but trying to transfer ",
                    formatTokens(requestedAmount)
                )
            );
            return senderBalance;
        }
        return requestedAmount;
    }

    /**
     * @dev Perform a transfer between two wallets and log results
     */
    function performTransfer(
        address sender,
        address recipient,
        uint256 amount
    ) internal returns (bool) {
        // Record balances before transfer
        uint256 senderBefore = stableCoin.balanceOf(sender);
        uint256 recipientBefore = stableCoin.balanceOf(recipient);

        // Perform transfer (uses msg.sender as the sender)
        bool success = stableCoin.transfer(recipient, amount);

        // Record balances after transfer
        uint256 senderAfter = stableCoin.balanceOf(sender);
        uint256 recipientAfter = stableCoin.balanceOf(recipient);

        // Log results
        if (success) {
            printSuccess("Transfer completed", formatTokens(amount));
            printBalanceChange(
                getWalletName(sender),
                senderBefore,
                senderAfter
            );
            printBalanceChange(
                getWalletName(recipient),
                recipientBefore,
                recipientAfter
            );
        } else {
            printError("Transfer failed", "Unknown error");
        }

        return success;
    }

    /**
     * @dev Test transferring tokens from second wallet to third wallet
     */
    function testTransferToThirdWallet() internal {
        // Note: This function uses the context's secondWallet (via msg.sender) implicitly
        printStep("TRANSFER TEST: Second Wallet -> Third Wallet");

        uint256 transferAmount = SMALL_TRANSFER_AMOUNT * decimalFactor;
        transferAmount = validateTransferAmount(
            secondWallet,
            THIRD_WALLET,
            transferAmount
        );

        if (transferAmount == 0) {
            printInfo("Skipping transfer", "Second wallet has no tokens");
            printReserveDisclosure("FINAL");
            printSeparator();
            return;
        }

        printAllBalances("BEFORE TRANSFER");
        performTransfer(secondWallet, THIRD_WALLET, transferAmount);
        printAllBalances("AFTER TRANSFER");

        printReserveDisclosure("FINAL");
        printSeparator();
    }

    /**
     * @dev Demonstrates pause functionality
     */
    function testPauseFunctionality() internal {
        printStep("PAUSE FUNCTIONALITY TEST");

        // Test pause functionality
        testPauseState();

        // Test unpause functionality
        testUnpauseState();

        printSeparator();
    }

    /**
     * @dev Tests contract behavior in paused state
     */
    function testPauseState() internal {
        // Pause the contract
        printInfo("Action", "Pausing contract...");
        stableCoin.pause();
        printSuccess("Contract paused", "All transfers and mints disabled");

        // Test transfer while paused
        testTransferWhilePaused();

        // Test mint while paused
        testMintWhilePaused();

        printAllBalances("AFTER PAUSE");
    }

    /**
     * @dev Tests contract behavior after unpausing
     */
    function testUnpauseState() internal {
        // Unpause the contract
        printInfo("Action", "Unpausing contract...");
        stableCoin.unpause();
        printSuccess("Contract unpaused", "Normal operations resumed");

        // Test transfer after unpausing
        testTransferAfterUnpause();

        // Test mint after unpausing
        testMintAfterUnpause();

        printAllBalances("AFTER UNPAUSE");
    }

    /**
     * @dev Tests that transfers fail when contract is paused
     */
    function testTransferWhilePaused() internal {
        printInfo("Test", "Attempting transfer while paused (should fail)");

        try
            stableCoin.transfer(
                secondWallet,
                SMALL_TRANSFER_AMOUNT * decimalFactor
            )
        {
            printError("Pause test FAILED", "Transfer succeeded when paused!");
        } catch Error(string memory reason) {
            printSuccess("Pause protection working", reason);
        } catch (bytes memory revertData) {
            bytes4 errorSelector;
            assembly {
                errorSelector := mload(add(revertData, 0x20))
            }
            if (errorSelector == bytes4(keccak256("EnforcedPause()"))) {
                printSuccess(
                    "Pause protection working",
                    "EnforcedPause() error"
                );
            } else {
                printSuccess(
                    "Pause protection working",
                    "Contract reverted as expected"
                );
            }
        }
    }

    /**
     * @dev Tests that minting fails when contract is paused
     */
    function testMintWhilePaused() internal {
        printInfo("Test", "Attempting mint while paused (should fail)");

        try
            stableCoin.mint(
                ownerWallet,
                STANDARD_TRANSFER_AMOUNT * decimalFactor
            )
        {
            printError("Pause test FAILED", "Mint succeeded when paused!");
        } catch {
            printSuccess(
                "Pause protection working",
                "Mint blocked while paused"
            );
        }
    }

    /**
     * @dev Tests that transfers work after unpausing
     */
    function testTransferAfterUnpause() internal {
        uint256 ownerBalance = stableCoin.balanceOf(ownerWallet);
        uint256 testAmount = ownerBalance >=
            SMALL_TRANSFER_AMOUNT * decimalFactor
            ? SMALL_TRANSFER_AMOUNT * decimalFactor
            : ownerBalance;

        if (testAmount > 0) {
            printInfo(
                "Test",
                string.concat(
                    "Transfer ",
                    formatTokens(testAmount),
                    " after unpause"
                )
            );
            bool success = performTransfer(
                ownerWallet,
                secondWallet,
                testAmount
            );

            if (success) {
                printSuccess("Unpause verified", "Transfer successful");
            } else {
                printWarning(
                    "Unpause test inconclusive",
                    "Transfer failed for unknown reason"
                );
            }
        }
    }

    /**
     * @dev Tests that minting works after unpausing
     */
    function testMintAfterUnpause() internal {
        uint256 availableToMint = stableCoin.availableToMint();
        uint256 mintTestAmount = availableToMint >=
            TEST_MINT_AFTER_UNPAUSE * decimalFactor
            ? TEST_MINT_AFTER_UNPAUSE * decimalFactor
            : availableToMint;

        if (mintTestAmount > 0) {
            printInfo(
                "Test",
                string.concat(
                    "Mint ",
                    formatTokens(mintTestAmount),
                    " after unpause"
                )
            );
            bool success = performMint(ownerWallet, mintTestAmount);

            if (success) {
                printSuccess("Unpause verified", "Mint successful");
            } else {
                printWarning(
                    "Unpause test inconclusive",
                    "Mint failed for unknown reason"
                );
            }
        } else {
            printInfo("Skipping mint test", "No reserves available");
        }
    }

    // ============ HELPER FUNCTIONS FOR BETTER LOGGING ============

    /**
     * @dev Print a formatted header
     */
    function printHeader(string memory title) internal pure {
        console.log("");
        console.log(
            "================================================================================"
        );
        console.log(string.concat("  ", title));
        console.log(
            "================================================================================"
        );
        console.log("");
    }

    /**
     * @dev Print a formatted footer
     */
    function printFooter(string memory title) internal pure {
        console.log("");
        console.log(
            "================================================================================"
        );
        console.log(string.concat("  [COMPLETED] ", title));
        console.log(
            "================================================================================"
        );
        console.log("");
    }

    /**
     * @dev Print wallet information
     */
    function printWalletInfo() internal view {
        console.log("[WALLETS] Addresses:");
        console.log(string.concat("   Owner:  ", vm.toString(ownerWallet)));
        console.log(string.concat("   Second: ", vm.toString(secondWallet)));
        console.log(string.concat("   Third:  ", vm.toString(THIRD_WALLET)));
        console.log("");
    }

    /**
     * @dev Print a test step header
     */
    function printStep(string memory stepName) internal {
        stepCounter++;
        console.log("");
        console.log(
            string.concat("[STEP ", vm.toString(stepCounter), "] ", stepName)
        );
        console.log(
            "-------------------------------------------------------------------------"
        );
    }

    /**
     * @dev Print success message
     */
    function printSuccess(
        string memory label,
        string memory value
    ) internal pure {
        console.log(string.concat("[SUCCESS] ", label, ": ", value));
    }

    /**
     * @dev Print error message
     */
    function printError(
        string memory label,
        string memory value
    ) internal pure {
        console.log(string.concat("[ERROR] ", label, ": ", value));
    }

    /**
     * @dev Print warning message
     */
    function printWarning(
        string memory label,
        string memory value
    ) internal pure {
        console.log(string.concat("[WARNING] ", label, ": ", value));
    }

    /**
     * @dev Print info message
     */
    function printInfo(string memory label, string memory value) internal pure {
        console.log(string.concat("[INFO] ", label, ": ", value));
    }

    /**
     * @dev Print metric
     */
    function printMetric(
        string memory label,
        string memory value
    ) internal pure {
        console.log(string.concat("[METRIC] ", label, ": ", value));
    }

    /**
     * @dev Print balance change
     */
    function printBalanceChange(
        string memory wallet,
        uint256 before,
        uint256 post
    ) internal view {
        string memory change;
        if (post > before) {
            change = string.concat("(+", formatTokens(post - before), ")");
        } else if (before > post) {
            change = string.concat("(-", formatTokens(before - post), ")");
        } else {
            change = "(no change)";
        }
        console.log(
            string.concat(
                "[BALANCE] ",
                wallet,
                ": ",
                formatTokens(before),
                " -> ",
                formatTokens(post),
                " ",
                change
            )
        );
    }

    /**
     * @dev Print all wallet balances
     */
    function printAllBalances(string memory context) internal view {
        console.log(string.concat("[BALANCES] ", context, ":"));
        console.log(
            string.concat(
                "   Owner:  ",
                formatTokens(stableCoin.balanceOf(ownerWallet))
            )
        );
        console.log(
            string.concat(
                "   Second: ",
                formatTokens(stableCoin.balanceOf(secondWallet))
            )
        );
        console.log(
            string.concat(
                "   Third:  ",
                formatTokens(stableCoin.balanceOf(THIRD_WALLET))
            )
        );
    }

    /**
     * @dev Get wallet name for displaying in logs
     */
    function getWalletName(
        address wallet
    ) internal view returns (string memory) {
        if (wallet == ownerWallet) return "Owner Balance";
        if (wallet == secondWallet) return "Second Wallet";
        if (wallet == THIRD_WALLET) return "Third Wallet";
        return "Unknown Wallet";
    }

    /**
     * @dev Print reserve disclosure
     */
    function printReserveDisclosure(string memory context) internal view {
        (
            uint256 reserveAmount,
            uint256 circulatingSupply,
            uint256 reserveSurplus
        ) = stableCoin.reserveDisclosure();

        console.log(string.concat("[RESERVES] ", context, " State:"));
        console.log(
            string.concat(
                "   Total Reserves:     ",
                formatTokens(reserveAmount)
            )
        );
        console.log(
            string.concat(
                "   Circulating Supply: ",
                formatTokens(circulatingSupply)
            )
        );
        console.log(
            string.concat(
                "   Reserve Surplus:    ",
                formatTokens(reserveSurplus)
            )
        );
    }

    /**
     * @dev Format token amounts with commas and decimals
     */
    function formatTokens(
        uint256 amount
    ) internal view returns (string memory) {
        if (amount == 0) return "0";

        uint256 wholePart = amount / decimalFactor;

        // Just return the whole part without any decimal formatting
        return vm.toString(wholePart);
    }

    /**
     * @dev Print a separator line
     */
    function printSeparator() internal pure {
        console.log("");
    }
}
