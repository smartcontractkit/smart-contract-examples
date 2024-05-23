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

import {ILockReleaseTokenPool} from "../interfaces/ILockReleaseTokenPool.sol";
import {Pool} from "./Pool.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract LockReleaseTokenPool is ILockReleaseTokenPool, Pool {
    using SafeERC20 for IERC20;

    address private s_liquidityProvider;
    uint256 public s_cachedLiquidity;

    modifier onlyLiquidityProvider() {
        if (msg.sender != s_liquidityProvider) {
            revert IsNotLiquidityProvider(msg.sender, s_liquidityProvider);
        }
        _;
    }

    modifier mustHaveEnoughLiquidity(uint256 amount) {
        if (getAvailableLiquidity() < amount) {
            revert NoMoreLiquidity(amount, getAvailableLiquidity());
        }
        _;
    }

    constructor(
        IERC20 token,
        address bridge,
        address liquidityProvider
    ) Pool(token, TokenPoolType.LockRelease, bridge) {
        if (liquidityProvider != address(0)) {
            s_liquidityProvider = liquidityProvider;
            emit LiquidityProviderSet(
                address(0),
                liquidityProvider,
                msg.sender
            );
        }
    }

    /**
     * @inheritdoc ILockReleaseTokenPool
     */
    function setLiquidityProvider(
        address liquidityProvider
    ) external onlyOwner {
        if (liquidityProvider == address(0)) {
            revert LiquidityProviderAddressZero();
        }
        address oldLiquidityProvider = s_liquidityProvider;
        if (oldLiquidityProvider != liquidityProvider) {
            s_liquidityProvider = liquidityProvider;
            emit LiquidityProviderSet(
                oldLiquidityProvider,
                liquidityProvider,
                msg.sender
            );
        }
    }

    /**
     * @inheritdoc ILockReleaseTokenPool
     */
    function removeLiquidityProvider() external onlyOwner {
        address oldLiquidityProvider = s_liquidityProvider;
        if (oldLiquidityProvider != address(0)) {
            delete s_liquidityProvider;
            emit LiquidityProviderSet(
                oldLiquidityProvider,
                address(0),
                msg.sender
            );
        }
    }

    function _lockOrBurn(uint256 amount) internal override {
        uint256 newLiquidity = i_token.balanceOf(address(this)) -
            s_cachedLiquidity;
        if (amount > newLiquidity) {
            revert NoAmountToLock(amount, msg.sender);
        }
        _syncLiquidity();
        emit Locked(msg.sender, amount);
    }

    function _releaseOrMint(
        uint256 amount,
        address receiver
    ) internal override mustHaveEnoughLiquidity(amount) {
        i_token.safeTransfer(receiver, amount);
        _syncLiquidity();
        emit Released(msg.sender, receiver, amount);
    }

    /**
     * @inheritdoc ILockReleaseTokenPool
     */
    function provideLiquidity(uint256 amount) external onlyLiquidityProvider {
        i_token.safeTransferFrom(msg.sender, address(this), amount);
        _syncLiquidity();
        emit LiquidityProvided(msg.sender, amount);
    }

    /**
     * @inheritdoc ILockReleaseTokenPool
     */
    function withdrawLiquidity(
        uint256 amount
    ) external onlyLiquidityProvider mustHaveEnoughLiquidity(amount) {
        i_token.safeTransfer(msg.sender, amount);
        _syncLiquidity();
        emit LiquidityWithdrawn(msg.sender, amount);
    }

    /**
     * @inheritdoc ILockReleaseTokenPool
     */
    function getLiquidityProvider()
        external
        view
        returns (address liquidityProvider)
    {
        liquidityProvider = s_liquidityProvider;
    }

    /**
     * @inheritdoc ILockReleaseTokenPool
     */
    function getAvailableLiquidity() public view returns (uint256 liquidity) {
        return i_token.balanceOf(address(this));
    }

    function _syncLiquidity() private {
        s_cachedLiquidity = i_token.balanceOf(address(this));
    }
}
