// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title EpochManager
 * @notice Epoch 管理器 - 管理分配周期
 * @dev 
 *   - 每个 Epoch 默认 7 天
 *   - Epoch 结束后触发 MerkleDistributor 分配
 *   - 支持手动推进和自动推进
 */
contract EpochManager is AccessControl {
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    struct Epoch {
        uint256 id;
        uint256 startTime;
        uint256 endTime;
        bytes32 merkleRoot;      // 该 Epoch 的 Merkle Root
        bool finalized;          // 是否已完成分配
        uint256 totalRewards;    // 该 Epoch 的总奖励
    }

    // Configuration
    uint256 public epochDuration = 7 days;
    uint256 public minEpochDuration = 1 days;
    uint256 public maxEpochDuration = 30 days;

    // State
    uint256 public currentEpochId;
    mapping(uint256 => Epoch) public epochs;
    
    // Events
    event EpochStarted(uint256 indexed epochId, uint256 startTime, uint256 endTime);
    event EpochFinalized(uint256 indexed epochId, bytes32 merkleRoot, uint256 totalRewards);
    event EpochDurationUpdated(uint256 oldDuration, uint256 newDuration);

    constructor(address _admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(OPERATOR_ROLE, _admin);

        // 初始化第一个 Epoch
        currentEpochId = 1;
        epochs[currentEpochId] = Epoch({
            id: currentEpochId,
            startTime: block.timestamp,
            endTime: block.timestamp + epochDuration,
            merkleRoot: bytes32(0),
            finalized: false,
            totalRewards: 0
        });

        emit EpochStarted(currentEpochId, block.timestamp, block.timestamp + epochDuration);
    }

    /**
     * @notice 获取当前 Epoch ID
     * @dev 如果当前 Epoch 已过期但未推进，仍返回当前 ID
     */
    function getCurrentEpochId() external view returns (uint256) {
        return currentEpochId;
    }

    /**
     * @notice 获取当前 Epoch 信息
     */
    function getCurrentEpoch() external view returns (Epoch memory) {
        return epochs[currentEpochId];
    }

    /**
     * @notice 检查是否可以推进到下一个 Epoch
     */
    function canAdvanceEpoch() public view returns (bool) {
        return block.timestamp >= epochs[currentEpochId].endTime;
    }

    /**
     * @notice 推进到下一个 Epoch
     * @dev 任何人都可以调用（如果满足条件）
     */
    function advanceEpoch() external {
        require(canAdvanceEpoch(), "Current epoch not ended");
        require(epochs[currentEpochId].finalized, "Current epoch not finalized yet");

        // 推进到下一个 Epoch
        currentEpochId++;
        
        epochs[currentEpochId] = Epoch({
            id: currentEpochId,
            startTime: block.timestamp,
            endTime: block.timestamp + epochDuration,
            merkleRoot: bytes32(0),
            finalized: false,
            totalRewards: 0
        });

        emit EpochStarted(currentEpochId, block.timestamp, block.timestamp + epochDuration);
    }

    /**
     * @notice 完成 Epoch 分配（设置 Merkle Root）
     * @dev 只有 OPERATOR_ROLE 可以调用
     */
    function finalizeEpoch(
        uint256 epochId,
        bytes32 merkleRoot,
        uint256 totalRewards
    ) external onlyRole(OPERATOR_ROLE) {
        require(epochId <= currentEpochId, "Invalid epoch");
        require(!epochs[epochId].finalized, "Already finalized");
        require(merkleRoot != bytes32(0), "Invalid merkle root");

        epochs[epochId].merkleRoot = merkleRoot;
        epochs[epochId].totalRewards = totalRewards;
        epochs[epochId].finalized = true;

        emit EpochFinalized(epochId, merkleRoot, totalRewards);
    }

    /**
     * @notice 更新 Epoch 持续时间
     */
    function setEpochDuration(uint256 _duration) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_duration >= minEpochDuration, "Duration too short");
        require(_duration <= maxEpochDuration, "Duration too long");
        
        uint256 oldDuration = epochDuration;
        epochDuration = _duration;
        
        emit EpochDurationUpdated(oldDuration, _duration);
    }

    /**
     * @notice 获取 Epoch 的 Merkle Root
     */
    function getMerkleRoot(uint256 epochId) external view returns (bytes32) {
        return epochs[epochId].merkleRoot;
    }

    /**
     * @notice 检查 Epoch 是否已完成
     */
    function isEpochFinalized(uint256 epochId) external view returns (bool) {
        return epochs[epochId].finalized;
    }
}
