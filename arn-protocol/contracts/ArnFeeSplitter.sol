// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title ArnFeeSplitter
 * @notice 核心入口合约：处理 x402 支付的分账逻辑
 * @dev 接收支付 -> 扣除 Protocol Fee -> 转发剩余资金给商户
 */
contract ArnFeeSplitter is Ownable {
    using SafeERC20 for IERC20;

    // Protocol Fee (Basis Points, 10000 = 100%)
    // Default: 0.3% (30 bps)
    uint256 public protocolFeeBps = 30;
    
    // Commission Contract Address (Legacy / Main Distribution)
    address public commissionContract;

    // Treasury Address
    address public treasury;

    event PaymentSplit(
        address indexed token,
        address indexed merchant,
        uint256 totalAmount,
        uint256 commissionAmount,
        uint256 x402FeeAmount,
        bytes32 indexed routeRefHash
    );

    event ProtocolFeeUpdated(uint256 newFeeBps);
    event TreasuryUpdated(address newTreasury);
    event CommissionContractUpdated(address newCommissionContract);

    constructor(address _treasury, address _commissionContract) Ownable(msg.sender) {
        require(_treasury != address(0), "Invalid treasury");
        require(_commissionContract != address(0), "Invalid commission contract");
        treasury = _treasury;
        commissionContract = _commissionContract;
    }

    function setCommissionContract(address _commissionContract) external onlyOwner {
        require(_commissionContract != address(0), "Invalid address");
        commissionContract = _commissionContract;
        emit CommissionContractUpdated(_commissionContract);
    }

    /**
     * @notice 处理 QuickPay 支付 (X402 V2)
     * @dev 由 ArnSessionManager 调用 (Approve and Call)
     * @param token 支付代币地址
     * @param merchant 商户接收地址 (Note: This is passed to Commission contract, not used for direct transfer)
     * @param amount 支付金额
     * @param orderId 订单ID (用于追踪)
     */
    function quickPaySplit(
        address token,
        address merchant,
        uint256 amount,
        bytes32 orderId
    ) external {
        require(amount > 0, "Amount must be > 0");
        
        // 1. Pull Tokens from Sender (ArnSessionManager)
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        // 2. Calculate X402 Fee (0.3%)
        uint256 x402FeeAmount = (amount * protocolFeeBps) / 10000;
        uint256 remainingAmount = amount - x402FeeAmount;

        // 3. Transfer X402 Fee to Treasury (for 40/30/20/10 distribution)
        if (x402FeeAmount > 0) {
            IERC20(token).safeTransfer(treasury, x402FeeAmount);
        }

        // 4. Forward Remaining to Commission Contract
        if (remainingAmount > 0) {
            // Approve Commission Contract to spend tokens
            IERC20(token).forceApprove(commissionContract, remainingAmount);
            
            // Call Commission.quickPaySplit(orderId, amount)
            // Note: Commission contract will pull tokens from this contract
            // Interface: function quickPaySplit(bytes32 orderId, uint256 amount)
            (bool success, bytes memory data) = commissionContract.call(
                abi.encodeWithSignature("quickPaySplit(bytes32,uint256)", orderId, remainingAmount)
            );
            require(success, string(abi.encodePacked("Commission call failed: ", data)));
            
            // Reset approval
            IERC20(token).forceApprove(commissionContract, 0);
        }

        // 5. Emit Event
        emit PaymentSplit(
            token,
            merchant,
            amount,
            remainingAmount,
            x402FeeAmount,
            orderId
        );
    }

    /**
     * @notice 处理 ERC20 支付分账 (Legacy / Direct Push)
     * @param token 支付代币地址
     * @param merchant 商户接收地址
     * @param amount 支付总金额
     * @param routeRef 归因数据 (用于链下积分计算)
     */
    function splitPaymentERC20(
        address token,
        address merchant,
        uint256 amount,
        bytes calldata routeRef
    ) external {
        require(amount > 0, "Amount must be > 0");
        
        // 1. Calculate Fee
        uint256 feeAmount = (amount * protocolFeeBps) / 10000;
        uint256 merchantAmount = amount - feeAmount;

        // 2. Transfer Fee to Treasury
        if (feeAmount > 0) {
            IERC20(token).safeTransferFrom(msg.sender, treasury, feeAmount);
        }

        // 3. Transfer Remaining to Merchant
        if (merchantAmount > 0) {
            IERC20(token).safeTransferFrom(msg.sender, merchant, merchantAmount);
        }

        // 4. Emit Event for Indexer
        emit PaymentSplit(
            token,
            merchant,
            amount,
            merchantAmount,
            feeAmount,
            keccak256(routeRef)
        );
    }

    /**
     * @notice 处理原生代币 (ETH/MATIC) 支付分账
     */
    function splitPaymentNative(
        address merchant,
        bytes calldata routeRef
    ) external payable {
        uint256 amount = msg.value;
        require(amount > 0, "Amount must be > 0");

        // 1. Calculate Fee
        uint256 feeAmount = (amount * protocolFeeBps) / 10000;
        uint256 merchantAmount = amount - feeAmount;

        // 2. Transfer Fee to Treasury
        if (feeAmount > 0) {
            (bool successFee, ) = treasury.call{value: feeAmount}("");
            require(successFee, "Fee transfer failed");
        }

        // 3. Transfer Remaining to Merchant
        if (merchantAmount > 0) {
            (bool successMerch, ) = merchant.call{value: merchantAmount}("");
            require(successMerch, "Merchant transfer failed");
        }

        emit PaymentSplit(
            address(0),
            merchant,
            amount,
            merchantAmount,
            feeAmount,
            keccak256(routeRef)
        );
    }

    // --- Admin Functions ---

    function setProtocolFee(uint256 _bps) external onlyOwner {
        require(_bps <= 1000, "Fee too high (max 10%)");
        protocolFeeBps = _bps;
        emit ProtocolFeeUpdated(_bps);
    }

    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Invalid address");
        treasury = _treasury;
        emit TreasuryUpdated(_treasury);
    }
}
