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
import { KnowledgeService } from '../knowledge/knowledge.service';
import { UnifiedChatService } from './unified-chat.service';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatRequest {
  agentId: string;
  projectId?: string;
  messages: ChatMessage[];
  useMemory?: boolean;
  toolPrompt?: string;
  provider?: 'openai' | 'claude' | 'deepseek' | 'gemini' | 'bedrock-opus' | 'bedrock-sonnet' | 'bedrock-haiku' | 'auto';
  model?: string;
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
    @Optional() private knowledgeService: KnowledgeService,
    private unifiedChatService: UnifiedChatService,
  ) {
    this.initializeDefaultAgents();
  }

  // ========== Agent Management ==========

  async getAgents(): Promise<HqAgent[]> {
    return this.agentRepo.find({ where: { isActive: true }, order: { code: 'ASC' } });
  }

  async getAgentModelDiagnostics(): Promise<{
    aiStatus: any;
    agents: Array<{
      id: string;
      code: string;
      name: string;
      role: string;
      configProvider?: string;
      configModel?: string;
      mappingProvider?: string;
      mappingModel?: string;
      resolvedProvider?: string;
      resolvedModel?: string;
      providerSource: 'config' | 'mapping' | 'default' | 'unknown';
      modelSource: 'config' | 'mapping' | 'unknown';
    }>;
  }> {
    const agents = await this.getAgents();
    const aiStatus = this.aiService?.getStatus() || { defaultProvider: 'unknown', agentMappings: [] };

    return {
      aiStatus,
      agents: agents.map(agent => {
        const mapping = this.aiService?.getAgentAIConfig(agent.code);
        const configProvider = agent.config?.modelProvider as string | undefined;
        const configModel = agent.config?.modelId as string | undefined;

        const resolvedProvider = configProvider || mapping?.provider || aiStatus.defaultProvider || 'unknown';
        const resolvedModel = configModel || mapping?.model || undefined;

        return {
          id: agent.id,
          code: agent.code,
          name: agent.name,
          role: agent.role,
          configProvider,
          configModel,
          mappingProvider: mapping?.provider,
          mappingModel: mapping?.model,
          resolvedProvider,
          resolvedModel,
          providerSource: configProvider ? 'config' : mapping?.provider ? 'mapping' : aiStatus.defaultProvider ? 'default' : 'unknown',
          modelSource: configModel ? 'config' : mapping?.model ? 'mapping' : 'unknown',
        };
      }),
    };
  }

  async getAgent(agentId: string): Promise<HqAgent | null> {
    // 支持通过 code 或 UUID 查找
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(agentId)) {
      const agent = await this.agentRepo.findOne({ where: { id: agentId } });
      if (agent) return agent;
    }
    // Fallback to code lookup
    return this.agentRepo.findOne({ where: { code: agentId } });
  }

  async updateAgentModel(
    agentId: string,
    payload: {
      provider?: 'openai' | 'claude' | 'deepseek' | 'gemini' | 'bedrock-opus' | 'bedrock-sonnet' | 'bedrock-haiku' | 'auto';
      model?: string;
      clear?: boolean;
    },
  ): Promise<HqAgent> {
    const agent = await this.getAgent(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    const nextConfig = { ...(agent.config || {}) } as any;

    if (payload.clear) {
      delete nextConfig.modelProvider;
      delete nextConfig.modelId;
    } else {
      if (payload.provider !== undefined) {
        nextConfig.modelProvider = payload.provider;
      }
      if (payload.model !== undefined) {
        nextConfig.modelId = payload.model;
      }
    }

    await this.agentRepo.update(agent.id, { config: nextConfig });
    const updated = await this.getAgent(agent.id);
    return updated || agent;
  }

  async getAgentByCode(code: string): Promise<HqAgent | null> {
    return this.agentRepo.findOne({ where: { code } });
  }

  async updateAgentStatus(agentId: string, status: AgentStatus, task?: string): Promise<void> {
    // 先获取 agent 的真实 UUID
    const agent = await this.getAgent(agentId);
    if (!agent) {
      this.logger.warn(`Agent ${agentId} not found for status update`);
      return;
    }
    await this.agentRepo.update(agent.id, {
      status,
      currentTask: task,
      stats: () => `jsonb_set(COALESCE(stats, '{}'), '{lastActiveAt}', '"${new Date().toISOString()}"')`,
    });
  }

  // ========== Chat with Memory ==========

  // UUID 格式验证
  private isUUID(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const { agentId, messages: rawMessages = [] } = request;
    const normalizedAgentId = this.normalizeAgentId(agentId);

    // 查找 Agent
    let agent: HqAgent | null = null;
    if (this.isUUID(normalizedAgentId)) {
      agent = await this.agentRepo.findOne({ where: { id: normalizedAgentId } });
    }
    if (!agent) {
      agent = await this.agentRepo.findOne({ where: { code: normalizedAgentId } });
    }
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    // 提取最后一条用户消息
    const lastMessage = rawMessages[rawMessages.length - 1];
    const userMessage = lastMessage?.content || '';

    // 调用 UnifiedChatService（带工具执行）
    const unifiedResponse = await this.unifiedChatService.chat({
      agentCode: agent.code,
      message: userMessage,
      mode: 'general',
      userId: 'system',
    });

    // 适配返回格式
    return {
      agentId: agent.id,
      content: unifiedResponse.response,
      sessionId: unifiedResponse.sessionId,
      memoryUsed: false,
      model: unifiedResponse.model,
      tokensUsed: unifiedResponse.usage?.totalTokens || 0,
    };
  }

  /**
   * 流式对话 - SSE 流式输出（支持工具执行事件）
   * 委托给 UnifiedChatService.chatStream，实时发送 tool_start/tool_end 事件
   */
  async *chatStream(request: ChatRequest): AsyncGenerator<{
    type: 'meta' | 'chunk' | 'done' | 'error' | 'tool_start' | 'tool_end';
    data: any;
  }> {
    const { agentId, messages: rawMessages = [] } = request;
    const normalizedAgentId = this.normalizeAgentId(agentId);

    if (!agentId) {
      yield { type: 'error', data: { message: 'agentId is required' } };
      return;
    }

    // 查找 Agent
    let agent: HqAgent | null = null;
    if (this.isUUID(normalizedAgentId)) {
      agent = await this.agentRepo.findOne({ where: { id: normalizedAgentId } });
    }
    if (!agent) {
      agent = await this.agentRepo.findOne({ where: { code: normalizedAgentId } });
    }
    if (!agent) {
      yield { type: 'error', data: { message: `Agent ${agentId} not found` } };
      return;
    }

    // 委托给 UnifiedChatService 的流式接口
    const lastMessage = rawMessages[rawMessages.length - 1];
    const userMessage = lastMessage?.content || '';

    try {
      for await (const event of this.unifiedChatService.chatStream({
        agentCode: agent.code,
        message: userMessage,
        mode: 'general',
        userId: 'system',
      })) {
        yield event;
      }
    } catch (error: any) {
      yield { type: 'error', data: { message: error.message } };
    }
  }

  /**
   * 纯 AI 文本补全 (透传调用)
   */
  async chatCompletion(messages: any[], options: any) {
    return this.aiService.chatCompletion(messages, options);
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
    provider?: 'openai' | 'claude' | 'deepseek' | 'gemini' | 'bedrock-opus' | 'bedrock-sonnet' | 'bedrock-haiku' | 'auto',
    model?: string,
    toolMode?: boolean,
  ): Promise<{ content: string; model?: string; tokensUsed?: number }> {
    // 使用真正的 AI 服务
    if (this.aiService) {
      const aiStatus = this.aiService.getStatus();
      this.logger.log(`🔍 AI Status check for ${agentCode}: Bedrock=${aiStatus.bedrockOpus}, Gemini=${aiStatus.gemini}, OpenAI=${aiStatus.openai}`);
      
      const temperature = toolMode ? 0 : 0.7;
      const maxTokens = Math.max(256, Number(this.configService.get<string>('HQ_MAX_TOKENS', '4096')) || 4096);
      const enablePaidFallbacks = String(this.configService.get<string>('HQ_ENABLE_PAID_FALLBACKS', 'false') || 'false').toLowerCase() === 'true';

      try {
        // 检查是否有任何 AI 服务可用
        if (aiStatus.bedrockOpus || aiStatus.bedrockSonnet || aiStatus.gemini || 
            aiStatus.openai || aiStatus.claude || aiStatus.deepseek) {
          
          this.logger.log(`📤 Calling AI for agent ${agentCode}...`);
          
          const overrideModel = model?.trim();

          if (provider || overrideModel) {
            this.logger.log(`🧭 Model override for ${agentCode}: ${provider || 'auto'} / ${overrideModel || 'default'}`);
            const result = await this.aiService.chatCompletion(
              messages.map(m => ({ role: m.role, content: m.content })),
              {
                systemPrompt,
                temperature,
                maxTokens,
                provider,
                model: overrideModel,
              },
            );
            this.logger.log(`✅ Agent ${agentCode} response from ${result.model}, tokens: ${result.usage.totalTokens}`);
            return {
              content: result.content,
              model: result.model,
              tokensUsed: result.usage.totalTokens,
            };
          }

          // 使用 Agent 专属的 AI 模型
          const result = await this.aiService.chatForAgent(
            agentCode,
            messages.map(m => ({ role: m.role, content: m.content })),
            { 
              systemPrompt, 
              temperature,
              maxTokens,
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
        const errorMessage = String(error?.message || '');
        this.logger.error(`❌ AI call failed for ${agentCode}: ${errorMessage}`);
        this.logger.error(`Stack: ${error.stack}`);

        const isGeminiQuota = /RESOURCE_EXHAUSTED|quota|429|Too Many Requests/i.test(errorMessage);
        if (isGeminiQuota && enablePaidFallbacks && (this.aiService?.getStatus?.().bedrockOpus || this.aiService?.getStatus?.().bedrockSonnet)) {
          this.logger.warn(`🔁 Gemini quota hit. Falling back to Bedrock Haiku for ${agentCode}.`);
          try {
            const fallback = await this.aiService.chatCompletion(
              messages.map(m => ({ role: m.role, content: m.content })),
              {
                systemPrompt,
                temperature,
                maxTokens,
                provider: 'bedrock-haiku',
                model: 'us.anthropic.claude-haiku-4-5-20251001-v1:0',
              },
            );
            return {
              content: fallback.content,
              model: fallback.model,
              tokensUsed: fallback.usage.totalTokens,
            };
          } catch (fallbackError) {
            this.logger.error(`❌ Bedrock Haiku fallback failed for ${agentCode}: ${fallbackError?.message || fallbackError}`);
          }
        }

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
    const defaultAgents = [
      {
        code: 'COMMANDER-01',
        name: '首席指挥官',
        type: 'commander',
        role: AgentRole.COMMANDER,
        description: '首席执行官 (CEO) - 战略审计、任务分发。使用 Gemini 1.5 Pro',
        systemPrompt: `你是 Agentrix 的首席指挥官，代号 COMMANDER-01。
核心职责：战略规划、任务分发、绩效审计、指挥协同。一切以营收增长数据（twitter粉丝, 商户数量, 营收）为导向。`,
      },
      {
        code: 'REVENUE-01',
        name: '营收与转化官',
        type: 'revenue',
        role: AgentRole.REVENUE,
        description: 'GMV监控、商户转化。使用 Gemini 1.5 Flash',
        systemPrompt: `你是 Agentrix 的营收与转化官，代号 REVENUE-01。
核心职责：驱动平台交易量、活跃商户数和付费转化。`,
      },
      {
        code: 'ANALYST-01',
        name: 'Business Analyst',
        type: 'analyst',
        role: AgentRole.ANALYST,
        description: '业务分析、需求梳理、数据洞察。使用 Gemini 1.5 Pro - 深度分析',
        systemPrompt: `你是 Agentrix 的 Business Analyst，代号 ANALYST-01。

你的核心职责：
1. 业务分析 - 分析业务需求，提取关键洞察
2. 需求梳理 - 将用户需求转化为技术需求
3. 数据洞察 - 分析数据趋势，提供决策支持。重点关注 GMV、付费转化率及用户增长数据。
4. 竞品分析 - 跟踪竞争对手动态
5. 市场研究 - 研究市场趋势和用户行为

你使用 Gemini 1.5 Pro 模型，响应较快，分析精准。
在回答时，请提供结构化的分析 and 可执行的建议。

当前时间: ${new Date().toISOString()}`,
      },
      {
        code: 'ARCHITECT-01',
        name: '首席架构师',
        type: 'architect',
        role: AgentRole.ARCHITECT,
        description: '系统架构设计、技术决策、代码审查。使用 Claude Opus 4.6 (AWS Bedrock) - 最强推理能力',
        systemPrompt: `你是 Agentrix 的首席架构师，代号 ARCHITECT-01。

      你的核心职责：
      一、首席架构师（原有职能）
      1. 系统架构设计 - 设计可扩展、高可用的系统架构
      2. 技术决策 - 评估技术选型，做出关键技术决策
      3. 代码审查 - 审查关键代码，确保代码质量和架构一致性
      4. 技术债务管理 - 识别和规划技术债务偿还
      5. 团队技术指导 - 指导团队成员解决技术难题

      二、Agent CEO（新增）
      - 目标导向，快速获得稳定增长收益
      - 管理后续可能增加的其他项目
      - 提高整个 Agent 团队的工作效率和创收

      三、CFO 开源节流（新增）
      开源（增收）：
      1. 项目营收 - 通过技能、Marketplace 等让 Agentrix 尽快产生营收
      2. 融资机会 - 股权/币权融资、公链 Grant、基金会 Grant、云创计划
      3. 主动创收 - 安排 Agent 接任务，寻找收益机会

      节流（控费）：
      - AWS 抵扣券：$2,500（启动资金）
      - 服务器：~$20/月（控制成本）
      - API 限额：$25/天（整个团队共享）
      原则：争取免费资源，把钱用在最能产生收益的地方

      四、HQ 项目灵魂（新增）
      - 不断自我迭代增强能力
      - 未来有营收可部署本地大模型
      - 加入更强设备
      - 不断增加可使用的工具
      - 重要：以上需要和老板同步确认

      工作原则：
      1. 开源节流 - 增收为先，控费为本
      2. 快速营收 - 一切以产生收益为导向
      3. 自我进化 - 持续增强 HQ 能力
      4. 团队协作 - 提升整体效能
      5. 同步确认 - 重大决策需老板确认

      你使用 Claude Opus 4.6 模型，具备最强的推理和分析能力。
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
      // ========== 新增团队成员 (使用 Gemini 2.5 Flash) ==========
      {
        code: 'SOCIAL-01',
        name: '社交媒体运营官',
        type: 'social',
        role: AgentRole.GROWTH,
        description: '社交媒体管理、内容发布、社区互动。使用 Gemini 2.5 Flash - 多语言 + 创意',
        systemPrompt: `你是 Agentrix 的社交媒体运营官，代号 SOCIAL-01。

你的核心职责：
1. 社交媒体管理 - 管理 Twitter/X、Telegram、Discord 等平台
2. 内容创作 - 创作吸引人的社交媒体内容
3. 社区互动 - 与用户和 KOL 互动，建立关系
4. 舆情监控 - 监控品牌提及和行业动态
5. 获客策略 - 通过社交媒体获取新用户

你使用 Gemini 2.5 Flash 模型，创意丰富，多语言流畅。
你了解各平台的最佳实践和算法特点。

当前时间: ${new Date().toISOString()}`,
      },
      {
        code: 'CONTENT-01',
        name: '内容创作官',
        type: 'content',
        role: AgentRole.GROWTH,
        description: '内容策划、文案撰写、营销物料。使用 Gemini 2.5 Flash - 创意 + 多语言',
        systemPrompt: `你是 Agentrix 的内容创作官，代号 CONTENT-01。

你的核心职责：
1. 内容策划 - 策划博客、文档、营销内容
2. 文案撰写 - 撰写产品文案、推广文案
3. 技术写作 - 编写技术文档和教程
4. 品牌故事 - 塑造和传播品牌故事
5. 多语言内容 - 创作中英文双语内容

你使用 Gemini 2.5 Flash 模型，创意丰富。
你擅长将复杂技术概念转化为通俗易懂的内容。

当前时间: ${new Date().toISOString()}`,
      },
      {
        code: 'SUPPORT-01',
        name: '客户成功经理',
        type: 'support',
        role: AgentRole.SUPPORT,
        description: '客户支持、问题解答、用户反馈。使用 Gemini 2.5 Flash - 快速响应',
        systemPrompt: `你是 Agentrix 的客户成功经理，代号 SUPPORT-01。

你的核心职责：
1. 客户支持 - 快速响应客户问题和需求
2. 问题诊断 - 诊断技术问题，提供解决方案
3. 用户引导 - 引导新用户熟悉平台功能
4. 反馈收集 - 收集和整理用户反馈
5. 知识库维护 - 维护常见问题解答

你使用 Gemini 2.5 Flash 模型，响应快速。
你熟悉 Agentrix 所有功能和常见问题。

当前时间: ${new Date().toISOString()}`,
      },
      {
        code: 'SECURITY-01',
        name: '安全审计官',
        type: 'security',
        role: AgentRole.RISK,
        description: '安全审计、风险评估、合规检查。使用 Gemini 2.5 Flash',
        systemPrompt: `你是 Agentrix 的安全审计官，代号 SECURITY-01。

你的核心职责：
1. 安全审计 - 审计代码和系统安全性
2. 风险评估 - 评估潜在安全风险
3. 合规检查 - 确保符合安全合规要求
4. 漏洞分析 - 分析和报告安全漏洞
5. 安全建议 - 提供安全加固建议

你使用 Gemini 2.5 Flash 模型。
你熟悉 OWASP、CWE 等安全标准和最佳实践。

当前时间: ${new Date().toISOString()}`,
      },
      {
        code: 'DEVREL-01',
        name: '开发者关系',
        type: 'devrel',
        role: AgentRole.BD,
        description: '开发者支持、SDK 文档、社区建设。使用 Gemini 1.5 Flash',
        systemPrompt: `你是 Agentrix 的开发者关系专员，代号 DEVREL-01。

你的核心职责：
1. 开发者支持 - 帮助开发者集成 Agentrix
2. SDK 文档 - 维护 SDK 文档和示例代码
3. 社区建设 - 建设开发者社区
4. 技术布道 - 推广 Agentrix 技术方案
5. 反馈桥梁 - 传递开发者反馈给产品团队

你使用 Gemini 1.5 Flash 模型。
你熟悉各种编程语言和 AI Agent 开发流程。

当前时间: ${new Date().toISOString()}`,
      },
      {
        code: 'LEGAL-01',
        name: '合规顾问',
        type: 'legal',
        role: AgentRole.RISK,
        description: '法律合规、隐私保护、条款审查。使用 Claude Haiku 4.5',
        systemPrompt: `你是 Agentrix 的合规顾问，代号 LEGAL-01。

你的核心职责：
1. 法律合规 - 确保业务符合各地法律法规
2. 隐私保护 - GDPR、CCPA 等隐私合规
3. 条款审查 - 审查用户协议和合作条款
4. 风险提示 - 识别潜在法律风险
5. 政策建议 - 提供合规政策建议

你使用 Claude Haiku 4.5 模型。
你了解全球主要市场的法律法规要求。

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
    this.logger.log('🤖 HQ Agent Team Initialized (11 members):');
    this.logger.log('  � Leadership:');
    this.logger.log('    COMMANDER-01: Gemini 1.5 Pro (Strategic Lead)');
    this.logger.log('    REVENUE-01:   Gemini 1.5 Flash (GMV Hunter)');
    this.logger.log('  📊 Core Ops (Bedrock/Gemini Mixed):');
    this.logger.log('    ANALYST-01:   Gemini 1.5 Pro (Data Analysis)');
    this.logger.log('    ARCHITECT-01: Claude Opus 4.6 (Tech Strategy)');
    this.logger.log('    CODER-01:     Claude Sonnet 4.5 (Core Dev)');
    this.logger.log('    GROWTH-01:    Gemini 2.5 Flash (Acquisition)');
    this.logger.log('    BD-01:        Gemini 2.5 Flash (Ecosystem)');
    this.logger.log('  🌟 Growth & Support (Gemini Trio-Rotation):');
    this.logger.log('    SOCIAL-01:    Gemini 2.5 Flash (X/Twitter)');
    this.logger.log('    CONTENT-01:   Gemini 2.5 Flash (Docs/Blog)');
    this.logger.log('    SUPPORT-01:   Gemini 2.5 Flash (Customer Success)');
    this.logger.log('    DEVREL-01:    Gemini 1.5 Flash (Developer Relation)');
    this.logger.log('    SECURITY-01:  Gemini 2.5 Flash (Compliance)');
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
- ARCHITECT-01: 首席架构师 (Claude Opus 4.6)
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
    if (this.knowledgeService) {
      const docs = await this.knowledgeService.findAll();
      const docFiles = docs.map(doc => ({
        name: doc.title || doc.filePath,
        path: doc.filePath,
        type: 'file',
        size: doc.content?.length ?? 0,
      }));

      const merged = new Map<string, { name: string; path: string; type: string; size: number }>();
      for (const file of docFiles) merged.set(file.path, file);
      for (const file of this.ragFiles) merged.set(file.path, file);

      return { files: Array.from(merged.values()) };
    }

    return { files: this.ragFiles };
  }

  async uploadRagFile(name: string, content: string) {
    if (!name) {
      throw new Error('RAG filename is required');
    }
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

    if (this.knowledgeService) {
      await this.knowledgeService.importRawDocument({
        name,
        content,
        filePath: file.path,
      });
    }
    
    return { success: true, file: { name, path: file.path, size: file.size } };
  }

  async deleteRagFile(path: string) {
    this.ragFiles = this.ragFiles.filter(f => f.path !== path);
    if (this.knowledgeService) {
      await this.knowledgeService.removeByFilePath(path);
    }
    return { success: true };
  }
}
