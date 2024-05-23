// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @notice This contract is provided "AS IS" without warranties of any kind, as an example and has not been audited.
 * Users are advised to thoroughly test and audit their own implementations
 * before deploying to mainnet or any production environment.
 *
 * @dev This code is intended for educational and illustrative purposes only.
 * Use it at your own risk. The authors are not responsible for any loss of
 * funds or other damages caused by the use of this code.
 */

interface ILockReleaseTokenPool {
    event LiquidityProvided(address indexed provider, uint256 amount);
    event LiquidityWithdrawn(address indexed provider, uint256 amount);
    event LiquidityProviderSet(
        address indexed oldLiquidityProvider,
        address indexed newLiquidityProvider,
        address indexed owner
    );

    error NoAmountToLock(uint256 amount, address bridge);
    error IsNotLiquidityProvider(address account, address liquidityProvider);
    error LiquidityProviderAddressZero();

    /**
     * @notice Returns the liquidity provider.
     * @return liquidityProvider The liquidity provider address
     */
    function getLiquidityProvider()
        external
        view
        returns (address liquidityProvider);

    /**
     * @notice Returns the available liquidity in the pool.
     * @return liquidity The available liquidity in the pool
     */
    function getAvailableLiquidity() external view returns (uint256 liquidity);

    /**
     * @notice Set `account` as a liquidity provider. Only callable by the owner.
     * @dev Emits the `LiquidityProviderSet` event upon success.
     * @param account The account to add as liquidity provider.
     */

    function setLiquidityProvider(address account) external;

    /**
     * @notice Removes current liquidity provider. Only callable by the owner.
     * @dev Emits the `LiquidityProviderSet` event with liquidityProvider as 0 address upon success.
     */
    function removeLiquidityProvider() external;

    /**

    /**
     * @notice Provides liquidity to the pool. Can only be called by a liquidity provider
     * @dev Should transfer the liquidity from the sender to the pool. Emit LiquidityProvided event
     * @param amount The amount of liquidity to provide
     */
    function provideLiquidity(uint256 amount) external;

    /**
     * @notice Withdraws liquidity from the pool. Can only be called by a liquidity provider
     * @dev Should transfer the liquidity from the pool to the sender. Emit LiquidityWithdrawn event
     * @param amount The amount of liquidity to withdraw
     */
    function withdrawLiquidity(uint256 amount) external;
}
