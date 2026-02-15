/**
 * Work Schedule Service
 * 
 * 7×24 Agent 工作排班系统
 * 最大化利用免费 API 额度，让 Agent 全天候工作
 * 
 * 免费额度:
 * - Gemini: 1,500 req/day (15 RPM)
 * - Groq:  14,400 req/day (30 RPM) 
 * - DeepSeek: ~unlimited ($0.0001/1K tokens)
 * - Bedrock: $2,500 credit (Claude Opus/Sonnet/Haiku)
 * 
 * 总计: ~16,000+ free requests/day
 */

import { Injectable, Logger } from '@nestjs/common';

/** 时段定义 */
export enum TimeSlot {
  DAWN = 'dawn',           // 00:00-06:00 低活跃期
  MORNING = 'morning',     // 06:00-12:00 高活跃期
  AFTERNOON = 'afternoon', // 12:00-18:00 高活跃期
  EVENING = 'evening',     // 18:00-24:00 中活跃期
}

/** Agent 工作模式 */
export enum WorkMode {
  ACTIVE = 'active',       // 主动工作：生成任务、执行、协作
  MONITOR = 'monitor',     // 监控模式：只响应事件和紧急任务
  BATCH = 'batch',         // 批量模式：处理积压任务
  CREATIVE = 'creative',   // 创意模式：内容生成、策略思考
  MAINTENANCE = 'maintenance', // 维护模式：代码审查、文档更新
}

/** 单个 Agent 的排班 */
export interface AgentScheduleEntry {
  agentCode: string;
  timeSlot: TimeSlot;
  workMode: WorkMode;
  tasksPerTick: number;      // 每次 Tick 执行的任务数
  taskTemplates: string[];   // 该时段的任务模板 ID
  priority: number;          // 调度优先级 1-10
  maxDailyTasks: number;     // 每日最大任务数
  cooldownMinutes: number;   // 两次执行间的冷却时间
}

/** 每日任务配额 */
export interface DailyQuota {
  agentCode: string;
  provider: string;
  maxRequests: number;       // 最大请求数
  usedRequests: number;      // 已用请求数
  remainingRequests: number; // 剩余请求数
  resetAt: Date;             // 重置时间
}

@Injectable()
export class WorkScheduleService {
  private readonly logger = new Logger(WorkScheduleService.name);

  /**
   * 获取当前时段
   */
  getCurrentTimeSlot(): TimeSlot {
    const hour = new Date().getUTCHours(); // 使用 UTC
    if (hour >= 0 && hour < 6) return TimeSlot.DAWN;
    if (hour >= 6 && hour < 12) return TimeSlot.MORNING;
    if (hour >= 12 && hour < 18) return TimeSlot.AFTERNOON;
    return TimeSlot.EVENING;
  }

  /**
   * 获取当前时段的完整排班表
   */
  getScheduleForCurrentSlot(): AgentScheduleEntry[] {
    const slot = this.getCurrentTimeSlot();
    return this.getFullSchedule().filter(s => s.timeSlot === slot);
  }

  /**
   * 获取指定 Agent 在当前时段的排班
   */
  getAgentSchedule(agentCode: string): AgentScheduleEntry | null {
    const slot = this.getCurrentTimeSlot();
    return this.getFullSchedule().find(
      s => s.agentCode === agentCode && s.timeSlot === slot
    ) || null;
  }

  /**
   * 计算每日配额
   * 基于免费额度合理分配
   */
  getDailyQuotas(): DailyQuota[] {
    const now = new Date();
    const resetAt = new Date(now);
    resetAt.setUTCHours(0, 0, 0, 0);
    resetAt.setUTCDate(resetAt.getUTCDate() + 1);

    return [
      // === 付费 Agent (按需启用，不参与自动排班) ===
      // ARCHITECT-01 和 CODER-01 使用 Bedrock 付费模型，仅人工指派时启用

      // === Groq Agents (免费 14,400 req/天) ===
      { agentCode: 'GROWTH-01', provider: 'groq', maxRequests: 3500, usedRequests: 0, remainingRequests: 3500, resetAt },
      { agentCode: 'BD-01', provider: 'groq', maxRequests: 3000, usedRequests: 0, remainingRequests: 3000, resetAt },
      { agentCode: 'CONTENT-01', provider: 'groq', maxRequests: 3500, usedRequests: 0, remainingRequests: 3500, resetAt },
      { agentCode: 'SUPPORT-01', provider: 'groq', maxRequests: 2400, usedRequests: 0, remainingRequests: 2400, resetAt },
      // Groq 剩余 2000 作为缓冲

      // === Gemini Agents (免费 1,500 req/天) ===
      { agentCode: 'ANALYST-01', provider: 'gemini', maxRequests: 350, usedRequests: 0, remainingRequests: 350, resetAt },
      { agentCode: 'SOCIAL-01', provider: 'gemini', maxRequests: 350, usedRequests: 0, remainingRequests: 350, resetAt },
      { agentCode: 'SECURITY-01', provider: 'gemini', maxRequests: 200, usedRequests: 0, remainingRequests: 200, resetAt },
      { agentCode: 'DEVREL-01', provider: 'gemini', maxRequests: 300, usedRequests: 0, remainingRequests: 300, resetAt },
      { agentCode: 'LEGAL-01', provider: 'gemini', maxRequests: 200, usedRequests: 0, remainingRequests: 200, resetAt },
      // Gemini 剩余 100 作为缓冲
    ];
  }

  /**
   * 完整的 7×24 排班表
   * 
   * 设计原则 (7×24 自主运行):
   * 1. 9 个免费 Agent (Groq/Gemini) 全天 7×24 高频运行
   * 2. 付费 Agent (ARCHITECT-01/CODER-01) 不参与自动排班，仅人工按需启用
   * 3. 凌晨做批量/研究/维护任务
   * 4. 白天做创意/社交/协作任务
   * 5. 晚间做总结/规划/社交互动
   */
  getFullSchedule(): AgentScheduleEntry[] {
    return [
      // ============ DAWN (00:00-06:00) 低活跃期 ============
      // 免费 Agent 做批量/研究任务，付费 Agent 不参与自动排班
      {
        agentCode: 'GROWTH-01', timeSlot: TimeSlot.DAWN, workMode: WorkMode.BATCH,
        tasksPerTick: 2, taskTemplates: ['seo-audit', 'competitor-scan', 'keyword-research', 'funnel-analysis'],
        priority: 7, maxDailyTasks: 3500, cooldownMinutes: 10,
      },
      {
        agentCode: 'BD-01', timeSlot: TimeSlot.DAWN, workMode: WorkMode.BATCH,
        tasksPerTick: 2, taskTemplates: ['grant-research', 'free-resource-scan', 'cloud-credits-hunt', 'ecosystem-analysis'],
        priority: 8, maxDailyTasks: 3000, cooldownMinutes: 10,
      },
      {
        agentCode: 'CONTENT-01', timeSlot: TimeSlot.DAWN, workMode: WorkMode.CREATIVE,
        tasksPerTick: 2, taskTemplates: ['blog-draft', 'doc-update', 'changelog-generate', 'tutorial-draft'],
        priority: 7, maxDailyTasks: 3500, cooldownMinutes: 10,
      },
      {
        agentCode: 'SUPPORT-01', timeSlot: TimeSlot.DAWN, workMode: WorkMode.BATCH,
        tasksPerTick: 2, taskTemplates: ['faq-update', 'ticket-triage', 'knowledge-base-update', 'auto-response-optimize'],
        priority: 6, maxDailyTasks: 2400, cooldownMinutes: 10,
      },
      {
        agentCode: 'ANALYST-01', timeSlot: TimeSlot.DAWN, workMode: WorkMode.BATCH,
        tasksPerTick: 1, taskTemplates: ['daily-metrics-report', 'anomaly-detection', 'trend-analysis'],
        priority: 7, maxDailyTasks: 350, cooldownMinutes: 20,
      },
      {
        agentCode: 'SOCIAL-01', timeSlot: TimeSlot.DAWN, workMode: WorkMode.MONITOR,
        tasksPerTick: 1, taskTemplates: ['social-monitoring', 'sentiment-scan', 'trend-monitor'],
        priority: 5, maxDailyTasks: 350, cooldownMinutes: 20,
      },
      {
        agentCode: 'SECURITY-01', timeSlot: TimeSlot.DAWN, workMode: WorkMode.BATCH,
        tasksPerTick: 1, taskTemplates: ['security-scan', 'dependency-audit', 'credential-check'],
        priority: 6, maxDailyTasks: 200, cooldownMinutes: 30,
      },
      {
        agentCode: 'DEVREL-01', timeSlot: TimeSlot.DAWN, workMode: WorkMode.BATCH,
        tasksPerTick: 1, taskTemplates: ['sdk-doc-review', 'example-code-update', 'github-issue-triage'],
        priority: 5, maxDailyTasks: 300, cooldownMinutes: 20,
      },
      {
        agentCode: 'LEGAL-01', timeSlot: TimeSlot.DAWN, workMode: WorkMode.MONITOR,
        tasksPerTick: 0, taskTemplates: [],
        priority: 3, maxDailyTasks: 200, cooldownMinutes: 60,
      },

      // ============ MORNING (06:00-12:00) 高活跃期 ============
      // 全力工作：发帖、互动、策略、报告
      {
        agentCode: 'GROWTH-01', timeSlot: TimeSlot.MORNING, workMode: WorkMode.ACTIVE,
        tasksPerTick: 3, taskTemplates: ['growth-strategy', 'user-acquisition', 'conversion-optimize', 'ab-test-plan'],
        priority: 9, maxDailyTasks: 3500, cooldownMinutes: 10,
      },
      {
        agentCode: 'BD-01', timeSlot: TimeSlot.MORNING, workMode: WorkMode.ACTIVE,
        tasksPerTick: 2, taskTemplates: ['partnership-outreach', 'grant-application', 'free-api-hunt', 'ecosystem-mapping'],
        priority: 9, maxDailyTasks: 3000, cooldownMinutes: 10,
      },
      {
        agentCode: 'CONTENT-01', timeSlot: TimeSlot.MORNING, workMode: WorkMode.CREATIVE,
        tasksPerTick: 3, taskTemplates: ['blog-write', 'tutorial-create', 'twitter-thread-draft', 'landing-page-copy'],
        priority: 8, maxDailyTasks: 3500, cooldownMinutes: 10,
      },
      {
        agentCode: 'SUPPORT-01', timeSlot: TimeSlot.MORNING, workMode: WorkMode.ACTIVE,
        tasksPerTick: 2, taskTemplates: ['ticket-respond', 'faq-update', 'onboarding-guide', 'feedback-analyze'],
        priority: 7, maxDailyTasks: 2400, cooldownMinutes: 10,
      },
      {
        agentCode: 'ANALYST-01', timeSlot: TimeSlot.MORNING, workMode: WorkMode.ACTIVE,
        tasksPerTick: 2, taskTemplates: ['market-analysis', 'competitor-report', 'user-behavior-analysis', 'revenue-forecast'],
        priority: 8, maxDailyTasks: 350, cooldownMinutes: 15,
      },
      {
        agentCode: 'SOCIAL-01', timeSlot: TimeSlot.MORNING, workMode: WorkMode.ACTIVE,
        tasksPerTick: 2, taskTemplates: ['tweet-compose', 'kol-engage', 'discord-post', 'telegram-update'],
        priority: 9, maxDailyTasks: 350, cooldownMinutes: 15,
      },
      {
        agentCode: 'SECURITY-01', timeSlot: TimeSlot.MORNING, workMode: WorkMode.ACTIVE,
        tasksPerTick: 1, taskTemplates: ['security-audit', 'vulnerability-scan', 'compliance-check'],
        priority: 6, maxDailyTasks: 200, cooldownMinutes: 30,
      },
      {
        agentCode: 'DEVREL-01', timeSlot: TimeSlot.MORNING, workMode: WorkMode.ACTIVE,
        tasksPerTick: 2, taskTemplates: ['developer-support', 'sdk-improvement', 'community-engage', 'integration-guide'],
        priority: 7, maxDailyTasks: 300, cooldownMinutes: 15,
      },
      {
        agentCode: 'LEGAL-01', timeSlot: TimeSlot.MORNING, workMode: WorkMode.ACTIVE,
        tasksPerTick: 1, taskTemplates: ['compliance-review', 'terms-audit', 'privacy-check', 'grant-legal-review'],
        priority: 5, maxDailyTasks: 200, cooldownMinutes: 30,
      },

      // ============ AFTERNOON (12:00-18:00) 高活跃期 ============
      // 协作产出：内容发布、合作跟进、社区维护
      {
        agentCode: 'GROWTH-01', timeSlot: TimeSlot.AFTERNOON, workMode: WorkMode.ACTIVE,
        tasksPerTick: 3, taskTemplates: ['campaign-optimize', 'retention-strategy', 'pricing-research', 'referral-program'],
        priority: 8, maxDailyTasks: 3500, cooldownMinutes: 10,
      },
      {
        agentCode: 'BD-01', timeSlot: TimeSlot.AFTERNOON, workMode: WorkMode.ACTIVE,
        tasksPerTick: 2, taskTemplates: ['proposal-draft', 'follow-up-email', 'deal-analysis', 'cloud-credits-apply'],
        priority: 8, maxDailyTasks: 3000, cooldownMinutes: 10,
      },
      {
        agentCode: 'CONTENT-01', timeSlot: TimeSlot.AFTERNOON, workMode: WorkMode.CREATIVE,
        tasksPerTick: 3, taskTemplates: ['whitepaper-section', 'case-study', 'social-content-batch', 'newsletter-draft'],
        priority: 7, maxDailyTasks: 3500, cooldownMinutes: 10,
      },
      {
        agentCode: 'SUPPORT-01', timeSlot: TimeSlot.AFTERNOON, workMode: WorkMode.ACTIVE,
        tasksPerTick: 2, taskTemplates: ['ticket-respond', 'doc-improve', 'tutorial-update', 'community-support'],
        priority: 7, maxDailyTasks: 2400, cooldownMinutes: 10,
      },
      {
        agentCode: 'ANALYST-01', timeSlot: TimeSlot.AFTERNOON, workMode: WorkMode.ACTIVE,
        tasksPerTick: 2, taskTemplates: ['performance-report', 'cost-analysis', 'roi-calculation', 'data-visualization'],
        priority: 8, maxDailyTasks: 350, cooldownMinutes: 15,
      },
      {
        agentCode: 'SOCIAL-01', timeSlot: TimeSlot.AFTERNOON, workMode: WorkMode.ACTIVE,
        tasksPerTick: 2, taskTemplates: ['engagement-respond', 'influencer-outreach', 'content-schedule', 'analytics-review'],
        priority: 8, maxDailyTasks: 350, cooldownMinutes: 15,
      },
      {
        agentCode: 'SECURITY-01', timeSlot: TimeSlot.AFTERNOON, workMode: WorkMode.MONITOR,
        tasksPerTick: 1, taskTemplates: ['incident-monitor', 'access-review'],
        priority: 5, maxDailyTasks: 200, cooldownMinutes: 30,
      },
      {
        agentCode: 'DEVREL-01', timeSlot: TimeSlot.AFTERNOON, workMode: WorkMode.ACTIVE,
        tasksPerTick: 2, taskTemplates: ['github-pr-review', 'developer-outreach', 'framework-integration', 'demo-create'],
        priority: 7, maxDailyTasks: 300, cooldownMinutes: 15,
      },
      {
        agentCode: 'LEGAL-01', timeSlot: TimeSlot.AFTERNOON, workMode: WorkMode.ACTIVE,
        tasksPerTick: 1, taskTemplates: ['contract-review', 'partnership-legal', 'risk-assessment'],
        priority: 5, maxDailyTasks: 200, cooldownMinutes: 30,
      },

      // ============ EVENING (18:00-24:00) 中活跃期 ============
      // 总结、规划、晚间社交互动
      {
        agentCode: 'GROWTH-01', timeSlot: TimeSlot.EVENING, workMode: WorkMode.ACTIVE,
        tasksPerTick: 2, taskTemplates: ['daily-growth-report', 'next-day-plan', 'experiment-review', 'market-scan'],
        priority: 7, maxDailyTasks: 3500, cooldownMinutes: 10,
      },
      {
        agentCode: 'BD-01', timeSlot: TimeSlot.EVENING, workMode: WorkMode.BATCH,
        tasksPerTick: 2, taskTemplates: ['crm-update', 'pipeline-review', 'follow-up-schedule', 'opportunity-score'],
        priority: 6, maxDailyTasks: 3000, cooldownMinutes: 10,
      },
      {
        agentCode: 'CONTENT-01', timeSlot: TimeSlot.EVENING, workMode: WorkMode.BATCH,
        tasksPerTick: 2, taskTemplates: ['content-review', 'seo-optimize', 'content-calendar', 'repurpose-content'],
        priority: 6, maxDailyTasks: 3500, cooldownMinutes: 10,
      },
      {
        agentCode: 'SUPPORT-01', timeSlot: TimeSlot.EVENING, workMode: WorkMode.BATCH,
        tasksPerTick: 2, taskTemplates: ['daily-ticket-summary', 'knowledge-gap-identify', 'satisfaction-analyze', 'bug-report-compile'],
        priority: 6, maxDailyTasks: 2400, cooldownMinutes: 10,
      },
      {
        agentCode: 'ANALYST-01', timeSlot: TimeSlot.EVENING, workMode: WorkMode.BATCH,
        tasksPerTick: 1, taskTemplates: ['daily-report-compile', 'weekly-trend', 'alert-review', 'prediction-update'],
        priority: 7, maxDailyTasks: 350, cooldownMinutes: 20,
      },
      {
        agentCode: 'SOCIAL-01', timeSlot: TimeSlot.EVENING, workMode: WorkMode.ACTIVE,
        tasksPerTick: 2, taskTemplates: ['evening-post', 'engagement-summary', 'tomorrow-content-plan', 'trend-monitor'],
        priority: 8, maxDailyTasks: 350, cooldownMinutes: 15,
      },
      {
        agentCode: 'SECURITY-01', timeSlot: TimeSlot.EVENING, workMode: WorkMode.BATCH,
        tasksPerTick: 1, taskTemplates: ['daily-security-report', 'log-analysis'],
        priority: 5, maxDailyTasks: 200, cooldownMinutes: 30,
      },
      {
        agentCode: 'DEVREL-01', timeSlot: TimeSlot.EVENING, workMode: WorkMode.BATCH,
        tasksPerTick: 1, taskTemplates: ['doc-review', 'release-notes', 'community-summary'],
        priority: 5, maxDailyTasks: 300, cooldownMinutes: 20,
      },
      {
        agentCode: 'LEGAL-01', timeSlot: TimeSlot.EVENING, workMode: WorkMode.MONITOR,
        tasksPerTick: 0, taskTemplates: [],
        priority: 3, maxDailyTasks: 200, cooldownMinutes: 60,
      },
    ];
  }

  /**
   * 获取每日任务分配总览
   */
  getDailySummary(): {
    totalDailyTasks: number;
    byProvider: Record<string, { agents: string[]; maxRequests: number; cost: string }>;
    byTimeSlot: Record<string, number>;
  } {
    const quotas = this.getDailyQuotas();
    const schedule = this.getFullSchedule();

    const byProvider: Record<string, { agents: string[]; maxRequests: number; cost: string }> = {
      'groq': { agents: ['GROWTH-01', 'BD-01', 'CONTENT-01', 'SUPPORT-01'], maxRequests: 12400, cost: '$0 (FREE)' },
      'gemini': { agents: ['ANALYST-01', 'SOCIAL-01', 'SECURITY-01', 'DEVREL-01', 'LEGAL-01'], maxRequests: 1400, cost: '$0 (FREE)' },
      'bedrock (on-demand)': { agents: ['ARCHITECT-01', 'CODER-01'], maxRequests: 0, cost: '按需启用，不参与自动排班' },
    };

    // 按时段统计
    const byTimeSlot: Record<string, number> = {};
    for (const entry of schedule) {
      const key = entry.timeSlot;
      byTimeSlot[key] = (byTimeSlot[key] || 0) + entry.tasksPerTick * 6; // 6 ticks per slot (10min each, 1hr)
    }

    const totalDailyTasks = quotas.reduce((sum, q) => sum + q.maxRequests, 0);

    return { totalDailyTasks, byProvider, byTimeSlot };
  }

  /**
   * 检查 Agent 是否应该在当前时段工作
   */
  shouldAgentWork(agentCode: string): {
    shouldWork: boolean;
    workMode: WorkMode;
    tasksPerTick: number;
    reason: string;
  } {
    const schedule = this.getAgentSchedule(agentCode);
    if (!schedule) {
      return { shouldWork: false, workMode: WorkMode.MONITOR, tasksPerTick: 0, reason: 'No schedule found' };
    }

    if (schedule.workMode === WorkMode.MONITOR && schedule.tasksPerTick === 0) {
      return { shouldWork: false, workMode: WorkMode.MONITOR, tasksPerTick: 0, reason: 'Monitor mode - no active tasks' };
    }

    return {
      shouldWork: true,
      workMode: schedule.workMode,
      tasksPerTick: schedule.tasksPerTick,
      reason: `${schedule.workMode} mode in ${schedule.timeSlot} slot`,
    };
  }
}
