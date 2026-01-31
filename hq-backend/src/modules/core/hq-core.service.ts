/**
 * HQ Core Service
 * 
 * CEO 指挥室核心服务，集成：
 * - 多项目管理
 * - Agent 长期记忆
 * - AI 对话
 * - 告警管理
 */

import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { HqAgent, AgentRole, AgentStatus } from '../../entities/hq-agent.entity';
import { HqAlert, AlertType, AlertSeverity, AlertStatus } from '../../entities/hq-alert.entity';
import { AgentMemoryService, MemoryContext } from '../memory/agent-memory.service';
import { ProjectService } from '../project/project.service';
import { MemoryType, MemoryImportance } from '../../entities/agent-memory.entity';
import { HqAIService } from '../ai/hq-ai.service';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatRequest {
  agentId: string;
  projectId?: string;
  messages: ChatMessage[];
  useMemory?: boolean;
  provider?: 'openai' | 'claude' | 'deepseek' | 'auto';
}

export interface ChatResponse {
  content: string;
  agentId: string;
  sessionId?: string;
  memoryUsed?: boolean;
  model?: string;
  tokensUsed?: number;
}

@Injectable()
export class HqCoreService {
  private readonly logger = new Logger(HqCoreService.name);

  constructor(
    @InjectRepository(HqAgent)
    private agentRepo: Repository<HqAgent>,
    @InjectRepository(HqAlert)
    private alertRepo: Repository<HqAlert>,
    private memoryService: AgentMemoryService,
    private projectService: ProjectService,
    private configService: ConfigService,
    @Optional() private aiService: HqAIService,
  ) {
    this.initializeDefaultAgents();
  }

  // ========== Agent Management ==========

  async getAgents(): Promise<HqAgent[]> {
    return this.agentRepo.find({ where: { isActive: true }, order: { code: 'ASC' } });
  }

  async getAgent(agentId: string): Promise<HqAgent | null> {
    return this.agentRepo.findOne({ where: { id: agentId } });
  }

  async getAgentByCode(code: string): Promise<HqAgent | null> {
    return this.agentRepo.findOne({ where: { code } });
  }

  async updateAgentStatus(agentId: string, status: AgentStatus, task?: string): Promise<void> {
    await this.agentRepo.update(agentId, {
      status,
      currentTask: task,
      stats: () => `jsonb_set(COALESCE(stats, '{}'), '{lastActiveAt}', '"${new Date().toISOString()}"')`,
    });
  }

  // ========== Chat with Memory ==========

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const { agentId, projectId, messages, useMemory = true } = request;
    const normalizedAgentId = this.normalizeAgentId(agentId);

    // 支持通过 code 或 UUID 查找 Agent
    let agent = await this.agentRepo.findOne({ where: { id: normalizedAgentId } });
    if (!agent) {
      // 尝试通过 code 查找
      agent = await this.agentRepo.findOne({ where: { code: normalizedAgentId } });
    }
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    const context: MemoryContext = { agentId: agent.id, projectId };

    // 获取或创建会话
    let session = await this.memoryService.getActiveSession(context);
    if (!session) {
      session = await this.memoryService.startSession(context, `Chat session ${new Date().toISOString()}`);
    }
    context.sessionId = session.id;

    // 构建提示词
    let systemPrompt = agent.systemPrompt || this.getDefaultSystemPrompt(agent);
    
    if (useMemory) {
      const memoryContext = await this.memoryService.buildContextPrompt(context);
      if (memoryContext) {
        systemPrompt += `\n\n## Your Memory\n${memoryContext}`;
      }
    }

    // 存储用户消息到记忆
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    if (lastUserMessage) {
      await this.memoryService.storeConversation(context, 'user', lastUserMessage.content);
    }

    // 更新 Agent 状态为运行中
    await this.updateAgentStatus(agent.id, AgentStatus.RUNNING, 'Processing chat request...');

    // 调用 AI 模型 - 根据 Agent 代码选择对应的模型
    const response = await this.callAI(agent.code, systemPrompt, messages, request.provider);

    // 存储助手响应到记忆
    await this.memoryService.storeConversation(context, 'assistant', response.content);

    // 更新 Agent 状态
    await this.updateAgentStatus(agent.id, AgentStatus.IDLE);

    return {
      content: response.content,
      agentId: agent.code,
      sessionId: session.id,
      memoryUsed: useMemory,
      model: response.model,
      tokensUsed: response.tokensUsed,
    };
  }

  private normalizeAgentId(agentId: string): string {
    if (!agentId) return agentId;

    const raw = agentId.trim();
    const normalized = raw.toUpperCase();

    // 如果已经是标准 code，则直接返回
    if (normalized.includes('-')) {
      return normalized;
    }

    const aliasMap: Record<string, string> = {
      CEO: 'ARCHITECT-01',
      ARCHITECT: 'ARCHITECT-01',
      CODER: 'CODER-01',
      ANALYST: 'ANALYST-01',
      GROWTH: 'GROWTH-01',
      BD: 'BD-01',
    };

    return aliasMap[normalized] || raw;
  }

  private async callAI(
    agentCode: string,
    systemPrompt: string, 
    messages: ChatMessage[],
    provider?: 'openai' | 'claude' | 'deepseek' | 'auto',
  ): Promise<{ content: string; model?: string; tokensUsed?: number }> {
    // 使用真正的 AI 服务
    if (this.aiService) {
      const aiStatus = this.aiService.getStatus();
      this.logger.log(`🔍 AI Status check for ${agentCode}: Bedrock=${aiStatus.bedrockOpus}, Gemini=${aiStatus.gemini}, OpenAI=${aiStatus.openai}`);
      
      try {
        // 检查是否有任何 AI 服务可用
        if (aiStatus.bedrockOpus || aiStatus.bedrockSonnet || aiStatus.gemini || 
            aiStatus.openai || aiStatus.claude || aiStatus.deepseek) {
          
          this.logger.log(`📤 Calling AI for agent ${agentCode}...`);
          
          // 使用 Agent 专属的 AI 模型
          const result = await this.aiService.chatForAgent(
            agentCode,
            messages.map(m => ({ role: m.role, content: m.content })),
            { 
              systemPrompt, 
              temperature: 0.7,
              maxTokens: 4096,
            },
          );
          
          this.logger.log(`✅ Agent ${agentCode} response from ${result.model}, tokens: ${result.usage.totalTokens}`);
          
          return {
            content: result.content,
            model: result.model,
            tokensUsed: result.usage.totalTokens,
          };
        } else {
          this.logger.warn(`⚠️ No AI service available for ${agentCode}`);
        }
      } catch (error) {
        this.logger.error(`❌ AI call failed for ${agentCode}: ${error.message}`);
        this.logger.error(`Stack: ${error.stack}`);
        // 降级到模拟响应
      }
    } else {
      this.logger.warn(`⚠️ AI Service not injected`);
    }
    
    // 模拟响应（当没有 AI 配置时）
    const lastMessage = messages[messages.length - 1]?.content || '';
    const agentMapping = this.aiService?.getAgentAIConfig(agentCode);
    
    return {
      content: `[HQ Agent Response - AI Not Configured]\n\n` +
        `Agent: ${agentCode}\n` +
        `Expected Model: ${agentMapping?.description || 'Unknown'}\n\n` +
        `I've received your message: "${lastMessage.substring(0, 100)}..."\n\n` +
        `To enable real AI responses, please configure:\n` +
        `- AWS_BEARER_TOKEN_BEDROCK (for Architect/Coder)\n` +
        `- GEMINI_API_KEY (for Growth/BD)\n\n` +
        `System prompt length: ${systemPrompt.length} chars\n` +
        `Message history: ${messages.length} messages`,
      model: 'mock',
      tokensUsed: 0,
    };
  }

  private getDefaultSystemPrompt(agent: HqAgent): string {
    return `You are ${agent.name}, a ${agent.role} agent in Agentrix HQ.

Your responsibilities:
- Help the CEO manage and develop projects
- Remember past conversations and decisions
- Provide insights and recommendations
- Execute tasks when instructed

Current time: ${new Date().toISOString()}
`;
  }

  // ========== Alert Management ==========

  async createAlert(
    type: AlertType,
    severity: AlertSeverity,
    title: string,
    message: string,
    projectId?: string,
  ): Promise<HqAlert> {
    let projectName: string | undefined;
    if (projectId) {
      const project = await this.projectService.getProject(projectId);
      projectName = project?.name;
    }

    const alert = this.alertRepo.create({
      type,
      severity,
      title,
      message,
      projectId,
      projectName,
      status: AlertStatus.PENDING,
    });

    return this.alertRepo.save(alert);
  }

  async getAlerts(options: {
    projectId?: string;
    status?: AlertStatus;
    severity?: AlertSeverity;
    limit?: number;
  } = {}): Promise<HqAlert[]> {
    const { projectId, status, severity, limit = 50 } = options;

    const query = this.alertRepo.createQueryBuilder('alert')
      .orderBy('alert.createdAt', 'DESC')
      .take(limit);

    if (projectId) {
      query.andWhere('alert.projectId = :projectId', { projectId });
    }
    if (status) {
      query.andWhere('alert.status = :status', { status });
    }
    if (severity) {
      query.andWhere('alert.severity = :severity', { severity });
    }

    return query.getMany();
  }

  async acknowledgeAlert(alertId: string, userId: string): Promise<void> {
    await this.alertRepo.update(alertId, {
      status: AlertStatus.ACKNOWLEDGED,
      acknowledgedBy: userId,
      acknowledgedAt: new Date(),
    });
  }

  async resolveAlert(alertId: string, userId: string, notes?: string): Promise<void> {
    await this.alertRepo.update(alertId, {
      status: AlertStatus.RESOLVED,
      resolvedBy: userId,
      resolvedAt: new Date(),
      resolutionNotes: notes,
    });
  }

  // ========== Dashboard ==========

  async getDashboardStats() {
    const [agents, alerts, projectMetrics] = await Promise.all([
      this.getAgents(),
      this.getAlerts({ status: AlertStatus.PENDING, limit: 100 }),
      this.projectService.getAggregatedMetrics(),
    ]);

    const activeAgents = agents.filter(a => a.status === AgentStatus.RUNNING || a.status === AgentStatus.IDLE);
    const criticalAlerts = alerts.filter(a => a.severity === AlertSeverity.CRITICAL);

    return {
      // Agent stats
      totalAgents: agents.length,
      activeAgents: activeAgents.length,
      runningAgents: agents.filter(a => a.status === AgentStatus.RUNNING).length,

      // Alert stats
      pendingAlerts: alerts.length,
      criticalAlerts: criticalAlerts.length,

      // Project stats
      ...projectMetrics,

      // System health
      systemHealth: criticalAlerts.length > 0 ? 'degraded' : 'healthy',
    };
  }

  // ========== Initialization ==========

  private async initializeDefaultAgents(): Promise<void> {
    // 5 个核心 Agent，每个绑定特定的 AI 模型
    const defaultAgents = [
      {
        code: 'ANALYST-01',
        name: 'Business Analyst',
        type: 'analyst',
        role: AgentRole.ANALYST,
        description: '业务分析、需求梳理、数据洞察。使用 Claude Haiku 4.5 (AWS Bedrock) - 快速响应',
        systemPrompt: `你是 Agentrix 的 Business Analyst，代号 ANALYST-01。

你的核心职责：
1. 业务分析 - 分析业务需求，提取关键洞察
2. 需求梳理 - 将用户需求转化为技术需求
3. 数据洞察 - 分析数据趋势，提供决策支持
4. 竞品分析 - 跟踪竞争对手动态
5. 市场研究 - 研究市场趋势和用户行为

你使用 Claude Haiku 4.5 模型，响应快速，分析精准。
在回答时，请提供结构化的分析和可执行的建议。

当前时间: ${new Date().toISOString()}`,
      },
      {
        code: 'ARCHITECT-01',
        name: '首席架构师',
        type: 'architect',
        role: AgentRole.ARCHITECT,
        description: '系统架构设计、技术决策、代码审查。使用 Claude Opus 4.5 (AWS Bedrock) - 最强推理能力',
        systemPrompt: `你是 Agentrix 的首席架构师，代号 ARCHITECT-01。

你的核心职责：
1. 系统架构设计 - 设计可扩展、高可用的系统架构
2. 技术决策 - 评估技术选型，做出关键技术决策
3. 代码审查 - 审查关键代码，确保代码质量和架构一致性
4. 技术债务管理 - 识别和规划技术债务偿还
5. 团队技术指导 - 指导团队成员解决技术难题

你使用 Claude Opus 4.5 模型，具备最强的推理和分析能力。
在回答时，请深入分析问题，给出专业、全面的架构建议。

当前时间: ${new Date().toISOString()}`,
      },
      {
        code: 'CODER-01',
        name: '高级开发工程师',
        type: 'coder',
        role: AgentRole.CODER,
        description: '全栈开发、代码实现、Bug修复。使用 Claude Sonnet 4.5 (AWS Bedrock) - 最佳编码能力',
        systemPrompt: `你是 Agentrix 的高级开发工程师，代号 CODER-01。

你的核心职责：
1. 功能开发 - 实现新功能，编写高质量代码
2. Bug 修复 - 快速定位和修复 Bug
3. 代码优化 - 优化代码性能和可读性
4. 单元测试 - 编写全面的测试用例
5. 文档编写 - 编写清晰的技术文档

你使用 Claude Sonnet 4.5 模型，具备业界最强的编码能力。
你精通 TypeScript、React、NestJS、PostgreSQL 等技术栈。

请在回答时直接给出可执行的代码，并解释关键设计决策。

当前时间: ${new Date().toISOString()}`,
      },
      {
        code: 'GROWTH-01',
        name: '全球增长负责人',
        type: 'growth',
        role: AgentRole.GROWTH,
        description: '用户增长策略、营销推广、数据分析。使用 Gemini 2.5 Flash - 快速响应 + 多语言',
        systemPrompt: `你是 Agentrix 的全球增长负责人，代号 GROWTH-01。

你的核心职责：
1. 增长策略 - 制定全球用户增长策略
2. 市场分析 - 分析市场趋势和竞争格局
3. 用户获取 - 设计用户获取渠道和方案
4. 数据驱动 - 基于数据分析优化增长策略
5. 品牌建设 - 提升 Agentrix 品牌影响力

你使用 Gemini 2.5 Flash 模型，响应快速，支持多语言。
你熟悉全球市场，了解不同地区的用户特点。

请在回答时考虑全球化视角，给出可落地的增长建议。

当前时间: ${new Date().toISOString()}`,
      },
      {
        code: 'BD-01',
        name: '全球生态发展负责人',
        type: 'bd',
        role: AgentRole.BD,
        description: '生态合作、商务拓展、战略合作。使用 Gemini 2.5 Flash - 快速响应 + 多语言',
        systemPrompt: `你是 Agentrix 的全球生态发展负责人，代号 BD-01。

你的核心职责：
1. 生态建设 - 构建 Agentrix AI Agent 生态系统
2. 战略合作 - 发掘和推进战略合作伙伴关系
3. 开发者关系 - 吸引和支持开发者社区
4. 商务拓展 - 拓展商业合作机会
5. 行业洞察 - 跟踪 AI Agent 行业动态

你使用 Gemini 2.5 Flash 模型，响应快速，支持多语言。
你了解 AI Agent 生态、MCP 协议、各大 AI 平台的最新动态。

请在回答时从生态和商务角度给出专业建议。

当前时间: ${new Date().toISOString()}`,
      },
    ];

    for (const agentData of defaultAgents) {
      const existing = await this.agentRepo.findOne({ where: { code: agentData.code } });
      if (!existing) {
        await this.agentRepo.save(this.agentRepo.create({
          ...agentData,
          status: AgentStatus.IDLE,
          isActive: true,
        }));
        this.logger.log(`✅ Created agent: ${agentData.code} - ${agentData.name}`);
      } else {
        // 更新现有 Agent 的配置
        await this.agentRepo.update(existing.id, {
          name: agentData.name,
          type: agentData.type,
          description: agentData.description,
          systemPrompt: agentData.systemPrompt,
        });
        this.logger.log(`🔄 Updated agent: ${agentData.code} - ${agentData.name}`);
      }
    }
    
    this.logger.log('===========================================');
    this.logger.log('🤖 HQ Agent Team Initialized:');
    this.logger.log('  ANALYST-01: Claude Haiku 4.5 (Bedrock)');
    this.logger.log('  ARCHITECT-01: Claude Opus 4.5 (Bedrock)');
    this.logger.log('  CODER-01: Claude Sonnet 4.5 (Bedrock)');
    this.logger.log('  GROWTH-01: Claude Haiku 4.5 (Bedrock)');
    this.logger.log('  BD-01: Claude Haiku 4.5 (Bedrock)');
    this.logger.log('===========================================');
  }

  // ========== Knowledge Base ==========

  private knowledgeBaseContent: string = `# Agentrix Knowledge Base

## 项目概述
Agentrix 是一个统一的 AI Agent 生态平台，支持多模型集成、支付系统和开发者工具。

## 核心功能
- 多 AI 模型集成 (AWS Bedrock, OpenAI, Google Gemini, DeepSeek)
- MCP 协议支持 - 对接 ChatGPT, Claude Desktop, Google AI Studio
- 统一支付引擎 - Stripe, Crypto, X402 协议
- Skill Marketplace - Agent 技能市场

## 团队配置
- ARCHITECT-01: 首席架构师 (Claude Opus 4.5)
- CODER-01: 资深开发者 (Claude Sonnet 4.5)
- GROWTH-01: 全球增长负责人 (Claude Haiku 4.5)
- BD-01: 全球生态发展负责人 (Claude Haiku 4.5)

## 技术栈
- Frontend: Next.js 14, TypeScript, TailwindCSS
- Backend: NestJS 10, TypeORM, PostgreSQL
- AI: AWS Bedrock, OpenAI, Google AI, DeepSeek
`;

  private ragFiles: { name: string; path: string; type: string; size: number; content?: string }[] = [];

  async getKnowledgeBase() {
    return { content: this.knowledgeBaseContent };
  }

  async saveKnowledgeBase(content: string) {
    this.knowledgeBaseContent = content;
    return { success: true, content };
  }

  async getRagFiles() {
    return { files: this.ragFiles };
  }

  async uploadRagFile(name: string, content: string) {
    const file = {
      name,
      path: `/rag/${name}`,
      type: 'file',
      size: content.length,
      content,
    };
    
    // 检查是否已存在
    const existingIndex = this.ragFiles.findIndex(f => f.name === name);
    if (existingIndex >= 0) {
      this.ragFiles[existingIndex] = file;
    } else {
      this.ragFiles.push(file);
    }
    
    return { success: true, file: { name, path: file.path, size: file.size } };
  }

  async deleteRagFile(path: string) {
    this.ragFiles = this.ragFiles.filter(f => f.path !== path);
    return { success: true };
  }
}
