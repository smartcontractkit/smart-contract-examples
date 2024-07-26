// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {LinkTokenInterface} from "@chainlink/contracts/src/v0.8/shared/interfaces/LinkTokenInterface.sol";
import {AutomationCompatible} from "@chainlink/contracts/src/v0.8/AutomationCompatible.sol";
/**
 * THIS IS AN EXAMPLE CONTRACT THAT USES HARDCODED VALUES FOR CLARITY.
 * THIS IS AN EXAMPLE CONTRACT THAT USES UN-AUDITED CODE.
 * DO NOT USE THIS CODE IN PRODUCTION.
 */

error LessThanMinimumAmount(uint256 required);
error UpkeepIsAlreadyInPausedState();
error UpkeepIsAlreadyInUnpausedOrActiveState();
error UpkeepIsNotRegisteredYet();
error UpkeepIsAlreadyCancelled();
error UpkeepNeedsToBeCancelledFirst();

struct RegistrationParams {
    string name;
    bytes encryptedEmail;
    address upkeepContract;
    uint32 gasLimit;
    address adminAddress;
    uint8 triggerType;
    bytes checkData;
    bytes triggerConfig;
    bytes offchainConfig;
    uint96 amount;
}

/**
 * string name = "test upkeep";
 * bytes encryptedEmail = 0x;
 * address upkeepContract = 0x...;
 * uint32 gasLimit = 500000;
 * address adminAddress = 0x....;
 * uint8 triggerType = 0;
 * bytes checkData = 0x;
 * bytes triggerConfig = 0x;
 * bytes offchainConfig = 0x;
 * uint96 amount = 1000000000000000000;
 */
interface AutomationRegistrarInterface {
    function registerUpkeep(RegistrationParams calldata requestParams) external returns (uint256);
}

interface KeeperRegistryInterface {
    function addFunds(uint256 id, uint96 amount) external;

    function pauseUpkeep(uint256 id) external;

    function unpauseUpkeep(uint256 id) external;

    function cancelUpkeep(uint256 id) external;

    function setUpkeepGasLimit(uint256 id, uint32 gasLimit) external;

    function withdrawFunds(uint256 id, address to) external;
}

contract UpkeepIDConditionalExample is AutomationCompatible {
    // Hardcoded for Eth-Sepolia network
    LinkTokenInterface public constant LINK = LinkTokenInterface(0x779877A7B0D9E8603169DdbD7836e478b4624789);
    AutomationRegistrarInterface public constant REGISTRAR =
        AutomationRegistrarInterface(0xb0E49c5D0d05cbc241d68c05BC5BA1d1B7B72976);
    KeeperRegistryInterface public constant KEEPER_REGISTRY =
        KeeperRegistryInterface(0x86EFBD0b6736Bed994962f9797049422A3A8E8Ad);

    uint256 public s_numberOfPerformUpkeepCallsForLatestUpkeep;
    uint256 constant endDate = 1715781439;
    uint256 public s_latestUpkeepId;
    bool public s_isLatestUpkeepPaused;
    bool public s_isLatestUpkeepCancelled;

    // Note: The upkeep that will be registered here won't be visible in the Automation UI (https://automation.chain.link/) because the adminAddress is being set to the address of this contract (not to any wallet).
    function registerUpkeep(string memory upkeepName, uint96 initialAmount, uint32 gasLimit) external {
        s_numberOfPerformUpkeepCallsForLatestUpkeep = 0;
        s_isLatestUpkeepPaused = false;
        s_isLatestUpkeepCancelled = false;

        bytes memory encryptedEmail = "";
        address upkeepContract = address(this);
        address adminAddress = address(this); // Note: Setting adminAddress as address of this contract, so as to have the authorization to call the management functions like pause, unpause, cancel, etc. as they can be called only by the admin.
        uint8 triggerType = 0;
        bytes memory checkData = "";
        bytes memory triggerConfig = "";
        bytes memory offchainConfig = "";

        RegistrationParams memory params = RegistrationParams(
            upkeepName,
            encryptedEmail,
            upkeepContract,
            gasLimit,
            adminAddress,
            triggerType,
            checkData,
            triggerConfig,
            offchainConfig,
            initialAmount
        );

        // LINK must be approved for transfer - this can be done every time or once
        // with an infinite approval
        if (params.amount < 1e18) {
            revert LessThanMinimumAmount(1e18);
        }
        LINK.approve(address(REGISTRAR), params.amount);
        uint256 upkeepID = REGISTRAR.registerUpkeep(params);
        if (upkeepID != 0) {
            // DEV - Use the upkeepID however you see fit
            s_latestUpkeepId = upkeepID;
        } else {
            revert("auto-approve disabled");
        }
    }

    function addFundsToUpkeep(uint96 amount) external {
        if (s_latestUpkeepId == 0) revert UpkeepIsNotRegisteredYet();
        if (s_isLatestUpkeepCancelled) revert UpkeepIsAlreadyCancelled();
        LINK.approve(address(KEEPER_REGISTRY), amount);
        KEEPER_REGISTRY.addFunds(s_latestUpkeepId, amount);
    }

    function withdrawFundsFromUpkeep(address to) external {
        if (s_latestUpkeepId == 0) revert UpkeepIsNotRegisteredYet();
        if (!s_isLatestUpkeepCancelled) revert UpkeepNeedsToBeCancelledFirst();

        KEEPER_REGISTRY.withdrawFunds(s_latestUpkeepId, to);
    }

    function pauseUpkeep() external {
        if (s_latestUpkeepId == 0) revert UpkeepIsNotRegisteredYet();
        if (s_isLatestUpkeepCancelled) revert UpkeepIsAlreadyCancelled();
        if (s_isLatestUpkeepPaused) revert UpkeepIsAlreadyInPausedState();
        KEEPER_REGISTRY.pauseUpkeep(s_latestUpkeepId);
        s_isLatestUpkeepPaused = true;
    }

    function unpauseUpkeep() external {
        if (s_latestUpkeepId == 0) revert UpkeepIsNotRegisteredYet();
        if (s_isLatestUpkeepCancelled) revert UpkeepIsAlreadyCancelled();
        if (!s_isLatestUpkeepPaused) {
            revert UpkeepIsAlreadyInUnpausedOrActiveState();
        }
        KEEPER_REGISTRY.unpauseUpkeep(s_latestUpkeepId);
        s_isLatestUpkeepPaused = false;
    }

    function editUpkeepGasLimit(uint32 newGasLimit) external {
        if (s_latestUpkeepId == 0) revert UpkeepIsNotRegisteredYet();
        if (s_isLatestUpkeepCancelled) revert UpkeepIsAlreadyCancelled();
        KEEPER_REGISTRY.setUpkeepGasLimit(s_latestUpkeepId, newGasLimit);
    }

    function cancelUpkeep() external {
        if (s_latestUpkeepId == 0) revert UpkeepIsNotRegisteredYet();
        if (s_isLatestUpkeepCancelled) revert UpkeepIsAlreadyCancelled();
        KEEPER_REGISTRY.cancelUpkeep(s_latestUpkeepId);
        s_isLatestUpkeepPaused = false;
        s_isLatestUpkeepCancelled = true;
    }

    function checkUpkeep(bytes memory /*checkdata*/ )
        public
        view
        override
        returns (bool upkeepNeeded, bytes memory /* performData*/ )
    {
        upkeepNeeded = block.timestamp > endDate && s_numberOfPerformUpkeepCallsForLatestUpkeep == 0;
        return (upkeepNeeded, "");
    }

    function performUpkeep(bytes calldata /* performData */ ) external override {
        (bool upkeepNeeded,) = checkUpkeep("");
        if (upkeepNeeded) {
            //    requestRandomWords();
            s_numberOfPerformUpkeepCallsForLatestUpkeep += 1;
        }
    }
}
