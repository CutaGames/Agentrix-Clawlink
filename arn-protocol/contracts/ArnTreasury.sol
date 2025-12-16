// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title ArnTreasury
 * @notice ARN 生态金库
 * @dev 资金只进不出，除非通过 Timelock 或 Distributor 授权
 */
contract ArnTreasury is AccessControl {
    using SafeERC20 for IERC20;

    bytes32 public constant DISTRIBUTOR_ROLE = keccak256("DISTRIBUTOR_ROLE");
    bytes32 public constant TIMELOCK_ROLE = keccak256("TIMELOCK_ROLE");

    event FundsWithdrawn(address indexed token, address indexed to, uint256 amount, string reason);
    event FundsReceived(address indexed sender, uint256 amount);

    // Distribution Roles
    address public watcher;
    address public operator;
    address public publicGoods;
    address public securityReserve;

    // Distribution Ratios (Basis Points, 10000 = 100%)
    uint256 public constant WATCHER_BPS = 4000; // 40%
    uint256 public constant OPERATOR_BPS = 3000; // 30%
    uint256 public constant PUBLIC_GOODS_BPS = 2000; // 20%
    uint256 public constant SECURITY_RESERVE_BPS = 1000; // 10%

    event DistributionUpdated(address watcher, address operator, address publicGoods, address securityReserve);
    event RewardsDistributed(address indexed token, uint256 totalAmount);

    constructor(address _admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(TIMELOCK_ROLE, _admin);
        
        // Initialize with admin as placeholder for all roles (should be updated)
        watcher = _admin;
        operator = _admin;
        publicGoods = _admin;
        securityReserve = _admin;
    }

    function setDistributionAddresses(
        address _watcher,
        address _operator,
        address _publicGoods,
        address _securityReserve
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        watcher = _watcher;
        operator = _operator;
        publicGoods = _publicGoods;
        securityReserve = _securityReserve;
        emit DistributionUpdated(_watcher, _operator, _publicGoods, _securityReserve);
    }

    /**
     * @notice Distribute accumulated rewards according to the 40/30/20/10 rule
     * @param token The token to distribute (address(0) for native)
     */
    function distributeRewards(address token) external onlyRole(DISTRIBUTOR_ROLE) {
        uint256 totalBalance;
        if (token == address(0)) {
            totalBalance = address(this).balance;
        } else {
            totalBalance = IERC20(token).balanceOf(address(this));
        }
        
        require(totalBalance > 0, "No funds to distribute");

        uint256 watcherAmount = (totalBalance * WATCHER_BPS) / 10000;
        uint256 operatorAmount = (totalBalance * OPERATOR_BPS) / 10000;
        uint256 publicGoodsAmount = (totalBalance * PUBLIC_GOODS_BPS) / 10000;
        uint256 securityReserveAmount = totalBalance - watcherAmount - operatorAmount - publicGoodsAmount;

        _transfer(token, watcher, watcherAmount);
        _transfer(token, operator, operatorAmount);
        _transfer(token, publicGoods, publicGoodsAmount);
        _transfer(token, securityReserve, securityReserveAmount);

        emit RewardsDistributed(token, totalBalance);
    }

    function _transfer(address token, address to, uint256 amount) internal {
        if (amount == 0) return;
        if (token == address(0)) {
            (bool success, ) = to.call{value: amount}("");
            require(success, "Transfer failed");
        } else {
            IERC20(token).safeTransfer(to, amount);
        }
    }

    /**
     * @notice 授权 Distributor 提取资金 (用于自动分发)
     * @dev 这是一个特殊的 withdraw，通常由 MerkleDistributor 合约调用
     */
    function distributeReward(
        address token,
        address to,
        uint256 amount
    ) external onlyRole(DISTRIBUTOR_ROLE) {
        if (token == address(0)) {
            (bool success, ) = to.call{value: amount}("");
            require(success, "Transfer failed");
        } else {
            IERC20(token).safeTransfer(to, amount);
        }
        // 不触发通用 Withdraw 事件，避免噪音，Distributor 自己会发 Claim 事件
    }

    /**
     * @notice 接收原生代币
     */
    receive() external payable {
        emit FundsReceived(msg.sender, msg.value);
    }
}
