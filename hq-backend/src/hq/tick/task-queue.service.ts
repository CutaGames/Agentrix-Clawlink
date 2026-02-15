/**
 * Task Queue Service
 * 
 * Phase 4: DB-backed task queue with dependencies and collaboration
 * Replaces in-memory task arrays in agent-scheduler.service.ts
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull, Not } from 'typeorm';
import { AgentTask, TaskStatus, TaskPriority, TaskType } from '../../entities/agent-task.entity';
import { HqAgent } from '../../entities/hq-agent.entity';

export interface CreateTaskDto {
  title: string;
  description: string;
  type?: TaskType;
  priority?: TaskPriority;
  assignedToCode?: string;
  createdByCode?: string;
  parentTaskId?: string;
  dependsOn?: string[];
  estimatedCost?: number;
  dueDate?: Date;
  context?: any;
  metadata?: any;
}

@Injectable()
export class TaskQueueService {
  private readonly logger = new Logger(TaskQueueService.name);

  constructor(
    @InjectRepository(AgentTask)
    private taskRepo: Repository<AgentTask>,
    @InjectRepository(HqAgent)
    private agentRepo: Repository<HqAgent>,
  ) {}

  /**
   * 创建新任务
   */
  async createTask(dto: CreateTaskDto): Promise<AgentTask> {
    let assignedTo: HqAgent | undefined;
    let createdBy: HqAgent | undefined;

    if (dto.assignedToCode) {
      assignedTo = await this.agentRepo.findOne({ where: { code: dto.assignedToCode } });
    }
    if (dto.createdByCode) {
      createdBy = await this.agentRepo.findOne({ where: { code: dto.createdByCode } });
    }

    const task = this.taskRepo.create({
      ...dto,
      dueDate: dto.dueDate || new Date(), // Always set a default due date
      assignedToId: assignedTo?.id,
      createdById: createdBy?.id,
      status: TaskStatus.PENDING,
    });

    const saved = await this.taskRepo.save(task);
    this.logger.log(`✅ Task created: ${saved.title} (ID: ${saved.id})`);
    return saved;
  }

  /**
   * 获取可执行的任务 (无依赖或依赖已完成)
   */
  async getExecutableTasks(agentCode?: string, limit = 10): Promise<AgentTask[]> {
    const queryBuilder = this.taskRepo.createQueryBuilder('task')
      .leftJoinAndSelect('task.assignedTo', 'assignedTo')
      .where('task.status = :status', { status: TaskStatus.PENDING })
      .andWhere('task.isActive = :isActive', { isActive: true })
      .orderBy('task.priority', 'DESC')
      .addOrderBy('task.createdAt', 'ASC')
      .take(limit);

    if (agentCode) {
      queryBuilder.andWhere('assignedTo.code = :agentCode', { agentCode });
    }

    const tasks = await queryBuilder.getMany();

    // Filter out tasks with incomplete dependencies
    const executableTasks: AgentTask[] = [];
    for (const task of tasks) {
      if (!task.dependsOn || task.dependsOn.length === 0) {
        executableTasks.push(task);
        continue;
      }

      const dependencies = await this.taskRepo.find({
        where: { id: In(task.dependsOn) },
        select: ['id', 'status'],
      });

      const allComplete = dependencies.every(d => d.status === TaskStatus.COMPLETED);
      if (allComplete) {
        executableTasks.push(task);
      }
    }

    return executableTasks;
  }

  /**
   * 分配任务给 Agent
   */
  async assignTask(taskId: string, agentCode: string): Promise<boolean> {
    const agent = await this.agentRepo.findOne({ where: { code: agentCode } });
    if (!agent) {
      this.logger.error(`Agent ${agentCode} not found`);
      return false;
    }

    const task = await this.taskRepo.findOne({ where: { id: taskId } });
    if (!task || task.status !== TaskStatus.PENDING) {
      return false;
    }

    task.assignedToId = agent.id;
    task.status = TaskStatus.ASSIGNED;
    task.startedAt = new Date();
    await this.taskRepo.save(task);

    this.logger.log(`📋 Task "${task.title}" assigned to ${agentCode}`);
    return true;
  }

  /**
   * 开始执行任务
   */
  async startTask(taskId: string): Promise<void> {
    await this.taskRepo.update(taskId, {
      status: TaskStatus.IN_PROGRESS,
      startedAt: new Date(),
    });
    this.logger.log(`🚀 Task ${taskId} started`);
  }

  /**
   * 完成任务
   */
  async completeTask(
    taskId: string,
    result: string,
    actualCost?: number,
    metadata?: any,
  ): Promise<void> {
    const task = await this.taskRepo.findOne({ where: { id: taskId } });
    if (!task) return;

    await this.taskRepo.update(taskId, {
      status: TaskStatus.COMPLETED,
      completedAt: new Date(),
      result,
      actualCost: actualCost ?? task.actualCost,
      metadata: { ...task.metadata, ...metadata },
    });

    this.logger.log(`✅ Task "${task.title}" completed, cost: $${actualCost?.toFixed(4) || 0}`);

    // Check if this was a subtask and update parent
    if (task.parentTaskId) {
      await this.checkParentTaskCompletion(task.parentTaskId);
    }
  }

  /**
   * 任务失败
   */
  async failTask(taskId: string, errorMessage: string, shouldRetry = true): Promise<void> {
    const task = await this.taskRepo.findOne({ where: { id: taskId } });
    if (!task) return;

    const canRetry = shouldRetry && task.retryCount < task.maxRetries;

    if (canRetry) {
      await this.taskRepo.update(taskId, {
        status: TaskStatus.PENDING,
        errorMessage,
        retryCount: task.retryCount + 1,
      });
      this.logger.warn(`⚠️ Task "${task.title}" failed, retrying (${task.retryCount + 1}/${task.maxRetries})`);
    } else {
      await this.taskRepo.update(taskId, {
        status: TaskStatus.FAILED,
        completedAt: new Date(),
        errorMessage,
      });
      this.logger.error(`❌ Task "${task.title}" failed permanently: ${errorMessage}`);
    }
  }

  /**
   * 创建子任务 (用于任务分解)
   */
  async createSubtask(parentTaskId: string, subtaskDto: CreateTaskDto): Promise<AgentTask> {
    const parentTask = await this.taskRepo.findOne({ where: { id: parentTaskId } });
    if (!parentTask) {
      throw new Error(`Parent task ${parentTaskId} not found`);
    }

    const subtask = await this.createTask({
      ...subtaskDto,
      parentTaskId,
      createdByCode: subtaskDto.createdByCode,
    });

    this.logger.log(`🔀 Subtask created under "${parentTask.title}": ${subtask.title}`);
    return subtask;
  }

  /**
   * 检查父任务是否所有子任务都完成
   */
  private async checkParentTaskCompletion(parentTaskId: string): Promise<void> {
    const subtasks = await this.taskRepo.find({
      where: { parentTaskId, isActive: true },
      select: ['id', 'status'],
    });

    const allComplete = subtasks.every(st => st.status === TaskStatus.COMPLETED);
    const anyFailed = subtasks.some(st => st.status === TaskStatus.FAILED);

    if (allComplete && subtasks.length > 0) {
      const aggregatedResult = `All ${subtasks.length} subtasks completed successfully`;
      await this.completeTask(parentTaskId, aggregatedResult);
      this.logger.log(`✅ Parent task ${parentTaskId} completed (all subtasks done)`);
    } else if (anyFailed) {
      await this.taskRepo.update(parentTaskId, { status: TaskStatus.BLOCKED });
      this.logger.warn(`⚠️ Parent task ${parentTaskId} blocked (some subtasks failed)`);
    }
  }

  /**
   * 获取 Agent 的当前任务
   */
  async getAgentCurrentTasks(agentCode: string): Promise<AgentTask[]> {
    return this.taskRepo.find({
      where: {
        assignedTo: { code: agentCode },
        status: In([TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS]),
        isActive: true,
      },
      order: { priority: 'DESC', startedAt: 'ASC' },
    });
  }

  /**
   * 获取任务统计
   */
  async getTaskStats(): Promise<{
    pending: number;
    inProgress: number;
    completed: number;
    failed: number;
    totalCost: number;
  }> {
    const [pending, inProgress, completed, failed] = await Promise.all([
      this.taskRepo.count({ where: { status: TaskStatus.PENDING, isActive: true } }),
      this.taskRepo.count({ where: { status: TaskStatus.IN_PROGRESS, isActive: true } }),
      this.taskRepo.count({ where: { status: TaskStatus.COMPLETED } }),
      this.taskRepo.count({ where: { status: TaskStatus.FAILED } }),
    ]);

    const costResult = await this.taskRepo
      .createQueryBuilder('task')
      .select('SUM(task.actualCost)', 'total')
      .where('task.status = :status', { status: TaskStatus.COMPLETED })
      .getRawOne();

    return {
      pending,
      inProgress,
      completed,
      failed,
      totalCost: parseFloat(costResult?.total || '0'),
    };
  }
}
