import { Controller, Post, Get, Body, Query, Logger } from '@nestjs/common';
import { TickService } from './tick.service';

@Controller('hq/tick')
export class TickController {
  private readonly logger = new Logger(TickController.name);

  constructor(private readonly tickService: TickService) {}

  /**
   * POST /api/hq/tick
   * 触发系统 Tick - 这是 ARCHITECT-01 的心跳
   * 可以由 cron job 或手动触发
   */
  @Post()
  async executeTick(@Body() body: { triggeredBy?: string }) {
    this.logger.log(`Tick 触发请求: ${body.triggeredBy || 'manual'}`);
    const result = await this.tickService.executeTick(body.triggeredBy || 'manual');
    return {
      success: true,
      data: result,
    };
  }

  /**
   * GET /api/hq/tick/status
   * 获取当前系统状态（不触发 Tick）
   */
  @Get('status')
  async getStatus() {
    return {
      success: true,
      data: {
        agents: this.tickService.getAgentStatuses(),
        taskQueue: this.tickService.getTaskQueue(),
        timestamp: new Date(),
      },
    };
  }

  /**
   * POST /api/hq/tick/task
   * 添加新任务到队列
   */
  @Post('task')
  async addTask(
    @Body() body: {
      title: string;
      description: string;
      assignedTo: string;
      priority?: number;
    },
  ) {
    this.logger.log(`新任务: ${body.title} -> ${body.assignedTo}`);
    const task = await this.tickService.addTask(body);
    return {
      success: true,
      data: task,
    };
  }

  /**
   * POST /api/hq/tick/agent-status
   * 更新 Agent 状态
   */
  @Post('agent-status')
  async updateAgentStatus(
    @Body() body: {
      agentId: string;
      status: 'idle' | 'working' | 'offline';
      currentTask?: string;
    },
  ) {
    this.tickService.updateAgentStatus(body.agentId, body.status, body.currentTask);
    return {
      success: true,
      message: `Agent ${body.agentId} 状态已更新为 ${body.status}`,
    };
  }

  /**
   * POST /api/hq/tick/spending
   * 记录 API 消费
   */
  @Post('spending')
  async recordSpending(
    @Body() body: {
      agentId: string;
      amount: number;
    },
  ) {
    this.tickService.recordSpending(body.agentId, body.amount);
    return {
      success: true,
      message: `已记录 ${body.agentId} 消费 $${body.amount}`,
    };
  }
}
