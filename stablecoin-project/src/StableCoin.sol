// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/extensions/AccessControlEnumerable.sol";

// Interface for the MockAggregato
interface AggregatorV3Interface {
    function decimals() external view returns (uint8);

    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        );
}

contract StableCoin is
    ERC20,
    ERC20Burnable,
    ERC20Pausable,
    ERC20Permit,
    AccessControlEnumerable
{
    address public immutable aggregatorAddress;

    constructor(
        uint256 initialSupply,
        address _aggregatorAddress
    ) ERC20("StableCoin", "STBL") ERC20Permit("StableCoin") {
        require(
            _aggregatorAddress != address(0),
            "Aggregator cannot be zero address"
        );

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        aggregatorAddress = _aggregatorAddress;

        if (initialSupply > 0) {
            uint256 reserveValue = getReserveValue();
            uint256 initialTokens = initialSupply * 10 ** decimals();

            require(
                initialTokens <= reserveValue,
                "Initial supply exceeds reserves"
            );

            _mint(msg.sender, initialTokens);
        }
    }

    function getReserveValue() public view returns (uint256) {
        AggregatorV3Interface aggregator = AggregatorV3Interface(
            aggregatorAddress
        );

        // Get latest round data from the aggregator with proper validation
        (, int256 answer, , uint256 updatedAt, ) = aggregator.latestRoundData();

        require(answer > 0, "Invalid reserve value from aggregator");
        require(updatedAt > 0, "Round not complete");
        require(block.timestamp - updatedAt <= 3600, "Price data is stale"); // 1 hour staleness check

        // Normalize the answer to match the token's decimals (18)
        return uint256(answer) * 10 ** (18 - aggregator.decimals());
    }

    function mint(
        address to,
        uint256 amount
    ) public onlyRole(DEFAULT_ADMIN_ROLE) returns (bool success) {
        uint256 mintableAmount = availableToMint();

        require(amount <= mintableAmount, "Minting would exceed reserves");

        _mint(to, amount);
        return true;
    }

    function availableToMint() public view returns (uint256) {
        uint256 reserveValue = getReserveValue();
        return reserveValue - totalSupply();
    }

    function reserveDisclosure()
        public
        view
        returns (
            uint256 reserveAmount,
            uint256 circulatingSupply,
            uint256 reserveSurplus
        )
    {
        reserveAmount = getReserveValue();
        circulatingSupply = totalSupply();

        if (reserveAmount < circulatingSupply) {
            reserveSurplus = 0; // No surplus if reserves are less than circulating supply
        } else {
            reserveSurplus = reserveAmount - circulatingSupply;
        }
    }

    function _update(
        address from,
        address to,
        uint256 value
    ) internal override(ERC20, ERC20Pausable) {
        super._update(from, to, value);
    }

    function pause() public onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}
