// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

interface IStaking {
    /**
     * @notice How much reward a token gets based on how long it's been in and during which "snapshots"
     */
    function rewardPerToken() external view returns (uint256);

    /**
     * @notice How much reward a user has earned
     */
    function earned(address account) external view returns (uint256);

    /**
     * @notice Deposit tokens into Staking contract
     * @param amount | How much to stake
     */
    function stake(uint256 amount) external;

    /**
     * @notice Withdraw tokens from Staking contract
     * @param amount | How much to withdraw
     */
    function withdraw(uint256 amount) external;

    /**
     * @notice User claims their tokens
     */
    function claimReward() external;

    function getStaked(address account) external view returns (uint256);
}
