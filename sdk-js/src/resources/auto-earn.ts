/**
 * AutoEarn Resource
 * 自动收益管理 - 包含任务、策略、套利、Launchpad等功能
 */

import { AgentrixClient } from '../client';

// ========== 类型定义 ==========

export type AutoEarnTaskType = 'airdrop' | 'task' | 'strategy' | 'referral';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
export type AutoEarnStrategyType = 'arbitrage' | 'launchpad' | 'dca' | 'grid' | 'copy_trading';
export type StrategyStatus = 'active' | 'paused' | 'stopped' | 'error';
export type RiskLevel = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  type: AutoEarnTaskType;
  name: string;
  description?: string;
  status: TaskStatus;
  reward?: number;
  rewardToken?: string;
  progress?: number;
  deadline?: Date;
  completedAt?: Date;
  metadata?: Record<string, any>;
}

export interface Strategy {
  id: string;
  type: AutoEarnStrategyType;
  name: string;
  status: StrategyStatus;
  config: StrategyConfig;
  performance: StrategyPerformance;
  createdAt: Date;
  lastExecutedAt?: Date;
}

export interface StrategyConfig {
  // DCA 配置
  dca?: {
    token: string;
    amount: number;
    frequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
    targetPrice?: number;
  };
  // 网格交易配置
  grid?: {
    pair: string;
    lowerPrice: number;
    upperPrice: number;
    gridCount: number;
    totalAmount: number;
  };
  // 套利配置
  arbitrage?: {
    pairs: string[];
    minProfit: number;
    maxSlippage: number;
  };
  // 跟单配置
  copyTrading?: {
    targetAddress: string;
    maxAmount: number;
    followPercentage: number;
  };
}

export interface StrategyPerformance {
  totalProfit: number;
  totalTrades: number;
  winRate: number;
  averageProfit: number;
  maxDrawdown: number;
}

export interface ArbitrageOpportunity {
  id: string;
  pair: string;
  buyVenue: string;
  sellVenue: string;
  buyPrice: number;
  sellPrice: number;
  spread: number;
  profitPercentage: number;
  estimatedProfit: number;
  riskLevel: RiskLevel;
  availableLiquidity: number;
  expiresAt?: Date;
}

export interface TradeResult {
  success: boolean;
  transactionHash?: string;
  profit?: number;
  error?: string;
  details?: {
    buyTx?: string;
    sellTx?: string;
    actualProfit?: number;
    slippage?: number;
  };
}

export interface LaunchpadProject {
  id: string;
  name: string;
  symbol: string;
  platform: string;
  launchDate: Date;
  endDate: Date;
  targetRaise: number;
  currentRaise: number;
  tokenPrice: number;
  minInvestment: number;
  maxInvestment: number;
  whitelistRequired: boolean;
  isWhitelisted?: boolean;
  description?: string;
  website?: string;
  riskLevel: RiskLevel;
}

export interface EarningsStats {
  totalEarnings: number;
  todayEarnings: number;
  weekEarnings: number;
  monthEarnings: number;
  byType: {
    airdrop: number;
    arbitrage: number;
    launchpad: number;
    strategy: number;
    referral: number;
  };
  recentTransactions: Array<{
    id: string;
    type: string;
    amount: number;
    timestamp: Date;
  }>;
}

// ========== Resource 实现 ==========

export class AutoEarnResource {
  private client: AgentrixClient;
  
  public tasks: TasksResource;
  public strategies: StrategiesResource;
  public arbitrage: ArbitrageResource;
  public launchpad: LaunchpadResource;

  constructor(client: AgentrixClient) {
    this.client = client;
    this.tasks = new TasksResource(client);
    this.strategies = new StrategiesResource(client);
    this.arbitrage = new ArbitrageResource(client);
    this.launchpad = new LaunchpadResource(client);
  }

  /**
   * 获取收益统计
   * @returns 收益统计数据
   */
  async getStats(): Promise<EarningsStats> {
    return this.client.get('/auto-earn/stats');
  }

  /**
   * 获取仪表板数据
   * @returns 仪表板数据
   */
  async getDashboard(): Promise<{
    stats: EarningsStats;
    activeTasks: Task[];
    activeStrategies: Strategy[];
    recentOpportunities: ArbitrageOpportunity[];
  }> {
    return this.client.get('/auto-earn/dashboard');
  }
}

// ========== 子资源: Tasks ==========

export class TasksResource {
  private client: AgentrixClient;

  constructor(client: AgentrixClient) {
    this.client = client;
  }

  /**
   * 获取任务列表
   */
  async list(params?: { type?: AutoEarnTaskType; status?: TaskStatus; limit?: number }): Promise<Task[]> {
    return this.client.get('/auto-earn/tasks', { params });
  }

  /**
   * 获取任务详情
   */
  async get(taskId: string): Promise<Task> {
    return this.client.get(`/auto-earn/tasks/${taskId}`);
  }

  /**
   * 执行任务
   */
  async execute(taskId: string): Promise<{ success: boolean; result?: any; error?: string }> {
    return this.client.post(`/auto-earn/tasks/${taskId}/execute`);
  }

  /**
   * 取消任务
   */
  async cancel(taskId: string): Promise<void> {
    return this.client.post(`/auto-earn/tasks/${taskId}/cancel`);
  }
}

// ========== 子资源: Strategies ==========

export class StrategiesResource {
  private client: AgentrixClient;

  constructor(client: AgentrixClient) {
    this.client = client;
  }

  /**
   * 获取策略列表
   */
  async list(params?: { type?: AutoEarnStrategyType; status?: StrategyStatus }): Promise<Strategy[]> {
    return this.client.get('/auto-earn/strategies', { params });
  }

  /**
   * 获取策略详情
   */
  async get(strategyId: string): Promise<Strategy> {
    return this.client.get(`/auto-earn/strategies/${strategyId}`);
  }

  /**
   * 创建策略
   */
  async create(type: AutoEarnStrategyType, config: StrategyConfig): Promise<Strategy> {
    return this.client.post('/auto-earn/strategies', { type, config });
  }

  /**
   * 启动策略
   */
  async start(strategyId: string): Promise<void> {
    return this.client.post(`/auto-earn/strategies/${strategyId}/start`);
  }

  /**
   * 暂停策略
   */
  async pause(strategyId: string): Promise<void> {
    return this.client.post(`/auto-earn/strategies/${strategyId}/pause`);
  }

  /**
   * 停止策略
   */
  async stop(strategyId: string): Promise<void> {
    return this.client.post(`/auto-earn/strategies/${strategyId}/stop`);
  }

  /**
   * 更新策略配置
   */
  async update(strategyId: string, config: Partial<StrategyConfig>): Promise<Strategy> {
    return this.client.patch(`/auto-earn/strategies/${strategyId}`, { config });
  }

  /**
   * 删除策略
   */
  async delete(strategyId: string): Promise<void> {
    return this.client.delete(`/auto-earn/strategies/${strategyId}`);
  }
}

// ========== 子资源: Arbitrage ==========

export class ArbitrageResource {
  private client: AgentrixClient;

  constructor(client: AgentrixClient) {
    this.client = client;
  }

  /**
   * 扫描套利机会
   */
  async scan(params?: { pairs?: string[]; minProfit?: number }): Promise<ArbitrageOpportunity[]> {
    return this.client.get('/auto-earn/arbitrage/opportunities', { params });
  }

  /**
   * 执行套利
   */
  async execute(opportunityId: string, amount: number): Promise<TradeResult> {
    return this.client.post('/auto-earn/arbitrage/execute', { opportunityId, amount });
  }

  /**
   * 启动自动套利
   */
  async startAuto(config: {
    pairs: string[];
    minProfit: number;
    maxAmount: number;
    stopLoss?: number;
  }): Promise<{ success: boolean; strategyId: string }> {
    return this.client.post('/auto-earn/arbitrage/auto-start', config);
  }

  /**
   * 停止自动套利
   */
  async stopAuto(strategyId: string): Promise<void> {
    return this.client.post('/auto-earn/arbitrage/auto-stop', { strategyId });
  }

  /**
   * 获取套利历史
   */
  async getHistory(limit = 50): Promise<Array<{
    id: string;
    opportunity: ArbitrageOpportunity;
    result: TradeResult;
    executedAt: Date;
  }>> {
    return this.client.get('/auto-earn/arbitrage/history', { params: { limit } });
  }
}

// ========== 子资源: Launchpad ==========

export class LaunchpadResource {
  private client: AgentrixClient;

  constructor(client: AgentrixClient) {
    this.client = client;
  }

  /**
   * 发现Launchpad项目
   */
  async discover(params?: { platform?: string; riskLevel?: RiskLevel }): Promise<LaunchpadProject[]> {
    return this.client.get('/auto-earn/launchpad/projects', { params });
  }

  /**
   * 获取项目详情
   */
  async getProject(projectId: string): Promise<LaunchpadProject> {
    return this.client.get(`/auto-earn/launchpad/projects/${projectId}`);
  }

  /**
   * 检查白名单状态
   */
  async checkWhitelist(projectId: string): Promise<{ isWhitelisted: boolean; requirements?: string[] }> {
    return this.client.get(`/auto-earn/launchpad/projects/${projectId}/whitelist`);
  }

  /**
   * 参与Launchpad
   */
  async participate(projectId: string, amount: number): Promise<{
    success: boolean;
    transactionHash?: string;
    allocation?: number;
    error?: string;
  }> {
    return this.client.post('/auto-earn/launchpad/participate', { projectId, amount });
  }

  /**
   * 获取参与历史
   */
  async getHistory(): Promise<Array<{
    project: LaunchpadProject;
    amount: number;
    allocation: number;
    status: 'pending' | 'confirmed' | 'distributed' | 'refunded';
    participatedAt: Date;
  }>> {
    return this.client.get('/auto-earn/launchpad/history');
  }
}
