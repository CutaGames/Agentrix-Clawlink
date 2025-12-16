// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/**
 * @title MerkleDistributor
 * @notice Merkle 树分发器 - 用于高效分发 Epoch 奖励
 * @dev 
 *   - 使用 Merkle 证明验证领取资格
 *   - 支持多 Epoch 累积领取
 *   - 支持多种代币分发
 */
contract MerkleDistributor is AccessControl {
    using SafeERC20 for IERC20;

    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    // Treasury 地址（奖励来源）
    address public treasury;

    // Epoch Merkle Roots (epochId => token => merkleRoot)
    mapping(uint256 => mapping(address => bytes32)) public epochMerkleRoots;

    // 已领取记录 (epochId => token => account => claimed)
    mapping(uint256 => mapping(address => mapping(address => bool))) public claimed;

    // 累积领取金额 (account => token => totalClaimed)
    mapping(address => mapping(address => uint256)) public totalClaimed;

    // Events
    event MerkleRootSet(uint256 indexed epochId, address indexed token, bytes32 merkleRoot);
    event Claimed(
        uint256 indexed epochId,
        address indexed account,
        address indexed token,
        uint256 amount
    );
    event TreasuryUpdated(address oldTreasury, address newTreasury);

    constructor(address _admin, address _treasury) {
        require(_treasury != address(0), "Invalid treasury");
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(OPERATOR_ROLE, _admin);
        treasury = _treasury;
    }

    /**
     * @notice 设置某个 Epoch 的 Merkle Root
     * @dev 由 OPERATOR 调用（通常是 EpochManager 或后端服务）
     */
    function setMerkleRoot(
        uint256 epochId,
        address token,
        bytes32 merkleRoot
    ) external onlyRole(OPERATOR_ROLE) {
        require(merkleRoot != bytes32(0), "Invalid merkle root");
        epochMerkleRoots[epochId][token] = merkleRoot;
        emit MerkleRootSet(epochId, token, merkleRoot);
    }

    /**
     * @notice 领取单个 Epoch 的奖励
     * @param epochId Epoch ID
     * @param token 代币地址
     * @param amount 领取金额
     * @param merkleProof Merkle 证明
     */
    function claim(
        uint256 epochId,
        address token,
        uint256 amount,
        bytes32[] calldata merkleProof
    ) external {
        require(!claimed[epochId][token][msg.sender], "Already claimed");
        
        bytes32 merkleRoot = epochMerkleRoots[epochId][token];
        require(merkleRoot != bytes32(0), "Merkle root not set");

        // 验证 Merkle 证明
        bytes32 leaf = keccak256(abi.encodePacked(msg.sender, amount));
        require(MerkleProof.verify(merkleProof, merkleRoot, leaf), "Invalid proof");

        // 标记已领取
        claimed[epochId][token][msg.sender] = true;
        totalClaimed[msg.sender][token] += amount;

        // 从 Treasury 转账给用户
        IERC20(token).safeTransferFrom(treasury, msg.sender, amount);

        emit Claimed(epochId, msg.sender, token, amount);
    }

    /**
     * @notice 批量领取多个 Epoch 的奖励
     * @param epochIds Epoch ID 数组
     * @param token 代币地址
     * @param amounts 金额数组
     * @param merkleProofs Merkle 证明数组
     */
    function claimMultiple(
        uint256[] calldata epochIds,
        address token,
        uint256[] calldata amounts,
        bytes32[][] calldata merkleProofs
    ) external {
        require(epochIds.length == amounts.length, "Length mismatch");
        require(epochIds.length == merkleProofs.length, "Length mismatch");

        uint256 totalAmount = 0;

        for (uint256 i = 0; i < epochIds.length; i++) {
            uint256 epochId = epochIds[i];
            uint256 amount = amounts[i];
            
            if (claimed[epochId][token][msg.sender]) {
                continue; // 跳过已领取的
            }

            bytes32 merkleRoot = epochMerkleRoots[epochId][token];
            if (merkleRoot == bytes32(0)) {
                continue; // 跳过未设置的
            }

            bytes32 leaf = keccak256(abi.encodePacked(msg.sender, amount));
            if (!MerkleProof.verify(merkleProofs[i], merkleRoot, leaf)) {
                continue; // 跳过验证失败的
            }

            claimed[epochId][token][msg.sender] = true;
            totalAmount += amount;

            emit Claimed(epochId, msg.sender, token, amount);
        }

        if (totalAmount > 0) {
            totalClaimed[msg.sender][token] += totalAmount;
            IERC20(token).safeTransferFrom(treasury, msg.sender, totalAmount);
        }
    }

    /**
     * @notice 检查是否已领取
     */
    function isClaimed(
        uint256 epochId,
        address token,
        address account
    ) external view returns (bool) {
        return claimed[epochId][token][account];
    }

    /**
     * @notice 验证领取资格（不实际领取）
     */
    function canClaim(
        uint256 epochId,
        address token,
        address account,
        uint256 amount,
        bytes32[] calldata merkleProof
    ) external view returns (bool) {
        if (claimed[epochId][token][account]) {
            return false;
        }

        bytes32 merkleRoot = epochMerkleRoots[epochId][token];
        if (merkleRoot == bytes32(0)) {
            return false;
        }

        bytes32 leaf = keccak256(abi.encodePacked(account, amount));
        return MerkleProof.verify(merkleProof, merkleRoot, leaf);
    }

    /**
     * @notice 更新 Treasury 地址
     */
    function setTreasury(address _treasury) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_treasury != address(0), "Invalid treasury");
        address oldTreasury = treasury;
        treasury = _treasury;
        emit TreasuryUpdated(oldTreasury, _treasury);
    }
}
