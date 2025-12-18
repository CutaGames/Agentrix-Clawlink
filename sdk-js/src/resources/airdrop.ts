/**
 * Airdrop Resource
 * 空投检测与自动领取功能
 */

import { AgentrixClient } from '../client';

// ========== 类型定义 ==========

export type AirdropStatus = 'monitoring' | 'eligible' | 'claimed' | 'expired' | 'failed';

export interface Airdrop {
  id: string;
  name: string;
  description?: string;
  projectName: string;
  tokenSymbol: string;
  tokenAddress?: string;
  chain: string;
  estimatedValue?: number;
  status: AirdropStatus;
  requirements: AirdropRequirement[];
  eligibilityChecked: boolean;
  eligible: boolean;
  claimedAmount?: number;
  claimTxHash?: string;
  claimDeadline?: Date;
  discoveredAt: Date;
  claimedAt?: Date;
  metadata?: Record<string, any>;
}

export interface AirdropRequirement {
  type: 'follow_twitter' | 'join_discord' | 'verify_wallet' | 'complete_kyc' | 'hold_token' | 'transaction_history' | 'other';
  description: string;
  completed: boolean;
  data?: Record<string, any>;
}

export interface EligibilityCheckResult {
  eligible: boolean;
  requirements: AirdropRequirement[];
  missingRequirements: string[];
  estimatedValue?: number;
}

export interface ClaimResult {
  success: boolean;
  transactionHash?: string;
  amount?: number;
  error?: string;
}

export interface BatchClaimResult {
  total: number;
  successful: number;
  failed: number;
  results: Array<{
    airdropId: string;
    name: string;
    result: ClaimResult;
  }>;
}

export interface DiscoverAirdropsParams {
  chains?: string[];
  minValue?: number;
  includeTestnet?: boolean;
}

export interface ListAirdropsParams {
  status?: AirdropStatus | AirdropStatus[];
  chain?: string;
  limit?: number;
  offset?: number;
}

// ========== Resource 实现 ==========

export class AirdropResource {
  private client: AgentrixClient;

  constructor(client: AgentrixClient) {
    this.client = client;
  }

  /**
   * 发现新的空投机会
   * @param params 发现参数
   * @returns 发现的空投列表
   */
  async discover(params?: DiscoverAirdropsParams): Promise<Airdrop[]> {
    return this.client.post('/auto-earn/airdrops/discover', params || {});
  }

  /**
   * 获取空投列表
   * @param params 查询参数
   * @returns 空投列表
   */
  async list(params?: ListAirdropsParams): Promise<Airdrop[]> {
    return this.client.get('/auto-earn/airdrops', { params });
  }

  /**
   * 获取空投详情
   * @param airdropId 空投ID
   * @returns 空投信息
   */
  async get(airdropId: string): Promise<Airdrop> {
    return this.client.get(`/auto-earn/airdrops/${airdropId}`);
  }

  /**
   * 检查领取资格
   * @param airdropId 空投ID
   * @returns 资格检查结果
   */
  async checkEligibility(airdropId: string): Promise<EligibilityCheckResult> {
    return this.client.post(`/auto-earn/airdrops/${airdropId}/check-eligibility`);
  }

  /**
   * 领取空投
   * @param airdropId 空投ID
   * @returns 领取结果
   */
  async claim(airdropId: string): Promise<ClaimResult> {
    return this.client.post(`/auto-earn/airdrops/${airdropId}/claim`);
  }

  /**
   * 批量领取所有符合条件的空投
   * @returns 批量领取结果
   */
  async claimAll(): Promise<BatchClaimResult> {
    return this.client.post('/auto-earn/airdrops/claim-all');
  }

  /**
   * 获取可领取的空投列表
   * @returns 可领取的空投
   */
  async getEligible(): Promise<Airdrop[]> {
    return this.list({ status: 'eligible' });
  }

  /**
   * 获取已领取的空投历史
   * @returns 已领取的空投
   */
  async getClaimed(): Promise<Airdrop[]> {
    return this.list({ status: 'claimed' });
  }

  /**
   * 刷新空投状态
   * @param airdropId 空投ID
   * @returns 更新后的空投信息
   */
  async refresh(airdropId: string): Promise<Airdrop> {
    return this.client.post(`/auto-earn/airdrops/${airdropId}/refresh`);
  }

  /**
   * 获取空投统计
   * @returns 空投统计数据
   */
  async getStats(): Promise<{
    total: number;
    eligible: number;
    claimed: number;
    totalValue: number;
    claimedValue: number;
  }> {
    return this.client.get('/auto-earn/airdrops/stats');
  }
}
