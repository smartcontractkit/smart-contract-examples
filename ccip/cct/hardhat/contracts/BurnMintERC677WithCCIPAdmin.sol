// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {BurnMintERC677} from "@chainlink/contracts-ccip/src/v0.8/shared/token/ERC677/BurnMintERC677.sol";
import {IGetCCIPAdmin} from "@chainlink/contracts-ccip/src/v0.8/ccip/interfaces/IGetCCIPAdmin.sol";

contract BurnMintERC677WithCCIPAdmin is IGetCCIPAdmin, BurnMintERC677 {
    event CCIPAdminSet(address indexed ccipAdmin, address indexed owner);
    address private s_ccipAdmin;

    constructor(
        string memory name,
        string memory symbol,
        uint8 decimals_,
        uint256 maxSupply_
    ) BurnMintERC677(name, symbol, decimals_, maxSupply_) {}

    function setCCIPAdmin(address ccipAdmin) external onlyOwner {
        s_ccipAdmin = ccipAdmin;
        emit CCIPAdminSet(ccipAdmin, msg.sender);
    }

    function getCCIPAdmin() external view returns (address ccipAdmin) {
        ccipAdmin = s_ccipAdmin;
    }
}
