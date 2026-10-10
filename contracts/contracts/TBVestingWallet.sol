// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title TB Vesting Wallet
/// @notice Minimal linear vesting with cliff for team/insider allocations.
///         Deploy one instance per beneficiary schedule. Funds can only move
///         to the beneficiary, only as they vest — no admin withdrawal path.
contract TBVestingWallet {
    using SafeERC20 for IERC20;

    IERC20 public immutable token;
    address public immutable beneficiary;
    uint64 public immutable start;
    uint64 public immutable cliff;
    uint64 public immutable duration;
    uint256 public released;

    event Released(uint256 amount);

    error NothingDue();
    error CliffNotReached();

    constructor(
        address token_,
        address beneficiary_,
        uint64 start_,
        uint64 cliffSeconds_,
        uint64 durationSeconds_
    ) {
        require(token_ != address(0) && beneficiary_ != address(0), "TBV: zero address");
        require(durationSeconds_ > 0, "TBV: zero duration");
        require(cliffSeconds_ <= durationSeconds_, "TBV: cliff > duration");
        token = IERC20(token_);
        beneficiary = beneficiary_;
        start = start_;
        cliff = start_ + cliffSeconds_;
        duration = durationSeconds_;
    }

    /// @notice Total amount vested so far (linear, after cliff).
    function vested() public view returns (uint256) {
        uint256 total = token.balanceOf(address(this)) + released;
        if (block.timestamp < cliff) return 0;
        if (block.timestamp >= start + duration) return total;
        return (total * (block.timestamp - start)) / duration;
    }

    /// @notice Release everything currently vested to the beneficiary.
    function release() external {
        if (block.timestamp < cliff) revert CliffNotReached();
        uint256 due = vested() - released;
        if (due == 0) revert NothingDue();
        released += due;
        token.safeTransfer(beneficiary, due);
        emit Released(due);
    }
}
