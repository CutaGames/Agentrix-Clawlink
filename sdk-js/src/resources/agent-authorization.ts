/**
 * Agent Authorization Resource
 * Agent授权管理 - 支持ERC8004 Session Key、MPC钱包授权、API Key授权
 */

import { AgentrixClient } from '../client';

// ========== 类型定义 ==========

export type AgentAuthorizationType = 'erc8004_session' | 'mpc_wallet' | 'api_key' | 'session_key';
export type AgentAuthorizationStatus = 'active' | 'revoked' | 'expired';
export type AgentStrategyType = 'dca' | 'grid' | 'arbitrage' | 'market_making' | 'rebalancing';

export interface AuthorizationLimit {
  singleLimit: number;
  dailyLimit: number;
  totalLimit?: number;
  usedToday?: number;
  usedTotal?: number;
}

export interface StrategyPermission {
  strategyType: AgentStrategyType;
  enabled: boolean;
  tokenWhitelist?: string[];
  dexWhitelist?: string[];
  cexWhitelist?: string[];
  riskLimits?: {
    maxDrawdown?: number;
    stopLoss?: number;
    takeProfit?: number;
    maxSlippage?: number;
    maxPositionSize?: number;
  };
  executionFrequency?: {
    maxPerHour?: number;
    maxPerDay?: number;
    minInterval?: number;
  };
}

export interface CreateAuthorizationDto {
  agentId: string;
  type: AgentAuthorizationType;
  limit: AuthorizationLimit;
  expiresAt?: Date | string;
  allowedStrategies?: AgentStrategyType[];
  strategyPermissions?: StrategyPermission[];
  metadata?: Record<string, any>;
}

// 别名，用于导出
export type CreateAgentAuthorizationParams = CreateAuthorizationDto;

export interface AgentAuthorization {
  id: string;
  userId: string;
  agentId: string;
  type: AgentAuthorizationType;
  status: AgentAuthorizationStatus;
  limit: AuthorizationLimit;
  allowedStrategies: AgentStrategyType[];
  strategyPermissions: StrategyPermission[];
  sessionId?: string;
  x402SessionId?: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

export interface PermissionCheckParams {
  authorizationId: string;
  strategyType: AgentStrategyType;
  action: string;
  amount: number;
  token?: string;
  venue?: string;
}

export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  remainingDaily?: number;
  remainingTotal?: number;
}

export interface ExecutionHistory {
  id: string;
  authorizationId: string;
  strategyType: AgentStrategyType;
  action: string;
  amount: number;
  status: 'completed' | 'failed' | 'rejected' | 'pending';
  transactionHash?: string;
  error?: string;
  executedAt: Date;
}

// ========== Resource 实现 ==========

export class AgentAuthorizationResource {
  private client: AgentrixClient;

  constructor(client: AgentrixClient) {
    this.client = client;
  }

  /**
   * 创建Agent授权
   * @param dto 授权配置
   * @returns 创建的授权信息
   */
  async create(dto: CreateAuthorizationDto): Promise<AgentAuthorization> {
    return this.client.post('/agent-authorization', dto);
  }

  /**
   * 获取用户的所有授权
   * @returns 授权列表
   */
  async listByUser(): Promise<AgentAuthorization[]> {
    return this.client.get('/agent-authorization/user');
  }

  /**
   * 获取Agent的所有授权
   * @param agentId Agent ID
   * @returns 授权列表
   */
  async listByAgent(agentId: string): Promise<AgentAuthorization[]> {
    return this.client.get(`/agent-authorization/agent/${agentId}`);
  }

  /**
   * 获取Agent的活跃授权
   * @param agentId Agent ID
   * @returns 活跃的授权信息
   */
  async getActive(agentId: string): Promise<AgentAuthorization | null> {
    return this.client.get(`/agent-authorization/agent/${agentId}/active`);
  }

  /**
   * 获取授权详情
   * @param authorizationId 授权ID
   * @returns 授权信息
   */
  async get(authorizationId: string): Promise<AgentAuthorization> {
    return this.client.get(`/agent-authorization/${authorizationId}`);
  }

  /**
   * 撤销授权
   * @param authorizationId 授权ID
   */
  async revoke(authorizationId: string): Promise<void> {
    return this.client.delete(`/agent-authorization/${authorizationId}`);
  }

  /**
   * 检查策略权限
   * @param params 权限检查参数
   * @returns 权限检查结果
   */
  async checkPermission(params: PermissionCheckParams): Promise<PermissionCheckResult> {
    return this.client.post('/agent-authorization/check-permission', params);
  }

  /**
   * 获取执行历史
   * @param authorizationId 授权ID
   * @param limit 数量限制
   * @returns 执行历史列表
   */
  async getExecutionHistory(authorizationId: string, limit = 50): Promise<ExecutionHistory[]> {
    return this.client.get(`/agent-authorization/${authorizationId}/history`, {
      params: { limit },
    });
  }

  /**
   * 更新策略权限
   * @param authorizationId 授权ID
   * @param permissions 新的策略权限配置
   */
  async updatePermissions(authorizationId: string, permissions: StrategyPermission[]): Promise<AgentAuthorization> {
    return this.client.patch(`/agent-authorization/${authorizationId}/permissions`, {
      strategyPermissions: permissions,
    });
  }

  /**
   * 更新限额配置
   * @param authorizationId 授权ID
   * @param limit 新的限额配置
   */
  async updateLimit(authorizationId: string, limit: Partial<AuthorizationLimit>): Promise<AgentAuthorization> {
    return this.client.patch(`/agent-authorization/${authorizationId}/limit`, limit);
  }
}
