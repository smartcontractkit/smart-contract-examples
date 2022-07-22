// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@chainlink/contracts/src/v0.8/KeeperCompatible.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";

/**
 * @notice Parameters necessary for Uniswap V3 swap
 *
 * @param deadline - transaction will revert if it is pending for more than this period of time
 * @param fee - the fee of the token pool to consider for the pair
 * @param sqrtPriceLimitX96 - the price limit of the pool that cannot be exceeded by the swap
 * @param isMultiSwap - flag to check whether to perform single or multi swap, cheaper than to compare path with abi.encodePacked("")
 * @param path - sequence of (tokenAddress - fee - tokenAddress), encoded in reverse order, which are the variables needed to compute each pool contract address in sequence of swaps
 *
 * @dev path is encoded in reverse order
 */
struct SwapParameters {
    uint256 deadline;
    uint24 fee;
    uint160 sqrtPriceLimitX96;
    bool isMultiSwap;
    bytes path;
}

contract TradingBot is KeeperCompatibleInterface, Ownable {
    /**
     * @notice Represents the token which this bot contract trades
     *
     * @param tokenAddress - address of erc20 token contract
     * @param tokenInTermsOfUsdAggregator - $TOKEN / USD Chainlink Price Feed Aggregator
     * @param buyingPrice - if the price of the token in terms of USD is less than this value bot should buy
     * @param sellingPrice - if the price of the token in terms of USD is greater than this value bot should sell
     *
     * @dev Buying is being done by swapping stable coin for $TOKEN
     * @dev Selling is being done by swapping $TOKEN for stable coin
     */
    struct Token {
        address tokenAddress;
        AggregatorV3Interface tokenInTermsOfUsdAggregator;
        uint256 buyingPrice;
        uint256 sellingPrice;
        SwapParameters buyingParams;
        SwapParameters sellingParams;
    }

    address private s_stableToken;
    Token private s_tradingToken;
    ISwapRouter public constant UNISWAP_V3_ROUTER_CONTRACT =
        ISwapRouter(0xE592427A0AEce92De3Edee1F18E0157C05861564); // It's the same on each network

    event TokenDeposited(address indexed tokenAddress, uint256 indexed amount);
    event TokenWithdrawn(address indexed tokenAddress, uint256 indexed amount);

    constructor(
        address _stableToken,
        address _tradingTokenAddress,
        address _aggregatorAddress,
        uint256 _buyingPrice,
        uint256 _sellingPrice,
        SwapParameters memory _buyingParams,
        SwapParameters memory _sellingParams
    ) {
        s_stableToken = _stableToken;
        setTradingToken(
            _tradingTokenAddress,
            _aggregatorAddress,
            _buyingPrice,
            _sellingPrice,
            _buyingParams,
            _sellingParams
        );
    }

    function setTradingToken(
        address _tradingTokenAddress,
        address _aggregatorAddress,
        uint256 _buyingPrice,
        uint256 _sellingPrice,
        SwapParameters memory _buyingParams,
        SwapParameters memory _sellingParams
    ) public onlyOwner {
        s_tradingToken = Token(
            _tradingTokenAddress,
            AggregatorV3Interface(_aggregatorAddress),
            _buyingPrice,
            _sellingPrice,
            _buyingParams,
            _sellingParams
        );
    }

    function deposit(address _tokenAddress, uint256 _amount)
        external
        onlyOwner
    {
        IERC20(_tokenAddress).transferFrom(msg.sender, address(this), _amount);
        emit TokenDeposited(_tokenAddress, _amount);
    }

    function withdraw(address _tokenAddress, uint256 _amount)
        external
        onlyOwner
    {
        IERC20(_tokenAddress).transfer(msg.sender, _amount);
        emit TokenWithdrawn(_tokenAddress, _amount);
    }

    function getPrice() public view returns (int256) {
        (, int256 price, , , ) = s_tradingToken
            .tokenInTermsOfUsdAggregator
            .latestRoundData();

        return price;
    }

    function checkUpkeep(bytes calldata checkData)
        external
        view
        override
        returns (bool upkeepNeeded, bytes memory performData)
    {
        uint256 currentPrice = uint256(getPrice());
        upkeepNeeded =
            currentPrice > s_tradingToken.sellingPrice ||
            currentPrice < s_tradingToken.buyingPrice;

        /**
         *                buying price                        selling price
         * -∞ ----------------- | ---------------------------------- | ----------------- ∞
         *  ////// upkeep ///////                                    ////// upkeep ///////
         *
         */
    }

    function performUpkeep(bytes calldata performData) external override {
        uint256 currentPrice = uint256(getPrice());
        require(
            currentPrice > s_tradingToken.sellingPrice ||
                currentPrice < s_tradingToken.buyingPrice,
            "Trading is not profitable right now"
        );

        if (currentPrice < s_tradingToken.buyingPrice) {
            // buy
            uint256 amountIn = IERC20(s_stableToken).balanceOf(address(this));
            swap(
                s_stableToken,
                s_tradingToken.tokenAddress,
                amountIn,
                s_tradingToken.buyingPrice,
                s_tradingToken.buyingParams
            );
        } else {
            // sell
            uint256 tradingTokenBalance = IERC20(s_tradingToken.tokenAddress)
                .balanceOf(address(this));

            uint256 amountIn = (currentPrice * tradingTokenBalance) /
                s_tradingToken.tokenInTermsOfUsdAggregator.decimals();

            swap(
                s_tradingToken.tokenAddress,
                s_stableToken,
                amountIn,
                s_tradingToken.sellingPrice,
                s_tradingToken.sellingParams
            );
        }
    }

    function swap(
        address _tokenIn,
        address _tokenOut,
        uint256 _amountIn,
        uint256 _minimumAmountOut,
        SwapParameters memory _params
    ) internal {
        TransferHelper.safeApprove(
            _tokenIn,
            address(UNISWAP_V3_ROUTER_CONTRACT),
            _amountIn
        );

        if (_params.isMultiSwap) {
            ISwapRouter.ExactInputParams memory params = ISwapRouter
                .ExactInputParams({
                    path: _params.path, // @dev to swap DAI for WETH9 through a USDC pool: abi.encodePacked(WETH9, poolFee, USDC, poolFee, DAI)
                    recipient: address(this),
                    deadline: _params.deadline,
                    amountIn: _amountIn,
                    amountOutMinimum: _minimumAmountOut
                });

            UNISWAP_V3_ROUTER_CONTRACT.exactInput(params);
        } else {
            ISwapRouter.ExactInputSingleParams memory params = ISwapRouter
                .ExactInputSingleParams({
                    tokenIn: _tokenIn,
                    tokenOut: _tokenOut,
                    fee: _params.fee,
                    recipient: address(this),
                    deadline: _params.deadline,
                    amountIn: _amountIn,
                    amountOutMinimum: _minimumAmountOut,
                    sqrtPriceLimitX96: _params.sqrtPriceLimitX96
                });

            UNISWAP_V3_ROUTER_CONTRACT.exactInputSingle(params);
        }

        TransferHelper.safeApprove(
            _tokenIn,
            address(UNISWAP_V3_ROUTER_CONTRACT),
            0
        );
    }
}
