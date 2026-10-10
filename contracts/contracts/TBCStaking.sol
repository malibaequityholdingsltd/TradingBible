// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title TBC Simple Staking
/// @notice Lock TBC to earn a per-second pro-rata share of a reward pool the
///         owner funds. No minting: rewards come only from tokens sent here.
///         Emergency exit always returns the principal.
contract TBCStaking {
    using SafeERC20 for IERC20;

    IERC20 public immutable token;
    address public owner;
    uint256 public rewardRate; // reward tokens per second, set by owner
    uint256 public lastUpdate;
    uint256 public rewardPerTokenStored;
    uint256 public totalStaked;

    mapping(address => uint256) public staked;
    mapping(address => uint256) public rewardPerTokenPaid;
    mapping(address => uint256) public rewards;

    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardPaid(address indexed user, uint256 amount);

    error OnlyOwner();
    error ZeroAmount();

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    constructor(address token_) {
        require(token_ != address(0), "TBC: zero token");
        token = IERC20(token_);
        owner = msg.sender;
    }

    function setRewardRate(uint256 rate) external onlyOwner {
        _updateGlobal();
        rewardRate = rate;
    }

    function fundRewards(uint256 amount) external onlyOwner {
        if (amount == 0) revert ZeroAmount();
        token.safeTransferFrom(msg.sender, address(this), amount);
    }

    function rewardPerToken() public view returns (uint256) {
        if (totalStaked == 0) return rewardPerTokenStored;
        uint256 elapsed = block.timestamp - lastUpdate;
        return rewardPerTokenStored + (elapsed * rewardRate * 1e18) / totalStaked;
    }

    function earned(address user) public view returns (uint256) {
        uint256 perToken = rewardPerToken();
        uint256 accrued = (staked[user] * (perToken - rewardPerTokenPaid[user])) / 1e18;
        return rewards[user] + accrued;
    }

    function stake(uint256 amount) external {
        if (amount == 0) revert ZeroAmount();
        _updateUser(msg.sender);
        totalStaked += amount;
        staked[msg.sender] += amount;
        token.safeTransferFrom(msg.sender, address(this), amount);
        emit Staked(msg.sender, amount);
    }

    function withdraw(uint256 amount) external {
        if (amount == 0 || amount > staked[msg.sender]) revert ZeroAmount();
        _updateUser(msg.sender);
        totalStaked -= amount;
        staked[msg.sender] -= amount;
        token.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    function claim() external {
        _updateUser(msg.sender);
        uint256 due = rewards[msg.sender];
        if (due == 0) revert ZeroAmount();
        rewards[msg.sender] = 0;
        token.safeTransfer(msg.sender, due);
        emit RewardPaid(msg.sender, due);
    }

    function _updateGlobal() internal {
        rewardPerTokenStored = rewardPerToken();
        lastUpdate = block.timestamp;
    }

    function _updateUser(address user) internal {
        _updateGlobal();
        rewards[user] = earned(user);
        rewardPerTokenPaid[user] = rewardPerTokenStored;
    }
}
