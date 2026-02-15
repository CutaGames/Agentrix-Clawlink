/**
 * Task Context Service
 * 
 * Phase 4: 为每个 Agent 任务构建丰富的上下文
 * 包含项目状态、知识库片段、团队活动、预算信息
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { HqAgent, AgentStatus } from '../../entities/hq-agent.entity';
import { AgentTask, TaskStatus } from '../../entities/agent-task.entity';
import { HqSkill } from '../../entities/hq-skill.entity';
import { BudgetMonitorService } from './budget-monitor.service';

export interface TaskContext {
  // 基础信息
  taskId: string;
  taskTitle: string;
  taskDescription: string;
  agentCode: string;
  agentRole: string;
  
  // 战略规划
  strategicPlan?: {
    currentPhase: string;
    objectives: string[];
    priorities: string[];
  };
  
  // 项目状态
  projectStatus?: {
    activeProjects: number;
    recentChanges: string[];
    technicalStack: string[];
  };
  
  // 团队活动
  teamActivity?: {
    recentTasks: Array<{
      agentCode: string;
      taskTitle: string;
      status: string;
      completedAt?: Date;
    }>;
    activeAgents: string[];
    blockedTasks: number;
  };
  
  // 知识库片段
  knowledgeSnippets?: Array<{
    topic: string;
    content: string;
    relevance: number;
  }>;
  
  // 可用技能
  availableSkills?: Array<{
    code: string;
    name: string;
    category: string;
  }>;
  
  // 预算信息
  budget?: {
    dailyTotal: number;
    dailyUsed: number;
    agentBudget: number;
    agentUsed: number;
    recommendedModel: string;
  };
  
  // 依赖任务
  dependencies?: Array<{
    taskId: string;
    title: string;
    status: string;
  }>;
  
  // 相关上下文
  relatedContext?: {
    parentTask?: string;
    subtasks?: number;
    workingDirectory?: string;
    repositoryUrl?: string;
  };
}

@Injectable()
export class TaskContextService {
  private readonly logger = new Logger(TaskContextService.name);

  constructor(
    @InjectRepository(HqAgent)
    private agentRepo: Repository<HqAgent>,
    @InjectRepository(AgentTask)
    private taskRepo: Repository<AgentTask>,
    @InjectRepository(HqSkill)
    private skillRepo: Repository<HqSkill>,
    private budgetMonitor: BudgetMonitorService,
  ) {}

  /**
   * 构建任务执行上下文
   */
  async buildTaskContext(taskId: string): Promise<TaskContext> {
    const task = await this.taskRepo.findOne({
      where: { id: taskId },
      relations: ['assignedTo', 'createdBy', 'parentTask'],
    });

    if (!task || !task.assignedTo) {
      throw new Error(`Task ${taskId} not found or not assigned`);
    }

    const [teamActivity, availableSkills, dependencies, budgetInfo] = await Promise.all([
      this.getTeamActivity(),
      this.getAgentSkills(task.assignedTo.code),
      this.getTaskDependencies(task),
      this.getBudgetInfo(task.assignedTo.code),
    ]);

    const context: TaskContext = {
      taskId: task.id,
      taskTitle: task.title,
      taskDescription: task.description,
      agentCode: task.assignedTo.code,
      agentRole: task.assignedTo.role,
      strategicPlan: await this.getStrategicPlan(),
      projectStatus: await this.getProjectStatus(),
      teamActivity,
      availableSkills,
      budget: budgetInfo,
      dependencies,
      relatedContext: {
        parentTask: task.parentTask?.title,
        subtasks: await this.taskRepo.count({ where: { parentTaskId: task.id } }),
        workingDirectory: task.context?.workspaceId,
        repositoryUrl: task.context?.repositoryUrl,
      },
    };

    this.logger.log(`📋 Built context for task "${task.title}" (${task.id.slice(0, 8)}...)`);
    return context;
  }

  /**
   * 获取战略规划
   */
  private async getStrategicPlan(): Promise<TaskContext['strategicPlan']> {
    // TODO: 从战略规划表获取，目前返回硬编码
    return {
      currentPhase: 'MVP Development',
      objectives: [
        '完善 HQ Console 核心功能',
        '实现 Agent 自主运行系统',
        '建立知识库和记忆系统',
        '优化成本控制和预算管理',
      ],
      priorities: ['Stability', 'Cost Efficiency', 'User Experience'],
    };
  }

  /**
   * 获取项目状态
   */
  private async getProjectStatus(): Promise<TaskContext['projectStatus']> {
    // TODO: 从项目管理模块获取
    return {
      activeProjects: 2,
      recentChanges: [
        'Refactored AgentChat.tsx (Phase 3)',
        'Added Task Queue System (Phase 4)',
        'Implemented Monaco Editor',
      ],
      technicalStack: ['NestJS', 'Next.js', 'TypeORM', 'PostgreSQL', 'Redis'],
    };
  }

  /**
   * 获取团队活动
   */
  private async getTeamActivity(): Promise<TaskContext['teamActivity']> {
    const recentTasks = await this.taskRepo.find({
      where: { isActive: true },
      relations: ['assignedTo'],
      order: { updatedAt: 'DESC' },
      take: 10,
    });

    const activeAgents = await this.agentRepo.count({
      where: { isActive: true, status: AgentStatus.RUNNING },
    });

    const blockedTasks = await this.taskRepo.count({
      where: { status: TaskStatus.BLOCKED, isActive: true },
    });

    return {
      recentTasks: recentTasks.map(t => ({
        agentCode: t.assignedTo?.code || 'unassigned',
        taskTitle: t.title,
        status: t.status,
        completedAt: t.completedAt,
      })),
      activeAgents: recentTasks
        .map(t => t.assignedTo?.code)
        .filter((c, i, arr) => c && arr.indexOf(c) === i) as string[],
      blockedTasks,
    };
  }

  /**
   * 获取 Agent 可用技能
   */
  private async getAgentSkills(agentCode: string): Promise<TaskContext['availableSkills']> {
    const agent = await this.agentRepo.findOne({
      where: { code: agentCode },
      relations: ['skills'],
    });

    if (!agent || !agent.skills) {
      return [];
    }

    return agent.skills
      .filter(s => s.isActive)
      .map(s => ({
        code: s.code,
        name: s.name,
        category: s.category,
      }));
  }

  /**
   * 获取预算信息
   */
  private async getBudgetInfo(agentCode: string): Promise<TaskContext['budget']> {
    const status = this.budgetMonitor.getBudgetStatus();
    const agentStatus = status.byAgent[agentCode];
    const recommendedModel = this.budgetMonitor.getRecommendedModel(agentCode);

    return {
      dailyTotal: status.totalBudget,
      dailyUsed: status.totalUsed,
      agentBudget: agentStatus?.budget || 0,
      agentUsed: agentStatus?.used || 0,
      recommendedModel,
    };
  }

  /**
   * 获取任务依赖
   */
  private async getTaskDependencies(task: AgentTask): Promise<TaskContext['dependencies']> {
    if (!task.dependsOn || task.dependsOn.length === 0) {
      return [];
    }

    const dependencies = await this.taskRepo.find({
      where: { id: In(task.dependsOn) },
      select: ['id', 'title', 'status'],
    });

    return dependencies.map(d => ({
      taskId: d.id,
      title: d.title,
      status: d.status,
    }));
  }

  /**
   * 格式化上下文为提示词
   */
  formatContextAsPrompt(context: TaskContext): string {
    let prompt = `# Task Execution Context

## Your Assignment
**Task**: ${context.taskTitle}
**Description**: ${context.taskDescription}
**Your Role**: ${context.agentRole} (${context.agentCode})

## Strategic Context
**Current Phase**: ${context.strategicPlan?.currentPhase || 'N/A'}
**Key Objectives**:
${context.strategicPlan?.objectives.map(o => `- ${o}`).join('\n') || '- N/A'}

## Project Status
- Active Projects: ${context.projectStatus?.activeProjects || 0}
- Recent Changes: ${context.projectStatus?.recentChanges.slice(0, 3).join(', ') || 'None'}

## Team Activity
- Active Agents: ${context.teamActivity?.activeAgents.join(', ') || 'None'}
- Blocked Tasks: ${context.teamActivity?.blockedTasks || 0}
- Recent Completions: ${context.teamActivity?.recentTasks.filter(t => t.status === 'completed').length || 0}

## Available Skills
${context.availableSkills?.slice(0, 5).map(s => `- ${s.name} (${s.category})`).join('\n') || '- No skills loaded'}

## Budget Status
- Your Budget: $${context.budget?.agentBudget.toFixed(2)} (Used: $${context.budget?.agentUsed.toFixed(2)})
- Daily Total: $${context.budget?.dailyTotal.toFixed(2)} (Used: $${context.budget?.dailyUsed.toFixed(2)})
- Recommended Model: ${context.budget?.recommendedModel}

## Task Dependencies
${context.dependencies?.length ? context.dependencies.map(d => `- ${d.title} (${d.status})`).join('\n') : '- No dependencies'}

## Related Context
${context.relatedContext?.parentTask ? `- Parent Task: ${context.relatedContext.parentTask}` : ''}
${context.relatedContext?.subtasks ? `- Subtasks: ${context.relatedContext.subtasks}` : ''}
${context.relatedContext?.workingDirectory ? `- Working Directory: ${context.relatedContext.workingDirectory}` : ''}

---

**Instructions**: Execute this task efficiently. Use available skills when appropriate. Stay within budget. Report progress and any blockers.
`;

    return prompt;
  }
}
