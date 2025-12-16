// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title ArnSessionManager
 * @notice X402 V2 Session Manager (ERC8004 Enhanced)
 * @dev Supports "Approve and Call" pattern for seamless integration with Commission contracts
 */
contract ArnSessionManager is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using ECDSA for bytes32;

    struct Session {
        address signer;      // Session Key address
        address owner;       // User wallet address
        uint256 singleLimit; // Single transaction limit
        uint256 dailyLimit;  // Daily transaction limit
        uint256 usedToday;   // Amount used today
        uint256 expiry;      // Expiry timestamp
        uint256 lastResetDate; // Last reset date (days since epoch)
        bool isActive;       // Is session active
    }

    // State variables
    mapping(bytes32 => Session) public sessions;
    mapping(address => bytes32[]) public userSessions;
    address public usdcToken;
    address public relayer;

    // Events
    event SessionCreated(bytes32 indexed sessionId, address indexed owner, address indexed signer, uint256 singleLimit, uint256 dailyLimit, uint256 expiry);
    event SessionRevoked(bytes32 indexed sessionId, address indexed owner);
    event PaymentExecuted(bytes32 indexed sessionId, address indexed to, uint256 amount, bytes32 paymentId);
    event DailyLimitReset(bytes32 indexed sessionId, uint256 date);

    modifier onlyRelayer() {
        require(msg.sender == relayer, "Only relayer");
        _;
    }

    modifier validSession(bytes32 sessionId) {
        require(sessions[sessionId].isActive, "Session not active");
        require(sessions[sessionId].expiry > block.timestamp, "Session expired");
        _;
    }

    constructor(address _usdcToken) Ownable(msg.sender) {
        usdcToken = _usdcToken;
    }

    function setRelayer(address _relayer) external onlyOwner {
        relayer = _relayer;
    }

    function createSession(
        address signer,
        uint256 singleLimit,
        uint256 dailyLimit,
        uint256 expiry
    ) external returns (bytes32) {
        bytes32 sessionId = keccak256(
            abi.encodePacked(msg.sender, signer, block.timestamp, block.number)
        );

        sessions[sessionId] = Session({
            signer: signer,
            owner: msg.sender,
            singleLimit: singleLimit,
            dailyLimit: dailyLimit,
            usedToday: 0,
            expiry: expiry,
            lastResetDate: block.timestamp / 1 days,
            isActive: true
        });

        userSessions[msg.sender].push(sessionId);
        emit SessionCreated(sessionId, msg.sender, signer, singleLimit, dailyLimit, expiry);
        return sessionId;
    }

    /**
     * @notice Execute payment with session and optional contract call
     * @dev Supports two modes:
     * 1. Simple Transfer: If data is empty, transfers tokens to 'to'.
     * 2. Approve and Call: If data is present, pulls tokens from user, approves 'to', and calls 'to'.
     */
    function executeWithSession(
        bytes32 sessionId,
        address to,
        uint256 amount,
        bytes32 paymentId,
        bytes calldata signature,
        bytes calldata data
    ) external onlyRelayer validSession(sessionId) nonReentrant {
        Session storage session = sessions[sessionId];

        // 1. Check Limits
        uint256 currentDate = block.timestamp / 1 days;
        if (currentDate > session.lastResetDate) {
            session.usedToday = 0;
            session.lastResetDate = currentDate;
            emit DailyLimitReset(sessionId, currentDate);
        }

        require(amount <= session.singleLimit, "Exceeds single limit");
        require(session.usedToday + amount <= session.dailyLimit, "Exceeds daily limit");

        // 2. Verify Signature
        bytes32 messageHash = keccak256(
            abi.encodePacked(
                "\x19Ethereum Signed Message:\n32",
                keccak256(abi.encodePacked(sessionId, to, amount, paymentId, block.chainid))
            )
        );
        address recoveredSigner = messageHash.recover(signature);
        require(recoveredSigner == session.signer, "Invalid signature");

        // 3. Update Usage
        session.usedToday += amount;

        // 4. Execute Payment
        // Note: Assuming amount is in 6 decimals (USDC standard) or matching token decimals
        // For simplicity, we assume amount matches token decimals here. 
        // In production, handle decimal conversion if needed.
        
        if (data.length > 0) {
            // Mode 2: Approve and Call (for Commission Contracts)
            // a. Pull tokens from User to SessionManager
            IERC20(usdcToken).safeTransferFrom(session.owner, address(this), amount);
            
            // b. Approve 'to' contract to spend tokens
            IERC20(usdcToken).forceApprove(to, amount);
            
            // c. Call 'to' contract
            (bool success, bytes memory returnData) = to.call(data);
            require(success, string(abi.encodePacked("Call failed: ", returnData)));
            
            // d. Reset approval (optional but good practice)
            IERC20(usdcToken).forceApprove(to, 0);
        } else {
            // Mode 1: Simple Transfer (Legacy / Direct Payment)
            IERC20(usdcToken).safeTransferFrom(session.owner, to, amount);
        }

        emit PaymentExecuted(sessionId, to, amount, paymentId);
    }
}
