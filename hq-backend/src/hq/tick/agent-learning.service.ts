/**
 * Agent Learning Service (Phase 5)
 * 
 * Enables agents to learn from task results and share knowledge:
 * - Extract insights from completed tasks
 * - Build per-agent skill profiles from execution history
 * - Cross-agent knowledge sharing (broadcast learnings)
 * - Task result summarization for future context
 * - Automatic knowledge base updates from agent outputs
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, In } from 'typeorm';
import { HqAgent, AgentRole, AgentStatus } from '../../entities/hq-agent.entity';
import { AgentTask, TaskStatus, TaskType } from '../../entities/agent-task.entity';
import { AgentMemoryService, MemoryContext } from '../../modules/memory/agent-memory.service';
import { MemoryType, MemoryImportance } from '../../entities/agent-memory.entity';
import { AgentCommunicationService } from './agent-communication.service';

/** Learned insight from a completed task */
export interface LearnedInsight {
  agentCode: string;
  taskId: string;
  taskType: string;
  insight: string;
  confidence: number; // 0-1
  tags: string[];
  createdAt: Date;
}

/** Agent skill profile built from execution history */
export interface AgentSkillProfile {
  agentCode: string;
  name: string;
  role: string;
  totalTasksCompleted: number;
  totalTasksFailed: number;
  successRate: number;
  strongAreas: Array<{ type: string; successRate: number; count: number }>;
  weakAreas: Array<{ type: string; successRate: number; count: number }>;
  avgResponseTimeMs: number;
  totalCost: number;
  recentInsights: string[];
  lastUpdated: Date;
}

/** Knowledge sharing event */
export interface KnowledgeShareEvent {
  id: string;
  fromAgent: string;
  toAgents: string[];
  knowledgeType: 'insight' | 'skill' | 'warning' | 'best_practice';
  content: string;
  context?: Record<string, any>;
  timestamp: Date;
}

@Injectable()
export class AgentLearningService {
  private readonly logger = new Logger(AgentLearningService.name);
  private shareHistory: KnowledgeShareEvent[] = [];

  constructor(
    @InjectRepository(HqAgent)
    private agentRepo: Repository<HqAgent>,
    @InjectRepository(AgentTask)
    private taskRepo: Repository<AgentTask>,
    private memoryService: AgentMemoryService,
    private communicationService: AgentCommunicationService,
  ) {}

  /**
   * Learn from a completed task — extract insights and update agent profile.
   * Called automatically after task completion in the tick system.
   */
  async learnFromTask(taskId: string): Promise<LearnedInsight | null> {
    const task = await this.taskRepo.findOne({
      where: { id: taskId },
      relations: ['assignedTo'],
    });

    if (!task || task.status !== TaskStatus.COMPLETED || !task.result) {
      return null;
    }

    const agentCode = task.assignedTo?.code || 'UNKNOWN';
    const agentId = task.assignedToId;

    // 1. Extract key points from the task result
    const insight = this.extractInsight(task);
    if (!insight) return null;

    // 2. Store as a knowledge memory
    if (agentId) {
      try {
        const context: MemoryContext = { agentId };
        await this.memoryService.storeMemory(context, {
          type: MemoryType.KNOWLEDGE,
          content: `[Task Learning] ${task.title}\n\nResult: ${task.result.substring(0, 1000)}\n\nInsight: ${insight}`,
          importance: MemoryImportance.HIGH,
          summary: insight,
          metadata: {
            source: 'task_learning',
            tags: [task.type, agentCode],
            context: { taskId: task.id, taskType: task.type },
          },
        });
      } catch (err) {
        this.logger.warn(`Failed to store learning memory: ${err.message}`);
      }
    }

    // 3. Update agent stats
    await this.updateAgentStats(agentCode, task);

    const learned: LearnedInsight = {
      agentCode,
      taskId: task.id,
      taskType: task.type,
      insight,
      confidence: this.calculateConfidence(task),
      tags: [task.type, agentCode],
      createdAt: new Date(),
    };

    this.logger.log(`📚 ${agentCode} learned: ${insight.substring(0, 80)}...`);
    return learned;
  }

  /**
   * Learn from a failed task — record what went wrong for future avoidance.
   */
  async learnFromFailure(taskId: string): Promise<void> {
    const task = await this.taskRepo.findOne({
      where: { id: taskId },
      relations: ['assignedTo'],
    });

    if (!task || task.status !== TaskStatus.FAILED) return;

    const agentCode = task.assignedTo?.code || 'UNKNOWN';
    const agentId = task.assignedToId;

    if (agentId) {
      try {
        const context: MemoryContext = { agentId };
        await this.memoryService.storeMemory(context, {
          type: MemoryType.DECISION,
          content: `[Task Failure] ${task.title}\n\nError: ${task.errorMessage || 'Unknown error'}\n\nLesson: Avoid similar approach for ${task.type} tasks. Consider alternative strategies.`,
          importance: MemoryImportance.HIGH,
          summary: `Failed: ${task.title} — ${task.errorMessage?.substring(0, 100) || 'Unknown error'}`,
          metadata: {
            source: 'task_failure_learning',
            tags: [task.type, 'failure', agentCode],
          },
        });
      } catch (err) {
        this.logger.warn(`Failed to store failure learning: ${err.message}`);
      }
    }

    this.logger.log(`⚠️ ${agentCode} learned from failure: ${task.title}`);
  }

  /**
   * Build a skill profile for an agent based on their execution history.
   */
  async buildSkillProfile(agentCode: string): Promise<AgentSkillProfile> {
    const agent = await this.agentRepo.findOne({ where: { code: agentCode } });
    if (!agent) throw new Error(`Agent not found: ${agentCode}`);

    const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const tasks = await this.taskRepo.find({
      where: {
        assignedToId: agent.id,
        completedAt: MoreThan(since30d),
      },
      select: ['id', 'type', 'status', 'actualCost', 'startedAt', 'completedAt', 'result'],
    });

    const completed = tasks.filter(t => t.status === TaskStatus.COMPLETED);
    const failed = tasks.filter(t => t.status === TaskStatus.FAILED);
    const total = completed.length + failed.length;
    const successRate = total > 0 ? completed.length / total : 1;

    // Calculate per-type stats
    const typeStats: Record<string, { completed: number; failed: number; total: number }> = {};
    for (const task of tasks) {
      if (!typeStats[task.type]) {
        typeStats[task.type] = { completed: 0, failed: 0, total: 0 };
      }
      typeStats[task.type].total++;
      if (task.status === TaskStatus.COMPLETED) typeStats[task.type].completed++;
      if (task.status === TaskStatus.FAILED) typeStats[task.type].failed++;
    }

    const areas = Object.entries(typeStats).map(([type, stats]) => ({
      type,
      successRate: stats.total > 0 ? stats.completed / stats.total : 0,
      count: stats.total,
    }));

    const strongAreas = areas.filter(a => a.successRate >= 0.8 && a.count >= 2).sort((a, b) => b.successRate - a.successRate);
    const weakAreas = areas.filter(a => a.successRate < 0.6 && a.count >= 2).sort((a, b) => a.successRate - b.successRate);

    // Avg response time
    const completedWithTimes = completed.filter(t => t.startedAt && t.completedAt);
    const avgResponseTimeMs = completedWithTimes.length > 0
      ? completedWithTimes.reduce((sum, t) => sum + (t.completedAt!.getTime() - t.startedAt!.getTime()), 0) / completedWithTimes.length
      : 0;

    // Total cost
    const totalCost = completed.reduce((sum, t) => sum + (t.actualCost || 0), 0);

    // Recent insights from memory
    let recentInsights: string[] = [];
    try {
      const memories = await this.memoryService.retrieveMemories(
        { agentId: agent.id },
        { types: [MemoryType.KNOWLEDGE, MemoryType.INSIGHT], limit: 5 },
      );
      recentInsights = memories.map(m => m.summary || m.content.substring(0, 150));
    } catch { /* ignore */ }

    return {
      agentCode: agent.code,
      name: agent.name,
      role: agent.role,
      totalTasksCompleted: completed.length,
      totalTasksFailed: failed.length,
      successRate: Math.round(successRate * 100) / 100,
      strongAreas,
      weakAreas,
      avgResponseTimeMs: Math.round(avgResponseTimeMs),
      totalCost: Math.round(totalCost * 10000) / 10000,
      recentInsights,
      lastUpdated: new Date(),
    };
  }

  /**
   * Share knowledge from one agent to others.
   * Useful when an agent discovers something relevant to the team.
   */
  async shareKnowledge(
    fromAgentCode: string,
    content: string,
    knowledgeType: KnowledgeShareEvent['knowledgeType'] = 'insight',
    targetAgentCodes?: string[],
  ): Promise<KnowledgeShareEvent> {
    // Determine target agents
    let targets: string[];
    if (targetAgentCodes && targetAgentCodes.length > 0) {
      targets = targetAgentCodes;
    } else {
      // Share with all active agents except sender
      const agents = await this.agentRepo.find({ where: { isActive: true } });
      targets = agents.map(a => a.code).filter(c => c !== fromAgentCode);
    }

    // Store knowledge in each target agent's memory
    for (const targetCode of targets) {
      const targetAgent = await this.agentRepo.findOne({ where: { code: targetCode } });
      if (!targetAgent) continue;

      try {
        await this.memoryService.storeMemory(
          { agentId: targetAgent.id },
          {
            type: MemoryType.KNOWLEDGE,
            content: `[Shared by ${fromAgentCode}] ${content}`,
            importance: knowledgeType === 'warning' ? MemoryImportance.CRITICAL : MemoryImportance.HIGH,
            summary: `${knowledgeType}: ${content.substring(0, 100)}`,
            metadata: {
              source: 'knowledge_sharing',
              tags: [knowledgeType, fromAgentCode],
            },
          },
        );
      } catch (err) {
        this.logger.warn(`Failed to share knowledge with ${targetCode}: ${err.message}`);
      }
    }

    // Send notification via communication service
    try {
      await this.communicationService.broadcastMessage(
        fromAgentCode,
        `[${knowledgeType.toUpperCase()}] ${content}`,
        { priority: knowledgeType === 'warning' ? 'high' : 'medium' as any },
      );
    } catch { /* ignore */ }

    const event: KnowledgeShareEvent = {
      id: `share_${Date.now()}`,
      fromAgent: fromAgentCode,
      toAgents: targets,
      knowledgeType,
      content,
      timestamp: new Date(),
    };

    this.shareHistory.push(event);
    // Keep only last 100 events
    if (this.shareHistory.length > 100) {
      this.shareHistory = this.shareHistory.slice(-100);
    }

    this.logger.log(`📤 ${fromAgentCode} shared ${knowledgeType} with ${targets.length} agents`);
    return event;
  }

  /**
   * Auto-share learnings after tick completion.
   * Called by TickService at the end of each tick.
   */
  async autoShareLearnings(): Promise<number> {
    const since1h = new Date(Date.now() - 60 * 60 * 1000);

    // Find recently completed tasks with results
    const recentTasks = await this.taskRepo.find({
      where: {
        status: TaskStatus.COMPLETED,
        completedAt: MoreThan(since1h),
      },
      relations: ['assignedTo'],
      order: { completedAt: 'DESC' },
      take: 5,
    });

    let sharedCount = 0;

    for (const task of recentTasks) {
      if (!task.result || !task.assignedTo) continue;

      // Only share significant results (longer than 200 chars)
      if (task.result.length < 200) continue;

      // Check if already shared (avoid duplicates)
      const alreadyShared = this.shareHistory.some(
        e => e.context?.taskId === task.id
      );
      if (alreadyShared) continue;

      const insight = this.extractInsight(task);
      if (insight) {
        // Determine relevant agents based on task type
        const relevantRoles = this.getRelevantRoles(task.type);
        const relevantAgents = await this.agentRepo.find({
          where: { role: In(relevantRoles), isActive: true },
        });
        const targetCodes = relevantAgents
          .map(a => a.code)
          .filter(c => c !== task.assignedTo?.code);

        if (targetCodes.length > 0) {
          const event = await this.shareKnowledge(
            task.assignedTo.code,
            `From task "${task.title}": ${insight}`,
            'insight',
            targetCodes,
          );
          (event as any).context = { taskId: task.id };
          sharedCount++;
        }
      }
    }

    if (sharedCount > 0) {
      this.logger.log(`📚 Auto-shared ${sharedCount} learning(s) across agents`);
    }

    return sharedCount;
  }

  /**
   * Get all skill profiles for the team.
   */
  async getTeamSkillProfiles(): Promise<AgentSkillProfile[]> {
    const agents = await this.agentRepo.find({ where: { isActive: true }, order: { code: 'ASC' } });
    return Promise.all(agents.map(a => this.buildSkillProfile(a.code)));
  }

  /**
   * Get recent knowledge sharing events.
   */
  getShareHistory(limit = 20): KnowledgeShareEvent[] {
    return this.shareHistory.slice(-limit).reverse();
  }

  /**
   * Get learning summary for the team.
   */
  async getTeamLearningSummary(): Promise<{
    totalInsights: number;
    totalKnowledgeShares: number;
    topLearners: Array<{ agentCode: string; insightCount: number }>;
    recentLearnings: string[];
    teamStrengths: string[];
    teamWeaknesses: string[];
  }> {
    const profiles = await this.getTeamSkillProfiles();

    // Aggregate strengths and weaknesses
    const strengthMap: Record<string, number> = {};
    const weaknessMap: Record<string, number> = {};

    for (const profile of profiles) {
      for (const area of profile.strongAreas) {
        strengthMap[area.type] = (strengthMap[area.type] || 0) + 1;
      }
      for (const area of profile.weakAreas) {
        weaknessMap[area.type] = (weaknessMap[area.type] || 0) + 1;
      }
    }

    const teamStrengths = Object.entries(strengthMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([type, count]) => `${type} (${count} agents strong)`);

    const teamWeaknesses = Object.entries(weaknessMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([type, count]) => `${type} (${count} agents weak)`);

    // Top learners by completed tasks
    const topLearners = profiles
      .map(p => ({ agentCode: p.agentCode, insightCount: p.totalTasksCompleted }))
      .sort((a, b) => b.insightCount - a.insightCount)
      .slice(0, 5);

    // Recent learnings from share history
    const recentLearnings = this.shareHistory
      .slice(-10)
      .reverse()
      .map(e => `${e.fromAgent}: ${e.content.substring(0, 100)}`);

    return {
      totalInsights: profiles.reduce((sum, p) => sum + p.recentInsights.length, 0),
      totalKnowledgeShares: this.shareHistory.length,
      topLearners,
      recentLearnings,
      teamStrengths,
      teamWeaknesses,
    };
  }

  // --- Private helpers ---

  private extractInsight(task: AgentTask): string | null {
    if (!task.result || task.result.length < 50) return null;

    const result = task.result;

    // Extract key sentences (simple heuristic)
    const sentences = result.split(/[.。!！\n]/).filter(s => s.trim().length > 20);
    if (sentences.length === 0) return null;

    // Pick the most informative sentence (longest with key terms)
    const keyTerms = ['recommend', 'suggest', 'found', 'discovered', 'important', 'critical', 'issue', 'solution', 'improve', 'optimize',
      '建议', '发现', '重要', '关键', '问题', '解决', '优化', '改进'];

    let bestSentence = sentences[0].trim();
    let bestScore = 0;

    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      let score = trimmed.length / 100; // Longer is slightly better
      for (const term of keyTerms) {
        if (trimmed.toLowerCase().includes(term)) score += 2;
      }
      if (score > bestScore) {
        bestScore = score;
        bestSentence = trimmed;
      }
    }

    return bestSentence.substring(0, 300);
  }

  private calculateConfidence(task: AgentTask): number {
    let confidence = 0.5;

    // Higher confidence for tasks with longer results
    if (task.result && task.result.length > 500) confidence += 0.2;
    if (task.result && task.result.length > 1000) confidence += 0.1;

    // Higher confidence for tasks that completed quickly
    if (task.startedAt && task.completedAt) {
      const durationMs = task.completedAt.getTime() - task.startedAt.getTime();
      if (durationMs < 30000) confidence += 0.1; // < 30s
    }

    return Math.min(1, confidence);
  }

  private async updateAgentStats(agentCode: string, task: AgentTask): Promise<void> {
    try {
      const agent = await this.agentRepo.findOne({ where: { code: agentCode } });
      if (!agent) return;

      const stats = agent.stats || {};
      stats.tasksCompleted = (stats.tasksCompleted || 0) + 1;
      stats.lastActiveAt = new Date().toISOString();

      await this.agentRepo.update(agent.id, { stats });
    } catch (err) {
      this.logger.warn(`Failed to update agent stats: ${err.message}`);
    }
  }

  private getRelevantRoles(taskType: string): AgentRole[] {
    const mapping: Record<string, AgentRole[]> = {
      [TaskType.DEVELOPMENT]: [AgentRole.CODER, AgentRole.ARCHITECT],
      [TaskType.ANALYSIS]: [AgentRole.ANALYST, AgentRole.GROWTH],
      [TaskType.MARKETING]: [AgentRole.GROWTH, AgentRole.BD],
      [TaskType.OPERATIONS]: [AgentRole.SUPPORT, AgentRole.RISK],
      [TaskType.RESEARCH]: [AgentRole.ANALYST, AgentRole.BD],
      [TaskType.PLANNING]: [AgentRole.ARCHITECT, AgentRole.ANALYST],
      [TaskType.REVIEW]: [AgentRole.ARCHITECT, AgentRole.CODER],
    };
    return mapping[taskType] || [AgentRole.ARCHITECT];
  }
}
