/**
 * Agent Trigger Service (Rewritten - Phase 4)
 * 
 * 连接到真实的 unified-chat API
 * 支持任务上下文注入和结果解析
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UnifiedChatService } from '../../modules/core/unified-chat.service';
import { TaskContextService } from './task-context.service';
import { BudgetMonitorService } from './budget-monitor.service';
import { AgentTask } from '../../entities/agent-task.entity';

export interface TriggerResult {
  success: boolean;
  agentCode: string;
  taskId: string;
  response?: string;
  error?: string;
  cost?: number;
  tokensUsed?: number;
  model?: string;
}

@Injectable()
export class AgentTriggerService {
  private readonly logger = new Logger(AgentTriggerService.name);

  constructor(
    private readonly unifiedChatService: UnifiedChatService,
    private readonly taskContextService: TaskContextService,
    private readonly budgetMonitor: BudgetMonitorService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * 触发 Agent 执行任务 (使用真实的 UnifiedChatService)
   */
  async triggerAgent(
    agentCode: string,
    task: AgentTask,
  ): Promise<TriggerResult> {
    this.logger.log(`🚀 Triggering ${agentCode} for task: ${task.title}`);

    // 1. 检查预算
    const budgetCheck = this.budgetMonitor.canAgentExecute(agentCode);
    if (!budgetCheck.allowed) {
      this.logger.warn(`❌ ${agentCode} budget exhausted: ${budgetCheck.reason}`);
      return {
        success: false,
        agentCode,
        taskId: task.id,
        error: `Budget check failed: ${budgetCheck.reason}`,
      };
    }

    try {
      // 2. 构建任务上下文
      const context = await this.taskContextService.buildTaskContext(task.id);
      const contextPrompt = this.taskContextService.formatContextAsPrompt(context);

      // 3. 构建任务指令
      const taskPrompt = this.buildTaskPrompt(task, contextPrompt);

      // 4. 调用 UnifiedChatService
      const startTime = Date.now();
      const chatResponse = await this.unifiedChatService.chat({
        agentCode,
        message: taskPrompt,
        mode: 'staff',
        context: {
          topic: task.type,
          ...task.context,
        },
      });
      const executionTime = (Date.now() - startTime) / 1000;

      // 5. 记录预算消耗 (使用 AI 服务返回的真实 token 用量)
      const usage = chatResponse.usage;
      const inputTokens = usage?.promptTokens || 0;
      const outputTokens = usage?.completionTokens || 0;
      this.budgetMonitor.recordUsage(agentCode, chatResponse.model || 'unknown', inputTokens, outputTokens);

      this.logger.log(`✅ ${agentCode} completed task "${task.title}" in ${executionTime.toFixed(2)}s`);

      return {
        success: true,
        agentCode,
        taskId: task.id,
        response: chatResponse.response,
        model: chatResponse.model,
        cost: this.budgetMonitor.getBudgetStatus().byAgent[agentCode]?.used || 0,
        tokensUsed: (inputTokens + outputTokens) || undefined,
      };
    } catch (error) {
      this.logger.error(`❌ ${agentCode} task failed: ${error.message}`);
      return {
        success: false,
        agentCode,
        taskId: task.id,
        error: error.message,
      };
    }
  }

  /**
   * 构建任务提示词
   */
  private buildTaskPrompt(task: AgentTask, contextPrompt: string): string {
    return `${contextPrompt}

## Task Instructions

${task.description}

**Expected Deliverables**:
- Clear execution report
- Any files created/modified
- Next steps or recommendations
- Issues encountered (if any)

**Execution Guidelines**:
1. Start by understanding the task requirements
2. Break down into subtasks if needed
3. Execute systematically
4. Document your work
5. Report completion with summary

Begin execution now.
`;
  }

  /**
   * 批量触发多个 Agent (串行执行以避免并发过高)
   */
  async triggerMultipleAgents(
    tasks: Array<{ agentCode: string; task: AgentTask }>
  ): Promise<TriggerResult[]> {
    const results: TriggerResult[] = [];

    for (const { agentCode, task } of tasks) {
      const result = await this.triggerAgent(agentCode, task);
      results.push(result);

      // 避免并发过高，每个任务间隔 2 秒
      await this.sleep(2000);
    }

    return results;
  }

  /**
   * 发送每日报告给 ARCHITECT-01
   */
  async sendDailyReport(report: {
    date: string;
    tasksCompleted: number;
    tasksFailed: number;
    totalCost: number;
    highlights: string[];
    issues: string[];
    budgetStatus: any;
  }): Promise<void> {
    this.logger.log('=== 📊 Daily Report ===');
    this.logger.log(`Date: ${report.date}`);
    this.logger.log(`Completed: ${report.tasksCompleted} | Failed: ${report.tasksFailed}`);
    this.logger.log(`Total Cost: $${report.totalCost.toFixed(2)}`);
    this.logger.log(`Budget Used: ${report.budgetStatus.percentUsed.toFixed(1)}%`);
    this.logger.log(`Highlights: ${report.highlights.join(', ')}`);
    if (report.issues.length > 0) {
      this.logger.warn(`Issues: ${report.issues.join(', ')}`);
    }
    this.logger.log('=====================');

    // TODO: 可选择发送到 Telegram/Email/Slack
    // 也可以作为一个任务分配给 SOCIAL-01 或 SUPPORT-01 去发布
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
