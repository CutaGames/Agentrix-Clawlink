/**
 * Agent Metrics Service (Phase 4)
 * 
 * Observability & Production Hardening:
 * - Real-time agent performance metrics
 * - Error recovery with exponential backoff
 * - Health checks and auto-healing
 * - Tick execution analytics
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, Between } from 'typeorm';
import { HqAgent, AgentStatus } from '../../entities/hq-agent.entity';
import { AgentTask, TaskStatus } from '../../entities/agent-task.entity';
import { TickExecution } from '../../entities/tick-execution.entity';

export interface AgentMetrics {
  agentCode: string;
  name: string;
  role: string;
  status: AgentStatus;
  isActive: boolean;
  // Performance
  tasksCompleted24h: number;
  tasksFailed24h: number;
  successRate: number;
  avgResponseTimeMs: number;
  // Cost
  totalCost24h: number;
  totalTokens24h: number;
  // Health
  healthScore: number; // 0-100
  lastActiveAt: Date | null;
  consecutiveFailures: number;
  isHealthy: boolean;
}

export interface SystemMetrics {
  timestamp: Date;
  agents: {
    total: number;
    active: number;
    idle: number;
    running: number;
    paused: number;
    error: number;
  };
  tasks: {
    pending: number;
    inProgress: number;
    completed24h: number;
    failed24h: number;
    successRate: number;
  };
  ticks: {
    total24h: number;
    successRate: number;
    avgDurationMs: number;
    lastTickAt: Date | null;
    nextTickAt: Date | null;
  };
  budget: {
    totalSpent24h: number;
    totalTokens24h: number;
  };
  health: {
    overallScore: number; // 0-100
    unhealthyAgents: string[];
    warnings: string[];
  };
}

export interface ErrorRecoveryResult {
  agentCode: string;
  action: 'reset' | 'retry' | 'escalate' | 'skip';
  success: boolean;
  message: string;
}

@Injectable()
export class AgentMetricsService {
  private readonly logger = new Logger(AgentMetricsService.name);
  private failureTracker: Map<string, { count: number; lastFailure: Date; backoffMs: number }> = new Map();

  constructor(
    @InjectRepository(HqAgent)
    private agentRepo: Repository<HqAgent>,
    @InjectRepository(AgentTask)
    private taskRepo: Repository<AgentTask>,
    @InjectRepository(TickExecution)
    private tickExecutionRepo: Repository<TickExecution>,
  ) {}

  /**
   * Get metrics for a single agent.
   */
  async getAgentMetrics(agentCode: string): Promise<AgentMetrics> {
    const agent = await this.agentRepo.findOne({ where: { code: agentCode } });
    if (!agent) throw new Error(`Agent not found: ${agentCode}`);

    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [completed24h, failed24h, allTasks24h] = await Promise.all([
      this.taskRepo.count({
        where: { assignedToId: agent.id, status: TaskStatus.COMPLETED, completedAt: MoreThan(since24h) },
      }),
      this.taskRepo.count({
        where: { assignedToId: agent.id, status: TaskStatus.FAILED, completedAt: MoreThan(since24h) },
      }),
      this.taskRepo.find({
        where: { assignedToId: agent.id, completedAt: MoreThan(since24h) },
        select: ['id', 'status', 'actualCost', 'startedAt', 'completedAt', 'metadata'],
      }),
    ]);

    const totalTasks = completed24h + failed24h;
    const successRate = totalTasks > 0 ? completed24h / totalTasks : 1;

    // Calculate avg response time
    const completedTasks = allTasks24h.filter(t => t.status === TaskStatus.COMPLETED && t.startedAt && t.completedAt);
    const avgResponseTimeMs = completedTasks.length > 0
      ? completedTasks.reduce((sum, t) => sum + (t.completedAt!.getTime() - t.startedAt!.getTime()), 0) / completedTasks.length
      : 0;

    // Calculate cost
    const totalCost24h = allTasks24h.reduce((sum, t) => sum + (t.actualCost || 0), 0);
    const totalTokens24h = allTasks24h.reduce((sum, t) => sum + ((t.metadata as any)?.tokensUsed || 0), 0);

    // Health score calculation
    const tracker = this.failureTracker.get(agentCode);
    const consecutiveFailures = tracker?.count || 0;
    const healthScore = this.calculateHealthScore(agent, successRate, consecutiveFailures);

    return {
      agentCode: agent.code,
      name: agent.name,
      role: agent.role,
      status: agent.status,
      isActive: agent.isActive,
      tasksCompleted24h: completed24h,
      tasksFailed24h: failed24h,
      successRate: Math.round(successRate * 100) / 100,
      avgResponseTimeMs: Math.round(avgResponseTimeMs),
      totalCost24h: Math.round(totalCost24h * 10000) / 10000,
      totalTokens24h,
      healthScore,
      lastActiveAt: agent.stats?.lastActiveAt ? new Date(agent.stats.lastActiveAt) : null,
      consecutiveFailures,
      isHealthy: healthScore >= 60,
    };
  }

  /**
   * Get metrics for all agents.
   */
  async getAllAgentMetrics(): Promise<AgentMetrics[]> {
    const agents = await this.agentRepo.find({ order: { code: 'ASC' } });
    return Promise.all(agents.map(a => this.getAgentMetrics(a.code)));
  }

  /**
   * Get system-wide metrics.
   */
  async getSystemMetrics(): Promise<SystemMetrics> {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [agents, taskStats, tickStats] = await Promise.all([
      this.agentRepo.find(),
      this.getTaskStats24h(since24h),
      this.getTickStats24h(since24h),
    ]);

    const agentMetrics = await this.getAllAgentMetrics();
    const unhealthyAgents = agentMetrics.filter(m => !m.isHealthy).map(m => m.agentCode);
    const warnings = this.generateWarnings(agentMetrics, taskStats, tickStats);

    const overallScore = agentMetrics.length > 0
      ? Math.round(agentMetrics.reduce((sum, m) => sum + m.healthScore, 0) / agentMetrics.length)
      : 100;

    return {
      timestamp: new Date(),
      agents: {
        total: agents.length,
        active: agents.filter(a => a.isActive).length,
        idle: agents.filter(a => a.status === AgentStatus.IDLE).length,
        running: agents.filter(a => a.status === AgentStatus.RUNNING).length,
        paused: agents.filter(a => a.status === AgentStatus.PAUSED).length,
        error: agents.filter(a => a.status === AgentStatus.ERROR).length,
      },
      tasks: taskStats,
      ticks: tickStats,
      budget: {
        totalSpent24h: agentMetrics.reduce((sum, m) => sum + m.totalCost24h, 0),
        totalTokens24h: agentMetrics.reduce((sum, m) => sum + m.totalTokens24h, 0),
      },
      health: {
        overallScore,
        unhealthyAgents,
        warnings,
      },
    };
  }

  /**
   * Record a task failure for error recovery tracking.
   */
  recordFailure(agentCode: string): void {
    const existing = this.failureTracker.get(agentCode) || { count: 0, lastFailure: new Date(), backoffMs: 1000 };
    existing.count++;
    existing.lastFailure = new Date();
    existing.backoffMs = Math.min(existing.backoffMs * 2, 300000); // Max 5 min backoff
    this.failureTracker.set(agentCode, existing);
  }

  /**
   * Record a task success (resets failure tracker).
   */
  recordSuccess(agentCode: string): void {
    this.failureTracker.delete(agentCode);
  }

  /**
   * Check if an agent should be allowed to execute (respects backoff).
   * Agents with many failures get longer backoff but are never permanently blocked.
   */
  shouldExecute(agentCode: string): { allowed: boolean; waitMs: number; reason?: string } {
    const tracker = this.failureTracker.get(agentCode);
    if (!tracker) return { allowed: true, waitMs: 0 };

    const elapsed = Date.now() - tracker.lastFailure.getTime();

    // For agents with 5+ failures, use a longer cooldown (10 minutes) but still allow retry
    if (tracker.count >= 5) {
      const cooldownMs = 10 * 60 * 1000; // 10 minutes
      if (elapsed < cooldownMs) {
        return {
          allowed: false,
          waitMs: cooldownMs - elapsed,
          reason: `Extended cooldown: ${tracker.count} consecutive failures, wait ${Math.ceil((cooldownMs - elapsed) / 1000)}s`,
        };
      }
      // After cooldown, reset failure count to give fresh start
      tracker.count = 0;
      tracker.backoffMs = 1000;
      return { allowed: true, waitMs: 0 };
    }

    if (elapsed < tracker.backoffMs) {
      return {
        allowed: false,
        waitMs: tracker.backoffMs - elapsed,
        reason: `Backoff: ${tracker.count} consecutive failures, wait ${Math.ceil((tracker.backoffMs - elapsed) / 1000)}s`,
      };
    }

    return { allowed: true, waitMs: 0 };
  }

  /**
   * Auto-heal agents stuck in ERROR or RUNNING state.
   */
  async autoHealAgents(): Promise<ErrorRecoveryResult[]> {
    const results: ErrorRecoveryResult[] = [];

    // Find agents stuck in RUNNING for > 10 minutes
    const stuckAgents = await this.agentRepo.find({
      where: { status: AgentStatus.RUNNING },
    });

    for (const agent of stuckAgents) {
      const lastUpdate = agent.updatedAt?.getTime() || 0;
      const stuckDuration = Date.now() - lastUpdate;

      if (stuckDuration > 10 * 60 * 1000) {
        agent.status = AgentStatus.IDLE;
        agent.currentTask = null;
        await this.agentRepo.save(agent);

        results.push({
          agentCode: agent.code,
          action: 'reset',
          success: true,
          message: `Reset from RUNNING (stuck for ${Math.round(stuckDuration / 60000)}min)`,
        });
        this.logger.warn(`🔧 Auto-healed ${agent.code}: reset from stuck RUNNING state`);
      }
    }

    // Find agents in ERROR state - always reset them to IDLE
    const errorAgents = await this.agentRepo.find({
      where: { status: AgentStatus.ERROR },
    });

    for (const agent of errorAgents) {
      const tracker = this.failureTracker.get(agent.code);
      const failCount = tracker?.count || 0;

      // Always reset to IDLE - autonomous system should self-recover
      agent.status = AgentStatus.IDLE;
      agent.currentTask = null;
      await this.agentRepo.save(agent);

      // Reset failure tracker if count is high (give fresh start)
      if (failCount >= 5) {
        this.failureTracker.delete(agent.code);
      }

      results.push({
        agentCode: agent.code,
        action: 'retry',
        success: true,
        message: `Reset from ERROR to IDLE (failures: ${failCount}, tracker cleared: ${failCount >= 5})`,
      });
      this.logger.log(`🔧 Auto-healed ${agent.code}: reset from ERROR to IDLE (failures: ${failCount})`);
    }

    // Clean up stale tasks (IN_PROGRESS for > 30 min)
    const staleTasks = await this.taskRepo.find({
      where: {
        status: TaskStatus.IN_PROGRESS,
        startedAt: MoreThan(new Date(0)), // has a start time
      },
    });

    for (const task of staleTasks) {
      if (task.startedAt && Date.now() - task.startedAt.getTime() > 30 * 60 * 1000) {
        await this.taskRepo.update(task.id, {
          status: TaskStatus.PENDING,
          errorMessage: 'Auto-reset: task was stuck in progress',
        });
        this.logger.warn(`🔧 Auto-reset stale task: ${task.title}`);
      }
    }

    return results;
  }

  // --- Private helpers ---

  private calculateHealthScore(agent: HqAgent, successRate: number, consecutiveFailures: number): number {
    let score = 100;

    // Deduct for status
    if (agent.status === AgentStatus.ERROR) score -= 40;
    if (agent.status === AgentStatus.PAUSED) score -= 20;
    if (!agent.isActive) score -= 30;

    // Deduct for failure rate
    score -= Math.round((1 - successRate) * 30);

    // Deduct for consecutive failures
    score -= consecutiveFailures * 10;

    return Math.max(0, Math.min(100, score));
  }

  private async getTaskStats24h(since: Date) {
    const [pending, inProgress, completed, failed] = await Promise.all([
      this.taskRepo.count({ where: { status: TaskStatus.PENDING, isActive: true } }),
      this.taskRepo.count({ where: { status: TaskStatus.IN_PROGRESS, isActive: true } }),
      this.taskRepo.count({ where: { status: TaskStatus.COMPLETED, completedAt: MoreThan(since) } }),
      this.taskRepo.count({ where: { status: TaskStatus.FAILED, completedAt: MoreThan(since) } }),
    ]);

    const total = completed + failed;
    return {
      pending,
      inProgress,
      completed24h: completed,
      failed24h: failed,
      successRate: total > 0 ? Math.round((completed / total) * 100) / 100 : 1,
    };
  }

  private async getTickStats24h(since: Date) {
    const executions = await this.tickExecutionRepo.find({
      where: { startTime: MoreThan(since) },
      order: { startTime: 'DESC' },
    });

    const completed = executions.filter(e => e.status === 'completed');
    const avgDurationMs = completed.length > 0
      ? Math.round(completed.reduce((sum, e) => sum + (e.durationMs || 0), 0) / completed.length)
      : 0;

    const lastTick = executions[0]?.startTime || null;
    const nextTick = lastTick ? new Date(lastTick.getTime() + 10 * 60 * 1000) : null;

    return {
      total24h: executions.length,
      successRate: executions.length > 0 ? Math.round((completed.length / executions.length) * 100) / 100 : 1,
      avgDurationMs,
      lastTickAt: lastTick,
      nextTickAt: nextTick,
    };
  }

  private generateWarnings(agentMetrics: AgentMetrics[], taskStats: any, tickStats: any): string[] {
    const warnings: string[] = [];

    // High failure rate
    if (taskStats.successRate < 0.8 && taskStats.completed24h + taskStats.failed24h > 3) {
      warnings.push(`Task success rate is ${Math.round(taskStats.successRate * 100)}% (below 80% threshold)`);
    }

    // Agents in error
    const errorAgents = agentMetrics.filter(m => m.status === AgentStatus.ERROR);
    if (errorAgents.length > 0) {
      warnings.push(`${errorAgents.length} agent(s) in ERROR state: ${errorAgents.map(a => a.agentCode).join(', ')}`);
    }

    // High consecutive failures
    const highFailures = agentMetrics.filter(m => m.consecutiveFailures >= 3);
    if (highFailures.length > 0) {
      warnings.push(`${highFailures.length} agent(s) with 3+ consecutive failures`);
    }

    // No ticks in last 30 min
    if (tickStats.lastTickAt && Date.now() - tickStats.lastTickAt.getTime() > 30 * 60 * 1000) {
      warnings.push('No tick execution in the last 30 minutes');
    }

    // Too many pending tasks
    if (taskStats.pending > 20) {
      warnings.push(`${taskStats.pending} tasks pending (backlog growing)`);
    }

    return warnings;
  }
}
