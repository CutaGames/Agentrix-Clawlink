// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title ReceiptRegistry
 * @notice 链上收据注册表 - 记录所有 x402 支付的收据
 * @dev 用于：
 *   1. 链下 Indexer 聚合支付数据
 *   2. Epoch 结算时计算分配
 *   3. 争议仲裁时提供证据
 */
contract ReceiptRegistry is AccessControl {
    bytes32 public constant EMITTER_ROLE = keccak256("EMITTER_ROLE");

    struct Receipt {
        bytes32 paymentId;       // 支付ID
        address payer;           // 付款人
        address merchant;        // 商户
        address agent;           // 推荐Agent
        address token;           // 支付代币
        uint256 amount;          // 支付金额
        uint256 protocolFee;     // 协议费用 (0.3%)
        uint256 timestamp;       // 时间戳
        uint256 epochId;         // 所属Epoch
        bytes32 routeRefHash;    // 路由归因哈希
    }

    // Storage
    mapping(bytes32 => Receipt) public receipts;
    bytes32[] public receiptIds;
    
    // Epoch tracking
    mapping(uint256 => bytes32[]) public epochReceipts;
    mapping(uint256 => uint256) public epochTotalVolume;
    mapping(uint256 => uint256) public epochTotalFees;

    // Events
    event ReceiptCreated(
        bytes32 indexed paymentId,
        address indexed payer,
        address indexed merchant,
        address agent,
        address token,
        uint256 amount,
        uint256 protocolFee,
        uint256 epochId,
        bytes32 routeRefHash
    );

    event EpochFinalized(
        uint256 indexed epochId,
        uint256 totalReceipts,
        uint256 totalVolume,
        uint256 totalFees
    );

    constructor(address _admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(EMITTER_ROLE, _admin);
    }

    /**
     * @notice 记录一笔支付收据
     * @dev 由 ArnFeeSplitter 在支付完成后调用
     */
    function recordReceipt(
        bytes32 paymentId,
        address payer,
        address merchant,
        address agent,
        address token,
        uint256 amount,
        uint256 protocolFee,
        uint256 epochId,
        bytes32 routeRefHash
    ) external onlyRole(EMITTER_ROLE) {
        require(receipts[paymentId].timestamp == 0, "Receipt already exists");

        receipts[paymentId] = Receipt({
            paymentId: paymentId,
            payer: payer,
            merchant: merchant,
            agent: agent,
            token: token,
            amount: amount,
            protocolFee: protocolFee,
            timestamp: block.timestamp,
            epochId: epochId,
            routeRefHash: routeRefHash
        });

        receiptIds.push(paymentId);
        epochReceipts[epochId].push(paymentId);
        epochTotalVolume[epochId] += amount;
        epochTotalFees[epochId] += protocolFee;

        emit ReceiptCreated(
            paymentId,
            payer,
            merchant,
            agent,
            token,
            amount,
            protocolFee,
            epochId,
            routeRefHash
        );
    }

    /**
     * @notice 获取收据详情
     */
    function getReceipt(bytes32 paymentId) external view returns (Receipt memory) {
        return receipts[paymentId];
    }

    /**
     * @notice 获取某个Epoch的所有收据ID
     */
    function getEpochReceiptIds(uint256 epochId) external view returns (bytes32[] memory) {
        return epochReceipts[epochId];
    }

    /**
     * @notice 获取某个Epoch的统计数据
     */
    function getEpochStats(uint256 epochId) external view returns (
        uint256 totalReceipts,
        uint256 totalVolume,
        uint256 totalFees
    ) {
        return (
            epochReceipts[epochId].length,
            epochTotalVolume[epochId],
            epochTotalFees[epochId]
        );
    }

    /**
     * @notice 获取总收据数量
     */
    function getTotalReceipts() external view returns (uint256) {
        return receiptIds.length;
    }
}
