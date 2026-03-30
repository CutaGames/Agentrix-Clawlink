import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, In } from 'typeorm';
import { AgentSession, SessionStatus } from '../../entities/agent-session.entity';
import { AgentMessage, MessageRole, MessageType } from '../../entities/agent-message.entity';
import { AgentMemory, MemoryType, MemoryScope } from '../../entities/agent-memory.entity';

// ── Plan Mode Types ──────────────────────────────────────────────────────────

export enum PlanStatus {
  DRAFT = 'draft',
  AWAITING_APPROVAL = 'awaiting_approval',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXECUTING = 'executing',
  STEP_DONE = 'step_done',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface PlanStep {
  id: string;
  description: string;
  toolName?: string;
  toolParams?: Record<string, any>;
  status: 'pending' | 'running' | 'done' | 'failed' | 'skipped';
  result?: string;
  error?: string;
}

export interface AgentPlan {
  id: string;
  sessionId: string;
  goal: string;
  reasoning: string;
  steps: PlanStep[];
  status: PlanStatus;
  currentStepIndex: number;
  createdAt: string;
  updatedAt: string;
}

// ── Compaction Types ─────────────────────────────────────────────────────────

export interface CompactionResult {
  originalCount: number;
  compactedCount: number;
  summary: string;
  tokensSaved: number;
}

// ── Cross-device Sync Types ──────────────────────────────────────────────────

export interface AgentSyncPayload {
  type: 'chat_chunk' | 'tool_call' | 'plan_update' | 'memory_update' | 'session_update' | 'approval_request' | 'approval_response' | 'subtask_update' | 'team_update';
  sessionId: string;
  data: any;
  sourceDeviceId?: string;
  timestamp: number;
}

// ── Sub-task Types ───────────────────────────────────────────────────────────

export enum SubtaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export interface Subtask {
  id: string;
  parentSessionId: string;
  childSessionId: string;
  title: string;
  description: string;
  status: SubtaskStatus;
  result?: string;
  assignedDeviceType?: string;
  createdAt: string;
}

// ── Agent Team Types ─────────────────────────────────────────────────────────

export interface TeamMember {
  agentId: string;
  role: 'leader' | 'worker';
  model?: string;
  specialization?: string;
  sessionId?: string;
  status: 'idle' | 'working' | 'done' | 'error';
}

export interface AgentTeam {
  id: string;
  name: string;
  parentSessionId: string;
  members: TeamMember[];
  task: string;
  status: 'planning' | 'executing' | 'completed' | 'failed';
}

@Injectable()
export class AgentIntelligenceService {
  private readonly logger = new Logger(AgentIntelligenceService.name);

  // In-memory plan store (per session)
  private activePlans = new Map<string, AgentPlan>();
  // In-memory subtask registry
  private subtasks = new Map<string, Subtask[]>();
  // In-memory team registry
  private teams = new Map<string, AgentTeam>();

  constructor(
    @InjectRepository(AgentSession)
    private readonly sessionRepo: Repository<AgentSession>,
    @InjectRepository(AgentMessage)
    private readonly messageRepo: Repository<AgentMessage>,
    @InjectRepository(AgentMemory)
    private readonly memoryRepo: Repository<AgentMemory>,
  ) {}

  // ═════════════════════════════════════════════════════════════════════════
  // P4.1 — Plan Mode
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Detect if a user message implies a multi-step task that benefits from planning.
   */
  detectPlanIntent(message: string): boolean {
    const planKeywords = /制定计划|make a plan|plan mode|step.?by.?step|帮我规划|分步骤|详细步骤|multiple steps|complex task|deploy|migrate|refactor|build.*and.*deploy|先.*然后.*最后/i;
    return planKeywords.test(message);
  }

  /**
   * Build a system prompt addition that instructs the LLM to output a structured plan.
   */
  getPlanModeSystemPrompt(): string {
    return `
## Plan Mode Active
When the user's request requires multiple steps, you MUST respond with a structured plan in this JSON format:
\`\`\`json
{
  "goal": "Brief description of the overall goal",
  "reasoning": "Why this plan is the best approach",
  "steps": [
    {
      "id": "step_1",
      "description": "What this step does",
      "toolName": "tool_name_if_applicable",
      "toolParams": {}
    }
  ]
}
\`\`\`
After outputting the plan, STOP and wait for user approval. Do NOT execute any steps until the user approves.
If the user says "approve", "ok", "go ahead", "执行", "批准", execute the plan step by step, reporting progress after each step.
If the user says "reject", "no", "修改", "拒绝", ask what changes they want.`;
  }

  /**
   * Parse LLM response for a plan JSON block.
   */
  parsePlanFromResponse(text: string): AgentPlan | null {
    const jsonMatch = text.match(/```json\s*\n?([\s\S]*?)\n?\s*```/);
    if (!jsonMatch) return null;

    try {
      const parsed = JSON.parse(jsonMatch[1]);
      if (!parsed.goal || !Array.isArray(parsed.steps)) return null;

      const plan: AgentPlan = {
        id: `plan-${Date.now()}`,
        sessionId: '',
        goal: parsed.goal,
        reasoning: parsed.reasoning || '',
        steps: parsed.steps.map((s: any, i: number) => ({
          id: s.id || `step_${i + 1}`,
          description: s.description,
          toolName: s.toolName || undefined,
          toolParams: s.toolParams || undefined,
          status: 'pending' as const,
        })),
        status: PlanStatus.AWAITING_APPROVAL,
        currentStepIndex: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return plan;
    } catch {
      return null;
    }
  }

  /**
   * Store active plan for a session.
   */
  setActivePlan(sessionId: string, plan: AgentPlan): void {
    plan.sessionId = sessionId;
    this.activePlans.set(sessionId, plan);
  }

  getActivePlan(sessionId: string): AgentPlan | null {
    return this.activePlans.get(sessionId) || null;
  }

  /**
   * Approve plan → change status to executing.
   */
  approvePlan(sessionId: string): AgentPlan | null {
    const plan = this.activePlans.get(sessionId);
    if (!plan || plan.status !== PlanStatus.AWAITING_APPROVAL) return null;
    plan.status = PlanStatus.EXECUTING;
    plan.updatedAt = new Date().toISOString();
    return plan;
  }

  /**
   * Reject plan → mark rejected.
   */
  rejectPlan(sessionId: string, feedback?: string): AgentPlan | null {
    const plan = this.activePlans.get(sessionId);
    if (!plan) return null;
    plan.status = PlanStatus.REJECTED;
    plan.updatedAt = new Date().toISOString();
    return plan;
  }

  /**
   * Advance plan to next step, return the step to execute.
   */
  advancePlan(sessionId: string): PlanStep | null {
    const plan = this.activePlans.get(sessionId);
    if (!plan || plan.status !== PlanStatus.EXECUTING) return null;
    if (plan.currentStepIndex >= plan.steps.length) {
      plan.status = PlanStatus.COMPLETED;
      return null;
    }
    const step = plan.steps[plan.currentStepIndex];
    step.status = 'running';
    plan.updatedAt = new Date().toISOString();
    return step;
  }

  /**
   * Mark current step as done and advance index.
   */
  completeStep(sessionId: string, result: string): PlanStep | null {
    const plan = this.activePlans.get(sessionId);
    if (!plan || plan.status !== PlanStatus.EXECUTING) return null;
    const step = plan.steps[plan.currentStepIndex];
    if (!step) return null;
    step.status = 'done';
    step.result = result;
    plan.currentStepIndex++;
    if (plan.currentStepIndex >= plan.steps.length) {
      plan.status = PlanStatus.COMPLETED;
    }
    plan.updatedAt = new Date().toISOString();
    return step;
  }

  failStep(sessionId: string, error: string): PlanStep | null {
    const plan = this.activePlans.get(sessionId);
    if (!plan) return null;
    const step = plan.steps[plan.currentStepIndex];
    if (!step) return null;
    step.status = 'failed';
    step.error = error;
    plan.status = PlanStatus.FAILED;
    plan.updatedAt = new Date().toISOString();
    return step;
  }

  /**
   * Build plan execution prompt for the LLM.
   */
  buildPlanExecutionPrompt(plan: AgentPlan): string {
    const step = plan.steps[plan.currentStepIndex];
    if (!step) return '';

    const completedSummary = plan.steps
      .filter(s => s.status === 'done')
      .map(s => `✅ ${s.id}: ${s.description} → ${s.result?.substring(0, 200) || 'done'}`)
      .join('\n');

    return `## Executing Plan: ${plan.goal}
Progress: Step ${plan.currentStepIndex + 1}/${plan.steps.length}
${completedSummary ? `\nCompleted Steps:\n${completedSummary}\n` : ''}
**Current Step**: ${step.id} — ${step.description}
${step.toolName ? `Tool: ${step.toolName}` : ''}
${step.toolParams ? `Params: ${JSON.stringify(step.toolParams)}` : ''}

Execute this step now. Use the appropriate tool if specified. Report the result concisely.`;
  }

  // ═════════════════════════════════════════════════════════════════════════
  // P4.2 — Auto-Memory
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Extract memorable facts from a conversation turn and persist them.
   * Called after each assistant response.
   */
  async extractAndSaveMemories(
    sessionId: string,
    userId: string,
    agentId: string | undefined,
    userMessage: string,
    assistantResponse: string,
  ): Promise<void> {
    try {
      // Extract user preferences, decisions, and key information
      const memories = this.extractMemoryCandidates(userMessage, assistantResponse);
      for (const mem of memories) {
        await this.upsertMemory(sessionId, userId, agentId, mem.key, mem.value, mem.type, mem.scope);
      }
    } catch (err: any) {
      this.logger.warn(`Memory extraction failed: ${err.message}`);
    }
  }

  /**
   * Simple rule-based memory extraction (can be upgraded to LLM-based later).
   */
  private extractMemoryCandidates(userMsg: string, assistantMsg: string): Array<{
    key: string; value: any; type: MemoryType; scope: MemoryScope;
  }> {
    const candidates: Array<{ key: string; value: any; type: MemoryType; scope: MemoryScope }> = [];

    // Extract user preferences (language, model, etc.)
    const langMatch = userMsg.match(/(?:我(?:用|说|讲)|speak|use|prefer)\s*(中文|英文|英语|chinese|english|japanese|日语|korean|韩语)/i);
    if (langMatch) {
      candidates.push({
        key: 'user_language_preference',
        value: { language: langMatch[1], detectedFrom: userMsg.substring(0, 100) },
        type: MemoryType.ENTITY,
        scope: MemoryScope.USER,
      });
    }

    // Extract named entities (product names, skill names mentioned)
    const skillMentions = assistantMsg.match(/(?:installed|执行|安装|found)\s+(?:skill|技能)\s+"?([^"]+)"?/gi);
    if (skillMentions) {
      candidates.push({
        key: `last_skill_interaction`,
        value: { skills: skillMentions, timestamp: Date.now() },
        type: MemoryType.ENTITY,
        scope: MemoryScope.SESSION,
      });
    }

    // Extract decisions / confirmations
    const decisionPatterns = /(?:I (?:want|prefer|chose|decided)|我(?:要|选|决定|想))\s+(.{5,80})/i;
    const decisionMatch = userMsg.match(decisionPatterns);
    if (decisionMatch) {
      candidates.push({
        key: `user_decision_${Date.now()}`,
        value: { decision: decisionMatch[1], context: userMsg.substring(0, 200) },
        type: MemoryType.INTENT,
        scope: MemoryScope.SESSION,
      });
    }

    // Extract tool results (for context in future turns)
    const toolResultMatch = assistantMsg.match(/\[Tool Call\]\s*(\w+)/g);
    if (toolResultMatch && toolResultMatch.length > 0) {
      candidates.push({
        key: 'last_tool_calls',
        value: { tools: toolResultMatch.map(t => t.replace('[Tool Call] ', '')), timestamp: Date.now() },
        type: MemoryType.STATE,
        scope: MemoryScope.SESSION,
      });
    }

    return candidates;
  }

  /**
   * Upsert a memory entry (update if key exists for same scope).
   */
  private async upsertMemory(
    sessionId: string,
    userId: string,
    agentId: string | undefined,
    key: string,
    value: any,
    type: MemoryType,
    scope: MemoryScope,
  ): Promise<void> {
    const existing = await this.memoryRepo.findOne({
      where: scope === MemoryScope.USER
        ? { agentId: agentId || undefined, key, scope }
        : { sessionId, key, scope },
    });

    if (existing) {
      existing.value = value;
      existing.metadata = { ...existing.metadata, importance: (existing.metadata?.importance || 0.5) + 0.1 };
      await this.memoryRepo.save(existing);
    } else {
      const mem = this.memoryRepo.create({
        sessionId: scope === MemoryScope.USER ? undefined : sessionId,
        agentId,
        key,
        value,
        type,
        scope,
        metadata: { importance: 0.5 },
      });
      await this.memoryRepo.save(mem);
    }
  }

  /**
   * Retrieve relevant memories for a session (to inject into system prompt).
   */
  async getRelevantMemories(
    sessionId: string,
    userId: string,
    agentId?: string,
    limit: number = 20,
  ): Promise<AgentMemory[]> {
    const memories: AgentMemory[] = [];

    // 1. Session-scoped memories
    if (sessionId) {
      const sessionMems = await this.memoryRepo.find({
        where: { sessionId, scope: MemoryScope.SESSION },
        order: { updatedAt: 'DESC' },
        take: limit,
      });
      memories.push(...sessionMems);
    }

    // 2. Agent-scoped memories (long-term per agent)
    if (agentId) {
      const agentMems = await this.memoryRepo.find({
        where: { agentId, scope: MemoryScope.AGENT },
        order: { updatedAt: 'DESC' },
        take: Math.min(limit, 10),
      });
      memories.push(...agentMems);
    }

    // 3. User-scoped memories (shared across agents)
    const userMems = await this.memoryRepo.find({
      where: { agentId: agentId || undefined, scope: MemoryScope.USER },
      order: { updatedAt: 'DESC' },
      take: Math.min(limit, 5),
    });
    memories.push(...userMems);

    return memories;
  }

  /**
   * Build a memory context string to inject into system prompt.
   */
  buildMemoryContext(memories: AgentMemory[]): string {
    if (!memories.length) return '';

    const memLines = memories
      .sort((a, b) => (b.metadata?.importance || 0) - (a.metadata?.importance || 0))
      .slice(0, 15)
      .map(m => `- [${m.scope}/${m.type}] ${m.key}: ${JSON.stringify(m.value).substring(0, 200)}`);

    return `\n## Agent Memory (auto-recalled context)\n${memLines.join('\n')}\n`;
  }

  // ═════════════════════════════════════════════════════════════════════════
  // P4.3 — Conversation Compaction
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Estimate token count for messages array.
   */
  estimateMessageTokens(messages: Array<{ role: string; content: string }>): number {
    return messages.reduce((sum, m) => sum + Math.ceil((m.content?.length || 0) / 3.5), 0);
  }

  /**
   * Check if conversation needs compaction.
   */
  needsCompaction(messages: Array<{ role: string; content: string }>, contextWindowTokens: number = 128000): boolean {
    const used = this.estimateMessageTokens(messages);
    return used > contextWindowTokens * 0.75;
  }

  /**
   * Compact conversation history by summarizing old messages.
   * Keeps the system prompt + last N messages intact, summarizes the middle.
   */
  async compactHistory(
    messages: Array<{ role: string; content: string }>,
    keepRecentCount: number = 6,
  ): Promise<{ compacted: Array<{ role: string; content: string }>; result: CompactionResult }> {
    if (messages.length <= keepRecentCount + 2) {
      return {
        compacted: messages,
        result: { originalCount: messages.length, compactedCount: messages.length, summary: '', tokensSaved: 0 },
      };
    }

    // Split: system prompt(s) + middle history + recent messages
    const systemMessages = messages.filter(m => m.role === 'system');
    const nonSystem = messages.filter(m => m.role !== 'system');
    const recent = nonSystem.slice(-keepRecentCount);
    const toSummarize = nonSystem.slice(0, -keepRecentCount);

    if (toSummarize.length === 0) {
      return {
        compacted: messages,
        result: { originalCount: messages.length, compactedCount: messages.length, summary: '', tokensSaved: 0 },
      };
    }

    // Build summary from older messages
    const summaryLines = toSummarize.map(m => {
      const prefix = m.role === 'user' ? 'User' : 'Assistant';
      const content = m.content.length > 300 ? m.content.substring(0, 300) + '...' : m.content;
      return `${prefix}: ${content}`;
    });

    const summary = `[Conversation Summary — ${toSummarize.length} earlier messages]\n` +
      summaryLines.join('\n').substring(0, 2000);

    const compactedMiddle: Array<{ role: string; content: string }> = [{ role: 'system', content: summary }];
    const compacted = [...systemMessages, ...compactedMiddle, ...recent];

    const originalTokens = this.estimateMessageTokens(messages);
    const compactedTokens = this.estimateMessageTokens(compacted);

    return {
      compacted,
      result: {
        originalCount: messages.length,
        compactedCount: compacted.length,
        summary: summary.substring(0, 500),
        tokensSaved: originalTokens - compactedTokens,
      },
    };
  }

  /**
   * Persist compaction — update stored messages for a session.
   */
  async persistCompaction(sessionId: string, summary: string): Promise<void> {
    // Mark old messages as archived and save summary as a system message
    const msgCount = await this.messageRepo.count({ where: { sessionId } });
    if (msgCount <= 8) return;

    // Keep latest 6 messages, archive the rest
    const recentMessages = await this.messageRepo.find({
      where: { sessionId },
      order: { sequenceNumber: 'DESC' },
      take: 6,
    });
    const recentIds = recentMessages.map(m => m.id);

    // Soft-delete old messages by setting metadata.archived = true
    await this.messageRepo
      .createQueryBuilder()
      .update()
      .set({ metadata: () => `COALESCE(metadata, '{}'::jsonb) || '{"archived": true}'::jsonb` })
      .where('sessionId = :sessionId', { sessionId })
      .andWhere('id NOT IN (:...recentIds)', { recentIds })
      .execute();

    // Save compaction summary as a special system message
    const summaryMsg = this.messageRepo.create({
      sessionId,
      role: MessageRole.SYSTEM,
      type: MessageType.TEXT,
      content: summary,
      metadata: { compaction: true, compactedAt: new Date().toISOString(), archivedCount: msgCount - 6 },
      sequenceNumber: 0, // Will be resequenced
    });
    await this.messageRepo.save(summaryMsg);

    this.logger.log(`Compacted session ${sessionId}: ${msgCount} → 7 messages (6 recent + 1 summary)`);
  }

  /**
   * Get context window usage info for a session.
   */
  async getContextUsage(sessionId: string, instanceId: string): Promise<{
    messageCount: number;
    estimatedTokens: number;
    contextWindowSize: number;
    usagePercent: number;
    needsCompaction: boolean;
  }> {
    const messages = await this.messageRepo.find({
      where: { sessionId },
      order: { sequenceNumber: 'ASC' },
    });

    const nonArchived = messages.filter(m => !m.metadata?.archived);
    const tokenEstimate = nonArchived.reduce((sum, m) => sum + Math.ceil((m.content?.length || 0) / 3.5), 0);
    const contextWindow = 128000; // default, can vary by model

    return {
      messageCount: nonArchived.length,
      estimatedTokens: tokenEstimate,
      contextWindowSize: contextWindow,
      usagePercent: Math.round((tokenEstimate / contextWindow) * 100),
      needsCompaction: tokenEstimate > contextWindow * 0.75,
    };
  }

  // ═════════════════════════════════════════════════════════════════════════
  // P4.4 — Session Resume / Management
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * List sessions for a user, with metadata for resume UI.
   */
  async listSessions(
    userId: string,
    options?: { status?: SessionStatus; limit?: number; offset?: number; search?: string },
  ): Promise<{
    sessions: Array<{
      id: string;
      sessionId: string;
      title: string;
      status: SessionStatus;
      messageCount: number;
      lastMessageAt: Date;
      metadata: any;
      createdAt: Date;
    }>;
    total: number;
  }> {
    const qb = this.sessionRepo
      .createQueryBuilder('session')
      .where('session.userId = :userId', { userId })
      .andWhere(`session.metadata ->> 'source' = :source`, { source: 'openclaw-platform-hosted' });

    if (options?.status) {
      qb.andWhere('session.status = :status', { status: options.status });
    }
    if (options?.search) {
      qb.andWhere('session.title ILIKE :search', { search: `%${options.search}%` });
    }

    const total = await qb.getCount();
    const sessions = await qb
      .orderBy('session.lastMessageAt', 'DESC')
      .offset(options?.offset || 0)
      .limit(options?.limit || 20)
      .getMany();

    const result = await Promise.all(
      sessions.map(async (s) => {
        const messageCount = await this.messageRepo.count({
          where: { sessionId: s.id, metadata: undefined },
        });
        return {
          id: s.id,
          sessionId: s.sessionId,
          title: s.title,
          status: s.status,
          messageCount,
          lastMessageAt: s.lastMessageAt,
          metadata: s.metadata,
          createdAt: s.createdAt,
        };
      }),
    );

    return { sessions: result, total };
  }

  /**
   * Load full session history for resume.
   */
  async loadSessionForResume(sessionId: string): Promise<{
    session: AgentSession;
    messages: AgentMessage[];
    memories: AgentMemory[];
    plan: AgentPlan | null;
  } | null> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
    });
    if (!session) return null;

    const messages = await this.messageRepo.find({
      where: { sessionId: session.id },
      order: { sequenceNumber: 'ASC' },
    });

    // Filter out archived messages but include compaction summaries
    const activeMessages = messages.filter(m => !m.metadata?.archived || m.metadata?.compaction);

    const memories = await this.memoryRepo.find({
      where: { sessionId: session.id },
      order: { updatedAt: 'DESC' },
      take: 20,
    });

    const plan = this.getActivePlan(session.sessionId);

    return { session, messages: activeMessages, memories, plan };
  }

  /**
   * Auto-generate session title from first user message.
   */
  async autoTitleSession(sessionId: string, firstMessage: string): Promise<string> {
    // Simple: take first 50 chars, trim to last word boundary
    let title = firstMessage.replace(/\n/g, ' ').trim();
    if (title.length > 50) {
      title = title.substring(0, 50);
      const lastSpace = title.lastIndexOf(' ');
      if (lastSpace > 20) title = title.substring(0, lastSpace);
      title += '...';
    }
    if (!title) title = `Chat ${new Date().toLocaleDateString()}`;

    await this.sessionRepo.update(sessionId, { title });
    return title;
  }

  /**
   * Archive a session.
   */
  async archiveSession(sessionId: string): Promise<void> {
    await this.sessionRepo.update(sessionId, { status: SessionStatus.ARCHIVED });
    this.activePlans.delete(sessionId);
  }

  // ═════════════════════════════════════════════════════════════════════════
  // P5.2 — Multi-Agent Sub-tasks
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Create a sub-task that spawns a child Agent session.
   */
  async createSubtask(
    parentSessionId: string,
    userId: string,
    title: string,
    description: string,
    assignedDeviceType?: string,
  ): Promise<Subtask> {
    // Create child session
    const childSession = this.sessionRepo.create({
      userId,
      sessionId: `subtask-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      title: `[Subtask] ${title}`,
      status: SessionStatus.ACTIVE,
      metadata: {
        source: 'openclaw-platform-hosted',
        parentSessionId,
        isSubtask: true,
      },
      context: { intent: title, entities: {}, userProfile: {} },
      lastMessageAt: new Date(),
    });
    await this.sessionRepo.save(childSession);

    const subtask: Subtask = {
      id: `st-${Date.now()}`,
      parentSessionId,
      childSessionId: childSession.id,
      title,
      description,
      status: SubtaskStatus.PENDING,
      assignedDeviceType,
      createdAt: new Date().toISOString(),
    };

    const existing = this.subtasks.get(parentSessionId) || [];
    existing.push(subtask);
    this.subtasks.set(parentSessionId, existing);

    return subtask;
  }

  /**
   * Get all subtasks for a parent session.
   */
  getSubtasks(parentSessionId: string): Subtask[] {
    return this.subtasks.get(parentSessionId) || [];
  }

  /**
   * Update subtask status.
   */
  updateSubtaskStatus(parentSessionId: string, subtaskId: string, status: SubtaskStatus, result?: string): Subtask | null {
    const tasks = this.subtasks.get(parentSessionId);
    if (!tasks) return null;
    const task = tasks.find(t => t.id === subtaskId);
    if (!task) return null;
    task.status = status;
    if (result) task.result = result;
    return task;
  }

  // ═════════════════════════════════════════════════════════════════════════
  // P5.4 — Agent Teams
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Create an Agent Team for parallel work.
   */
  createTeam(parentSessionId: string, name: string, task: string, members: Omit<TeamMember, 'status' | 'sessionId'>[]): AgentTeam {
    const team: AgentTeam = {
      id: `team-${Date.now()}`,
      name,
      parentSessionId,
      task,
      status: 'planning',
      members: members.map(m => ({
        ...m,
        status: 'idle',
        sessionId: undefined,
      })),
    };
    this.teams.set(parentSessionId, team);
    return team;
  }

  getTeam(parentSessionId: string): AgentTeam | null {
    return this.teams.get(parentSessionId) || null;
  }

  updateTeamMemberStatus(parentSessionId: string, agentId: string, status: TeamMember['status'], sessionId?: string): void {
    const team = this.teams.get(parentSessionId);
    if (!team) return;
    const member = team.members.find(m => m.agentId === agentId);
    if (member) {
      member.status = status;
      if (sessionId) member.sessionId = sessionId;
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  // Memory CRUD (for UI management)
  // ═════════════════════════════════════════════════════════════════════════

  async listMemories(
    userId: string,
    agentId?: string,
    scope?: MemoryScope,
  ): Promise<AgentMemory[]> {
    const where: any = {};
    if (agentId) where.agentId = agentId;
    if (scope) where.scope = scope;

    return this.memoryRepo.find({
      where,
      order: { updatedAt: 'DESC' },
      take: 50,
    });
  }

  async deleteMemory(memoryId: string): Promise<void> {
    await this.memoryRepo.delete(memoryId);
  }

  async updateMemory(memoryId: string, updates: Partial<{ value: any; key: string }>): Promise<AgentMemory | null> {
    const mem = await this.memoryRepo.findOne({ where: { id: memoryId } });
    if (!mem) return null;
    if (updates.value !== undefined) mem.value = updates.value;
    if (updates.key) mem.key = updates.key;
    return this.memoryRepo.save(mem);
  }
}
