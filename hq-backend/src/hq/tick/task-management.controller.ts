import { Controller, Get, Post, Put, Delete, Body, Param, Query, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { AgentTask, TaskStatus, TaskType, TaskPriority } from '../../entities/agent-task.entity';
import { TickExecution } from '../../entities/tick-execution.entity';
import { HqAgent } from '../../entities/hq-agent.entity';
import { AgentMetricsService } from './agent-metrics.service';

@ApiTags('Task Management')
@Controller('hq/tasks')
export class TaskManagementController {
  private readonly logger = new Logger(TaskManagementController.name);

  constructor(
    @InjectRepository(AgentTask)
    private readonly taskRepo: Repository<AgentTask>,
    @InjectRepository(TickExecution)
    private readonly tickRepo: Repository<TickExecution>,
    @InjectRepository(HqAgent)
    private readonly agentRepo: Repository<HqAgent>,
    private readonly metricsService: AgentMetricsService,
  ) {}

  // =============================================
  // IMPORTANT: Specific routes MUST come BEFORE
  // parameterized routes (:id) to avoid NestJS
  // matching 'board', 'metrics', etc. as :id
  // =============================================

  /**
   * 获取系统全局指标（监控与告警）
   */
  @Get('metrics/summary')
  @ApiOperation({ summary: '获取系统全局指标' })
  async getMetricsSummary() {
    try {
      const metrics = await this.metricsService.getSystemMetrics();
      return { success: true, metrics };
    } catch (error: any) {
      this.logger.error(`Failed to get metrics: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * 看板视图 - 按 Agent 分组的任务统计（优化版：单次查询）
   * NOTE: Must be declared BEFORE @Get(':id') to avoid route conflict
   */
  @Get('board/overview')
  @ApiOperation({ summary: '获取任务看板视图' })
  async getTaskBoard() {
    // 1. 一次性获取所有活跃的Agent
    const agents = await this.agentRepo.find({ where: { isActive: true } });

    // 2. 一次性获取所有任务（带关联），按创建时间倒序以便展示最新任务
    const allTasks = await this.taskRepo.find({
      relations: ['assignedTo'],
      order: { createdAt: 'DESC' },
    });

    // 3. 在内存中分组和统计 — 返回与前端 AgentBoard 接口一致的数据结构
    const board = agents.map((agent) => {
      const tasks = allTasks.filter(t => t.assignedToId === agent.id);

      const pending = tasks.filter(t => t.status === TaskStatus.PENDING).length;
      const running = tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length;
      const completed = tasks.filter(t => t.status === TaskStatus.COMPLETED).length;
      const failed = tasks.filter(t => t.status === TaskStatus.FAILED).length;

      return {
        agent: {
          code: agent.code,
          name: agent.name,
          role: agent.role || agent.description || '',
          isActive: agent.isActive,
        },
        tasks: tasks.slice(0, 10).map(t => ({
          id: t.id,
          title: t.title,
          description: t.description || '',
          type: t.type,
          priority: t.priority,
          status: t.status === TaskStatus.IN_PROGRESS ? 'running' : t.status,
          scheduledAt: t.dueDate,
          startedAt: t.startedAt,
          completedAt: t.completedAt,
          result: t.result,
        })),
        stats: {
          total: tasks.length,
          pending,
          running,
          completed,
          failed,
        },
      };
    });

    return {
      board,
      timestamp: new Date(),
    };
  }

  /**
   * 获取执行历史（最近的 Tick 执行记录）
   * NOTE: Must be declared BEFORE @Get(':id') to avoid route conflict
   */
  @Get('executions/history')
  @ApiOperation({ summary: '获取 Tick 执行历史' })
  async getExecutionHistory(
    @Query('limit') limit = 50,
    @Query('agentCode') agentCode?: string,
  ) {
    const queryBuilder = this.tickRepo.createQueryBuilder('tick')
      .leftJoinAndSelect('tick.agent', 'agent')
      .orderBy('tick.createdAt', 'DESC')
      .take(limit);

    if (agentCode) {
      queryBuilder.andWhere('agent.code = :agentCode', { agentCode });
    }

    const executions = await queryBuilder.getMany();

    return {
      executions,
      total: executions.length,
    };
  }

  /**
   * 获取所有 Agent 的任务列表（支持分页和筛选）
   */
  @Get()
  @ApiOperation({ summary: '获取所有任务列表' })
  async getAllTasks(
    @Query('status') status?: string,
    @Query('agentCode') agentCode?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit = 100,
    @Query('offset') offset = 0,
  ) {
    const queryBuilder = this.taskRepo.createQueryBuilder('task')
      .leftJoinAndSelect('task.assignedTo', 'agent')
      .orderBy('task.createdAt', 'DESC')
      .take(limit)
      .skip(offset);

    if (status) {
      queryBuilder.andWhere('task.status = :status', { status });
    }

    if (agentCode) {
      queryBuilder.andWhere('agent.code = :agentCode', { agentCode });
    }

    if (startDate) {
      queryBuilder.andWhere('task.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('task.createdAt <= :endDate', { endDate });
    }

    const [tasks, total] = await queryBuilder.getManyAndCount();

    return {
      tasks,
      total,
      limit,
      offset,
    };
  }

  /**
   * 获取单个任务详情（包含执行结果）
   * NOTE: This parameterized route MUST come AFTER all specific routes
   */
  @Get(':id')
  @ApiOperation({ summary: '获取任务详情' })
  async getTask(@Param('id') id: string) {
    const task = await this.taskRepo.findOne({
      where: { id },
      relations: ['assignedTo'],
    });

    if (!task) {
      return { error: 'Task not found' };
    }

    return {
      task,
      output: task.result || '任务尚未执行或无输出',
      executedAt: task.completedAt,
      duration: task.completedAt && task.startedAt
        ? new Date(task.completedAt).getTime() - new Date(task.startedAt).getTime()
        : null,
    };
  }

  /**
   * 创建新任务
   */
  @Post()
  @ApiOperation({ summary: '创建新任务' })
  async createTask(@Body() data: {
    agentCode: string;
    title: string;
    description: string;
    type?: string;
    priority?: number;
    scheduledAt?: Date;
  }) {
    const agent = await this.agentRepo.findOne({ where: { code: data.agentCode } });
    if (!agent) {
      return { error: `Agent ${data.agentCode} not found` };
    }

    const task = this.taskRepo.create({
      assignedToId: agent.id,
      title: data.title,
      description: data.description,
      type: (data.type as any) || TaskType.DEVELOPMENT,
      priority: data.priority || TaskPriority.NORMAL,
      status: TaskStatus.PENDING,
      isActive: true,
      dueDate: data.scheduledAt || new Date(),
    });

    await this.taskRepo.save(task);

    return {
      success: true,
      task,
      message: `任务已创建，将在 ${task.dueDate} 执行`,
    };
  }

  /**
   * 更新任务
   */
  @Put(':id')
  @ApiOperation({ summary: '更新任务' })
  async updateTask(
    @Param('id') id: string,
    @Body() data: Partial<{
      title: string;
      description: string;
      priority: number;
      dueDate: Date;
      status: TaskStatus;
    }>,
  ) {
    const task = await this.taskRepo.findOne({ where: { id } });
    if (!task) {
      return { error: 'Task not found' };
    }

    Object.assign(task, data);
    await this.taskRepo.save(task);

    return {
      success: true,
      task,
      message: '任务已更新',
    };
  }

  /**
   * 删除任务
   */
  @Delete(':id')
  @ApiOperation({ summary: '删除任务' })
  async deleteTask(@Param('id') id: string) {
    const result = await this.taskRepo.delete(id);

    if (result.affected === 0) {
      return { error: 'Task not found' };
    }

    return {
      success: true,
      message: '任务已删除',
    };
  }

  /**
   * 立即执行任务（手动触发）
   */
  @Post(':id/execute')
  @ApiOperation({ summary: '立即执行任务' })
  async executeTaskNow(@Param('id') id: string) {
    const task = await this.taskRepo.findOne({
      where: { id },
      relations: ['assignedTo'],
    });

    if (!task) {
      return { error: 'Task not found' };
    }

    // 更新任务状态
    task.status = TaskStatus.PENDING;
    task.dueDate = new Date();
    await this.taskRepo.save(task);

    return {
      success: true,
      message: '任务已加入执行队列，Tick 系统将在下一轮执行',
      task,
    };
  }
}
