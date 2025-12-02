// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./PaymentRouter.sol";

/**
 * @title X402Adapter
 * @dev X402协议适配器合约，用于处理X402协议支付
 */
contract X402Adapter is Ownable, ReentrancyGuard {
    // X402支付会话
    struct X402Session {
        bytes32 sessionId;
        bytes32 paymentId;
        address payer;
        address recipient;
        uint256 amount;
        bytes compressedData;
        bool executed;
        uint256 createdAt;
        uint256 expiresAt;
    }

    // 事件
    event X402SessionCreated(
        bytes32 indexed sessionId,
        bytes32 indexed paymentId,
        address indexed payer,
        uint256 amount
    );

    event X402PaymentExecuted(
        bytes32 indexed sessionId,
        bytes32 indexed paymentId,
        address indexed recipient,
        uint256 amount,
        uint256 gasSaved
    );

    // 状态变量
    mapping(bytes32 => X402Session) public sessions;
    PaymentRouter public paymentRouter;
    address public relayer; // X402中继器地址

    constructor(address payable _paymentRouter) {
        paymentRouter = PaymentRouter(_paymentRouter);
    }

    /**
     * @dev 创建X402支付会话
     * @param paymentId 支付ID
     * @param recipient 收款地址
     * @param amount 支付金额
     * @param compressedData 压缩的交易数据
     * @param expiresAt 过期时间
     */
    function createSession(
        bytes32 paymentId,
        address recipient,
        uint256 amount,
        bytes calldata compressedData,
        uint256 expiresAt
    ) external returns (bytes32) {
        bytes32 sessionId = keccak256(
            abi.encodePacked(
                paymentId,
                msg.sender,
                recipient,
                amount,
                block.timestamp
            )
        );

        sessions[sessionId] = X402Session({
            sessionId: sessionId,
            paymentId: paymentId,
            payer: msg.sender,
            recipient: recipient,
            amount: amount,
            compressedData: compressedData,
            executed: false,
            createdAt: block.timestamp,
            expiresAt: expiresAt
        });

        emit X402SessionCreated(sessionId, paymentId, msg.sender, amount);
        return sessionId;
    }

    /**
     * @dev 执行X402支付（由中继器调用）
     * @param sessionId 会话ID
     * @param signatures 批量签名
     */
    function executePayment(
        bytes32 sessionId,
        bytes calldata signatures
    ) external nonReentrant {
        X402Session storage session = sessions[sessionId];
        require(session.sessionId != bytes32(0), "Session not found");
        require(!session.executed, "Payment already executed");
        require(block.timestamp <= session.expiresAt, "Session expired");
        require(msg.sender == relayer, "Only relayer can execute");

        // 验证批量签名（简化实现）
        require(signatures.length > 0, "Signatures required");
        
        // 验证签名数量（至少需要1个有效签名）
        // 实际应该验证每个签名的有效性
        bytes32 messageHash = keccak256(
            abi.encodePacked(
                session.sessionId,
                session.paymentId,
                session.recipient,
                session.amount
            )
        );
        
        // 解压交易数据（简化实现）
        // 实际应该使用更高效的解压算法
        // 这里假设compressedData已经包含必要的交易信息
        
        // 执行批量交易（简化实现）
        // 实际应该批量处理多个交易以节省Gas
        require(address(this).balance >= session.amount, "Insufficient balance");
        payable(session.recipient).transfer(session.amount);

        session.executed = true;

        // 通知PaymentRouter完成支付
        paymentRouter.completePayment(session.paymentId);

        // 计算节省的Gas（示例）
        uint256 gasSaved = 100000; // 实际应该根据压缩率计算

        emit X402PaymentExecuted(
            sessionId,
            session.paymentId,
            session.recipient,
            session.amount,
            gasSaved
        );
    }

    /**
     * @dev 设置中继器地址
     */
    function setRelayer(address _relayer) external onlyOwner {
        relayer = _relayer;
    }

    /**
     * @dev 查询会话信息
     */
    function getSession(bytes32 sessionId)
        external
        view
        returns (X402Session memory)
    {
        return sessions[sessionId];
    }
}

