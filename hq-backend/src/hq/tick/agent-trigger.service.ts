import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

/**
 * Agent 触发器
 * 
 * 负责调用 HQ Backend API 触发其他 Agent 执行任务
 * 这是 ARCHITECT-01 控制其他 Agent 的核心机制
 */

export interface TriggerResult {
  success: boolean;
  agentId: string;
  taskId: string;
  response?: string;
  error?: string;
  cost?: number;
}

@Injectable()
export class AgentTriggerService {
  private readonly logger = new Logger(AgentTriggerService.name);
  private readonly apiBaseUrl: string;

  constructor(
    private readonly configService: ConfigService,
  ) {
    this.apiBaseUrl = this.configService.get('HQ_API_URL') || 'http://localhost:3005/api';
  }

  /**
   * 触发 Agent 执行任务
   * 通过调用 unified-chat API 让指定 Agent 执行任务
   */
  async triggerAgent(
    agentId: string,
    taskTitle: string,
    taskDescription: string,
    taskId: string,
  ): Promise<TriggerResult> {
    this.logger.log(`触发 ${agentId} 执行任务: ${taskTitle}`);

    try {
      // 构建任务指令
      const prompt = this.buildTaskPrompt(taskTitle, taskDescription);

      // 调用 unified-chat API
      const response = await this.callUnifiedChat(agentId, prompt);

      this.logger.log(`${agentId} 任务完成: ${taskTitle}`);

      return {
        success: true,
        agentId,
        taskId,
        response: response.content,
        cost: response.cost,
      };
    } catch (error) {
      this.logger.error(`${agentId} 任务失败: ${error.message}`);
      return {
        success: false,
        agentId,
        taskId,
        error: error.message,
      };
    }
  }

  /**
   * 构建任务提示词
   */
  private buildTaskPrompt(taskTitle: string, taskDescription: string): string {
    return `
## 任务指令

**任务**: ${taskTitle}

**详细描述**: ${taskDescription}

**要求**:
1. 认真执行任务
2. 完成后给出详细报告
3. 如果遇到问题，说明原因和建议

请开始执行任务。
`;
  }

  /**
   * 调用 unified-chat API
   */
  private async callUnifiedChat(
    agentId: string,
    message: string,
  ): Promise<{ content: string; cost: number }> {
    // 这里需要实现实际的 HTTP 调用
    // 暂时使用模拟响应
    
    this.logger.log(`调用 unified-chat API: ${agentId}`);
    
    // TODO: 实现真实的 API 调用
    // const response = await firstValueFrom(
    //   this.httpService.post(`${this.apiBaseUrl}/hq/unified-chat`, {
    //     agentId,
    //     message,
    //   })
    // );
    
    // 模拟响应
    return {
      content: `任务已完成: ${message.substring(0, 50)}...`,
      cost: 0.01,
    };
  }

  /**
   * 批量触发多个 Agent
   */
  async triggerMultipleAgents(
    tasks: Array<{
      agentId: string;
      taskTitle: string;
      taskDescription: string;
      taskId: string;
    }>
  ): Promise<TriggerResult[]> {
    const results: TriggerResult[] = [];

    for (const task of tasks) {
      const result = await this.triggerAgent(
        task.agentId,
        task.taskTitle,
        task.taskDescription,
        task.taskId,
      );
      results.push(result);

      // 避免并发过高，每个任务间隔 1 秒
      await this.sleep(1000);
    }

    return results;
  }

  /**
   * 发送每日报告给 CEO
   */
  async sendDailyReport(report: {
    date: string;
    tasksCompleted: number;
    tasksFailed: number;
    totalCost: number;
    highlights: string[];
    issues: string[];
  }): Promise<void> {
    this.logger.log('=== 每日报告 ===');
    this.logger.log(`日期: ${report.date}`);
    this.logger.log(`完成任务: ${report.tasksCompleted}`);
    this.logger.log(`失败任务: ${report.tasksFailed}`);
    this.logger.log(`总花费: $${report.totalCost.toFixed(2)}`);
    this.logger.log(`亮点: ${report.highlights.join(', ')}`);
    this.logger.log(`问题: ${report.issues.join(', ')}`);
    this.logger.log('================');

    // TODO: 发送到 Telegram/Email/其他通知渠道
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
