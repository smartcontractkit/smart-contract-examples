// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IBurnMintERC20} from "@chainlink/contracts/src/v0.8/shared/token/ERC20/IBurnMintERC20.sol";
import {OwnerIsCreator} from "@chainlink/contracts/src/v0.8/shared/access/OwnerIsCreator.sol";
import {ERC165} from "@chainlink/contracts/src/v0.8/vendor/openzeppelin-solidity/v5.0.2/contracts/utils/introspection/ERC165.sol";
import {IERC165} from "@chainlink/contracts/src/v0.8/vendor/openzeppelin-solidity/v5.0.2/contracts/utils/introspection/IERC165.sol";

/**
 * @title IFaucet
 * @dev Interface for the Faucet contract, for ERC165 compatibility.
 */
interface IFaucet is IERC165 {
    // --- Events (not part of ERC165 interface ID but good for documentation) ---
    event DripAmountUpdated(uint256 newAmount);
    event TokensDispensed(address indexed recipient, uint256 amount);
    event TokenContractUpdated(address indexed newTokenAddress);

    // --- View Functions ---
    function token() external view returns (IBurnMintERC20);
    function dripAmount() external view returns (uint256);
    function getTokenAddress() external view returns (address);

    // --- State-Changing Functions ---
    function setDripAmount(uint256 newAmount) external;
    function setTokenContract(address newTokenAddress, uint256 newInitialDripAmount) external;
    function drip() external;
}

/**
 * @title Faucet
 * @dev A contract that dispenses a configurable amount of a specific ERC20 token.
 * The Faucet contract must be granted the minter role on the target ERC20 token contract.
 * The owner can change the token contract and drip amount.
 * Implements IFaucet and supports ERC165 for interface detection.
 */
contract Faucet is OwnerIsCreator, ERC165, IFaucet {
    IBurnMintERC20 public override token;
    uint256 public override dripAmount;

    // --- Errors ---
    error InvalidDripAmount(uint256 amount);
    error TokenAddressCannotBeZero();
    error TokenMintFailed();

    // Events are defined in IFaucet and emitted here.

    /**
     * @dev Sets the initial target token address and the initial drip amount.
     * @param initialTokenAddress The address of the IBurnMintERC20 compatible token.
     * @param initialDripAmount The initial amount of tokens to dispense per request.
     */
    constructor(address initialTokenAddress, uint256 initialDripAmount) {
        if (initialTokenAddress == address(0)) revert TokenAddressCannotBeZero();
        token = IBurnMintERC20(initialTokenAddress);
        _setDripAmount(initialDripAmount);
    }

    /**
     * @notice Allows the owner to set the amount of tokens dispensed by the faucet for the current token.
     * @param newAmount The new amount of tokens to dispense. Must be greater than 0.
     */
    function setDripAmount(uint256 newAmount) external override onlyOwner {
        _setDripAmount(newAmount);
    }

    /**
     * @notice Allows the owner to change the token contract this faucet dispenses
     *         and set its initial drip amount.
     * @dev The Faucet contract must be granted the minter role on the newTokenAddress.
     * @param newTokenAddress The address of the new IBurnMintERC20 compatible token.
     * @param newInitialDripAmount The initial amount of tokens to dispense for the new token.
     */
    function setTokenContract(address newTokenAddress, uint256 newInitialDripAmount) external override onlyOwner {
        if (newTokenAddress == address(0)) revert TokenAddressCannotBeZero();
        
        token = IBurnMintERC20(newTokenAddress);
        emit TokenContractUpdated(newTokenAddress);

        _setDripAmount(newInitialDripAmount);
    }

    /**
     * @dev Internal function to set the drip amount and emit an event.
     * @param newAmount The new amount of tokens to dispense.
     */
    function _setDripAmount(uint256 newAmount) internal {
        if (newAmount == 0) revert InvalidDripAmount(newAmount);
        dripAmount = newAmount;
        emit DripAmountUpdated(newAmount);
    }

    /**
     * @notice Allows any user to request a drip of tokens from the faucet.
     * @dev The Faucet contract's address must have the minter role on the currently configured token contract.
     * The dripAmount must be configured (greater than 0) by the owner.
     */
    function drip() external override {
        if (dripAmount == 0) revert InvalidDripAmount(dripAmount);
        if (address(token) == address(0)) revert TokenAddressCannotBeZero();

        try token.mint(msg.sender, dripAmount) {
            emit TokensDispensed(msg.sender, dripAmount);
        } catch {
            revert TokenMintFailed();
        }
    }

    /**
     * @notice Returns the address of the token this faucet currently dispenses.
     * @return Address of the token.
     */
    function getTokenAddress() external view override returns (address) {
        return address(token);
    }

    /**
     * @inheritdoc ERC165
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC165, IERC165) returns (bool) {
        // Check IFaucet first, then ERC165 (which includes IERC165).
        return interfaceId == type(IFaucet).interfaceId || super.supportsInterface(interfaceId);
    }
}

