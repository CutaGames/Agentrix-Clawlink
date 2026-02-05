import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';

/**
 * Agent 调度器
 * 
 * 负责将任务分配给各个 Agent 并触发执行
 */

export interface AgentTask {
  id: string;
  title: string;
  description: string;
  assignedTo: string;
  priority: number; // 1-10, 10最高
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'failed';
  estimatedCost: number; // 预估 API 成本
  actualCost?: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  result?: string;
}

export interface AgentConfig {
  id: string;
  name: string;
  role: string;
  model: string;
  dailyBudget: number;
  dailySpent: number;
  status: 'idle' | 'working' | 'offline';
  currentTask?: string;
  capabilities: string[];
  preferFreeApi: boolean; // 是否优先使用免费 API
}

@Injectable()
export class AgentSchedulerService {
  private readonly logger = new Logger(AgentSchedulerService.name);

  // Agent 配置
  private agents: Map<string, AgentConfig> = new Map([
    ['ARCHITECT-01', {
      id: 'ARCHITECT-01',
      name: '首席架构师',
      role: 'CEO + CFO + 架构师',
      model: 'claude-sonnet-4-20250514', // 使用较贵模型，因为是决策核心
      dailyBudget: 10.00,
      dailySpent: 0,
      status: 'idle',
      capabilities: ['架构设计', '技术决策', '任务调度', '代码审查'],
      preferFreeApi: false,
    }],
    ['DEV-01', {
      id: 'DEV-01',
      name: '高级开发者',
      role: '全栈开发',
      model: 'gpt-4o-mini', // 使用便宜模型
      dailyBudget: 3.00,
      dailySpent: 0,
      status: 'idle',
      capabilities: ['前端开发', '后端开发', 'API开发', '数据库'],
      preferFreeApi: true,
    }],
    ['DEV-02', {
      id: 'DEV-02',
      name: '开发者',
      role: '前端开发',
      model: 'gpt-4o-mini',
      dailyBudget: 2.00,
      dailySpent: 0,
      status: 'idle',
      capabilities: ['前端开发', 'UI/UX', 'React', 'Next.js'],
      preferFreeApi: true,
    }],
    ['MARKET-01', {
      id: 'MARKET-01',
      name: '营销专家',
      role: '市场营销',
      model: 'gpt-4o-mini',
      dailyBudget: 2.00,
      dailySpent: 0,
      status: 'idle',
      capabilities: ['社交媒体', '内容创作', 'SEO', '用户增长'],
      preferFreeApi: true,
    }],
    ['OPS-01', {
      id: 'OPS-01',
      name: '运维工程师',
      role: 'DevOps',
      model: 'gpt-4o-mini',
      dailyBudget: 1.50,
      dailySpent: 0,
      status: 'idle',
      capabilities: ['服务器管理', '部署', '监控', '安全'],
      preferFreeApi: true,
    }],
    ['RESOURCE-01', {
      id: 'RESOURCE-01',
      name: '资源猎手',
      role: '免费资源搜寻',
      model: 'gpt-4o-mini', // 使用最便宜的
      dailyBudget: 1.50,
      dailySpent: 0,
      status: 'idle',
      capabilities: ['云创计划', 'Grant申请', '免费API', '开源资源'],
      preferFreeApi: true,
    }],
  ]);

  // 任务队列
  private taskQueue: AgentTask[] = [];

  constructor(
    private readonly configService: ConfigService,
  ) {}

  /**
   * 获取所有 Agent 状态
   */
  getAllAgents(): AgentConfig[] {
    return Array.from(this.agents.values());
  }

  /**
   * 获取空闲且有预算的 Agent
   */
  getAvailableAgents(): AgentConfig[] {
    return this.getAllAgents().filter(
      agent => agent.status === 'idle' && agent.dailySpent < agent.dailyBudget
    );
  }

  /**
   * 添加任务到队列
   */
  addTask(task: Omit<AgentTask, 'id' | 'status' | 'createdAt'>): AgentTask {
    const newTask: AgentTask = {
      ...task,
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'pending',
      createdAt: new Date(),
    };
    this.taskQueue.push(newTask);
    this.logger.log(`新任务已添加: ${newTask.title} -> ${newTask.assignedTo}`);
    return newTask;
  }

  /**
   * 获取待处理任务
   */
  getPendingTasks(): AgentTask[] {
    return this.taskQueue.filter(t => t.status === 'pending');
  }

  /**
   * 获取进行中的任务
   */
  getInProgressTasks(): AgentTask[] {
    return this.taskQueue.filter(t => t.status === 'in_progress');
  }

  /**
   * 分配任务给 Agent
   */
  async assignTask(taskId: string): Promise<boolean> {
    const task = this.taskQueue.find(t => t.id === taskId);
    if (!task || task.status !== 'pending') {
      return false;
    }

    const agent = this.agents.get(task.assignedTo);
    if (!agent || agent.status !== 'idle' || agent.dailySpent >= agent.dailyBudget) {
      this.logger.warn(`Agent ${task.assignedTo} 不可用`);
      return false;
    }

    // 检查预算
    if (agent.dailySpent + task.estimatedCost > agent.dailyBudget) {
      this.logger.warn(`Agent ${agent.id} 预算不足`);
      return false;
    }

    // 更新状态
    task.status = 'assigned';
    task.startedAt = new Date();
    agent.status = 'working';
    agent.currentTask = task.title;

    this.logger.log(`任务 "${task.title}" 已分配给 ${agent.id}`);
    return true;
  }

  /**
   * 触发 Agent 执行任务
   */
  async triggerAgent(agentId: string, task: AgentTask): Promise<string> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} 不存在`);
    }

    this.logger.log(`触发 ${agentId} 执行任务: ${task.title}`);

    // TODO: 调用 HQ Backend 的 unified-chat API 让 Agent 执行任务
    // 这里需要实现实际的 API 调用
    
    // 模拟执行
    task.status = 'in_progress';
    
    return `任务 ${task.title} 已开始执行`;
  }

  /**
   * 完成任务
   */
  completeTask(taskId: string, result: string, actualCost: number): void {
    const task = this.taskQueue.find(t => t.id === taskId);
    if (!task) return;

    task.status = 'completed';
    task.completedAt = new Date();
    task.result = result;
    task.actualCost = actualCost;

    const agent = this.agents.get(task.assignedTo);
    if (agent) {
      agent.status = 'idle';
      agent.currentTask = undefined;
      agent.dailySpent += actualCost;
    }

    this.logger.log(`任务 "${task.title}" 已完成，花费: $${actualCost}`);
  }

  /**
   * 获取预算摘要
   */
  getBudgetSummary(): { totalBudget: number; totalSpent: number; remaining: number } {
    let totalBudget = 0;
    let totalSpent = 0;

    this.agents.forEach(agent => {
      totalBudget += agent.dailyBudget;
      totalSpent += agent.dailySpent;
    });

    return {
      totalBudget,
      totalSpent,
      remaining: totalBudget - totalSpent,
    };
  }

  /**
   * 重置每日预算（每天凌晨调用）
   */
  resetDailyBudgets(): void {
    this.agents.forEach(agent => {
      agent.dailySpent = 0;
    });
    this.logger.log('每日预算已重置');
  }

  /**
   * 生成每日任务计划
   * ARCHITECT-01 的核心决策功能
   */
  generateDailyPlan(): AgentTask[] {
    const tasks: AgentTask[] = [];

    // RESOURCE-01: 每天搜索免费资源
    tasks.push({
      id: '',
      title: '搜索云创计划和免费 API 资源',
      description: '搜索 AWS/Azure/GCP 云创计划、免费 AI API、公链 Grant 机会',
      assignedTo: 'RESOURCE-01',
      priority: 8,
      status: 'pending',
      estimatedCost: 0.10,
      createdAt: new Date(),
    });

    // MARKET-01: 社交媒体内容
    tasks.push({
      id: '',
      title: '准备社交媒体内容',
      description: '为 Twitter/X 准备今日发布内容，推广 Agentrix',
      assignedTo: 'MARKET-01',
      priority: 7,
      status: 'pending',
      estimatedCost: 0.15,
      createdAt: new Date(),
    });

    // OPS-01: 系统健康检查
    tasks.push({
      id: '',
      title: '系统健康检查',
      description: '检查服务器状态、API 响应时间、错误日志',
      assignedTo: 'OPS-01',
      priority: 9,
      status: 'pending',
      estimatedCost: 0.05,
      createdAt: new Date(),
    });

    // 添加到队列
    tasks.forEach(task => {
      this.addTask(task);
    });

    return tasks;
  }
}
