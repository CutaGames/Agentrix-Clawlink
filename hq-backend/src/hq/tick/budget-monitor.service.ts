/**
 * Budget Monitor Service
 * 
 * 预算监控系统 - 防止 API 超支
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';

// 预算配置
export const BUDGET_CONFIG = {
  daily: {
    total: 30.00,           // 每日总预算 $30 (付费 Agent 按需启用)
    architect: 15.00,       // ARCHITECT-01 预算（CEO/CFO/架构师）— 按需启用
    coder01: 8.00,          // CODER-01 预算（主力开发）— 按需启用
    growth: 4.00,           // GROWTH-01 预算（增长/BD）— Groq 免费但追踪
    security: 2.00,         // SECURITY-01 预算 — Gemini 免费但追踪
    reserve: 1.00,          // 预留缓冲
    // 注意：9 个免费 Agent (Groq/Gemini) 7×24 运行，不消耗预算
    // GROWTH-01, BD-01, CONTENT-01, SUPPORT-01 → Groq (14,400 req/day FREE)
    // ANALYST-01, SOCIAL-01, SECURITY-01, DEVREL-01, LEGAL-01 → Gemini (1,500 req/day FREE)
  },
  models: {
    // 每 1K tokens 的成本 (USD)
    // Bedrock Claude models (cross-region inference profile IDs)
    'arn:aws:bedrock:us-east-1:696737009512:inference-profile/us.anthropic.claude-opus-4-6-v1': { input: 0.015, output: 0.075 },
    'us.anthropic.claude-sonnet-4-5-20250929-v1:0': { input: 0.003, output: 0.015 },
    'us.anthropic.claude-haiku-4-5-20251001-v1:0': { input: 0.0008, output: 0.004 },
    // Direct Claude
    'claude-sonnet-4-20250514': { input: 0.003, output: 0.015 },
    'claude-3-haiku-20240307': { input: 0.00025, output: 0.00125 },
    // Gemini (free tier, but track anyway)
    'gemini-2.5-flash': { input: 0.0, output: 0.0 },
    'gemini-1.5-flash': { input: 0.0, output: 0.0 },
    // OpenAI
    'gpt-4o': { input: 0.005, output: 0.015 },
    'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
    // Groq (FREE tier)
    'llama-3.3-70b-versatile': { input: 0.0, output: 0.0 },
    'llama-3.1-8b-instant': { input: 0.0, output: 0.0 },
    'mixtral-8x7b-32768': { input: 0.0, output: 0.0 },
    // DeepSeek
    'deepseek-chat': { input: 0.0001, output: 0.0002 },
  } as Record<string, { input: number; output: number }>,
  alerts: {
    warning: 0.8,           // 80% 时警告
    critical: 0.95,         // 95% 时停止
  },
};

export interface UsageRecord {
  agentCode: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  timestamp: Date;
}

export interface BudgetStatus {
  date: string;
  totalBudget: number;
  totalUsed: number;
  totalRemaining: number;
  percentUsed: number;
  status: 'ok' | 'warning' | 'critical' | 'exceeded';
  byAgent: {
    [agentCode: string]: {
      budget: number;
      used: number;
      remaining: number;
      percentUsed: number;
    };
  };
}

@Injectable()
export class BudgetMonitorService {
  private readonly logger = new Logger(BudgetMonitorService.name);
  
  // 内存中的使用记录（生产环境应该存数据库）
  private usageRecords: UsageRecord[] = [];

  /**
   * 记录 API 使用
   */
  recordUsage(
    agentCode: string,
    model: string,
    inputTokens: number,
    outputTokens: number,
  ): void {
    const modelCost = BUDGET_CONFIG.models[model] || { input: 0.001, output: 0.002 };
    const cost = 
      (inputTokens / 1000) * modelCost.input +
      (outputTokens / 1000) * modelCost.output;

    const record: UsageRecord = {
      agentCode,
      model,
      inputTokens,
      outputTokens,
      cost,
      timestamp: new Date(),
    };

    this.usageRecords.push(record);
    this.logger.log(
      `📊 Usage: ${agentCode} | ${model} | ${inputTokens}+${outputTokens} tokens | $${cost.toFixed(4)}`,
    );

    // 检查是否超预算
    this.checkBudgetAlerts(agentCode);
  }

  /**
   * 获取今日预算状态
   */
  getBudgetStatus(): BudgetStatus {
    const today = new Date().toISOString().split('T')[0];
    const todayRecords = this.usageRecords.filter(
      r => r.timestamp.toISOString().split('T')[0] === today,
    );

    // 按 Agent 汇总
    const byAgent: BudgetStatus['byAgent'] = {};
    const agentBudgets = {
      // 付费 Agent (Bedrock) — 按需启用
      'ARCHITECT-01': BUDGET_CONFIG.daily.architect,
      'CODER-01': BUDGET_CONFIG.daily.coder01,
      // 免费 Agent (Groq/Gemini) — 不消耗预算但仍追踪
      'GROWTH-01': BUDGET_CONFIG.daily.growth,
      'BD-01': 0,
      'CONTENT-01': 0,
      'SUPPORT-01': 0,
      'ANALYST-01': 0,
      'SOCIAL-01': 0,
      'SECURITY-01': BUDGET_CONFIG.daily.security,
      'DEVREL-01': 0,
      'LEGAL-01': 0,
    };

    for (const [code, budget] of Object.entries(agentBudgets)) {
      const agentRecords = todayRecords.filter(r => r.agentCode === code);
      const used = agentRecords.reduce((sum, r) => sum + r.cost, 0);
      byAgent[code] = {
        budget,
        used,
        remaining: Math.max(0, budget - used),
        percentUsed: budget > 0 ? (used / budget) * 100 : 0,
      };
    }

    const totalUsed = todayRecords.reduce((sum, r) => sum + r.cost, 0);
    const percentUsed = (totalUsed / BUDGET_CONFIG.daily.total) * 100;

    let status: BudgetStatus['status'] = 'ok';
    if (percentUsed >= 100) status = 'exceeded';
    else if (percentUsed >= BUDGET_CONFIG.alerts.critical * 100) status = 'critical';
    else if (percentUsed >= BUDGET_CONFIG.alerts.warning * 100) status = 'warning';

    return {
      date: today,
      totalBudget: BUDGET_CONFIG.daily.total,
      totalUsed,
      totalRemaining: Math.max(0, BUDGET_CONFIG.daily.total - totalUsed),
      percentUsed,
      status,
      byAgent,
    };
  }

  /**
   * 检查 Agent 是否可以执行任务
   */
  canAgentExecute(agentCode: string): { allowed: boolean; reason?: string } {
    // Free agents (Groq/Gemini) always allowed — they cost $0
    const FREE_AGENTS = ['GROWTH-01', 'BD-01', 'CONTENT-01', 'SUPPORT-01', 'ANALYST-01', 'SOCIAL-01', 'SECURITY-01', 'DEVREL-01', 'LEGAL-01'];
    if (FREE_AGENTS.includes(agentCode)) {
      return { allowed: true };
    }

    const status = this.getBudgetStatus();

    // 检查总预算 (only affects paid agents)
    if (status.status === 'exceeded') {
      return { allowed: false, reason: '今日总预算已用完（仅影响付费 Agent）' };
    }

    // 检查 Agent 预算
    const agentStatus = status.byAgent[agentCode];
    if (agentStatus && agentStatus.percentUsed >= 100) {
      return { allowed: false, reason: `${agentCode} 今日预算已用完` };
    }

    // 临界状态时只允许 ARCHITECT-01
    if (status.status === 'critical' && agentCode !== 'ARCHITECT-01') {
      return { allowed: false, reason: '预算临界，仅允许 ARCHITECT-01 执行' };
    }

    return { allowed: true };
  }

  /**
   * 检查预算告警
   */
  private checkBudgetAlerts(agentCode: string): void {
    const status = this.getBudgetStatus();

    if (status.status === 'exceeded') {
      this.logger.error(`🚨 预算超支！今日已使用 $${status.totalUsed.toFixed(2)}`);
    } else if (status.status === 'critical') {
      this.logger.warn(`⚠️ 预算临界！已使用 ${status.percentUsed.toFixed(1)}%`);
    } else if (status.status === 'warning') {
      this.logger.warn(`⚡ 预算警告！已使用 ${status.percentUsed.toFixed(1)}%`);
    }

    const agentStatus = status.byAgent[agentCode];
    if (agentStatus && agentStatus.percentUsed >= 80) {
      this.logger.warn(
        `⚡ ${agentCode} 预算警告！已使用 ${agentStatus.percentUsed.toFixed(1)}%`,
      );
    }
  }

  /**
   * 获取推荐模型（基于预算）
   */
  getRecommendedModel(agentCode: string): string {
    const status = this.getBudgetStatus();
    const agentStatus = status.byAgent[agentCode];

    // ARCHITECT-01 优先使用高级模型
    if (agentCode === 'ARCHITECT-01') {
      if (agentStatus && agentStatus.percentUsed < 50) {
        return 'claude-sonnet-4-20250514';
      }
      return 'gpt-4o-mini'; // 预算紧张时降级
    }

    // 其他 Agent 优先使用低成本模型
    if (status.status === 'warning' || status.status === 'critical') {
      return 'deepseek-chat'; // 最便宜
    }

    return 'claude-3-haiku-20240307'; // 默认低成本模型
  }

  /**
   * 清理过期记录（保留7天）
   */
  cleanupOldRecords(): void {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const before = this.usageRecords.length;
    this.usageRecords = this.usageRecords.filter(
      r => r.timestamp >= sevenDaysAgo,
    );
    const after = this.usageRecords.length;

    if (before !== after) {
      this.logger.log(`🧹 清理了 ${before - after} 条过期记录`);
    }
  }
}
