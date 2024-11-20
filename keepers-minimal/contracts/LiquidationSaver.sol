// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@chainlink/contracts/src/v0.8/KeeperCompatible.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "./interfaces/ILending.sol";

contract LiquidationSaver is KeeperCompatibleInterface, Ownable {
    address public s_beneficary;
    address public s_lendingAddress;
    address public s_borrowedTokenAddress;
    address public s_collateralTokenAddress;
    uint256 public immutable i_minHealthFactor;

    event EthDeposited(uint256 indexed amount);
    event TokenDeposited(address indexed tokenAddress, uint256 indexed amount);
    event EthWithdrawn(uint256 indexed amount);
    event TokenWithdrawn(address indexed tokenAddress, uint256 indexed amount);

    constructor(
        address _beneficary,
        address _lendingAddress,
        uint256 _minHealthFactor
    ) {
        s_beneficary = _beneficary;
        s_lendingAddress = _lendingAddress;
        i_minHealthFactor = _minHealthFactor;
    }

    /************************************/
    /* Saver Assets Managment Functions */
    /************************************/

    receive() external payable {
        emit EthDeposited(msg.value);
    }

    function depositTokenToSaver(address _tokenAddress, uint256 _amount)
        external
        onlyOwner
    {
        IERC20(_tokenAddress).transferFrom(msg.sender, address(this), _amount);

        emit TokenDeposited(_tokenAddress, _amount);
    }

    function withdrawEthFromSaver(uint256 _amount) external onlyOwner {
        require(_amount >= address(this).balance);

        (bool success, ) = s_beneficary.call{value: _amount}("");
        require(success);

        emit EthWithdrawn(_amount);
    }

    function withdrawTokenFromSaver(address _tokenAddress, uint256 _amount)
        external
        onlyOwner
    {
        require(_amount >= IERC20(_tokenAddress).balanceOf(address(this)));

        IERC20(_tokenAddress).transfer(s_beneficary, _amount);

        emit TokenWithdrawn(_tokenAddress, _amount);
    }

    /******************************************/
    /* Chainlink Keepers Automation Functions */
    /******************************************/

    function checkUpkeep(bytes calldata checkData)
        external
        view
        override
        returns (bool upkeepNeeded, bytes memory performData)
    {
        upkeepNeeded =
            ILending(s_lendingAddress).healthFactor(address(this)) <
            i_minHealthFactor;
    }

    function performUpkeep(bytes calldata performData) external override {
        require(
            ILending(s_lendingAddress).healthFactor(address(this)) <
                i_minHealthFactor,
            "Account can't be liquidated!"
        );

        /**
         * To avoid liquidation you can raise your health factor by
         *  1. repaying part of your loan or
         *  2. depositing more collateral assets.
         */

        (uint256 borrowedValueInETH, uint256 collateralValueInETH) = ILending(
            s_lendingAddress
        ).getAccountInformation(address(this));

        
        uint256 borrowedTokenBalanceInSaver = IERC20(s_borrowedTokenAddress)
            .balanceOf(address(this));
        uint256 collateralTokenBalanceInSaver = IERC20(s_collateralTokenAddress)
            .balanceOf(address(this));    
        
        // Check do you have funds to repay
        if (borrowedTokenBalanceInSaver > 0) {
            _tryToRepay(borrowedValueInETH, borrowedTokenBalanceInSaver);
        } else {
            // Check do you have funds to deposit more collateral
            if (collateralTokenBalanceInSaver > 0) {
                _tryToDepositMore(
                    collateralValueInETH,
                    collateralTokenBalanceInSaver
                );
            }
        }


    }

    function _tryToRepay(
        uint256 _borrowedValueInETH,
        uint256 _borrowedTokenBalanceInSaver
    ) private {
        uint256 amountToRepay = ILending(s_lendingAddress).getTokenValueFromEth(
            s_borrowedTokenAddress,
            _borrowedValueInETH
        );

        if (_borrowedTokenBalanceInSaver >= amountToRepay) {
            // repay full debt
            ILending(s_lendingAddress).repay(
                s_borrowedTokenAddress,
                amountToRepay
            );
        } else {
            // try to repay part of debt
            ILending(s_lendingAddress).repay(
                s_borrowedTokenAddress,
                _borrowedTokenBalanceInSaver
            );
        }
    }

    function _tryToDepositMore(
        uint256 _collateralValueInETH,
        uint256 _collateralTokenBalanceInSaver
    ) private {
        uint256 collateralAmount = ILending(s_lendingAddress)
            .getTokenValueFromEth(
                s_collateralTokenAddress,
                _collateralValueInETH
            );

        // try to double collateral value
        if (_collateralTokenBalanceInSaver >= 2 * collateralAmount) {
            ILending(s_lendingAddress).deposit(
                s_collateralTokenAddress,
                2 * collateralAmount
            );
        } else {
            // deposit what's left in the saver
            ILending(s_lendingAddress).deposit(
                s_collateralTokenAddress,
                _collateralTokenBalanceInSaver
            );
        }
    }

    /*******************************************************/
    /* Functions to Interact with DeFi Minimal Lending.sol */
    /*******************************************************/

    function deposit(address _tokenAddress, uint256 _amount)
        external
        onlyOwner
    {
        require(_amount <= IERC20(_tokenAddress).balanceOf(address(this)));
        ILending(s_lendingAddress).deposit(_tokenAddress, _amount);
        s_collateralTokenAddress = _tokenAddress;
    }

    // @notice Withdraws tokens from Lending.sol to LiquidtaionSaver.sol
    function withdraw(address _tokenAddress, uint256 _amount)
        external
        onlyOwner
    {
        ILending(s_lendingAddress).withdraw(_tokenAddress, _amount);
    }

    function borrow(address _tokenAddress, uint256 _amount) external onlyOwner {
        ILending(s_lendingAddress).borrow(_tokenAddress, _amount);
        s_borrowedTokenAddress = _tokenAddress;
    }

    function repay(address _tokenAddress, uint256 _amount) external onlyOwner {
        ILending(s_lendingAddress).repay(_tokenAddress, _amount);
    }
}
