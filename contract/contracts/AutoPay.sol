// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title AutoPay
 * @dev 自动支付合约，管理用户对Agent的自动支付授权
 */
contract AutoPay is Ownable, ReentrancyGuard {
    // 授权结构
    struct Grant {
        address user;
        address agent;
        uint256 singleLimit; // 单次限额
        uint256 dailyLimit; // 每日限额
        uint256 usedToday; // 今日已用
        uint256 lastResetDate; // 上次重置日期
        uint256 expiresAt; // 过期时间
        bool isActive;
    }

    // 支付记录
    struct AutoPayment {
        bytes32 paymentId;
        address user;
        address agent;
        address recipient;
        uint256 amount;
        uint256 timestamp;
        bool executed;
    }

    // 事件
    event GrantCreated(
        address indexed user,
        address indexed agent,
        uint256 singleLimit,
        uint256 dailyLimit,
        uint256 expiresAt
    );

    event GrantRevoked(address indexed user, address indexed agent);

    event AutoPaymentExecuted(
        bytes32 indexed paymentId,
        address indexed user,
        address indexed agent,
        address recipient,
        uint256 amount
    );

    // 状态变量
    mapping(address => mapping(address => Grant)) public grants;
    mapping(bytes32 => AutoPayment) public autoPayments;

    /**
     * @dev 创建自动支付授权
     * @param agent Agent地址
     * @param singleLimit 单次限额
     * @param dailyLimit 每日限额
     * @param duration 授权时长（秒）
     */
    function createGrant(
        address agent,
        uint256 singleLimit,
        uint256 dailyLimit,
        uint256 duration
    ) external {
        require(agent != address(0), "Invalid agent address");
        require(singleLimit > 0 && dailyLimit > 0, "Invalid limits");
        require(singleLimit <= dailyLimit, "Single limit exceeds daily limit");

        grants[msg.sender][agent] = Grant({
            user: msg.sender,
            agent: agent,
            singleLimit: singleLimit,
            dailyLimit: dailyLimit,
            usedToday: 0,
            lastResetDate: block.timestamp / 1 days,
            expiresAt: block.timestamp + duration,
            isActive: true
        });

        emit GrantCreated(
            msg.sender,
            agent,
            singleLimit,
            dailyLimit,
            block.timestamp + duration
        );
    }

    /**
     * @dev 撤销授权
     * @param agent Agent地址
     */
    function revokeGrant(address agent) external {
        require(
            grants[msg.sender][agent].isActive,
            "Grant not found or inactive"
        );

        grants[msg.sender][agent].isActive = false;
        emit GrantRevoked(msg.sender, agent);
    }

    /**
     * @dev 执行自动支付（由Agent调用）
     * @param paymentId 支付ID
     * @param user 用户地址
     * @param recipient 收款地址
     * @param amount 支付金额
     */
    function executeAutoPayment(
        bytes32 paymentId,
        address user,
        address recipient,
        uint256 amount
    ) external nonReentrant {
        Grant storage grant = grants[user][msg.sender];
        require(grant.isActive, "Grant not active");
        require(block.timestamp <= grant.expiresAt, "Grant expired");
        require(amount <= grant.singleLimit, "Amount exceeds single limit");

        // 检查是否需要重置每日限额
        uint256 currentDate = block.timestamp / 1 days;
        if (currentDate > grant.lastResetDate) {
            grant.usedToday = 0;
            grant.lastResetDate = currentDate;
        }

        require(
            grant.usedToday + amount <= grant.dailyLimit,
            "Amount exceeds daily limit"
        );

        // 更新使用量
        grant.usedToday += amount;

        // 记录支付
        autoPayments[paymentId] = AutoPayment({
            paymentId: paymentId,
            user: user,
            agent: msg.sender,
            recipient: recipient,
            amount: amount,
            timestamp: block.timestamp,
            executed: true
        });

        // 执行转账
        // 注意：这里需要用户预先授权合约使用其资金
        // 实际实现应该使用ERC20 approve + transferFrom 或 ETH的委托支付
        // 这里简化处理，假设资金已存入合约
        require(address(this).balance >= amount, "Insufficient contract balance");
        payable(recipient).transfer(amount);

        emit AutoPaymentExecuted(paymentId, user, msg.sender, recipient, amount);
    }

    /**
     * @dev 查询授权信息
     * @param user 用户地址
     * @param agent Agent地址
     */
    function getGrant(address user, address agent)
        external
        view
        returns (Grant memory)
    {
        return grants[user][agent];
    }

    /**
     * @dev 查询支付记录
     * @param paymentId 支付ID
     */
    function getAutoPayment(bytes32 paymentId)
        external
        view
        returns (AutoPayment memory)
    {
        return autoPayments[paymentId];
    }
}

