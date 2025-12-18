/**
 * MPC Wallet Resource
 * MPC多方计算钱包管理 - 支持Shamir密钥分片、安全恢复
 */

import { AgentrixClient } from '../client';

// ========== 类型定义 ==========

export type WalletStatus = 'active' | 'locked' | 'recovery' | 'disabled';
export type ChainType = 'bsc' | 'ethereum' | 'polygon' | 'arbitrum' | 'optimism';

export interface MPCWallet {
  id: string;
  userId: string;
  address: string;
  chain: ChainType;
  status: WalletStatus;
  hasShardB: boolean; // 平台托管的分片是否存在
  createdAt: Date;
  lastActiveAt: Date;
  metadata?: Record<string, any>;
}

export interface WalletCreationResult {
  wallet: MPCWallet;
  shardA: string; // 用户持有的加密分片
  shardC: string; // 用户备份的加密分片（需安全保存）
  address: string;
  recoveryPhrase?: string; // 仅在创建时返回一次
}

export interface RecoveryResult {
  success: boolean;
  wallet?: MPCWallet;
  newAddress?: string;
  error?: string;
}

export interface AutoSplitConfig {
  enabled: boolean;
  rules: AutoSplitRule[];
}

export interface AutoSplitRule {
  id?: string;
  name: string;
  triggerAmount: number;
  triggerToken: string;
  recipients: Array<{
    address: string;
    percentage: number;
    label?: string;
  }>;
  isActive: boolean;
}

export interface WalletBalance {
  token: string;
  symbol: string;
  balance: string;
  balanceUsd: number;
  decimals: number;
}

export interface TransactionRequest {
  to: string;
  value?: string;
  data?: string;
  token?: string;
  amount?: number;
  gasLimit?: string;
}

export interface TransactionResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
  gasUsed?: string;
  effectiveGasPrice?: string;
}

// ========== Resource 实现 ==========

export class MPCWalletResource {
  private client: AgentrixClient;

  constructor(client: AgentrixClient) {
    this.client = client;
  }

  /**
   * 创建MPC钱包
   * @param password 加密密码
   * @param chain 目标链
   * @returns 钱包创建结果（包含分片A和C，请安全保存）
   */
  async create(password: string, chain: ChainType = 'bsc'): Promise<WalletCreationResult> {
    return this.client.post('/mpc-wallet/create', { password, chain });
  }

  /**
   * 获取用户的MPC钱包信息
   * @returns MPC钱包信息
   */
  async get(): Promise<MPCWallet | null> {
    return this.client.get('/mpc-wallet');
  }

  /**
   * 获取钱包余额
   * @returns 代币余额列表
   */
  async getBalances(): Promise<WalletBalance[]> {
    return this.client.get('/mpc-wallet/balances');
  }

  /**
   * 恢复钱包（使用分片A + 分片C）
   * @param shardA 用户持有的分片
   * @param shardC 用户备份的分片
   * @param password 解密密码
   * @returns 恢复结果
   */
  async recover(shardA: string, shardC: string, password: string): Promise<RecoveryResult> {
    return this.client.post('/mpc-wallet/recover', { shardA, shardC, password });
  }

  /**
   * 导出分片C（用于备份）
   * 注意：此操作需要用户身份验证
   * @param password 当前密码
   * @returns 加密的分片C
   */
  async exportShardC(password: string): Promise<{ shardC: string }> {
    return this.client.post('/mpc-wallet/export-shard-c', { password });
  }

  /**
   * 设置自动分账配置
   * @param config 自动分账配置
   */
  async setAutoSplit(config: AutoSplitConfig): Promise<void> {
    return this.client.post('/mpc-wallet/auto-split', config);
  }

  /**
   * 获取自动分账配置
   * @returns 当前自动分账配置
   */
  async getAutoSplit(): Promise<AutoSplitConfig> {
    return this.client.get('/mpc-wallet/auto-split');
  }

  /**
   * 添加自动分账规则
   * @param rule 分账规则
   */
  async addAutoSplitRule(rule: AutoSplitRule): Promise<AutoSplitRule> {
    return this.client.post('/mpc-wallet/auto-split/rules', rule);
  }

  /**
   * 删除自动分账规则
   * @param ruleId 规则ID
   */
  async removeAutoSplitRule(ruleId: string): Promise<void> {
    return this.client.delete(`/mpc-wallet/auto-split/rules/${ruleId}`);
  }

  /**
   * 发送交易（需要分片A签名）
   * @param request 交易请求
   * @param shardA 用户分片（用于签名）
   * @param password 解密密码
   * @returns 交易结果
   */
  async sendTransaction(
    request: TransactionRequest,
    shardA: string,
    password: string
  ): Promise<TransactionResult> {
    return this.client.post('/mpc-wallet/send', {
      ...request,
      shardA,
      password,
    });
  }

  /**
   * 获取交易历史
   * @param limit 数量限制
   * @returns 交易历史
   */
  async getTransactionHistory(limit = 50): Promise<Array<{
    hash: string;
    type: 'send' | 'receive' | 'swap' | 'approve';
    from: string;
    to: string;
    value: string;
    token?: string;
    timestamp: Date;
    status: 'pending' | 'confirmed' | 'failed';
  }>> {
    return this.client.get('/mpc-wallet/transactions', { params: { limit } });
  }

  /**
   * 锁定钱包（安全措施）
   */
  async lock(): Promise<void> {
    return this.client.post('/mpc-wallet/lock');
  }

  /**
   * 解锁钱包
   * @param password 密码
   */
  async unlock(password: string): Promise<void> {
    return this.client.post('/mpc-wallet/unlock', { password });
  }

  /**
   * 更改钱包密码
   * @param currentPassword 当前密码
   * @param newPassword 新密码
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    return this.client.post('/mpc-wallet/change-password', {
      currentPassword,
      newPassword,
    });
  }
}
