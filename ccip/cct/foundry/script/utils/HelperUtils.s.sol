// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {stdJson} from "forge-std/StdJson.sol";
import {Vm} from "forge-std/Vm.sol";

library HelperUtils {
    using stdJson for string;

    function getAddressFromJson(Vm vm, string memory path, string memory key) internal view returns (address) {
        string memory json = vm.readFile(path);
        return json.readAddress(key);
    }

    function getBoolFromJson(Vm vm, string memory path, string memory key) internal view returns (bool) {
        string memory json = vm.readFile(path);
        return json.readBool(key);
    }

    function getStringFromJson(Vm vm, string memory path, string memory key) internal view returns (string memory) {
        string memory json = vm.readFile(path);
        return json.readString(key);
    }

    function getUintFromJson(Vm vm, string memory path, string memory key) internal view returns (uint256) {
        string memory json = vm.readFile(path);
        return json.readUint(key);
    }

    function bytes32ToHexString(bytes32 _bytes) internal pure returns (string memory) {
        bytes memory hexString = new bytes(64);
        bytes memory hexAlphabet = "0123456789abcdef";
        for (uint256 i = 0; i < 32; i++) {
            hexString[i * 2] = hexAlphabet[uint8(_bytes[i] >> 4)];
            hexString[i * 2 + 1] = hexAlphabet[uint8(_bytes[i] & 0x0f)];
        }
        return string(hexString);
    }

    function uintToStr(uint256 _i) internal pure returns (string memory) {
        if (_i == 0) {
            return "0";
        }
        uint256 j = _i;
        uint256 length;
        while (j != 0) {
            length++;
            j /= 10;
        }
        bytes memory bstr = new bytes(length);
        uint256 k = length;
        j = _i;
        while (j != 0) {
            bstr[--k] = bytes1(uint8(48 + j % 10));
            j /= 10;
        }
        return string(bstr);
    }
}
