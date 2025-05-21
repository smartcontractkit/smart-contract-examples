// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

interface ILending {
    function deposit(address token, uint256 amount) external;

    function withdraw(address token, uint256 amount) external;

    function borrow(address token, uint256 amount) external;

    function liquidate(
        address account,
        address repayToken,
        address rewardToken
    ) external;

    function repay(address token, uint256 amount) external;

    function getAccountInformation(address user)
        external
        view
        returns (uint256 borrowedValueInETH, uint256 collateralValueInETH);

    function getAccountCollateralValue(address user)
        external
        view
        returns (uint256);

    function getAccountBorrowedValue(address user)
        external
        view
        returns (uint256);

    function getEthValue(address token, uint256 amount)
        external
        view
        returns (uint256);

    function getTokenValueFromEth(address token, uint256 amount)
        external
        view
        returns (uint256);

    function healthFactor(address account) external view returns (uint256);
}
