/**
 * Tick Service (Rewritten - Phase 4)
 * 
 * Agent 自主运行系统核心 - 使用真实数据库和 Cron 调度
 * 替代内存中的硬编码 Agent 列表
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { HqAgent, AgentStatus } from '../../entities/hq-agent.entity';
import { AgentTask, TaskStatus } from '../../entities/agent-task.entity';
import { TickExecution } from '../../entities/tick-execution.entity';
import { TaskQueueService } from './task-queue.service';
import { TaskContextService } from './task-context.service';
import { AgentTriggerService } from './agent-trigger.service';
import { BudgetMonitorService } from './budget-monitor.service';
import { AutoTaskGeneratorService } from './auto-task-generator.service';
import { AgentMetricsService } from './agent-metrics.service';
import { AgentLearningService } from './agent-learning.service';

export interface TickResult {
  tickId: string;
  timestamp: Date;
  budgetStatus: any;
  agentStatuses: Array<{
    agentCode: string;
    status: string;
    currentTask: string | null;
    dailySpent: number;
    dailyBudget: number;
  }>;
  tasksProcessed: number;
  tasksCompleted: number;
  tasksFailed: number;
  actionsPlanned: string[];
  nextTickIn: string;
}

@Injectable()
export class TickService {
  private readonly logger = new Logger(TickService.name);
  private isProcessing = false; // Prevent concurrent ticks
  private lastQuotaExhaustedAt: Date | null = null; // Track when all quotas were exhausted

  constructor(
    @InjectRepository(HqAgent)
    private agentRepo: Repository<HqAgent>,
    @InjectRepository(AgentTask)
    private taskRepo: Repository<AgentTask>,
    @InjectRepository(TickExecution)
    private tickExecutionRepo: Repository<TickExecution>,
    private taskQueueService: TaskQueueService,
    private taskContextService: TaskContextService,
    private agentTriggerService: AgentTriggerService,
    private budgetMonitor: BudgetMonitorService,
    private autoTaskGenerator: AutoTaskGeneratorService,
    private agentMetrics: AgentMetricsService,
    private agentLearning: AgentLearningService,
  ) {}

  /**
   * 主 Tick 函数 - 每 30 分钟触发一次
   * 使用真实的 Cron 调度
   * 
   * 配额预算: 3 keys × (1500+1000) = 7500 RPD 主力配额
   * 30分钟/tick × 6任务/tick = 48 ticks × 6 = 288 次/天 (远低于配额)
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async scheduledTick() {
    // Allow disabling cron tick via env var (for standby servers)
    if (process.env.TICK_ENABLED === 'false') {
      return;
    }

    if (this.isProcessing) {
      this.logger.warn('⏸️ Tick already in progress, skipping...');
      return;
    }

    // Skip tick if all quotas were exhausted recently (within 20 min)
    if (this.lastQuotaExhaustedAt) {
      const minutesSinceExhaustion = (Date.now() - this.lastQuotaExhaustedAt.getTime()) / 60000;
      if (minutesSinceExhaustion < 20) {
        this.logger.warn(`⏸️ All Gemini quotas exhausted ${Math.round(minutesSinceExhaustion)}m ago, skipping tick to save quota`);
        return;
      } else {
        this.lastQuotaExhaustedAt = null; // Reset after cooldown
      }
    }

    await this.executeTick('cron');
  }

  /**
   * Called by agent trigger when all Gemini models are exhausted
   */
  markQuotaExhausted() {
    this.lastQuotaExhaustedAt = new Date();
    this.logger.warn('🚫 All Gemini quotas marked as exhausted, will skip ticks for 20 minutes');
  }

  /**
   * 执行 Tick (可手动触发或 Cron 触发)
   */
  async executeTick(triggeredBy: string = 'manual'): Promise<TickResult> {
    if (this.isProcessing) {
      throw new Error('Tick already in progress');
    }

    this.isProcessing = true;
    const tickId = `tick_${Date.now()}`;
    this.logger.log(`=== 🔄 Tick ${tickId} 开始 (触发者: ${triggeredBy}) ===`);

    const execution = this.tickExecutionRepo.create({
      tickId,
      triggeredBy,
      status: 'running',
      startTime: new Date(),
      tasksProcessed: 0,
      tasksCompleted: 0,
      tasksFailed: 0,
    });

    await this.tickExecutionRepo.save(execution);

    try {
      // 1. 检查预算
      const budgetStatus = this.budgetMonitor.getBudgetStatus();
      if (budgetStatus.status === 'exceeded') {
        this.logger.warn('💰 今日预算已用完，暂停自主操作');
        return this.buildTickResult(tickId, budgetStatus, [], 0, 0, 0, ['预算耗尽，等待明日重置']);
      }

      // 2. 获取所有 Active Agents
      const agents = await this.agentRepo.find({
        where: { isActive: true },
        order: { code: 'ASC' },
      });

      if (agents.length === 0) {
        this.logger.warn('⚠️ No active agents found');
        return this.buildTickResult(tickId, budgetStatus, [], 0, 0, 0, ['No active agents']);
      }

      // 3. 更新 Agent 状态
      const agentStatuses = await this.updateAgentStatuses(agents);

      // 4. 获取可执行任务
      const executableTasks = await this.taskQueueService.getExecutableTasks();
      this.logger.log(`📋 Found ${executableTasks.length} executable tasks`);

      // 4.5 Auto-heal agents stuck in bad states (Phase 4)
      const healResults = await this.agentMetrics.autoHealAgents();
      if (healResults.length > 0) {
        this.logger.log(`🔧 Auto-healed ${healResults.length} agent(s)`);
        // Re-fetch agents after healing
        const refreshedAgents = await this.agentRepo.find({ where: { isActive: true }, order: { code: 'ASC' } });
        agents.length = 0;
        agents.push(...refreshedAgents);
      }

      // 5. 分配和执行任务
      let tasksProcessed = 0;
      let tasksCompleted = 0;
      let tasksFailed = 0;
      const actionsPlanned: string[] = [];

      for (const task of executableTasks) {
        // 检查预算是否充足
        const currentBudget = this.budgetMonitor.getBudgetStatus();
        if (currentBudget.status === 'exceeded' || currentBudget.status === 'critical') {
          this.logger.warn('⚠️ Budget critical, stopping task execution');
          break;
        }

        // 如果任务已分配，直接触发
        if (task.assignedToId) {
          const agent = agents.find(a => a.id === task.assignedToId);
          if (agent) {
            // Phase 4: Check backoff before executing
            const execCheck = this.agentMetrics.shouldExecute(agent.code);
            if (!execCheck.allowed) {
              this.logger.warn(`⏸️ ${agent.code} in backoff: ${execCheck.reason}`);
              continue;
            }

            await this.executeTask(agent, task);
            tasksProcessed++;
            actionsPlanned.push(`${agent.code}: Executing "${task.title}"`);

            const updated = await this.taskRepo.findOne({ where: { id: task.id } });
            if (updated?.status === TaskStatus.COMPLETED) {
              tasksCompleted++;
              this.agentMetrics.recordSuccess(agent.code);
              // Phase 3: Chain task output
              await this.autoTaskGenerator.chainTaskOutput(task.id);
              // Phase 5: Learn from completed task
              await this.agentLearning.learnFromTask(task.id).catch(e => this.logger.warn(`Learning failed: ${e.message}`));
            } else if (updated?.status === TaskStatus.FAILED) {
              tasksFailed++;
              this.agentMetrics.recordFailure(agent.code);
              // Phase 5: Learn from failure
              await this.agentLearning.learnFromFailure(task.id).catch(e => this.logger.warn(`Failure learning failed: ${e.message}`));
            }
          }
          continue;
        }

        // 否则，尝试分配给合适的 Agent
        const suitableAgent = await this.findSuitableAgent(task, agents);
        if (suitableAgent) {
          // Phase 4: Check backoff
          const execCheck = this.agentMetrics.shouldExecute(suitableAgent.code);
          if (!execCheck.allowed) {
            this.logger.warn(`⏸️ ${suitableAgent.code} in backoff: ${execCheck.reason}`);
            continue;
          }

          await this.taskQueueService.assignTask(task.id, suitableAgent.code);
          await this.executeTask(suitableAgent, task);
          tasksProcessed++;
          actionsPlanned.push(`${suitableAgent.code}: Assigned and executing "${task.title}"`);

          const updated = await this.taskRepo.findOne({ where: { id: task.id } });
          if (updated?.status === TaskStatus.COMPLETED) {
            tasksCompleted++;
            this.agentMetrics.recordSuccess(suitableAgent.code);
            // Phase 3: Chain task output
            await this.autoTaskGenerator.chainTaskOutput(task.id);
            // Phase 5: Learn from completed task
            await this.agentLearning.learnFromTask(task.id).catch(e => this.logger.warn(`Learning failed: ${e.message}`));
          } else if (updated?.status === TaskStatus.FAILED) {
            tasksFailed++;
            this.agentMetrics.recordFailure(suitableAgent.code);
            // Phase 5: Learn from failure
            await this.agentLearning.learnFromFailure(task.id).catch(e => this.logger.warn(`Failure learning failed: ${e.message}`));
          }
        } else {
          this.logger.warn(`⚠️ No suitable agent for task "${task.title}"`);
        }

        // RPM guard: wait between tasks to avoid Gemini 429 errors
        // With 3 keys × 15 RPM = 45 RPM max, 4s gap keeps us safe
        if (tasksProcessed > 0) {
          await new Promise(r => setTimeout(r, 4000));
        }

        // 限制每个 Tick 最多处理 6 个任务 (控制RPM，避免配额耗尽)
        if (tasksProcessed >= 6) {
          this.logger.log('📊 Reached task limit for this tick (RPM guard)');
          break;
        }
      }

      // 5.5 Detect quota exhaustion: if we processed tasks but ALL failed, likely quota issue
      if (tasksProcessed > 0 && tasksFailed === tasksProcessed && tasksCompleted === 0) {
        this.markQuotaExhausted();
        this.logger.warn(`⚠️ All ${tasksFailed} tasks failed this tick — likely quota exhaustion, will pause ticks`);
      }

      // 6. Phase 3: Auto-generate tasks for idle agents if queue is empty
      if (tasksProcessed === 0 || executableTasks.length < 5) {
        // First, try Strategic Planning (COMMANDER-01) if queue is very low
        if (executableTasks.length < 3) {
           await this.autoTaskGenerator.runStrategicPlanning();
        }

        const generatedTasks = await this.autoTaskGenerator.generateTasksForIdleAgents(agents);
        if (generatedTasks.length > 0) {
          actionsPlanned.push(`Auto-generated ${generatedTasks.length} task(s) for idle agents`);
          for (const gt of generatedTasks) {
            actionsPlanned.push(`  → ${gt.title}`);
          }
        } else {
          const plannedActions = await this.planNextActions(agents, budgetStatus);
          actionsPlanned.push(...plannedActions);
        }
      }

      const result = this.buildTickResult(
        tickId,
        budgetStatus,
        agentStatuses,
        tasksProcessed,
        tasksCompleted,
        tasksFailed,
        actionsPlanned
      );

      const endTime = new Date();
      await this.tickExecutionRepo.update(execution.id, {
        status: 'completed',
        endTime,
        durationMs: endTime.getTime() - execution.startTime.getTime(),
        tasksProcessed,
        tasksCompleted,
        tasksFailed,
        actionsPlanned,
      });

      // Phase 5: Auto-share learnings across agents
      if (tasksCompleted > 0) {
        await this.agentLearning.autoShareLearnings().catch(e => this.logger.warn(`Auto-share failed: ${e.message}`));
      }

      this.logger.log(`=== ✅ Tick ${tickId} 完成 ===`);
      return result;
    } catch (error) {
      this.logger.error(`❌ Tick ${tickId} failed: ${error.message}`, error.stack);

      const endTime = new Date();
      await this.tickExecutionRepo.update(execution.id, {
        status: 'failed',
        endTime,
        durationMs: endTime.getTime() - execution.startTime.getTime(),
        metadata: { error: error.message },
      });
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }

  async getExecutions(options?: {
    limit?: number;
    status?: string;
  }): Promise<{ executions: TickExecution[]; total: number }> {
    const limit = options?.limit ? Math.min(options.limit, 100) : 20;
    const query = this.tickExecutionRepo.createQueryBuilder('exec')
      .orderBy('exec.startTime', 'DESC')
      .take(limit);

    if (options?.status) {
      query.andWhere('exec.status = :status', { status: options.status });
    }

    const [executions, total] = await query.getManyAndCount();
    return { executions, total };
  }

  async getStats(days = 7): Promise<{ totalExecutions: number; successRate: number; avgDuration: number; lastExecution: Date | null; nextExecution: Date | null }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const executions = await this.tickExecutionRepo.find({
      where: { startTime: MoreThan(startDate) },
      order: { startTime: 'DESC' },
      take: 1000,
    });

    const totalExecutions = executions.length;
    const completed = executions.filter(e => e.status === 'completed');
    const avgDuration = completed.length
      ? Math.round(completed.reduce((sum, e) => sum + (e.durationMs || 0), 0) / completed.length)
      : 0;
    const successRate = totalExecutions ? completed.length / totalExecutions : 0;
    const lastExecution = executions[0]?.startTime || null;
    const nextExecution = lastExecution
      ? new Date(lastExecution.getTime() + 10 * 60 * 1000)
      : new Date(Date.now() + 10 * 60 * 1000);

    return { totalExecutions, successRate, avgDuration, lastExecution, nextExecution };
  }

  async getAgentStatus(agentIdOrCode: string): Promise<{ agentId: string; isActive: boolean; status: AgentStatus; lastTick: Date | null; nextTick: Date | null; pendingTasks: number }> {
    const agent = await this.agentRepo.findOne({
      where: [{ id: agentIdOrCode }, { code: agentIdOrCode }],
    });

    if (!agent) {
      throw new Error(`Agent not found: ${agentIdOrCode}`);
    }

    const pendingTasks = await this.taskRepo.count({
      where: {
        assignedToId: agent.id,
        status: TaskStatus.PENDING,
        isActive: true,
      },
    });

    const lastExecution = await this.tickExecutionRepo.findOne({
      order: { startTime: 'DESC' },
    });

    const lastTick = lastExecution?.startTime || null;
    const nextTick = lastTick
      ? new Date(lastTick.getTime() + 10 * 60 * 1000)
      : new Date(Date.now() + 10 * 60 * 1000);

    return {
      agentId: agent.id,
      isActive: agent.isActive,
      status: agent.status,
      lastTick,
      nextTick,
      pendingTasks,
    };
  }

  async pauseAgent(agentIdOrCode: string): Promise<{ agentId: string; paused: boolean }> {
    const agent = await this.agentRepo.findOne({
      where: [{ id: agentIdOrCode }, { code: agentIdOrCode }],
    });

    if (!agent) {
      throw new Error(`Agent not found: ${agentIdOrCode}`);
    }

    agent.status = AgentStatus.PAUSED;
    agent.isActive = false;
    await this.agentRepo.save(agent);

    return { agentId: agent.id, paused: true };
  }

  async resumeAgent(agentIdOrCode: string): Promise<{ agentId: string; paused: boolean }> {
    const agent = await this.agentRepo.findOne({
      where: [{ id: agentIdOrCode }, { code: agentIdOrCode }],
    });

    if (!agent) {
      throw new Error(`Agent not found: ${agentIdOrCode}`);
    }

    agent.status = AgentStatus.IDLE;
    agent.isActive = true;
    await this.agentRepo.save(agent);

    return { agentId: agent.id, paused: false };
  }

  /**
   * 执行单个任务
   */
  private async executeTask(agent: HqAgent, task: AgentTask): Promise<void> {
    try {
      // 更新任务状态为进行中
      await this.taskQueueService.startTask(task.id);

      // 更新 Agent 状态
      agent.status = AgentStatus.RUNNING;
      agent.currentTask = task.title;
      await this.agentRepo.save(agent);

      // 触发 Agent 执行
      const result = await this.agentTriggerService.triggerAgent(agent.code, task);

      if (result.success) {
        await this.taskQueueService.completeTask(
          task.id,
          result.response || 'Task completed',
          result.cost,
          { model: result.model, tokensUsed: result.tokensUsed }
        );
      } else {
        await this.taskQueueService.failTask(task.id, result.error || 'Unknown error');
      }

      // 恢复 Agent 状态
      agent.status = AgentStatus.IDLE;
      agent.currentTask = null;
      await this.agentRepo.save(agent);
    } catch (error) {
      this.logger.error(`❌ Task execution failed: ${error.message}`);
      await this.taskQueueService.failTask(task.id, error.message);
      agent.status = AgentStatus.ERROR;
      await this.agentRepo.save(agent);
    }
  }

  /**
   * 查找合适的 Agent 执行任务
   */
  private async findSuitableAgent(task: AgentTask, agents: HqAgent[]): Promise<HqAgent | null> {
    // 优先级规则:
    // 1. Task.type 匹配 Agent.role
    // 2. Agent 状态为 IDLE
    // 3. Agent 有可用预算

    const budgetStatus = this.budgetMonitor.getBudgetStatus();

    for (const agent of agents) {
      // 检查状态
      if (agent.status !== AgentStatus.IDLE) continue;

      // 检查预算
      const agentBudget = budgetStatus.byAgent[agent.code];
      if (agentBudget && agentBudget.percentUsed >= 100) continue;

      // 检查角色匹配
      const roleMatch = this.matchTaskToAgentRole(task.type, agent.role);
      if (roleMatch) {
        return agent;
      }
    }

    // 如果没有完美匹配，返回第一个 IDLE 且有预算的 Agent
    for (const agent of agents) {
      if (agent.status === AgentStatus.IDLE) {
        const agentBudget = budgetStatus.byAgent[agent.code];
        if (!agentBudget || agentBudget.percentUsed < 100) {
          return agent;
        }
      }
    }

    return null;
  }

  /**
   * 任务类型与 Agent 角色匹配
   */
  private matchTaskToAgentRole(taskType: string, agentRole: string): boolean {
    const mapping: Record<string, string[]> = {
      development: ['coder', 'architect'],
      analysis: ['analyst', 'architect', 'growth'],
      marketing: ['growth', 'bd', 'custom'],
      operations: ['support', 'risk', 'custom'],
      research: ['analyst', 'bd', 'growth'],
      planning: ['architect', 'growth'],
      communication: ['bd', 'support', 'growth'],
    };

    const matchingRoles = mapping[taskType.toLowerCase()] || [];
    return matchingRoles.some(role => agentRole.toLowerCase().includes(role));
  }

  /**
   * 更新 Agent 状态
   */
  private async updateAgentStatuses(agents: HqAgent[]): Promise<any[]> {
    const budgetStatus = this.budgetMonitor.getBudgetStatus();
    return agents.map(agent => {
      const agentBudget = budgetStatus.byAgent[agent.code] || { budget: 0, used: 0 };
      return {
        agentCode: agent.code,
        status: agent.status,
        currentTask: agent.currentTask,
        dailySpent: agentBudget.used,
        dailyBudget: agentBudget.budget,
      };
    });
  }

  /**
   * ARCHITECT-01 规划下一步行动
   */
  private async planNextActions(agents: HqAgent[], budgetStatus: any): Promise<string[]> {
    const actions: string[] = [];
    const idleAgents = agents.filter(a => a.status === AgentStatus.IDLE);

    if (idleAgents.length === 0) {
      actions.push('所有 Agent 正在工作中或离线');
      return actions;
    }

    // 根据 Agent 代码建议具体任务 (优先为免费 Agent 安排工作)
    const PAID_AGENTS = ['ARCHITECT-01', 'CODER-01'];
    const freeIdleAgents = idleAgents.filter(a => !PAID_AGENTS.includes(a.code));

    for (const agent of freeIdleAgents.slice(0, 9)) {
      const agentBudget = budgetStatus.byAgent[agent.code];
      if (agentBudget && agentBudget.percentUsed >= 100) {
        actions.push(`${agent.code}: 预算已用完，等待明日重置`);
        continue;
      }

      switch (agent.code) {
        case 'GROWTH-01':
          actions.push(`${agent.code}: 执行增长分析和竞品监控`);
          break;
        case 'BD-01':
          actions.push(`${agent.code}: 搜索免费资源和 Grant 机会`);
          break;
        case 'CONTENT-01':
          actions.push(`${agent.code}: 创作内容和更新文档`);
          break;
        case 'SOCIAL-01':
          actions.push(`${agent.code}: 发布社交媒体内容和 KOL 互动`);
          break;
        case 'ANALYST-01':
          actions.push(`${agent.code}: 生成业务指标报告`);
          break;
        case 'SUPPORT-01':
          actions.push(`${agent.code}: 检查用户反馈和 GitHub Issues`);
          break;
        case 'SECURITY-01':
          actions.push(`${agent.code}: 执行安全扫描`);
          break;
        case 'DEVREL-01':
          actions.push(`${agent.code}: 维护开发者社区和 SDK 文档`);
          break;
        case 'LEGAL-01':
          actions.push(`${agent.code}: 监控法规更新`);
          break;
        default:
          actions.push(`${agent.code}: 等待任务分配`);
      }
    }

    return actions;
  }

  /**
   * 构建 Tick 结果
   */
  private buildTickResult(
    tickId: string,
    budgetStatus: any,
    agentStatuses: any[],
    tasksProcessed: number,
    tasksCompleted: number,
    tasksFailed: number,
    actionsPlanned: string[]
  ): TickResult {
    return {
      tickId,
      timestamp: new Date(),
      budgetStatus,
      agentStatuses,
      tasksProcessed,
      tasksCompleted,
      tasksFailed,
      actionsPlanned,
      nextTickIn: '10 minutes',
    };
  }

  /**
   * 每日预算重置 (凌晨 0 点)
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async dailyReset() {
    this.logger.log('🔄 Daily budget reset...');
    // BudgetMonitor 会自动处理每日重置
    // 这里可以添加额外的每日报告生成
    const stats = await this.taskQueueService.getTaskStats();
    await this.agentTriggerService.sendDailyReport({
      date: new Date().toISOString().split('T')[0],
      tasksCompleted: stats.completed,
      tasksFailed: stats.failed,
      totalCost: stats.totalCost,
      highlights: ['Daily tasks completed'],
      issues: stats.failed > 0 ? [`${stats.failed} tasks failed`] : [],
      budgetStatus: this.budgetMonitor.getBudgetStatus(),
    });
  }

  /**
   * 手动触发 Tick (用于测试)
   */
  async manualTick(): Promise<TickResult> {
    return this.executeTick('manual');
  }
}
