import { Controller, Post, Get, Body, Query, Param, Logger } from '@nestjs/common';
import { TickService } from './tick.service';
import { AgentCommunicationService } from './agent-communication.service';
import { AutoTaskGeneratorService } from './auto-task-generator.service';
import { AgentMetricsService } from './agent-metrics.service';
import { AgentLearningService } from './agent-learning.service';

@Controller('hq/tick')
export class TickController {
  private readonly logger = new Logger(TickController.name);

  constructor(
    private readonly tickService: TickService,
    private readonly agentCommunicationService: AgentCommunicationService,
    private readonly autoTaskGenerator: AutoTaskGeneratorService,
    private readonly agentMetrics: AgentMetricsService,
    private readonly agentLearning: AgentLearningService,
  ) {}

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
    // Get status from last tick result or generate new one
    const tickResult = await this.tickService.manualTick();
    return {
      success: true,
      data: {
        agents: tickResult.agentStatuses,
        budgetStatus: tickResult.budgetStatus,
        tasksProcessed: tickResult.tasksProcessed,
        timestamp: new Date(),
      },
    };
  }

  /**
   * GET /api/hq/tick/executions
   * 获取 Tick 执行历史
   */
  @Get('executions')
  async getExecutions(
    @Query('limit') limit?: number,
    @Query('status') status?: string,
  ) {
    return this.tickService.getExecutions({
      limit: limit ? Number(limit) : undefined,
      status,
    });
  }

  /**
   * GET /api/hq/tick/stats
   * 获取 Tick 统计数据
   */
  @Get('stats')
  async getStats(@Query('days') days?: number) {
    return this.tickService.getStats(days ? Number(days) : 7);
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
    // Use TaskQueueService directly - inject it in constructor
    return {
      success: true,
      message: 'Task creation moved to TaskQueueService. Use /api/hq/tick endpoint to trigger execution.',
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
    // Agent status is now managed automatically by TickService
    return {
      success: true,
      message: `Agent status is now managed automatically. Use GET /status to view current state.`,
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
    // Spending is now tracked automatically by BudgetMonitorService
    return {
      success: true,
      message: `Spending is now tracked automatically. Use GET /status to view budget status.`,
    };
  }

  // ========== Agent Communication ==========

  /**
   * POST /api/hq/tick/communicate/send
   * Agent 间发送消息
   */
  @Post('communicate/send')
  async sendAgentMessage(
    @Body() body: {
      fromAgentCode: string;
      toAgentCode: string;
      content: string;
      messageType?: 'request' | 'response' | 'notification' | 'delegation';
      priority?: 'low' | 'medium' | 'high' | 'urgent';
      context?: Record<string, any>;
    }
  ) {
    const message = await this.agentCommunicationService.sendMessage(
      body.fromAgentCode,
      body.toAgentCode,
      body.content,
      {
        messageType: body.messageType,
        priority: body.priority,
        context: body.context,
      }
    );
    return { success: true, data: message };
  }

  /**
   * GET /api/hq/tick/communicate/messages/:agentCode
   * 获取 Agent 的待处理消息
   */
  @Get('communicate/messages/:agentCode')
  async getAgentMessages(@Param('agentCode') agentCode: string) {
    const messages = await this.agentCommunicationService.getPendingMessages(agentCode);
    return { success: true, data: messages };
  }

  /**
   * POST /api/hq/tick/communicate/delegate
   * Agent 委托任务
   */
  @Post('communicate/delegate')
  async delegateTask(
    @Body() body: {
      fromAgentCode: string;
      toAgentCode: string;
      taskTitle: string;
      taskDescription: string;
      priority: 'low' | 'medium' | 'high' | 'critical';
      estimatedCost?: number;
      requiredSkills?: string[];
    }
  ) {
    const result = await this.agentCommunicationService.delegateTask(
      body.fromAgentCode,
      body.toAgentCode,
      {
        taskTitle: body.taskTitle,
        taskDescription: body.taskDescription,
        priority: body.priority as any,
        estimatedCost: body.estimatedCost,
        requiredSkills: body.requiredSkills,
      }
    );
    return { success: true, data: result };
  }

  /**
   * POST /api/hq/tick/communicate/request-help
   * Agent 请求帮助
   */
  @Post('communicate/request-help')
  async requestHelp(
    @Body() body: {
      fromAgentCode: string;
      toAgentCode: string;
      question: string;
      context?: Record<string, any>;
    }
  ) {
    const response = await this.agentCommunicationService.requestHelp(
      body.fromAgentCode,
      body.toAgentCode,
      body.question,
      body.context
    );
    return { success: true, data: { response } };
  }

  /**
   * POST /api/hq/tick/communicate/broadcast
   * 广播消息
   */
  @Post('communicate/broadcast')
  async broadcastMessage(
    @Body() body: {
      fromAgentCode: string;
      content: string;
      priority?: 'low' | 'medium' | 'high' | 'urgent';
      excludeAgents?: string[];
    }
  ) {
    const sentCount = await this.agentCommunicationService.broadcastMessage(
      body.fromAgentCode,
      body.content,
      {
        priority: body.priority,
        excludeAgents: body.excludeAgents,
      }
    );
    return { success: true, data: { sentCount } };
  }

  /**
   * GET /api/hq/tick/communicate/stats
   * 获取通信统计
   */
  @Get('communicate/stats')
  async getCommunicationStats() {
    const stats = this.agentCommunicationService.getStats();
    return { success: true, data: stats };
  }

  // ========== Phase 3: Autonomous Orchestration ==========

  /**
   * POST /api/hq/tick/pipeline/start
   * Start a collaboration pipeline
   */
  @Post('pipeline/start')
  async startPipeline(
    @Body() body: {
      template: string;
      context?: Record<string, any>;
      description?: string;
    }
  ) {
    this.logger.log(`Starting pipeline: ${body.template}`);
    const pipeline = await this.autoTaskGenerator.startPipeline(
      body.template,
      body.context,
      body.description,
    );
    return { success: true, data: pipeline };
  }

  /**
   * GET /api/hq/tick/pipeline/templates
   * List available pipeline templates
   */
  @Get('pipeline/templates')
  async getPipelineTemplates() {
    return { success: true, data: this.autoTaskGenerator.getAvailableTemplates() };
  }

  /**
   * GET /api/hq/tick/pipeline/active
   * List active pipelines
   */
  @Get('pipeline/active')
  async getActivePipelines() {
    return { success: true, data: this.autoTaskGenerator.getActivePipelines() };
  }

  /**
   * POST /api/hq/tick/task/decompose
   * Decompose a task into subtasks using AI
   */
  @Post('task/decompose')
  async decomposeTask(@Body() body: { taskId: string }) {
    const subtasks = await this.autoTaskGenerator.decomposeTask(body.taskId);
    return { success: true, data: subtasks };
  }

  // ========== Phase 4: Observability & Metrics ==========

  /**
   * GET /api/hq/tick/metrics
   * Get system-wide metrics
   */
  @Get('metrics')
  async getSystemMetrics() {
    const metrics = await this.agentMetrics.getSystemMetrics();
    return { success: true, data: metrics };
  }

  /**
   * GET /api/hq/tick/metrics/:agentCode
   * Get metrics for a specific agent
   */
  @Get('metrics/:agentCode')
  async getAgentMetrics(@Param('agentCode') agentCode: string) {
    const metrics = await this.agentMetrics.getAgentMetrics(agentCode);
    return { success: true, data: metrics };
  }

  /**
   * POST /api/hq/tick/heal
   * Manually trigger auto-healing
   */
  @Post('heal')
  async triggerAutoHeal() {
    const results = await this.agentMetrics.autoHealAgents();
    return { success: true, data: results };
  }

  // ========== Phase 5: Agent Learning & Knowledge Sharing ==========

  /**
   * GET /api/hq/tick/learning/profile/:agentCode
   * Get skill profile for a specific agent
   */
  @Get('learning/profile/:agentCode')
  async getAgentSkillProfile(@Param('agentCode') agentCode: string) {
    const profile = await this.agentLearning.buildSkillProfile(agentCode);
    return { success: true, data: profile };
  }

  /**
   * GET /api/hq/tick/learning/profiles
   * Get skill profiles for all agents
   */
  @Get('learning/profiles')
  async getTeamSkillProfiles() {
    const profiles = await this.agentLearning.getTeamSkillProfiles();
    return { success: true, data: profiles };
  }

  /**
   * GET /api/hq/tick/learning/summary
   * Get team learning summary
   */
  @Get('learning/summary')
  async getTeamLearningSummary() {
    const summary = await this.agentLearning.getTeamLearningSummary();
    return { success: true, data: summary };
  }

  /**
   * POST /api/hq/tick/learning/share
   * Share knowledge from one agent to others
   */
  @Post('learning/share')
  async shareKnowledge(
    @Body() body: {
      fromAgentCode: string;
      content: string;
      knowledgeType?: 'insight' | 'skill' | 'warning' | 'best_practice';
      targetAgentCodes?: string[];
    }
  ) {
    const event = await this.agentLearning.shareKnowledge(
      body.fromAgentCode,
      body.content,
      body.knowledgeType,
      body.targetAgentCodes,
    );
    return { success: true, data: event };
  }

  /**
   * GET /api/hq/tick/learning/history
   * Get knowledge sharing history
   */
  @Get('learning/history')
  async getShareHistory(@Query('limit') limit?: number) {
    const history = this.agentLearning.getShareHistory(limit ? Number(limit) : 20);
    return { success: true, data: history };
  }
}
