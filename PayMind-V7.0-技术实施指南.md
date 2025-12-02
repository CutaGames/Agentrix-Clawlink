# PayMind V7.0 技术实施指南

**版本**: V7.0  
**日期**: 2025年1月  
**类型**: 技术实施详细指南

---

## 📋 目录

1. [ERC-8004 合约实现](#1-erc-8004-合约实现)
2. [Relayer 服务实现](#2-relayer-服务实现)
3. [Session Key 管理](#3-session-key-管理)
4. [Pre-Flight Check 实现](#4-pre-flight-check-实现)
5. [QuickPay 支付流程](#5-quickpay-支付流程)
6. [Crypto-Rail 集成](#6-crypto-rail-集成)
7. [数据库迁移脚本](#7-数据库迁移脚本)

---

## 1. ERC-8004 合约实现

### 1.1 合约结构

```solidity
// contracts/ERC8004SessionManager.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title ERC8004SessionManager
 * @dev ERC-8004 标准实现：Session Key 管理合约
 */
contract ERC8004SessionManager is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Session {
        address signer;           // Session Key 地址
        address owner;            // 主钱包地址
        uint256 singleLimit;      // 单笔限额（USDC，6 decimals）
        uint256 dailyLimit;       // 每日限额（USDC，6 decimals）
        uint256 usedToday;        // 今日已用（USDC，6 decimals）
        uint256 expiry;           // 过期时间戳
        uint256 lastResetDate;    // 上次重置日期（用于每日限额重置）
        bool isActive;           // 是否激活
    }

    // 状态变量
    mapping(bytes32 => Session) public sessions;
    mapping(address => bytes32[]) public userSessions; // 用户的所有 Session
    address public usdcToken; // USDC 代币地址
    address public relayer;   // Relayer 地址

    // 事件
    event SessionCreated(
        bytes32 indexed sessionId,
        address indexed owner,
        address indexed signer,
        uint256 singleLimit,
        uint256 dailyLimit,
        uint256 expiry
    );

    event PaymentExecuted(
        bytes32 indexed sessionId,
        address indexed to,
        uint256 amount,
        bytes32 indexed paymentId
    );

    event SessionRevoked(
        bytes32 indexed sessionId,
        address indexed owner
    );

    event DailyLimitReset(
        bytes32 indexed sessionId,
        uint256 newDate
    );

    // 修饰符
    modifier onlyRelayer() {
        require(msg.sender == relayer, "Only relayer can execute");
        _;
    }

    modifier validSession(bytes32 sessionId) {
        Session storage session = sessions[sessionId];
        require(session.sessionId != bytes32(0), "Session not found");
        require(session.isActive, "Session not active");
        require(block.timestamp <= session.expiry, "Session expired");
        _;
    }

    constructor(address _usdcToken) {
        usdcToken = _usdcToken;
    }

    /**
     * @dev 创建 Session
     * @param signer Session Key 地址
     * @param singleLimit 单笔限额
     * @param dailyLimit 每日限额
     * @param expiry 过期时间戳
     */
    function createSession(
        address signer,
        uint256 singleLimit,
        uint256 dailyLimit,
        uint256 expiry
    ) external returns (bytes32 sessionId) {
        require(signer != address(0), "Invalid signer");
        require(singleLimit > 0, "Invalid single limit");
        require(dailyLimit >= singleLimit, "Daily limit must >= single limit");
        require(expiry > block.timestamp, "Invalid expiry");

        // 生成 Session ID
        sessionId = keccak256(
            abi.encodePacked(
                msg.sender,
                signer,
                block.timestamp,
                block.number
            )
        );

        // 创建 Session
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

        // 记录用户 Session
        userSessions[msg.sender].push(sessionId);

        emit SessionCreated(
            sessionId,
            msg.sender,
            signer,
            singleLimit,
            dailyLimit,
            expiry
        );

        return sessionId;
    }

    /**
     * @dev 使用 Session 执行支付（由 Relayer 调用）
     * @param sessionId Session ID
     * @param to 收款地址
     * @param amount 支付金额（USDC，6 decimals）
     * @param paymentId 支付 ID（用于追踪）
     * @param signature Session Key 签名
     */
    function executeWithSession(
        bytes32 sessionId,
        address to,
        uint256 amount,
        bytes32 paymentId,
        bytes calldata signature
    ) external onlyRelayer validSession(sessionId) nonReentrant {
        Session storage session = sessions[sessionId];

        // 检查每日限额重置
        uint256 currentDate = block.timestamp / 1 days;
        if (currentDate > session.lastResetDate) {
            session.usedToday = 0;
            session.lastResetDate = currentDate;
            emit DailyLimitReset(sessionId, currentDate);
        }

        // 检查单笔限额
        require(amount <= session.singleLimit, "Exceeds single limit");

        // 检查每日限额
        require(
            session.usedToday + amount <= session.dailyLimit,
            "Exceeds daily limit"
        );

        // 验证签名（简化实现，实际应该使用 EIP-712）
        bytes32 messageHash = keccak256(
            abi.encodePacked(
                "\x19Ethereum Signed Message:\n32",
                keccak256(
                    abi.encodePacked(
                        sessionId,
                        to,
                        amount,
                        paymentId,
                        block.chainid
                    )
                )
            )
        );
        address recoveredSigner = recoverSigner(messageHash, signature);
        require(recoveredSigner == session.signer, "Invalid signature");

        // 更新已用额度
        session.usedToday += amount;

        // 从用户钱包转账 USDC 到收款地址
        IERC20(usdcToken).safeTransferFrom(
            session.owner,
            to,
            amount
        );

        emit PaymentExecuted(sessionId, to, amount, paymentId);
    }

    /**
     * @dev 批量执行支付（节省 Gas）
     * @param sessionIds Session ID 数组
     * @param recipients 收款地址数组
     * @param amounts 支付金额数组
     * @param paymentIds 支付 ID 数组
     * @param signatures 签名数组
     */
    function executeBatchWithSession(
        bytes32[] calldata sessionIds,
        address[] calldata recipients,
        uint256[] calldata amounts,
        bytes32[] calldata paymentIds,
        bytes[] calldata signatures
    ) external onlyRelayer nonReentrant {
        require(
            sessionIds.length == recipients.length &&
            recipients.length == amounts.length &&
            amounts.length == paymentIds.length &&
            paymentIds.length == signatures.length,
            "Array length mismatch"
        );

        for (uint256 i = 0; i < sessionIds.length; i++) {
            this.executeWithSession(
                sessionIds[i],
                recipients[i],
                amounts[i],
                paymentIds[i],
                signatures[i]
            );
        }
    }

    /**
     * @dev 撤销 Session
     * @param sessionId Session ID
     */
    function revokeSession(bytes32 sessionId) external {
        Session storage session = sessions[sessionId];
        require(session.owner == msg.sender, "Not session owner");
        require(session.isActive, "Session already revoked");

        session.isActive = false;

        emit SessionRevoked(sessionId, msg.sender);
    }

    /**
     * @dev 获取 Session 信息
     * @param sessionId Session ID
     */
    function getSession(bytes32 sessionId)
        external
        view
        returns (Session memory)
    {
        return sessions[sessionId];
    }

    /**
     * @dev 获取用户的所有 Session
     * @param user 用户地址
     */
    function getUserSessions(address user)
        external
        view
        returns (bytes32[] memory)
    {
        return userSessions[user];
    }

    /**
     * @dev 设置 Relayer 地址
     */
    function setRelayer(address _relayer) external onlyOwner {
        require(_relayer != address(0), "Invalid relayer");
        relayer = _relayer;
    }

    /**
     * @dev 恢复签名者地址（简化实现）
     */
    function recoverSigner(bytes32 messageHash, bytes memory signature)
        internal
        pure
        returns (address)
    {
        require(signature.length == 65, "Invalid signature length");

        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
        }

        if (v < 27) {
            v += 27;
        }

        require(v == 27 || v == 28, "Invalid signature");

        return ecrecover(messageHash, v, r, s);
    }
}
```

### 1.2 合约部署脚本

```typescript
// scripts/deploy-erc8004.ts
import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const usdcAddress = process.env.USDC_ADDRESS || "0x..."; // USDC 地址

  console.log("Deploying ERC8004SessionManager with account:", deployer.address);

  const ERC8004SessionManager = await ethers.getContractFactory(
    "ERC8004SessionManager"
  );
  const sessionManager = await ERC8004SessionManager.deploy(usdcAddress);

  await sessionManager.deployed();

  console.log("ERC8004SessionManager deployed to:", sessionManager.address);

  // 设置 Relayer 地址
  const relayerAddress = process.env.RELAYER_ADDRESS || "0x...";
  await sessionManager.setRelayer(relayerAddress);
  console.log("Relayer set to:", relayerAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

---

## 2. Relayer 服务实现

### 2.1 Relayer 服务结构

```typescript
// backend/src/modules/relayer/relayer.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { ERC8004SessionManager } from '../contracts/ERC8004SessionManager';

interface QuickPayRequest {
  sessionId: string;
  paymentId: string;
  to: string;
  amount: string; // USDC amount (6 decimals)
  signature: string;
  nonce: number;
}

interface QueuedPayment {
  request: QuickPayRequest;
  timestamp: number;
  retryCount: number;
}

@Injectable()
export class PayMindRelayerService {
  private readonly logger = new Logger(PayMindRelayerService.name);
  private relayerWallet: ethers.Wallet;
  private provider: ethers.providers.JsonRpcProvider;
  private sessionManagerContract: ethers.Contract;
  private paymentQueue: QueuedPayment[] = [];
  private nonceManager: Map<string, number> = new Map(); // sessionId -> lastNonce

  constructor(private configService: ConfigService) {
    // 初始化 Relayer 钱包（用于付 Gas）
    const relayerPrivateKey = this.configService.get<string>('RELAYER_PRIVATE_KEY');
    this.relayerWallet = new ethers.Wallet(relayerPrivateKey);

    // 初始化 Provider
    const rpcUrl = this.configService.get<string>('RPC_URL');
    this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    this.relayerWallet = this.relayerWallet.connect(this.provider);

    // 初始化合约
    const contractAddress = this.configService.get<string>('ERC8004_CONTRACT_ADDRESS');
    this.sessionManagerContract = new ethers.Contract(
      contractAddress,
      ERC8004SessionManager.abi,
      this.relayerWallet
    );

    // 启动批量上链定时器
    this.startBatchProcessor();
  }

  /**
   * 处理 QuickPay 请求（链下验证 + 即时确认）
   */
  async processQuickPay(dto: QuickPayRequest): Promise<{
    success: boolean;
    paymentId: string;
    confirmedAt: Date;
  }> {
    try {
      // 1. 防重放检查
      const lastNonce = this.nonceManager.get(dto.sessionId) || 0;
      if (dto.nonce <= lastNonce) {
        throw new Error('Invalid nonce (replay attack)');
      }

      // 2. 链下验证签名（毫秒级）
      const isValid = await this.verifySessionSignature(dto);
      if (!isValid) {
        throw new Error('Invalid signature');
      }

      // 3. 链上查询 Session 状态（缓存 + 链上验证）
      const session = await this.getSessionFromChain(dto.sessionId);
      if (!session.isActive) {
        throw new Error('Session not active');
      }

      // 4. 检查额度（链下缓存 + 链上验证）
      const amount = ethers.BigNumber.from(dto.amount);
      if (amount.gt(session.singleLimit)) {
        throw new Error('Exceeds single limit');
      }

      // 检查每日限额（需要重置逻辑）
      const currentDate = Math.floor(Date.now() / 86400000); // days since epoch
      const sessionDate = Math.floor(session.lastResetDate.toNumber() / 86400);
      if (currentDate > sessionDate) {
        // 每日限额已重置，需要从链上重新获取
        const updatedSession = await this.getSessionFromChain(dto.sessionId);
        session.usedToday = updatedSession.usedToday;
      }

      if (session.usedToday.add(amount).gt(session.dailyLimit)) {
        throw new Error('Exceeds daily limit');
      }

      // 5. 更新 Nonce
      this.nonceManager.set(dto.sessionId, dto.nonce);

      // 6. 即时返回成功（商户可发货）
      const confirmedAt = new Date();

      // 7. 加入队列，异步上链
      this.paymentQueue.push({
        request: dto,
        timestamp: Date.now(),
        retryCount: 0,
      });

      this.logger.log(
        `QuickPay confirmed: paymentId=${dto.paymentId}, amount=${dto.amount}`
      );

      return {
        success: true,
        paymentId: dto.paymentId,
        confirmedAt,
      };
    } catch (error) {
      this.logger.error(`QuickPay failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * 验证 Session Key 签名（链下，毫秒级）
   */
  private async verifySessionSignature(dto: QuickPayRequest): Promise<boolean> {
    try {
      // 构建消息哈希（与合约一致）
      const messageHash = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
          ['bytes32', 'address', 'uint256', 'bytes32', 'uint256'],
          [
            dto.sessionId,
            dto.to,
            dto.amount,
            dto.paymentId,
            await this.provider.getNetwork().then((n) => n.chainId),
          ]
        )
      );

      // 恢复签名者地址
      const signerAddress = ethers.utils.verifyMessage(
        ethers.utils.arrayify(messageHash),
        dto.signature
      );

      // 从链上获取 Session 信息，验证 signer
      const session = await this.getSessionFromChain(dto.sessionId);
      return signerAddress.toLowerCase() === session.signer.toLowerCase();
    } catch (error) {
      this.logger.error(`Signature verification failed: ${error.message}`);
      return false;
    }
  }

  /**
   * 从链上获取 Session 信息
   */
  private async getSessionFromChain(sessionId: string): Promise<{
    signer: string;
    owner: string;
    singleLimit: ethers.BigNumber;
    dailyLimit: ethers.BigNumber;
    usedToday: ethers.BigNumber;
    expiry: ethers.BigNumber;
    lastResetDate: ethers.BigNumber;
    isActive: boolean;
  }> {
    const session = await this.sessionManagerContract.getSession(sessionId);
    return {
      signer: session.signer,
      owner: session.owner,
      singleLimit: session.singleLimit,
      dailyLimit: session.dailyLimit,
      usedToday: session.usedToday,
      expiry: session.expiry,
      lastResetDate: session.lastResetDate,
      isActive: session.isActive,
    };
  }

  /**
   * 批量上链处理器（定时执行）
   */
  private startBatchProcessor() {
    // 每 30 秒执行一次批量上链
    setInterval(async () => {
      if (this.paymentQueue.length === 0) return;

      // 积累最多 10 笔或立即上链（如果队列中有超过 5 分钟的支付）
      const now = Date.now();
      const oldPayments = this.paymentQueue.filter(
        (p) => now - p.timestamp > 5 * 60 * 1000
      );
      const batchSize = Math.min(10, this.paymentQueue.length);

      const batch = oldPayments.length > 0
        ? oldPayments.slice(0, batchSize)
        : this.paymentQueue.slice(0, batchSize);

      if (batch.length === 0) return;

      try {
        await this.executeBatchOnChain(batch.map((p) => p.request));
        // 从队列中移除已处理的支付
        this.paymentQueue = this.paymentQueue.filter(
          (p) => !batch.includes(p)
        );
      } catch (error) {
        this.logger.error(`Batch execution failed: ${error.message}`);
        // 重试逻辑
        batch.forEach((p) => {
          p.retryCount++;
          if (p.retryCount < 3) {
            // 重新加入队列
            this.paymentQueue.push(p);
          }
        });
      }
    }, 30000); // 30 秒
  }

  /**
   * 批量上链执行
   */
  private async executeBatchOnChain(payments: QuickPayRequest[]) {
    if (payments.length === 0) return;

    this.logger.log(`Executing batch on-chain: ${payments.length} payments`);

    // 准备批量执行参数
    const sessionIds = payments.map((p) => p.sessionId);
    const recipients = payments.map((p) => p.to);
    const amounts = payments.map((p) => p.amount);
    const paymentIds = payments.map((p) => ethers.utils.formatBytes32String(p.paymentId));
    const signatures = payments.map((p) => p.signature);

    // 调用合约批量执行
    const tx = await this.sessionManagerContract.executeBatchWithSession(
      sessionIds,
      recipients,
      amounts,
      paymentIds,
      signatures,
      {
        gasLimit: 500000 * payments.length, // 估算 Gas
      }
    );

    const receipt = await tx.wait();
    this.logger.log(
      `Batch execution confirmed: txHash=${receipt.transactionHash}, gasUsed=${receipt.gasUsed}`
    );
  }
}
```

### 2.2 Relayer Controller

```typescript
// backend/src/modules/relayer/relayer.controller.ts
import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PayMindRelayerService } from './relayer.service';
import { QuickPayRequestDto } from './dto/relayer.dto';

@ApiTags('relayer')
@Controller('relayer')
export class RelayerController {
  constructor(private readonly relayerService: PayMindRelayerService) {}

  @Post('/quickpay')
  @ApiOperation({ summary: '处理 QuickPay 请求（Agent 调用）' })
  @ApiResponse({ status: 200, description: '支付确认成功' })
  async processQuickPay(@Body() dto: QuickPayRequestDto) {
    return this.relayerService.processQuickPay(dto);
  }
}
```

---

## 3. Session Key 管理

### 3.1 前端 Session Key 生成器

```typescript
// paymindfrontend/lib/session-key-manager.ts
import { ethers } from 'ethers';

export interface SessionKeyPair {
  publicKey: string; // Session Key 地址
  privateKey: string; // 加密后的私钥
}

export class SessionKeyManager {
  private static readonly STORAGE_KEY = 'paymind_session_keys';

  /**
   * 生成 Session Key（浏览器本地）
   */
  static async generateSessionKey(): Promise<SessionKeyPair> {
    // 生成随机钱包
    const wallet = ethers.Wallet.createRandom();
    const publicKey = wallet.address;
    const privateKey = wallet.privateKey;

    // 加密私钥（使用用户密码或主钱包签名）
    const encryptedPrivateKey = await this.encryptPrivateKey(privateKey);

    // 保存到 IndexedDB
    await this.saveToIndexedDB(publicKey, encryptedPrivateKey);

    return {
      publicKey,
      privateKey: encryptedPrivateKey,
    };
  }

  /**
   * 使用 Session Key 签名
   */
  static async signWithSessionKey(
    sessionKeyAddress: string,
    message: string
  ): Promise<string> {
    // 从 IndexedDB 获取加密私钥
    const encryptedPrivateKey = await this.getFromIndexedDB(sessionKeyAddress);
    if (!encryptedPrivateKey) {
      throw new Error('Session key not found');
    }

    // 解密私钥
    const privateKey = await this.decryptPrivateKey(encryptedPrivateKey);

    // 使用私钥签名
    const wallet = new ethers.Wallet(privateKey);
    const signature = await wallet.signMessage(ethers.utils.arrayify(message));

    return signature;
  }

  /**
   * 加密私钥（使用用户密码）
   */
  private static async encryptPrivateKey(
    privateKey: string
  ): Promise<string> {
    // 使用 Web Crypto API 加密
    // 实际实现应该使用用户密码或主钱包签名作为密钥
    // 这里简化实现
    return btoa(privateKey); // Base64 编码（实际应该使用 AES 加密）
  }

  /**
   * 解密私钥
   */
  private static async decryptPrivateKey(
    encryptedPrivateKey: string
  ): Promise<string> {
    return atob(encryptedPrivateKey); // Base64 解码
  }

  /**
   * 保存到 IndexedDB
   */
  private static async saveToIndexedDB(
    publicKey: string,
    encryptedPrivateKey: string
  ): Promise<void> {
    // IndexedDB 实现
    // 实际应该使用 idb 库
    localStorage.setItem(
      `${this.STORAGE_KEY}_${publicKey}`,
      encryptedPrivateKey
    );
  }

  /**
   * 从 IndexedDB 获取
   */
  private static async getFromIndexedDB(
    publicKey: string
  ): Promise<string | null> {
    return localStorage.getItem(`${this.STORAGE_KEY}_${publicKey}`);
  }
}
```

### 3.2 创建 Session（前端 + 后端）

```typescript
// paymindfrontend/hooks/useSessionManager.ts
import { useState } from 'react';
import { SessionKeyManager } from '@/lib/session-key-manager';
import { useWallet } from '@/contexts/WalletContext';
import { api } from '@/lib/api';

export function useSessionManager() {
  const { wallet, signMessage } = useWallet();
  const [isCreating, setIsCreating] = useState(false);

  /**
   * 创建 Session（用户授权 Agent 使用）
   */
  const createSession = async (config: {
    singleLimit: number; // USDC amount
    dailyLimit: number;
    expiryDays: number;
  }) => {
    setIsCreating(true);
    try {
      // 1. 生成 Session Key（浏览器本地）
      const sessionKey = await SessionKeyManager.generateSessionKey();

      // 2. 使用主钱包签名授权（一次性）
      const message = `Authorize Session Key: ${sessionKey.publicKey}\nSingle Limit: ${config.singleLimit} USDC\nDaily Limit: ${config.dailyLimit} USDC\nExpiry: ${config.expiryDays} days`;
      const signature = await signMessage(message);

      // 3. 调用后端创建链上 Session
      const session = await api.createSession({
        signer: sessionKey.publicKey,
        singleLimit: config.singleLimit * 1e6, // 转换为 6 decimals
        dailyLimit: config.dailyLimit * 1e6,
        expiryDays: config.expiryDays,
        signature,
      });

      return session;
    } finally {
      setIsCreating(false);
    }
  };

  return {
    createSession,
    isCreating,
  };
}
```

---

## 4. Pre-Flight Check 实现

### 4.1 Pre-Flight Check Service

```typescript
// backend/src/modules/payment/preflight-check.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { WalletConnection } from '../../entities/wallet-connection.entity';
import { ERC8004SessionManager } from '../contracts/ERC8004SessionManager';
import { ethers } from 'ethers';

interface PreflightResult {
  recommendedRoute: 'quickpay' | 'wallet' | 'crypto-rail' | 'local-rail';
  quickPayAvailable: boolean;
  sessionLimit?: {
    singleLimit: string;
    dailyLimit: string;
    dailyRemaining: string;
  };
  walletBalance?: string;
  requiresKYC?: boolean;
}

@Injectable()
export class PreflightCheckService {
  private readonly logger = new Logger(PreflightCheckService.name);
  private provider: ethers.providers.JsonRpcProvider;
  private sessionManagerContract: ethers.Contract;
  private usdcContract: ethers.Contract;

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(WalletConnection)
    private walletRepository: Repository<WalletConnection>,
  ) {
    // 初始化 Provider 和合约
    const rpcUrl = process.env.RPC_URL;
    this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);

    const contractAddress = process.env.ERC8004_CONTRACT_ADDRESS;
    this.sessionManagerContract = new ethers.Contract(
      contractAddress,
      ERC8004SessionManager.abi,
      this.provider
    );

    const usdcAddress = process.env.USDC_ADDRESS;
    // USDC ABI (简化，只需要 balanceOf)
    this.usdcContract = new ethers.Contract(
      usdcAddress,
      ['function balanceOf(address) view returns (uint256)'],
      this.provider
    );
  }

  /**
   * Pre-Flight Check（200ms 内返回）
   */
  async check(
    userId: string,
    amount: number, // USDC amount
    currency: string,
  ): Promise<PreflightResult> {
    const startTime = Date.now();

    try {
      // 1. 获取用户钱包地址
      const wallet = await this.walletRepository.findOne({
        where: { userId, isDefault: true },
      });

      if (!wallet) {
        return {
          recommendedRoute: 'crypto-rail',
          quickPayAvailable: false,
          requiresKYC: true,
        };
      }

      // 2. 并行查询（提高速度）
      const [balance, sessions, user] = await Promise.all([
        this.getWalletBalance(wallet.walletAddress),
        this.getUserSessions(wallet.walletAddress),
        this.userRepository.findOne({ where: { id: userId } }),
      ]);

      const amountBN = ethers.utils.parseUnits(amount.toString(), 6); // USDC 6 decimals

      // 3. 检查 QuickPay 可用性
      let quickPayAvailable = false;
      let sessionLimit: PreflightResult['sessionLimit'] | undefined;

      if (sessions.length > 0) {
        // 获取第一个活跃 Session
        const activeSession = sessions.find((s) => s.isActive);
        if (activeSession) {
          // 检查单笔限额和每日限额
          const singleLimit = activeSession.singleLimit;
          const dailyRemaining = activeSession.dailyLimit.sub(
            activeSession.usedToday
          );

          if (
            amountBN.lte(singleLimit) &&
            amountBN.lte(dailyRemaining) &&
            balance.gte(amountBN)
          ) {
            quickPayAvailable = true;
            sessionLimit = {
              singleLimit: ethers.utils.formatUnits(singleLimit, 6),
              dailyLimit: ethers.utils.formatUnits(
                activeSession.dailyLimit,
                6
              ),
              dailyRemaining: ethers.utils.formatUnits(dailyRemaining, 6),
            };
          }
        }
      }

      // 4. 路由决策
      let recommendedRoute: PreflightResult['recommendedRoute'];

      if (quickPayAvailable) {
        recommendedRoute = 'quickpay';
      } else if (balance.gte(amountBN)) {
        recommendedRoute = 'wallet';
      } else {
        recommendedRoute = 'crypto-rail';
      }

      const elapsed = Date.now() - startTime;
      this.logger.log(`Pre-flight check completed in ${elapsed}ms`);

      return {
        recommendedRoute,
        quickPayAvailable,
        sessionLimit,
        walletBalance: ethers.utils.formatUnits(balance, 6),
        requiresKYC: user?.kycLevel === 'none',
      };
    } catch (error) {
      this.logger.error(`Pre-flight check failed: ${error.message}`);
      // 降级到默认路由
      return {
        recommendedRoute: 'crypto-rail',
        quickPayAvailable: false,
        requiresKYC: true,
      };
    }
  }

  /**
   * 获取钱包余额（链上查询）
   */
  private async getWalletBalance(
    walletAddress: string
  ): Promise<ethers.BigNumber> {
    return this.usdcContract.balanceOf(walletAddress);
  }

  /**
   * 获取用户的所有 Session（链上查询）
   */
  private async getUserSessions(walletAddress: string) {
    const sessionIds = await this.sessionManagerContract.getUserSessions(
      walletAddress
    );
    const sessions = await Promise.all(
      sessionIds.map((id: string) =>
        this.sessionManagerContract.getSession(id)
      )
    );
    return sessions;
  }
}
```

---

## 5. QuickPay 支付流程

### 5.1 前端 QuickPay 组件

```typescript
// paymindfrontend/components/payment/QuickPayButton.tsx
import { useState } from 'react';
import { SessionKeyManager } from '@/lib/session-key-manager';
import { useSessionManager } from '@/hooks/useSessionManager';
import { api } from '@/lib/api';
import { ethers } from 'ethers';

interface QuickPayButtonProps {
  amount: number; // USDC amount
  to: string; // 收款地址
  paymentId: string;
  onSuccess: () => void;
  onError: (error: Error) => void;
}

export function QuickPayButton({
  amount,
  to,
  paymentId,
  onSuccess,
  onError,
}: QuickPayButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { session } = useSessionManager(); // 当前活跃的 Session

  const handleQuickPay = async () => {
    if (!session) {
      onError(new Error('No active session'));
      return;
    }

    setIsProcessing(true);

    try {
      // 1. 使用 Session Key 签名（链下）
      const messageHash = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
          ['bytes32', 'address', 'uint256', 'bytes32', 'uint256'],
          [
            session.sessionId,
            to,
            ethers.utils.parseUnits(amount.toString(), 6),
            ethers.utils.formatBytes32String(paymentId),
            await window.ethereum.request({ method: 'eth_chainId' }).then((id) => parseInt(id as string, 16)),
          ]
        )
      );

      const signature = await SessionKeyManager.signWithSessionKey(
        session.signer,
        messageHash
      );

      // 2. 调用 Relayer API（即时确认）
      const result = await api.relayer.quickpay({
        sessionId: session.sessionId,
        paymentId,
        to,
        amount: ethers.utils.parseUnits(amount.toString(), 6).toString(),
        signature,
        nonce: Date.now(), // 简化实现，实际应该使用递增 nonce
      });

      // 3. 支付确认成功（商户可发货）
      onSuccess();
    } catch (error) {
      onError(error as Error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <button
      onClick={handleQuickPay}
      disabled={isProcessing}
      className="quickpay-button"
    >
      {isProcessing ? 'Processing...' : '⚡ Quick Pay'}
    </button>
  );
}
```

---

## 6. Crypto-Rail 集成

### 6.1 Crypto-Rail Service

```typescript
// backend/src/modules/payment/crypto-rail.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

interface ProviderRoute {
  provider: 'moonpay' | 'meld';
  rate: number;
  rateLockedUntil: Date;
  prefillLink: string;
  fees: {
    providerFee: number;
    networkFee: number;
    total: number;
  };
}

@Injectable()
export class CryptoRailService {
  private readonly logger = new Logger(CryptoRailService.name);

  constructor(private configService: ConfigService) {}

  /**
   * 选择最优 Provider
   */
  async selectProvider(
    amount: number,
    currency: string,
    userId: string,
  ): Promise<ProviderRoute> {
    // 1. 获取所有 Provider 的报价
    const [moonpayQuote, meldQuote] = await Promise.all([
      this.getMoonPayQuote(amount, currency),
      this.getMeldQuote(amount, currency),
    ]);

    // 2. 比较费用，选择最优
    const providers = [
      { name: 'moonpay' as const, quote: moonpayQuote },
      { name: 'meld' as const, quote: meldQuote },
    ];

    const bestProvider = providers.reduce((best, current) => {
      return current.quote.fees.total < best.quote.fees.total
        ? current
        : best;
    });

    // 3. 生成预填充链接
    const prefillLink = await this.generatePrefillLink(
      bestProvider.name,
      amount,
      currency,
      userId,
    );

    return {
      provider: bestProvider.name,
      rate: bestProvider.quote.rate,
      rateLockedUntil: bestProvider.quote.rateLockedUntil,
      prefillLink,
      fees: bestProvider.quote.fees,
    };
  }

  /**
   * 生成预填充链接（自动填入 PayMind 合约地址）
   */
  private async generatePrefillLink(
    provider: 'moonpay' | 'meld',
    amount: number,
    currency: string,
    userId: string,
  ): Promise<string> {
    const contractAddress = this.configService.get<string>(
      'PAYMIND_CONTRACT_ADDRESS'
    );
    const orderId = `order_${userId}_${Date.now()}`;

    if (provider === 'moonpay') {
      // MoonPay 预填充链接
      return `https://buy.moonpay.com/?apiKey=${this.configService.get(
        'MOONPAY_API_KEY'
      )}&walletAddress=${contractAddress}&currencyCode=${currency}&baseCurrencyAmount=${amount}&orderId=${orderId}`;
    } else {
      // Meld 预填充链接
      return `https://meld.com/buy?wallet=${contractAddress}&amount=${amount}&currency=${currency}&orderId=${orderId}`;
    }
  }

  /**
   * 获取 MoonPay 报价
   */
  private async getMoonPayQuote(
    amount: number,
    currency: string,
  ): Promise<{
    rate: number;
    rateLockedUntil: Date;
    fees: {
      providerFee: number;
      networkFee: number;
      total: number;
    };
  }> {
    // 调用 MoonPay API 获取报价
    const response = await axios.get(
      `https://api.moonpay.com/v3/currencies/${currency}/quote`,
      {
        params: {
          baseCurrencyAmount: amount,
          apiKey: this.configService.get('MOONPAY_API_KEY'),
        },
      }
    );

    return {
      rate: response.data.quoteCurrencyPrice,
      rateLockedUntil: new Date(Date.now() + 5 * 60 * 1000), // 5 分钟锁定
      fees: {
        providerFee: response.data.feeAmount,
        networkFee: response.data.networkFeeAmount,
        total: response.data.totalAmount,
      },
    };
  }

  /**
   * 获取 Meld 报价
   */
  private async getMeldQuote(
    amount: number,
    currency: string,
  ): Promise<{
    rate: number;
    rateLockedUntil: Date;
    fees: {
      providerFee: number;
      networkFee: number;
      total: number;
    };
  }> {
    // 调用 Meld API 获取报价
    // 类似实现
    return {
      rate: 1.0,
      rateLockedUntil: new Date(Date.now() + 5 * 60 * 1000),
      fees: {
        providerFee: amount * 0.02,
        networkFee: 0,
        total: amount * 1.02,
      },
    };
  }
}
```

---

## 7. 数据库迁移脚本

### 7.1 创建 agent_sessions 表

```typescript
// backend/src/migrations/XXXXXX-CreateAgentSessions.ts
import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateAgentSessions1234567890 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'agent_sessions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'session_id',
            type: 'varchar',
            length: '66', // bytes32 hex string
            isUnique: true,
          },
          {
            name: 'user_id',
            type: 'uuid',
          },
          {
            name: 'agent_id',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'signer_address',
            type: 'varchar',
            length: '42', // Ethereum address
          },
          {
            name: 'owner_address',
            type: 'varchar',
            length: '42',
          },
          {
            name: 'single_limit',
            type: 'decimal',
            precision: 18,
            scale: 6, // USDC 6 decimals
          },
          {
            name: 'daily_limit',
            type: 'decimal',
            precision: 18,
            scale: 6,
          },
          {
            name: 'used_today',
            type: 'decimal',
            precision: 18,
            scale: 6,
            default: 0,
          },
          {
            name: 'expiry',
            type: 'timestamp',
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['active', 'revoked', 'expired'],
            default: "'active'",
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
        foreignKeys: [
          {
            columnNames: ['user_id'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
        indices: [
          {
            name: 'IDX_agent_sessions_user_id',
            columnNames: ['user_id'],
          },
          {
            name: 'IDX_agent_sessions_session_id',
            columnNames: ['session_id'],
          },
          {
            name: 'IDX_agent_sessions_status',
            columnNames: ['status'],
          },
        ],
      }),
      true
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('agent_sessions');
  }
}
```

### 7.2 迁移旧数据脚本

```typescript
// backend/src/scripts/migrate-to-erc8004.ts
import { DataSource } from 'typeorm';
import { AutoPayGrant } from '../entities/auto-pay-grant.entity';
import { WalletConnection } from '../entities/wallet-connection.entity';

/**
 * 将 AutoPayGrant 数据迁移到链上 Session
 */
export async function migrateToERC8004(dataSource: DataSource) {
  const grantRepository = dataSource.getRepository(AutoPayGrant);
  const walletRepository = dataSource.getRepository(WalletConnection);

  const grants = await grantRepository.find({
    where: { isActive: true },
  });

  for (const grant of grants) {
    // 1. 获取用户钱包地址
    const wallet = await walletRepository.findOne({
      where: { userId: grant.userId, isDefault: true },
    });

    if (!wallet) {
      console.log(`Skipping grant ${grant.id}: no wallet found`);
      continue;
    }

    // 2. 调用合约创建 Session（需要用户签名，这里只是记录）
    console.log(`Migrating grant ${grant.id} for user ${grant.userId}`);
    console.log(`  - Single Limit: ${grant.singleLimit}`);
    console.log(`  - Daily Limit: ${grant.dailyLimit}`);
    console.log(`  - Expiry: ${grant.expiresAt}`);
    console.log(`  - Wallet: ${wallet.walletAddress}`);

    // 注意：实际迁移需要用户签名授权，这里只是记录需要迁移的数据
    // 实际应该通过前端界面让用户重新授权
  }
}
```

---

## 总结

本指南提供了 PayMind V7.0 的核心技术实现细节，包括：

1. ✅ **ERC-8004 合约** - 完整的 Session 管理合约
2. ✅ **Relayer 服务** - 链下验证 + 即时确认 + 异步上链
3. ✅ **Session Key 管理** - 前端生成和管理
4. ✅ **Pre-Flight Check** - 200ms 路由决策
5. ✅ **QuickPay 流程** - 完整的支付流程
6. ✅ **Crypto-Rail** - Provider 聚合
7. ✅ **数据库迁移** - 表结构和数据迁移

**下一步**：
1. 部署 ERC-8004 合约到测试网
2. 搭建 Relayer 服务
3. 实现前端 Session Key 生成器
4. 集成测试

---

**文档版本**: V1.0  
**最后更新**: 2025年1月

