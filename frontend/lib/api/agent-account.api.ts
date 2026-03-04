/**
 * Agent 账户 API
 * Agent Account API
 */

import { apiClient } from './client';

export type AgentAccountType = 'personal' | 'merchant' | 'platform' | 'third_party';
export type AgentAccountStatus = 'draft' | 'active' | 'suspended' | 'revoked';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface SpendingLimits {
  perTransaction: number;
  daily: number;
  monthly: number;
}

export interface AgentAccount {
  id: string;
  userId: string;
  agentUniqueId: string;
  name: string;
  description?: string;
  agentType: AgentAccountType;
  status: AgentAccountStatus;

  // 信用评分
  creditScore: number;
  riskLevel: RiskLevel;

  // 支出限额
  spendingLimits: SpendingLimits;

  // 使用统计
  spentToday: number;
  spentThisMonth: number;
  totalSpent: number;

  // 关联账户
  linkedAccountId?: string;
  linkedWalletAddress?: string;

  // 链上状态
  isOnChain: boolean;
  onChainAttestationId?: string;

  // 授权配置
  autoPayEnabled: boolean;
  autoPayLimit?: number;

  createdAt: string;
  updatedAt: string;
}

export interface CreateAgentAccountRequest {
  name: string;
  description?: string;
  agentType?: AgentAccountType;
  spendingLimits?: Partial<SpendingLimits>;
  linkedAccountId?: string;
}

export interface UpdateAgentAccountRequest {
  name?: string;
  description?: string;
  spendingLimits?: Partial<SpendingLimits>;
  autoPayEnabled?: boolean;
  autoPayLimit?: number;
}

export interface SpendingCheckResult {
  allowed: boolean;
  reason?: string;
  currentSpent: number;
  limit: number;
  remainingToday: number;
  remainingThisMonth: number;
}

export interface CreditScoreHistory {
  date: string;
  score: number;
  change: number;
  reason?: string;
}

// 提取响应数据的辅助函数
const extractData = <T>(response: any): T | null => {
  if (!response) return null;
  // 后端返回 { success: true, data: ... } 结构
  if (response.data !== undefined) {
    return response.data as T;
  }
  // 直接返回数据
  return response as T;
};

export const agentAccountApi = {
  // 获取我的所有 Agent 账户
  list: async (): Promise<AgentAccount[]> => {
    const response = await apiClient.get<{ success: boolean; data: AgentAccount[] }>('/agent-accounts');
    return extractData<AgentAccount[]>(response) || [];
  },

  // 创建 Agent 账户
  create: async (data: CreateAgentAccountRequest): Promise<AgentAccount | null> => {
    const response = await apiClient.post<{ success: boolean; data: AgentAccount }>('/agent-accounts', data);
    return extractData<AgentAccount>(response);
  },

  // 获取 Agent 详情
  getById: async (id: string): Promise<AgentAccount | null> => {
    const response = await apiClient.get<{ success: boolean; data: AgentAccount }>(`/agent-accounts/${id}`);
    return extractData<AgentAccount>(response);
  },

  // 通过唯一ID获取
  getByUniqueId: async (uniqueId: string): Promise<AgentAccount | null> => {
    const response = await apiClient.get<{ success: boolean; data: AgentAccount }>(`/agent-accounts/unique/${uniqueId}`);
    return extractData<AgentAccount>(response);
  },

  // 更新 Agent
  update: async (id: string, data: UpdateAgentAccountRequest): Promise<AgentAccount | null> => {
    const response = await apiClient.put<{ success: boolean; data: AgentAccount }>(`/agent-accounts/${id}`, data);
    return extractData<AgentAccount>(response);
  },

  // 激活 Agent
  activate: async (id: string): Promise<AgentAccount | null> => {
    const response = await apiClient.post<{ success: boolean; data: AgentAccount }>(`/agent-accounts/${id}/activate`);
    return extractData<AgentAccount>(response);
  },

  // 暂停 Agent
  suspend: async (id: string, reason?: string): Promise<AgentAccount | null> => {
    const response = await apiClient.post<{ success: boolean; data: AgentAccount }>(`/agent-accounts/${id}/suspend`, { reason });
    return extractData<AgentAccount>(response);
  },

  // 恢复 Agent
  resume: async (id: string): Promise<AgentAccount | null> => {
    const response = await apiClient.post<{ success: boolean; data: AgentAccount }>(`/agent-accounts/${id}/resume`);
    return extractData<AgentAccount>(response);
  },

  // 撤销 Agent
  revoke: async (id: string, reason?: string): Promise<AgentAccount | null> => {
    const response = await apiClient.post<{ success: boolean; data: AgentAccount }>(`/agent-accounts/${id}/revoke`, { reason });
    return extractData<AgentAccount>(response);
  },

  // 更新信用评分
  updateCreditScore: async (id: string, score: number, reason?: string): Promise<AgentAccount | null> => {
    const response = await apiClient.post<{ success: boolean; data: AgentAccount }>(`/agent-accounts/${id}/credit-score`, { score, reason });
    return extractData<AgentAccount>(response);
  },

  // 获取信用评分历史
  getCreditHistory: async (id: string, params?: { limit?: number }): Promise<CreditScoreHistory[]> => {
    const response = await apiClient.get<{ success: boolean; data: CreditScoreHistory[] }>(`/agent-accounts/${id}/credit-history`, { params });
    return extractData<CreditScoreHistory[]>(response) || [];
  },

  // 检查支出限额
  checkSpendingLimit: async (id: string, amount: number): Promise<SpendingCheckResult | null> => {
    const response = await apiClient.get<{ success: boolean; data: SpendingCheckResult }>(`/agent-accounts/${id}/check-spending`, { params: { amount } });
    return extractData<SpendingCheckResult>(response);
  },

  // 更新支出限额
  updateSpendingLimits: async (id: string, limits: Partial<SpendingLimits>): Promise<AgentAccount | null> => {
    const response = await apiClient.put<{ success: boolean; data: AgentAccount }>(`/agent-accounts/${id}/spending-limits`, limits);
    return extractData<AgentAccount>(response);
  },

  // 关联钱包
  linkWallet: async (id: string, walletAddress: string): Promise<AgentAccount | null> => {
    const response = await apiClient.post<{ success: boolean; data: AgentAccount }>(`/agent-accounts/${id}/link-wallet`, { walletAddress });
    return extractData<AgentAccount>(response);
  },

  // 解除钱包关联
  unlinkWallet: async (id: string): Promise<AgentAccount | null> => {
    const response = await apiClient.post<{ success: boolean; data: AgentAccount }>(`/agent-accounts/${id}/unlink-wallet`);
    return extractData<AgentAccount>(response);
  },

  // 关联资金账户
  linkAccount: async (id: string, accountId: string): Promise<AgentAccount | null> => {
    const response = await apiClient.post<{ success: boolean; data: AgentAccount }>(`/agent-accounts/${id}/link-account`, { accountId });
    return extractData<AgentAccount>(response);
  },

  // 获取 Agent 统计
  getStats: async (id: string): Promise<{
    totalTransactions: number;
    totalSpent: number;
    avgTransactionAmount: number;
    successRate: number;
    recentActivity: Array<{ date: string; amount: number; type: string }>;
  } | null> => {
    const response = await apiClient.get<{ success: boolean; data: {
      totalTransactions: number;
      totalSpent: number;
      avgTransactionAmount: number;
      successRate: number;
      recentActivity: Array<{ date: string; amount: number; type: string }>;
    } }>(`/agent-accounts/${id}/stats`);
    return extractData(response);
  },

  // 配置 AutoPay
  configureAutoPay: async (id: string, config: { enabled: boolean; limit?: number }): Promise<AgentAccount | null> => {
    const response = await apiClient.post<{ success: boolean; data: AgentAccount }>(`/agent-accounts/${id}/auto-pay`, config);
    return extractData<AgentAccount>(response);
  },
};
