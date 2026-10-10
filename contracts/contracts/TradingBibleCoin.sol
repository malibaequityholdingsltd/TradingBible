// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title TradingBible Coin (TBC)
/// @notice Fixed-supply ecosystem utility token. 100,000,000 TBC minted
///         once to the deployer (expected: the multisig treasury) and never
///         again — no mint, pause, freeze, blacklist or upgrade functions.
contract TradingBibleCoin is ERC20 {
    uint256 public constant MAX_SUPPLY = 100_000_000 * 10 ** 18;

    constructor(address treasury) ERC20("TradingBible Coin", "TBC") {
        require(treasury != address(0), "TBC: zero treasury");
        _mint(treasury, MAX_SUPPLY);
    }
}
