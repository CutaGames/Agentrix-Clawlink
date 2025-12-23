import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import * as crypto from 'crypto';
import { Authorization, AuthorizationStatus } from '../../entities/authorization.entity';
import { AuditProof } from '../../entities/audit-proof.entity';

@Injectable()
export class AuthorizationService {
  private readonly logger = new Logger(AuthorizationService.name);

  constructor(
    @InjectRepository(Authorization)
    private authorizationRepository: Repository<Authorization>,
    @InjectRepository(AuditProof)
    private auditProofRepository: Repository<AuditProof>,
  ) {}

  /**
   * 创建授权
   */
  async createAuthorization(userId: string, data: {
    agentId?: string;
    merchantScope?: string[];
    categoryScope?: string[];
    singleTxLimit?: number;
    dailyLimit?: number;
    monthlyLimit?: number;
    expiresInDays?: number;
  }): Promise<Authorization> {
    const expiresAt = data.expiresInDays 
      ? new Date(Date.now() + data.expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const auth = this.authorizationRepository.create({
      userId,
      agentId: data.agentId,
      merchantScope: data.merchantScope,
      categoryScope: data.categoryScope,
      singleTxLimit: data.singleTxLimit,
      dailyLimit: data.dailyLimit,
      monthlyLimit: data.monthlyLimit,
      status: AuthorizationStatus.ACTIVE,
      expiresAt,
    });

    return this.authorizationRepository.save(auth);
  }

  /**
   * 撤销授权
   */
  async revokeAuthorization(authId: string, userId: string): Promise<void> {
    const auth = await this.authorizationRepository.findOne({ where: { id: authId, userId } });
    if (!auth) {
      throw new NotFoundException('授权不存在');
    }
    auth.status = AuthorizationStatus.REVOKED;
    await this.authorizationRepository.save(auth);
  }

  /**
   * 验证授权并评估策略
   */
  async evaluateAuthorization(
    userId: string,
    agentId: string,
    amount: number,
    merchantId: string,
    category?: string,
  ): Promise<{ authorized: boolean; reason?: string; authId?: string }> {
    // 查找有效授权
    const auths = await this.authorizationRepository.find({
      where: {
        userId,
        agentId,
        status: AuthorizationStatus.ACTIVE,
      },
    });

    for (const auth of auths) {
      // 检查过期
      if (auth.expiresAt && auth.expiresAt < new Date()) {
        continue;
      }

      // 检查商户范围
      if (auth.merchantScope && auth.merchantScope.length > 0 && !auth.merchantScope.includes(merchantId)) {
        continue;
      }

      // 检查类目范围
      if (auth.categoryScope && auth.categoryScope.length > 0 && category && !auth.categoryScope.includes(category)) {
        continue;
      }

      // 检查单笔限额
      if (auth.singleTxLimit && amount > auth.singleTxLimit) {
        continue;
      }

      // TODO: 检查日限额和月限额（需要查询历史交易）

      return { authorized: true, authId: auth.id };
    }

    return { authorized: false, reason: '未找到匹配的有效授权或超出限额' };
  }

  /**
   * 记录审计证据（实现链式结构与不可抵赖性）
   */
  async recordAuditProof(data: {
    payIntentId: string;
    authorizationId?: string;
    agentId?: string;
    action: string;
    reason?: string;
    policyResults?: any;
    agentSignature?: string; // Agent 提供的原始签名
  }): Promise<AuditProof> {
    // 1. 获取该 Agent 或该支付意图的上一个证据，用于构建哈希链
    const lastProof = await this.auditProofRepository.findOne({
      where: data.agentId ? { agentId: data.agentId } : { payIntentId: data.payIntentId },
      order: { createdAt: 'DESC' },
    });

    const proof = this.auditProofRepository.create({
      payIntentId: data.payIntentId,
      authorizationId: data.authorizationId,
      agentId: data.agentId,
      decisionLog: {
        timestamp: new Date(),
        action: data.action,
        reason: data.reason,
        policyResults: data.policyResults,
      },
      previousProofHash: lastProof?.proofHash || '0'.repeat(64),
      signature: data.agentSignature || null,
    });

    // 2. 计算当前证据的哈希值 (SHA-256)
    // 包含：payIntentId, decisionLog, previousProofHash, signature
    const hashContent = JSON.stringify({
      p: proof.payIntentId,
      d: proof.decisionLog,
      prev: proof.previousProofHash,
      sig: proof.signature,
    });

    proof.proofHash = crypto
      .createHash('sha256')
      .update(hashContent)
      .digest('hex');

    this.logger.log(`记录审计证据: id=${proof.payIntentId}, action=${data.action}, hash=${proof.proofHash.substring(0, 8)}`);

    return this.auditProofRepository.save(proof);
  }
}
