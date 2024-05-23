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

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IPool {
    event BridgeSet(
        address indexed oldBridge,
        address indexed newBridge,
        address indexed owner
    );
    event Locked(address indexed sender, uint256 amount);
    event Burned(address indexed sender, uint256 amount);
    event Released(
        address indexed sender,
        address indexed receiver,
        uint256 amount
    );
    event Minted(
        address indexed sender,
        address indexed receiver,
        uint256 amount
    );

    error NoMoreLiquidity(uint256 amountoRelease, uint256 liquidity);

    error IsNotBridge(address caller, address bridge);

    error BridgeAddressZero();

    enum TokenPoolType {
        LockRelease,
        BurnMint
    }

    /**
     * @notice Locks or burns the amount of tokens.
     * @notice The caller must have the role of locker for LockRelease token pool or burner for BurnMint token pool.
     * @param amount The amount of tokens to lock or burn
     */
    function lockOrBurn(uint256 amount) external;

    /**
     * @notice Releases or mints the amount of tokens.
     * @notice The caller must have the role of unlocker for LockRelease token pool or minter for BurnMint token pool.
     * @dev For LockRelease token pool, if the pool is out of liquidity, it reverts.
     * @param amount The amount of tokens to release or mint
     * @param receiver The address to receive the released or minted tokens
     */
    function releaseOrMint(uint256 amount, address receiver) external;

    /**
     * @notice Returns the token of the pool.
     * @return token The token of the pool
     */
    function getToken() external view returns (IERC20 token);

    /**
     * @notice Returns the type of the token pool.
     * @return tokenPoolType The type of the token pool
     */
    function getTokenPoolType()
        external
        view
        returns (TokenPoolType tokenPoolType);

    /**
     * @notice Sets `account` as the bridge. Only callable by the owner.
     * @dev Emits the `BridgeSet` event upon success.
     * @param account The account to set as the bridge.
     */
    function setBridge(address account) external;

    /**
     * @notice Removes the bridge. Only callable by the owner.
     * @dev Emits the `BridgeSet` event with bridge as 0 address upon success.
     */
    function removeBridge() external;

    /**
     * @notice Returns the bridge address.
     * @return bridge The bridge address
     */
    function getBridge() external view returns (address bridge);
}
