import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import {
  JsonRpcProvider,
  Contract,
  Network,
  keccak256,
  AbiCoder,
  formatUnits,
  ZeroAddress,
} from 'ethers';
import { AgentSession, SessionStatus } from '../../entities/agent-session.entity';
import { WalletConnection } from '../../entities/wallet-connection.entity';
import { CreateSessionDto } from './dto/session.dto';

// ERC8004SessionManager ABI (简化版)
const ERC8004_ABI = [
  'function createSession(address, uint256, uint256, uint256) returns (bytes32)',
  'function revokeSession(bytes32)',
  'function sessions(bytes32) view returns (address signer, address owner, uint256 singleLimit, uint256 dailyLimit, uint256 usedToday, uint256 expiry, uint256 lastResetDate, bool isActive)',
];

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);
  private provider: JsonRpcProvider;
  private sessionManagerContract: Contract | null = null;

  constructor(
    @InjectRepository(AgentSession)
    private sessionRepository: Repository<AgentSession>,
    @InjectRepository(WalletConnection)
    private walletRepository: Repository<WalletConnection>,
    private configService: ConfigService,
  ) {
    this.initializeContracts();
  }

  /**
   * 初始化合约连接
   */
  private initializeContracts() {
    try {
      // 默认使用 BSC Testnet (chainId: 97)
      const rpcUrl = this.configService.get<string>('RPC_URL') 
        || this.configService.get<string>('BSC_TESTNET_RPC_URL') 
        || process.env.RPC_URL 
        || process.env.BSC_TESTNET_RPC_URL
        || 'https://bsc-testnet.nodereal.io/v1/1eefed273dc64160afd5e328e6c518d6';
      
      // 确保 chainId 是数字类型，默认 BSC Testnet (97)
      const chainIdStr = this.configService.get<string>('CHAIN_ID') || process.env.CHAIN_ID || '97';
      const chainId = typeof chainIdStr === 'string' ? parseInt(chainIdStr, 10) : (chainIdStr as number);
      
      // 创建自定义 Network 对象（ethers v6 要求）
      const network = new Network(
        `chain-${chainId}`, // name
        chainId,            // chainId (必须是数字)
      );
      
      this.provider = new JsonRpcProvider(rpcUrl, network);

      const contractAddress = this.configService.get<string>('ERC8004_CONTRACT_ADDRESS');
      if (contractAddress) {
        this.sessionManagerContract = new Contract(
          contractAddress,
          ERC8004_ABI,
          this.provider,
        );
        this.logger.log(`SessionManager 合约已初始化: ${contractAddress}, RPC: ${rpcUrl}`);
      } else {
        this.logger.warn('ERC8004_CONTRACT_ADDRESS 未设置，SessionManager 合约未初始化');
      }
    } catch (error: any) {
      this.logger.warn(`Failed to initialize contracts: ${error.message}`);
    }
  }

  /**
   * 创建 Session（链上 + 链下）
   */
  async createSession(userId: string, dto: CreateSessionDto) {
    try {
      // 1. 获取用户钱包地址
      const wallet = await this.walletRepository.findOne({
        where: { userId, isDefault: true },
      });

      if (!wallet) {
        throw new BadRequestException('User wallet not found');
      }

      // 2. 验证签名（确保用户授权）
      // 这里应该验证 dto.signature 是否来自用户钱包
      // 简化实现，实际应该验证签名

      // 3. 计算过期时间戳
      const expiryTimestamp = Math.floor(Date.now() / 1000) + dto.expiryDays * 86400;

      // 4. 根据链上Session数据校验/填充
      let sessionId = dto.sessionId;
      let normalizedSingleLimit = dto.singleLimit / 1e6;
      let normalizedDailyLimit = Math.max(dto.dailyLimit / 1e6, normalizedSingleLimit);
      let expiryDate = new Date(expiryTimestamp * 1000);

      if (sessionId && this.sessionManagerContract) {
        this.logger.log(`查询链上 Session: ${sessionId}, 合约地址: ${this.sessionManagerContract.target}`);
        
        // 增加重试逻辑，处理 RPC 同步延迟
        let onChainSession = null;
        const maxRetries = 5;
        const initialDelay = 2000; // 2秒
        let delay = initialDelay;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            // 使用 sessions 映射读取，而不是 getSession 函数
            onChainSession = await this.sessionManagerContract.sessions(sessionId);
            this.logger.log(`链上查询结果 (尝试 ${attempt}/${maxRetries}): ${JSON.stringify({
              signer: onChainSession?.signer,
              owner: onChainSession?.owner,
              isZeroAddress: onChainSession?.signer === ZeroAddress,
            })}`);
            
            // 如果找到有效的 Session，退出重试循环
            if (onChainSession && onChainSession.signer !== ZeroAddress) {
              break;
            }
          } catch (error: any) {
            this.logger.warn(`查询链上 Session 失败 (尝试 ${attempt}/${maxRetries}): ${error.message}`);
          }
          
          // 如果不是最后一次尝试，等待后重试
          if (attempt < maxRetries) {
            this.logger.log(`等待 ${delay}ms 后重试...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 1.5; // 指数退避：2s, 3s, 4.5s, 6.75s, 10.125s
          }
        }

        if (!onChainSession || onChainSession.signer === ZeroAddress) {
          this.logger.error(`Session 未找到 (已重试 ${maxRetries} 次): sessionId=${sessionId}, contract=${this.sessionManagerContract.target}`);
          throw new BadRequestException('Session not found on-chain. Please wait a few seconds and try again.');
        }

        if (
          onChainSession.owner?.toLowerCase() !== wallet.walletAddress.toLowerCase()
        ) {
          throw new BadRequestException('Session owner mismatch');
        }

        if (onChainSession.signer?.toLowerCase() !== dto.signer.toLowerCase()) {
          throw new BadRequestException('Session signer mismatch');
        }

        normalizedSingleLimit = Number(formatUnits(onChainSession.singleLimit, 6));
        normalizedDailyLimit = Number(formatUnits(onChainSession.dailyLimit, 6));
        expiryDate = new Date(Number(onChainSession.expiry) * 1000);
      } else if (!sessionId) {
        // 没有链上Session（开发模式）：生成 sessionId
        const abiCoder = AbiCoder.defaultAbiCoder();
        sessionId = keccak256(
          abiCoder.encode(
            ['address', 'address', 'uint256'],
            [wallet.walletAddress, dto.signer, Date.now()],
          ),
        );
      }

      // 5. 保存到数据库
      const session = this.sessionRepository.create({
        sessionId,
        userId,
        agentId: dto.agentId || null,
        signerAddress: dto.signer,
        ownerAddress: wallet.walletAddress,
        singleLimit: normalizedSingleLimit,
        dailyLimit: normalizedDailyLimit,
        usedToday: 0,
        expiry: expiryDate,
        status: SessionStatus.ACTIVE,
        // 原有字段设为默认值
        context: null,
        lastMessageAt: null,
      });

      const savedSession = await this.sessionRepository.save(session);

      this.logger.log(`Session created: ${sessionId} for user ${userId}`);

      return {
        sessionId: savedSession.sessionId!,
        signer: savedSession.signerAddress!,
        owner: savedSession.ownerAddress!, // Add owner address for payer identification
        singleLimit: (savedSession.singleLimit || 0).toString(),
        dailyLimit: (savedSession.dailyLimit || 0).toString(),
        expiry: savedSession.expiry!,
        createdAt: savedSession.createdAt,
      };
    } catch (error) {
      this.logger.error(`Failed to create session: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取用户的所有 Session
   */
  async getUserSessions(userId: string) {
    const sessions = await this.sessionRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    return sessions
      .filter(
        (session) =>
          session.sessionId && session.status === SessionStatus.ACTIVE,
      ) // 只返回仍然有效的支付 Session
      .map((session) => ({
        id: session.id,
        sessionId: session.sessionId!,
        signer: session.signerAddress!,
        owner: session.ownerAddress!, // Add owner address for payer identification
        singleLimit: Number(session.singleLimit || 0),
        dailyLimit: Number(session.dailyLimit || 0),
        usedToday: Number(session.usedToday || 0),
        expiry: session.expiry!,
        isActive: session.status === SessionStatus.ACTIVE,
        agentId: session.agentId,
        createdAt: session.createdAt,
      }));
  }

  /**
   * 获取活跃的 Session
   */
  async getActiveSession(userId: string) {
    const session = await this.sessionRepository.findOne({
      where: {
        userId,
        status: SessionStatus.ACTIVE,
      },
      order: { createdAt: 'DESC' },
    });

    if (!session || !session.sessionId) {
      return null; // 只返回支付 Session
    }

    // 检查是否过期
    if (session.expiry && new Date() > session.expiry) {
      session.status = SessionStatus.EXPIRED;
      await this.sessionRepository.save(session);
      return null;
    }

    return {
      id: session.id,
      sessionId: session.sessionId!,
      signer: session.signerAddress!,
      singleLimit: session.singleLimit || 0,
      dailyLimit: session.dailyLimit || 0,
      usedToday: session.usedToday || 0,
      expiry: session.expiry!,
      isActive: true,
      agentId: session.agentId || undefined,
    };
  }

  /**
   * 撤销 Session
   */
  async revokeSession(userId: string, sessionId: string) {
    const session = await this.sessionRepository.findOne({
      where: { sessionId, userId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.status !== SessionStatus.ACTIVE) {
      throw new BadRequestException('Session already revoked or expired');
    }

    // 调用合约撤销（如果合约可用）
    if (this.sessionManagerContract) {
      try {
        // 这里需要用户钱包签名，实际应该通过前端调用
        // 简化实现：只更新数据库状态
        this.logger.warn('On-chain revocation requires user wallet signature');
      } catch (error) {
        this.logger.warn(`Failed to revoke session on-chain: ${error.message}`);
      }
    }

    // 更新数据库状态
    session.status = SessionStatus.REVOKED;
    await this.sessionRepository.save(session);

    this.logger.log(`Session revoked: ${sessionId} by user ${userId}`);

    return {
      success: true,
      sessionId,
    };
  }

  /**
   * 通过 sessionId 获取 session 的 ownerAddress
   * 用于 QuickPay 支付时确定付款人地址
   */
  async getOwnerAddressBySessionId(sessionId: string): Promise<string | null> {
    try {
      const session = await this.sessionRepository.findOne({
        where: { sessionId },
      });
      if (session && session.ownerAddress) {
        return session.ownerAddress;
      }
      return null;
    } catch (error) {
      this.logger.warn(`Failed to get owner address for sessionId ${sessionId}: ${error.message}`);
      return null;
    }
  }
}

