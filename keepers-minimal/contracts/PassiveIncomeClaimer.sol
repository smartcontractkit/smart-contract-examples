// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@chainlink/contracts/src/v0.8/KeeperCompatible.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "./interfaces/IStaking.sol";

contract PassiveIncomeClaimer is KeeperCompatibleInterface, Ownable {
    address public s_beneficary;
    address public s_stakerAddress;
    IERC20 public s_rewardsToken;
    uint256 public s_rewardTarget;

    event Staked(uint256 amount);
    event Withdrawn(uint256 amount);
    event TargetRewardAdjusted(uint256 reward);
    event PassiveIncomeClaimed(uint256 amount);

    constructor(
        address _beneficary,
        address _stakerAddress,
        address _rewardsTokenAddress,
        uint256 _rewardTarget
    ) {
        s_beneficary = _beneficary;
        s_stakerAddress = _stakerAddress;
        s_rewardsToken = IERC20(_rewardsTokenAddress);
        s_rewardTarget = _rewardTarget;
    }

    function stake(uint256 amount) external onlyOwner {
        s_rewardsToken.transferFrom(msg.sender, address(this), amount);

        IStaking(s_stakerAddress).stake(amount);

        emit Staked(amount);
    }

    function adjustRewardTarget(uint256 rewardTarget) external onlyOwner {
        s_rewardTarget = rewardTarget;

        emit TargetRewardAdjusted(rewardTarget);
    }

    function withdraw(uint256 amount) external onlyOwner {
        IStaking(s_stakerAddress).withdraw(amount);

        s_rewardsToken.transfer(msg.sender, amount);

        emit Withdrawn(amount);
    }

    function checkUpkeep(
        bytes calldata /*checkData*/
    )
        external
        view
        override
        returns (
            bool upkeepNeeded,
            bytes memory /*performData*/
        )
    {
        upkeepNeeded =
            IStaking(s_stakerAddress).earned(address(this)) >= s_rewardTarget;
    }

    function performUpkeep(
        bytes calldata /*performData*/
    ) external override {
        uint256 reward = IStaking(s_stakerAddress).earned(address(this));
        require(
            reward >= s_rewardTarget
        );

        IStaking(s_stakerAddress).claimReward();

        s_rewardsToken.transfer(
            s_beneficary,
            s_rewardsToken.balanceOf(address(this))
        );

        emit PassiveIncomeClaimed(reward);
    }
}
