/**
 * Agent Scheduler Service
 * 
 * 负责将任务分配给最合适的 Agent
 * 使用统一的 team-config 配置
 */

import { Injectable, Logger } from '@nestjs/common';
import { TEAM_CONFIG, BUDGET_CONFIG, findBestAgent, type AgentConfig } from './team-config';
import { BudgetMonitorService } from '../tick/budget-monitor.service';

export interface ScheduledTask {
  id: string;
  type: string;
  description: string;
  requiredSkills: string[];
  priority: number;
  assignedAgent?: string;
  status: 'pending' | 'assigned' | 'running' | 'completed' | 'failed';
  result?: string;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

@Injectable()
export class AgentSchedulerService {
  private readonly logger = new Logger(AgentSchedulerService.name);
  private taskQueue: ScheduledTask[] = [];
  private runningTasks: Map<string, ScheduledTask> = new Map();

  constructor(
    private readonly budgetMonitor: BudgetMonitorService,
  ) {}

  /**
   * 调度任务给最合适的 Agent
   */
  async scheduleTask(task: Omit<ScheduledTask, 'id' | 'status' | 'createdAt'>): Promise<ScheduledTask> {
    const scheduledTask: ScheduledTask = {
      ...task,
      id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      status: 'pending',
      createdAt: new Date(),
    };

    // 找到最合适的 Agent
    const bestAgent = findBestAgent(task.requiredSkills);
    
    if (!bestAgent) {
      this.logger.warn(`No suitable agent found for skills: ${task.requiredSkills.join(', ')}`);
      scheduledTask.status = 'failed';
      scheduledTask.error = 'No suitable agent found';
      return scheduledTask;
    }

    // 检查预算
    if (this.budgetMonitor.getBudgetStatus().status === "exceeded") {
      this.logger.warn(`Budget exceeded for agent ${bestAgent.code}`);
      scheduledTask.status = 'failed';
      scheduledTask.error = 'Budget limit reached';
      return scheduledTask;
    }

    // 检查并发限制
    const agentRunningCount = this.getAgentRunningCount(bestAgent.code);
    if (agentRunningCount >= bestAgent.maxConcurrent) {
      this.logger.log(`Agent ${bestAgent.code} at max concurrent (${agentRunningCount}/${bestAgent.maxConcurrent}), queuing task`);
      this.taskQueue.push(scheduledTask);
      return scheduledTask;
    }

    // 分配任务
    scheduledTask.assignedAgent = bestAgent.code;
    scheduledTask.status = 'assigned';
    this.runningTasks.set(scheduledTask.id, scheduledTask);

    this.logger.log(`📋 Task ${scheduledTask.id} assigned to ${bestAgent.code} (${bestAgent.name})`);

    return scheduledTask;
  }

  /**
   * 标记任务完成
   */
  completeTask(taskId: string, result: string): void {
    const task = this.runningTasks.get(taskId);
    if (task) {
      task.status = 'completed';
      task.result = result;
      task.completedAt = new Date();
      this.runningTasks.delete(taskId);

      // 记录预算使用
      if (task.assignedAgent) {
        const agent = TEAM_CONFIG.find(a => a.code === task.assignedAgent);
        const cost = agent?.costTier === 'high' ? 0.15 : agent?.costTier === 'medium' ? 0.05 : 0.01;
        this.budgetMonitor.recordUsage(task.assignedAgent, 'unknown', 0, 0);
      }

      this.logger.log(`✅ Task ${taskId} completed by ${task.assignedAgent}`);

      // 处理队列中的下一个任务
      this.processQueue();
    }
  }

  /**
   * 标记任务失败
   */
  failTask(taskId: string, error: string): void {
    const task = this.runningTasks.get(taskId);
    if (task) {
      task.status = 'failed';
      task.error = error;
      task.completedAt = new Date();
      this.runningTasks.delete(taskId);
      this.logger.error(`❌ Task ${taskId} failed: ${error}`);
      this.processQueue();
    }
  }

  /**
   * 获取 Agent 当前运行的任务数
   */
  private getAgentRunningCount(agentCode: string): number {
    let count = 0;
    for (const task of this.runningTasks.values()) {
      if (task.assignedAgent === agentCode) count++;
    }
    return count;
  }

  /**
   * 处理任务队列
   */
  private async processQueue(): Promise<void> {
    if (this.taskQueue.length === 0) return;

    const pendingTasks = [...this.taskQueue];
    this.taskQueue = [];

    for (const task of pendingTasks) {
      await this.scheduleTask(task);
    }
  }

  /**
   * 获取调度器状态
   */
  getStatus() {
    return {
      queueLength: this.taskQueue.length,
      runningTasks: this.runningTasks.size,
      agents: TEAM_CONFIG.map(agent => ({
        code: agent.code,
        name: agent.name,
        runningTasks: this.getAgentRunningCount(agent.code),
        maxConcurrent: agent.maxConcurrent,
        costTier: agent.costTier,
      })),
      budget: this.budgetMonitor.getBudgetStatus(),
    };
  }
}
