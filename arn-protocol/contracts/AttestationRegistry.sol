// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title AttestationRegistry
 * @notice 证明注册表 - 质量激励系统的核心
 * @dev 
 *   实现 Bond/Challenge 机制：
 *   - Agent 可以为其服务质量提交 Attestation
 *   - 需要质押 Bond（可选）
 *   - 其他人可以 Challenge，如果成功则获得部分 Bond
 *   - 用于筛选高质量 Agent，支持后续激励分配
 */
contract AttestationRegistry is AccessControl {
    using SafeERC20 for IERC20;

    bytes32 public constant ARBITER_ROLE = keccak256("ARBITER_ROLE");

    // 配置
    address public bondToken;           // Bond 代币（通常是 USDT）
    uint256 public minBondAmount;       // 最小 Bond 金额
    uint256 public challengePeriod;     // Challenge 期限（秒）
    uint256 public slashPercentage;     // 惩罚比例（基点，10000 = 100%）

    struct Attestation {
        address attester;           // 证明提交者（Agent）
        bytes32 contentHash;        // 服务质量证明内容哈希
        uint256 bondAmount;         // 质押金额
        uint256 timestamp;          // 提交时间
        uint256 challengeDeadline;  // Challenge 截止时间
        AttestationStatus status;   // 状态
        address challenger;         // 挑战者
        bytes32 challengeReason;    // 挑战理由哈希
    }

    enum AttestationStatus {
        Pending,        // 等待 Challenge 期结束
        Validated,      // 已验证（无挑战或挑战失败）
        Challenged,     // 被挑战中
        Slashed,        // 已惩罚（挑战成功）
        Withdrawn       // 已提取（Bond 返还）
    }

    // Storage
    mapping(bytes32 => Attestation) public attestations;
    bytes32[] public attestationIds;
    
    // 累积统计
    mapping(address => uint256) public attesterValidCount;    // 验证通过次数
    mapping(address => uint256) public attesterSlashCount;    // 被惩罚次数
    mapping(address => uint256) public challengerWinCount;    // 挑战成功次数

    // Events
    event AttestationSubmitted(
        bytes32 indexed attestationId,
        address indexed attester,
        bytes32 contentHash,
        uint256 bondAmount,
        uint256 challengeDeadline
    );

    event AttestationChallenged(
        bytes32 indexed attestationId,
        address indexed challenger,
        bytes32 challengeReason
    );

    event AttestationValidated(bytes32 indexed attestationId);
    event AttestationSlashed(bytes32 indexed attestationId, address indexed challenger, uint256 slashAmount);
    event BondWithdrawn(bytes32 indexed attestationId, address indexed attester, uint256 amount);

    constructor(
        address _admin,
        address _bondToken,
        uint256 _minBondAmount,
        uint256 _challengePeriod,
        uint256 _slashPercentage
    ) {
        require(_bondToken != address(0), "Invalid bond token");
        require(_slashPercentage <= 10000, "Invalid slash percentage");

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ARBITER_ROLE, _admin);

        bondToken = _bondToken;
        minBondAmount = _minBondAmount;
        challengePeriod = _challengePeriod;
        slashPercentage = _slashPercentage;
    }

    /**
     * @notice 提交服务质量证明
     * @param contentHash 证明内容哈希（链下存储实际内容）
     * @param bondAmount 质押金额（可以为 0，但影响可信度）
     */
    function submitAttestation(
        bytes32 contentHash,
        uint256 bondAmount
    ) external returns (bytes32) {
        require(contentHash != bytes32(0), "Invalid content hash");
        
        bytes32 attestationId = keccak256(
            abi.encodePacked(msg.sender, contentHash, block.timestamp, block.number)
        );
        
        require(attestations[attestationId].timestamp == 0, "Attestation exists");

        // 如果提供了 Bond，则转入
        if (bondAmount > 0) {
            require(bondAmount >= minBondAmount, "Bond too low");
            IERC20(bondToken).safeTransferFrom(msg.sender, address(this), bondAmount);
        }

        uint256 deadline = block.timestamp + challengePeriod;

        attestations[attestationId] = Attestation({
            attester: msg.sender,
            contentHash: contentHash,
            bondAmount: bondAmount,
            timestamp: block.timestamp,
            challengeDeadline: deadline,
            status: AttestationStatus.Pending,
            challenger: address(0),
            challengeReason: bytes32(0)
        });

        attestationIds.push(attestationId);

        emit AttestationSubmitted(attestationId, msg.sender, contentHash, bondAmount, deadline);

        return attestationId;
    }

    /**
     * @notice 挑战证明
     * @param attestationId 证明ID
     * @param reason 挑战理由哈希
     */
    function challenge(bytes32 attestationId, bytes32 reason) external {
        Attestation storage att = attestations[attestationId];
        
        require(att.timestamp != 0, "Attestation not found");
        require(att.status == AttestationStatus.Pending, "Not challengeable");
        require(block.timestamp <= att.challengeDeadline, "Challenge period ended");
        require(msg.sender != att.attester, "Cannot self-challenge");

        att.status = AttestationStatus.Challenged;
        att.challenger = msg.sender;
        att.challengeReason = reason;

        emit AttestationChallenged(attestationId, msg.sender, reason);
    }

    /**
     * @notice 仲裁挑战结果
     * @param attestationId 证明ID
     * @param challengeSucceeded 挑战是否成功
     */
    function arbitrate(
        bytes32 attestationId,
        bool challengeSucceeded
    ) external onlyRole(ARBITER_ROLE) {
        Attestation storage att = attestations[attestationId];
        
        require(att.status == AttestationStatus.Challenged, "Not in challenge");

        if (challengeSucceeded) {
            att.status = AttestationStatus.Slashed;
            attesterSlashCount[att.attester]++;
            challengerWinCount[att.challenger]++;

            // 计算惩罚金额
            uint256 slashAmount = (att.bondAmount * slashPercentage) / 10000;
            uint256 refundAmount = att.bondAmount - slashAmount;

            // 惩罚金额给挑战者
            if (slashAmount > 0) {
                IERC20(bondToken).safeTransfer(att.challenger, slashAmount);
            }

            // 剩余返还给证明者
            if (refundAmount > 0) {
                IERC20(bondToken).safeTransfer(att.attester, refundAmount);
            }

            emit AttestationSlashed(attestationId, att.challenger, slashAmount);
        } else {
            att.status = AttestationStatus.Validated;
            attesterValidCount[att.attester]++;
            emit AttestationValidated(attestationId);
        }
    }

    /**
     * @notice 验证证明（Challenge 期结束后）
     */
    function validate(bytes32 attestationId) external {
        Attestation storage att = attestations[attestationId];
        
        require(att.status == AttestationStatus.Pending, "Not pending");
        require(block.timestamp > att.challengeDeadline, "Challenge period not ended");

        att.status = AttestationStatus.Validated;
        attesterValidCount[att.attester]++;

        emit AttestationValidated(attestationId);
    }

    /**
     * @notice 提取 Bond（验证通过后）
     */
    function withdrawBond(bytes32 attestationId) external {
        Attestation storage att = attestations[attestationId];
        
        require(msg.sender == att.attester, "Not attester");
        require(att.status == AttestationStatus.Validated, "Not validated");
        require(att.bondAmount > 0, "No bond");

        uint256 amount = att.bondAmount;
        att.bondAmount = 0;
        att.status = AttestationStatus.Withdrawn;

        IERC20(bondToken).safeTransfer(msg.sender, amount);

        emit BondWithdrawn(attestationId, msg.sender, amount);
    }

    /**
     * @notice 获取证明详情
     */
    function getAttestation(bytes32 attestationId) external view returns (Attestation memory) {
        return attestations[attestationId];
    }

    /**
     * @notice 获取地址的验证统计
     */
    function getAttesterStats(address attester) external view returns (
        uint256 validCount,
        uint256 slashCount
    ) {
        return (attesterValidCount[attester], attesterSlashCount[attester]);
    }

    /**
     * @notice 获取证明总数
     */
    function getTotalAttestations() external view returns (uint256) {
        return attestationIds.length;
    }

    // Admin functions
    function setMinBondAmount(uint256 _amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        minBondAmount = _amount;
    }

    function setChallengePeriod(uint256 _period) external onlyRole(DEFAULT_ADMIN_ROLE) {
        challengePeriod = _period;
    }

    function setSlashPercentage(uint256 _percentage) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_percentage <= 10000, "Invalid percentage");
        slashPercentage = _percentage;
    }
}
