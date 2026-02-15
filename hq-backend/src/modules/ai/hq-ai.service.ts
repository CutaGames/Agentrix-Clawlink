/**
 * HQ AI Service
 * 
 * 统一的 AI 模型集成服务
 * 支持:
 * - AWS Bedrock (Claude Opus 4.6, Claude Sonnet 4.5)
 * - Google Gemini (Gemini 2.5 Flash)
 * - OpenAI, DeepSeek (备用)
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  retryCount?: number;
  tools?: any[];  // 工具定义数组（Claude/OpenAI/Gemini 格式）
}

export interface ChatCompletionResult {
  content: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: string;
  toolCalls?: Array<{  // AI 请求调用的工具
    id: string;
    name: string;
    arguments: any;
  }>;
}

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  usage: {
    totalTokens: number;
  };
}

// Agent 专用 Provider - 每个 Agent 绑定特定模型
export type AIProvider = 'openai' | 'claude' | 'gemini' | 'deepseek' | 'groq' | 'bedrock-opus' | 'bedrock-sonnet' | 'bedrock-haiku' | 'auto';

// Agent 类型与 AI 模型映射
export interface AgentAIMapping {
  agentCode: string;
  provider: AIProvider;
  model: string;
  description: string;
}

@Injectable()
export class HqAIService {
  private readonly logger = new Logger(HqAIService.name);
  
  private openai: OpenAI | null = null;
  private anthropic: Anthropic | null = null;
  private deepseek: OpenAI | null = null;
  private groq: OpenAI | null = null;
  private gemini: GoogleGenerativeAI | null = null;
  private geminiClients: GoogleGenerativeAI[] = []; // 支持多个Gemini API key
  private currentGeminiIndex = 0;

  // RPM rate limiter: track last call time per key to respect 15 RPM limit
  private geminiLastCallTime: Map<number, number> = new Map();
  private readonly GEMINI_MIN_INTERVAL_MS = 4200; // 60s / 15rpm ≈ 4s per key

  // AWS Bedrock 配置
  private bedrockToken: string | null = null;
  private bedrockRegion: string = 'us-east-1';
  private proxyAgent: HttpsProxyAgent<string> | null = null;
  private relayUrl: string | null = null;
  
  private readonly defaultProvider: AIProvider;
  private readonly embeddingModel: string;

  private inferProviderFromModel(model?: string): AIProvider | null {
    if (!model) return null;
    const normalized = model.toLowerCase();

    if (normalized.includes('gemini')) return 'gemini';
    if (normalized.includes('deepseek')) return 'deepseek';
    if (normalized.includes('llama') || normalized.includes('groq') || normalized.includes('mixtral')) return 'groq';
    if (normalized.includes('gpt') || normalized.includes('openai')) return 'openai';
    if (normalized.includes('claude') || normalized.includes('anthropic') || normalized.includes('bedrock')) {
      if (normalized.includes('opus')) return 'bedrock-opus';
      if (normalized.includes('sonnet')) return 'bedrock-sonnet';
      if (normalized.includes('haiku')) return 'bedrock-haiku';
      return 'bedrock-sonnet';
    }

    return null;
  }

  // Agent 到 AI 模型的映射表
  //
  // 🆕 纯 Gemini 策略 — 3个API key × 4种可用模型，最大化免费配额
  // ⚠️ 1.5系列已废弃(404)，仅使用2.0+模型
  //
  // 每个模型有独立的 RPD/RPM 配额 (per key):
  //   gemini-2.0-flash:      1500 RPD, 15 RPM  → 主力模型（配额最大）
  //   gemini-2.0-flash-lite: 1000 RPD, 15 RPM  → 轻量任务
  //   gemini-2.5-flash:       250 RPD, 10 RPM  → 新一代，更智能
  //   gemini-2.5-pro:         100 RPD,  5 RPM  → 复杂决策
  //
  // 3 keys × (1500+1000+250+100) = 8,550 次/天 总配额
  //
  // 分配策略: 主力用2.0-flash(配额最大)，分散到其他模型减压
  //
  private readonly agentAIMapping: Map<string, AgentAIMapping> = new Map([
    // === gemini-2.5-pro (100×3=300次/天) — 仅用于最高级决策 ===
    ['COMMANDER-01', { agentCode: 'COMMANDER-01', provider: 'gemini', model: 'gemini-2.5-pro', description: '首席指挥官 (CEO) - Gemini 2.5 Pro' }],

    // === gemini-2.0-flash (1500×3=4500次/天) — 核心业务Agent (5个) ===
    ['ANALYST-01', { agentCode: 'ANALYST-01', provider: 'gemini', model: 'gemini-2.0-flash', description: '业务分析师 - Gemini 2.0 Flash' }],
    ['REVENUE-01', { agentCode: 'REVENUE-01', provider: 'gemini', model: 'gemini-2.0-flash', description: '营收与转化官 - Gemini 2.0 Flash' }],
    ['GROWTH-01', { agentCode: 'GROWTH-01', provider: 'gemini', model: 'gemini-2.0-flash', description: '全球增长负责人 - Gemini 2.0 Flash' }],
    ['BD-01', { agentCode: 'BD-01', provider: 'gemini', model: 'gemini-2.0-flash', description: '全球生态发展 - Gemini 2.0 Flash' }],
    ['SOCIAL-01', { agentCode: 'SOCIAL-01', provider: 'gemini', model: 'gemini-2.0-flash', description: '社交媒体运营官 - Gemini 2.0 Flash' }],

    // === gemini-2.5-flash (250×3=750次/天) — 内容创作Agent (3个) ===
    ['CONTENT-01', { agentCode: 'CONTENT-01', provider: 'gemini', model: 'gemini-2.5-flash', description: '内容创作官 - Gemini 2.5 Flash' }],
    ['DEVREL-01', { agentCode: 'DEVREL-01', provider: 'gemini', model: 'gemini-2.5-flash', description: '开发者关系 - Gemini 2.5 Flash' }],
    ['SUPPORT-01', { agentCode: 'SUPPORT-01', provider: 'gemini', model: 'gemini-2.5-flash', description: '客户成功经理 - Gemini 2.5 Flash' }],

    // === gemini-2.0-flash-lite (1000×3=3000次/天) — 合规与安全Agent (4个) ===
    ['SECURITY-01', { agentCode: 'SECURITY-01', provider: 'gemini', model: 'gemini-2.0-flash-lite', description: '安全审计官 - Gemini 2.0 Flash-Lite' }],
    ['LEGAL-01', { agentCode: 'LEGAL-01', provider: 'gemini', model: 'gemini-2.0-flash-lite', description: '合规顾问 - Gemini 2.0 Flash-Lite' }],
    ['ARCHITECT-01', { agentCode: 'ARCHITECT-01', provider: 'gemini', model: 'gemini-2.0-flash-lite', description: '首席架构师 - Gemini 2.0 Flash-Lite' }],
    ['CODER-01', { agentCode: 'CODER-01', provider: 'gemini', model: 'gemini-2.0-flash-lite', description: '高级开发工程师 - Gemini 2.0 Flash-Lite' }],
  ]);

  constructor(private configService: ConfigService) {
    // 初始化代理配置
    const proxyUrl = this.configService.get<string>('HTTPS_PROXY') || this.configService.get<string>('HTTP_PROXY');
    if (proxyUrl) {
      this.proxyAgent = new HttpsProxyAgent(proxyUrl);
      this.logger.log(`Proxy configured: ${proxyUrl}`);
    }

    // 初始化中转配置
    this.relayUrl = this.configService.get<string>('HQ_AI_RELAY_URL');
    if (this.relayUrl) {
      this.logger.log(`AI Relay configured: ${this.relayUrl}`);
    }

    // 初始化 AWS Bedrock
    this.bedrockToken = this.configService.get<string>('AWS_BEARER_TOKEN_BEDROCK');
    // 优先使用 BEDROCK_REGION，然后 AWS_REGION，默认 ap-northeast-1（支持 Claude 4）
    this.bedrockRegion = this.configService.get<string>('BEDROCK_REGION') || 
                         this.configService.get<string>('AWS_REGION') || 'ap-northeast-1';
    if (this.bedrockToken) {
      this.logger.log(`AWS Bedrock initialized (Region: ${this.bedrockRegion}, Token: ${this.bedrockToken.substring(0, 20)}...)`);
    } else {
      this.logger.warn('AWS Bedrock NOT configured - missing AWS_BEARER_TOKEN_BEDROCK');
    }

    // 初始化 Gemini (支持多个API key)
    const geminiKey = this.configService.get<string>('GEMINI_API_KEY');
    const geminiKey1 = this.configService.get<string>('GEMINI_API_KEY1');
    const geminiKey2 = this.configService.get<string>('GEMINI_API_KEY2');

    const keys: string[] = [];
    if (geminiKey) keys.push(...geminiKey.split(',').map(k => k.trim()).filter(k => k.length > 0));
    if (geminiKey1) keys.push(geminiKey1.trim());
    if (geminiKey2) keys.push(geminiKey2.trim());

    if (keys.length > 0) {
      keys.forEach((key) => {
        this.geminiClients.push(new GoogleGenerativeAI(key));
      });
      this.gemini = this.geminiClients[0];
      this.logger.log(`Google Gemini initialized with ${keys.length} API key(s) (including numbered keys)`);
    } else {
      this.logger.warn('Google Gemini NOT configured - missing GEMINI_API_KEY');
    }

    // 初始化 OpenAI (备用)
    const openaiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (openaiKey) {
      const baseURL = this.configService.get<string>('OPENAI_BASE_URL');
      this.openai = new OpenAI({ 
        apiKey: openaiKey,
        baseURL: baseURL || undefined,
      });
      this.logger.log('OpenAI initialized (fallback)');
    }

    // 初始化 Claude 直连 (备用)
    const claudeKey = this.configService.get<string>('ANTHROPIC_API_KEY') || 
                      this.configService.get<string>('CLAUDE_API_KEY');
    if (claudeKey) {
      this.anthropic = new Anthropic({ apiKey: claudeKey });
      this.logger.log('Claude (Anthropic) initialized (fallback)');
    }

    // 初始化 DeepSeek (备用)
    const deepseekKey = this.configService.get<string>('DEEPSEEK_API_KEY');
    if (deepseekKey) {
      this.deepseek = new OpenAI({
        apiKey: deepseekKey,
        baseURL: 'https://api.deepseek.com/v1',
      });
      this.logger.log('DeepSeek initialized (fallback)');
    }

    // Groq (FREE tier: 14,400 req/day)
    const groqKey = this.configService.get<string>('GROQ_API_KEY');
    if (groqKey) {
      this.groq = new OpenAI({
        apiKey: groqKey,
        baseURL: 'https://api.groq.com/openai/v1',
      });
      this.logger.log('Groq initialized (FREE: 14,400 req/day)');
    }

    // 默认 provider
    this.defaultProvider = this.configService.get<AIProvider>('HQ_DEFAULT_AI_PROVIDER', 'auto');
    this.embeddingModel = this.configService.get<string>('HQ_EMBEDDING_MODEL', 'text-embedding-3-small');
    
    this.logger.log(`HQ AI Service initialized. Default provider: ${this.defaultProvider}`);
    this.logger.log(`Agent AI Mappings: ${Array.from(this.agentAIMapping.keys()).join(', ')}`);
  }

  /**
   * 获取 Agent 专属的 AI 配置
   */
  getAgentAIConfig(agentCode: string): AgentAIMapping | null {
    return this.agentAIMapping.get(agentCode) || null;
  }

  /**
   * 根据 Agent 代码调用对应的 AI 模型
   */
  async chatForAgent(
    agentCode: string,
    messages: ChatMessage[],
    options: ChatCompletionOptions = {},
  ): Promise<ChatCompletionResult> {
    const mapping = this.agentAIMapping.get(agentCode);
    
    if (!mapping) {
      this.logger.warn(`No AI mapping for agent ${agentCode}, using auto provider`);
      return this.chatCompletion(messages, { ...options, provider: 'auto' });
    }

    this.logger.log(`Agent ${agentCode} using ${mapping.provider} (${mapping.model})`);
    
    return this.chatCompletion(messages, {
      ...options,
      provider: mapping.provider,
      model: mapping.model,
    });
  }

  /**
   * 自动选择可用的 AI 提供商
   */
  private selectProvider(preferred?: AIProvider): AIProvider {
    if (preferred && preferred !== 'auto') {
      return preferred;
    }

    // 按优先级自动选择: Bedrock > Gemini > Claude > OpenAI > DeepSeek
    if (this.bedrockToken) return 'bedrock-sonnet';
    if (this.gemini) return 'gemini';
    if (this.anthropic) return 'claude';
    if (this.openai) return 'openai';
    if (this.groq) return 'groq';
    if (this.deepseek) return 'deepseek';
    
    throw new Error('No AI provider available. Please configure AWS_BEARER_TOKEN_BEDROCK, GEMINI_API_KEY, or other API keys');
  }

  /**
   * 聊天补全
   */
  async chatCompletion(
    messages: ChatMessage[],
    options: ChatCompletionOptions & { provider?: AIProvider } = {},
  ): Promise<ChatCompletionResult> {
    const inferredProvider = this.inferProviderFromModel(options.model);
    const requestedProvider = inferredProvider || options.provider;
    const wantsBedrock =
      requestedProvider?.startsWith('bedrock') ||
      (options.model && /anthropic|claude|bedrock/i.test(options.model));
    const wantsDirect = !!requestedProvider && requestedProvider !== 'auto';

    // 如果配置了中转，默认走中转，但对明确指定的 Provider 优先直连
    if (this.relayUrl && !wantsDirect && !wantsBedrock) {
      return this.relayChatCompletion(messages, options);
    }

    try {
      const provider = this.selectProvider(requestedProvider);
      switch (provider) {
        case 'bedrock-opus':
          return this.bedrockChat(messages, { ...options, model: options.model || 'arn:aws:bedrock:us-east-1:696737009512:inference-profile/us.anthropic.claude-opus-4-6-v1' });
        case 'bedrock-sonnet':
          return this.bedrockChat(messages, { ...options, model: options.model || 'us.anthropic.claude-sonnet-4-5-20250929-v1:0' });
        case 'bedrock-haiku':
          return this.bedrockChat(messages, { ...options, model: options.model || 'us.anthropic.claude-haiku-4-5-20251001-v1:0' });
        case 'gemini':
          return this.geminiChat(messages, options);
        case 'openai':
          return this.openaiChat(messages, options);
        case 'claude':
          return this.claudeChat(messages, options);
        case 'groq':
          return this.groqChat(messages, options);
        case 'deepseek':
          return this.deepseekChat(messages, options);
        default:
          throw new Error(`Unknown provider: ${provider}`);
      }
    } catch (error) {
      if (this.relayUrl) {
        this.logger.warn(`Direct provider failed, falling back to relay: ${(error as Error).message}`);
        return this.relayChatCompletion(messages, options);
      }
      throw error;
    }
  }

  /**
   * 中转补全
   */
  private async relayChatCompletion(
    messages: ChatMessage[],
    options: ChatCompletionOptions & { provider?: AIProvider } = {},
  ): Promise<ChatCompletionResult> {
    this.logger.log(`Relaying chat completion to: ${this.relayUrl}`);
    try {
      const response = await axios.post(this.relayUrl!, {
        messages,
        options,
      }, {
        timeout: 600000,
        proxy: false,
      });
      return response.data;
    } catch (error: any) {
      this.logger.error(`AI Relay error: ${error.message}`);
      throw error;
    }
  }

  /**
   * AWS Bedrock 聊天 (Claude Opus/Sonnet 4.5)
   * 使用 cross-region inference profile ID
   */
  private async bedrockChat(
    messages: ChatMessage[],
    options: ChatCompletionOptions,
  ): Promise<ChatCompletionResult> {
    if (!this.bedrockToken) {
      throw new Error('AWS Bedrock not configured. Set AWS_BEARER_TOKEN_BEDROCK');
    }

    // 使用 cross-region inference profile ID (格式: us.anthropic.claude-xxx)
    const modelId = options.model || 'us.anthropic.claude-sonnet-4-20250514-v1:0';
    
    // 准备消息
    const claudeMessages = messages.filter(m => m.role !== 'system').map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    }));

    const systemMessage = messages.find(m => m.role === 'system');
    
    const body: any = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: options.maxTokens ?? 16384,
      messages: claudeMessages,
    };

    if (options.systemPrompt) {
      body.system = options.systemPrompt;
    } else if (systemMessage) {
      body.system = systemMessage.content;
    }

    if (options.temperature !== undefined) {
      body.temperature = options.temperature;
    }

    // 工具支持
    if (options.tools && options.tools.length > 0) {
      body.tools = options.tools;
      this.logger.log(`Bedrock: Sending ${options.tools.length} tools`);
    }

    // 对于 cross-region inference profile，URL 需要 encode model ID
    const encodedModelId = encodeURIComponent(modelId);
    const url = `https://bedrock-runtime.${this.bedrockRegion}.amazonaws.com/model/${encodedModelId}/invoke`;

    this.logger.log(`Bedrock request: ${modelId} (Region: ${this.bedrockRegion})`);
    this.logger.debug(`Bedrock URL: ${url}`);

    try {
      const response = await axios.post(url, body, {
        headers: {
          'Authorization': `Bearer ${this.bedrockToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        httpsAgent: this.proxyAgent || undefined,
        proxy: false,
        timeout: 600000, // 10 分钟超时
      });

      // 检查是否需要调用工具
      if (response.data.stop_reason === 'tool_use') {
        const toolUseBlocks = response.data.content.filter((block: any) => block.type === 'tool_use');
        this.logger.log(`Bedrock returned ${toolUseBlocks.length} tool calls`);

        return {
          content: '',
          model: modelId,
          usage: {
            promptTokens: response.data.usage?.input_tokens || 0,
            completionTokens: response.data.usage?.output_tokens || 0,
            totalTokens: (response.data.usage?.input_tokens || 0) + (response.data.usage?.output_tokens || 0),
          },
          finishReason: 'tool_use',
          toolCalls: toolUseBlocks.map((block: any) => ({
            id: block.id,
            name: block.name,
            arguments: block.input,
          })),
        };
      }

      const content = response.data.content[0];

      return {
        content: content.text || '',
        model: modelId,
        usage: {
          promptTokens: response.data.usage?.input_tokens || 0,
          completionTokens: response.data.usage?.output_tokens || 0,
          totalTokens: (response.data.usage?.input_tokens || 0) + (response.data.usage?.output_tokens || 0),
        },
        finishReason: response.data.stop_reason || 'end_turn',
      };
    } catch (error: any) {
      this.logger.error(`Bedrock error: ${error.message}`);
      if (error.response) {
        this.logger.error(`Response: ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  /**
   * Wait for RPM rate limit before calling Gemini API
   */
  private async waitForGeminiRateLimit(keyIndex: number): Promise<void> {
    const lastCall = this.geminiLastCallTime.get(keyIndex) || 0;
    const elapsed = Date.now() - lastCall;
    if (elapsed < this.GEMINI_MIN_INTERVAL_MS) {
      const waitMs = this.GEMINI_MIN_INTERVAL_MS - elapsed;
      this.logger.debug(`⏱️ Rate limit: waiting ${waitMs}ms for Gemini key #${keyIndex + 1}`);
      await new Promise(r => setTimeout(r, waitMs));
    }
    this.geminiLastCallTime.set(keyIndex, Date.now());
  }

  private async geminiChat(
    messages: ChatMessage[],
    options: ChatCompletionOptions,
  ): Promise<ChatCompletionResult> {
    if (!this.gemini || this.geminiClients.length === 0) {
      throw new Error('Gemini not configured. Set GEMINI_API_KEY');
    }

    // 纯 Gemini 多模型降级链 — 3 keys × 4 models = 8,550 RPD
    // ⚠️ 1.5系列已废弃(404)，仅使用2.0+模型
    // 每个模型有独立配额，降级到其他模型 = 全新的配额池
    //
    // 降级优先级（按配额从大到小）:
    //   2.0-flash (1500 RPD) → 2.0-flash-lite (1000 RPD) → 2.5-flash (250 RPD)
    //   2.5-pro 请求: 2.5-pro → 2.0-flash → 2.0-flash-lite → 2.5-flash
    const requestedModel = options.model || 'gemini-2.0-flash';

    // 所有可用模型（按配额从大到小排序）
    const allModels = ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-2.5-flash'];
    let fallbackModels: string[];
    if (requestedModel === 'gemini-2.5-pro') {
      // Pro → 全部flash模型作为降级
      fallbackModels = ['gemini-2.5-pro', ...allModels];
    } else {
      // 从请求的模型开始，然后按配额大小尝试其他模型
      fallbackModels = [requestedModel, ...allModels.filter(m => m !== requestedModel)];
    }

    const totalKeys = this.geminiClients.length;
    let lastError: any = null;
    let totalAttempts = 0;

    for (const modelName of fallbackModels) {
      for (let attempt = 0; attempt < totalKeys; attempt++) {
        const keyIndex = (this.currentGeminiIndex + attempt) % totalKeys;
        const geminiClient = this.geminiClients[keyIndex];

        try {
          // RPM rate limiting: wait if needed
          await this.waitForGeminiRateLimit(keyIndex);

          this.logger.log(`🔑 Gemini key #${keyIndex + 1}/${totalKeys}, model: ${modelName} (attempt ${++totalAttempts})`);
          const result = await this.geminiChatWithClient(geminiClient, messages, { ...options, model: modelName });

          // 成功后更新当前索引到下一个（负载均衡）
          this.currentGeminiIndex = (keyIndex + 1) % totalKeys;
          return result;
        } catch (error: any) {
          lastError = error;
          const errorMessage = `${error?.message || ''} ${JSON.stringify(error?.response?.data || {})}`;
          const isQuotaError = /RESOURCE_EXHAUSTED|quota|429|Too Many Requests/i.test(errorMessage);
          const isModelNotFound = /404|does not exist|not found/i.test(errorMessage);

          if (isQuotaError) {
            this.logger.warn(`Gemini key #${keyIndex + 1} quota exhausted for ${modelName}, trying next...`);
            continue; // 尝试下一个key
          } else if (isModelNotFound) {
            this.logger.warn(`Model ${modelName} not available, skipping to next model...`);
            break; // 跳到下一个模型
          } else {
            throw error;
          }
        }
      }
      // All keys exhausted for this model, try next model
      if (modelName !== fallbackModels[fallbackModels.length - 1]) {
        this.logger.warn(`All ${totalKeys} keys exhausted for ${modelName}, falling back to next model...`);
      }
    }

    // 所有 Gemini 模型和 key 都耗尽
    this.logger.error(`❌ All Gemini models exhausted (${totalAttempts} attempts across ${fallbackModels.length} models × ${totalKeys} keys)`);
    throw lastError || new Error(`All Gemini API keys and models exhausted. Total daily quota (8,550) may be exceeded. Consider adding more API keys.`);
  }

  /**
   * 使用特定Gemini client进行聊天
   */
  private async geminiChatWithClient(
    geminiClient: GoogleGenerativeAI,
    messages: ChatMessage[],
    options: ChatCompletionOptions,
  ): Promise<ChatCompletionResult> {

    const modelName = options.model || 'gemini-2.0-flash';

    // 转换工具格式
    const tools = options.tools && options.tools.length > 0 ? [{
      functionDeclarations: options.tools.map((t: any) => ({
        name: t.name,
        description: t.description,
        parameters: t.input_schema || t.parameters || {},
      })),
    }] : undefined;

    this.logger.log(`🔧 Gemini API - Model: ${modelName}, Tools provided: ${options.tools?.length || 0}`);
    if (tools) {
      this.logger.log(`🔧 Gemini API - Function declarations: ${tools[0].functionDeclarations.map((f: any) => f.name).join(', ')}`);
    }

    const model = geminiClient.getGenerativeModel({
      model: modelName,
      tools,
    });

    // 构建对话历史
    const history: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];
    let systemInstruction = options.systemPrompt || '';

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemInstruction = msg.content;
      } else {
        history.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        });
      }
    }

    // 获取最后一条用户消息
    const lastUserMessage = history.pop();
    if (!lastUserMessage || lastUserMessage.role !== 'user') {
      throw new Error('Last message must be from user');
    }

    const normalizedSystemInstruction = systemInstruction
      ? { role: 'system', parts: [{ text: systemInstruction }] }
      : undefined;

    try {
      const chat = model.startChat({
        history,
        generationConfig: {
          temperature: options.temperature ?? 0.7,
          maxOutputTokens: options.maxTokens ?? 16384,
        },
        systemInstruction: normalizedSystemInstruction,
      });

      const result = await chat.sendMessage(lastUserMessage.parts[0].text);
      const response = result.response;

      // 检查是否有函数调用
      const functionCalls = response.functionCalls();
      if (functionCalls && functionCalls.length > 0) {
        this.logger.log(`Gemini returned ${functionCalls.length} function calls`);

        return {
          content: '',
          model: modelName,
          usage: {
            promptTokens: response.usageMetadata?.promptTokenCount || 0,
            completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
            totalTokens: response.usageMetadata?.totalTokenCount || 0,
          },
          finishReason: 'tool_use',
          toolCalls: functionCalls.map((fc: any, idx: number) => ({
            id: `gemini_${Date.now()}_${idx}`,
            name: fc.name,
            arguments: fc.args,
          })),
        };
      }

      return {
        content: response.text(),
        model: modelName,
        usage: {
          promptTokens: response.usageMetadata?.promptTokenCount || 0,
          completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
          totalTokens: response.usageMetadata?.totalTokenCount || 0,
        },
        finishReason: 'stop',
      };
    } catch (error: any) {
      if (normalizedSystemInstruction && String(error?.message || '').includes('system_instruction')) {
        this.logger.warn('Gemini system_instruction rejected, retrying without system instruction');
        const chat = model.startChat({
          history,
          generationConfig: {
            temperature: options.temperature ?? 0.7,
            maxOutputTokens: options.maxTokens ?? 16384,
          },
        });
        const result = await chat.sendMessage(lastUserMessage.parts[0].text);
        const response = result.response;
        return {
          content: response.text(),
          model: modelName,
          usage: {
            promptTokens: response.usageMetadata?.promptTokenCount || 0,
            completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
            totalTokens: response.usageMetadata?.totalTokenCount || 0,
          },
          finishReason: 'stop',
        };
      }
      const errorMessage = `${error?.message || ''} ${JSON.stringify(error?.response?.data || {})}`;
      const isQuotaError = /RESOURCE_EXHAUSTED|quota|429|Too Many Requests/i.test(errorMessage);

      if (isQuotaError) {
        // 不做模型降级，直接抛出让外层 geminiChat() 的 key 轮换处理
        this.logger.warn(`Gemini model ${modelName} quota exceeded on current key`);
        throw error;
      }

      this.logger.error(`Gemini error (model: ${modelName}): ${error.message}`);
      throw error;
    }
  }

  /**
   * OpenAI 聊天
   */
  private async openaiChat(
    messages: ChatMessage[],
    options: ChatCompletionOptions,
  ): Promise<ChatCompletionResult> {
    if (!this.openai) {
      throw new Error('OpenAI not configured');
    }

    const model = options.model || 'gpt-4o';
    
    // 构建消息
    const openaiMessages: OpenAI.ChatCompletionMessageParam[] = [];
    const derivedSystemPrompt = options.systemPrompt || messages.find(m => m.role === 'system')?.content;
    
    if (derivedSystemPrompt) {
      openaiMessages.push({ role: 'system', content: derivedSystemPrompt });
    }
    
    for (const msg of messages) {
      if (msg.role === 'system') continue;
      openaiMessages.push({ role: msg.role, content: msg.content });
    }

    const response = await this.openai.chat.completions.create({
      model,
      messages: openaiMessages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 16384,
    });

    const choice = response.choices[0];
    
    return {
      content: choice.message.content || '',
      model: response.model,
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      },
      finishReason: choice.finish_reason || 'unknown',
    };
  }

  /**
   * Claude 聊天
   */
  private async claudeChat(
    messages: ChatMessage[],
    options: ChatCompletionOptions,
  ): Promise<ChatCompletionResult> {
    if (!this.anthropic) {
      throw new Error('Claude/Anthropic not configured');
    }

    const model = options.model || 'claude-sonnet-4-20250514';
    
    // Claude 格式
    const claudeMessages: Anthropic.MessageParam[] = [];
    
    for (const msg of messages) {
      if (msg.role !== 'system') {
        claudeMessages.push({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content,
        });
      }
    }

    const derivedSystemPrompt = options.systemPrompt || messages.find(m => m.role === 'system')?.content;

    const response = await this.anthropic.messages.create({
      model,
      max_tokens: options.maxTokens ?? 16384,
      system: derivedSystemPrompt,
      messages: claudeMessages,
    });

    const content = response.content[0];
    
    return {
      content: content.type === 'text' ? content.text : '',
      model: response.model,
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      },
      finishReason: response.stop_reason || 'unknown',
    };
  }

  /**
   * DeepSeek 聊天 (OpenAI 兼容)
   */
  /**
   * Groq Chat (OpenAI-compatible, FREE: 14,400 req/day)
   * Models: llama-3.3-70b-versatile, llama-3.1-8b-instant, mixtral-8x7b-32768
   */
  private async groqChat(
    messages: ChatMessage[],
    options: ChatCompletionOptions = {},
  ): Promise<ChatCompletionResult> {
    if (!this.groq) throw new Error('Groq not initialized');
    const model = options.model || 'llama-3.3-70b-versatile';
    this.logger.debug(`🟢 Groq chat: model=${model}`);
    try {
      const response = await this.groq.chat.completions.create({
        model,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens || 4096,
      });
      const choice = response.choices[0];
      return {
        content: choice?.message?.content || '',
        model,
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
        },
        finishReason: choice?.finish_reason || 'stop',
      };
    } catch (error: any) {
      this.logger.error(`Groq chat error: ${error.message}`);
      throw error;
    }
  }

  private async deepseekChat(
    messages: ChatMessage[],
    options: ChatCompletionOptions,
  ): Promise<ChatCompletionResult> {
    if (!this.deepseek) {
      throw new Error('DeepSeek not configured');
    }

    const model = options.model || 'deepseek-chat';
    
    const dsMessages: OpenAI.ChatCompletionMessageParam[] = [];
    const derivedSystemPrompt = options.systemPrompt || messages.find(m => m.role === 'system')?.content;
    
    if (derivedSystemPrompt) {
      dsMessages.push({ role: 'system', content: derivedSystemPrompt });
    }
    
    for (const msg of messages) {
      if (msg.role === 'system') continue;
      dsMessages.push({ role: msg.role, content: msg.content });
    }

    const response = await this.deepseek.chat.completions.create({
      model,
      messages: dsMessages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 16384,
    });

    const choice = response.choices[0];
    
    return {
      content: choice.message.content || '',
      model: response.model,
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      },
      finishReason: choice.finish_reason || 'unknown',
    };
  }

  /**
   * 生成文本嵌入向量
   */
  async generateEmbedding(text: string, model?: string): Promise<EmbeddingResult> {
    if (!this.openai) {
      throw new Error('OpenAI not configured for embeddings');
    }

    const embeddingModel = model || this.embeddingModel;
    
    const response = await this.openai.embeddings.create({
      model: embeddingModel,
      input: text,
    });

    return {
      embedding: response.data[0].embedding,
      model: response.model,
      usage: {
        totalTokens: response.usage.total_tokens,
      },
    };
  }

  /**
   * 批量生成嵌入向量
   */
  async generateEmbeddings(texts: string[], model?: string): Promise<EmbeddingResult[]> {
    if (!this.openai) {
      throw new Error('OpenAI not configured for embeddings');
    }

    const embeddingModel = model || this.embeddingModel;
    
    const response = await this.openai.embeddings.create({
      model: embeddingModel,
      input: texts,
    });

    return response.data.map((item, index) => ({
      embedding: item.embedding,
      model: response.model,
      usage: {
        totalTokens: Math.floor(response.usage.total_tokens / texts.length),
      },
    }));
  }

  /**
   * 检查 AI 服务状态
   */
  getStatus(): {
    bedrockOpus: boolean;
    bedrockSonnet: boolean;
    gemini: boolean;
    openai: boolean;
    claude: boolean;
    groq: boolean;
    deepseek: boolean;
    defaultProvider: AIProvider;
    agentMappings: string[];
  } {
    return {
      bedrockOpus: !!this.bedrockToken,
      bedrockSonnet: !!this.bedrockToken,
      gemini: !!this.gemini,
      openai: !!this.openai,
      claude: !!this.anthropic,
      groq: !!this.groq,
      deepseek: !!this.deepseek,
      defaultProvider: this.defaultProvider,
      agentMappings: Array.from(this.agentAIMapping.keys()),
    };
  }

  /**
   * 简单的聊天接口
   */
  async chat(
    prompt: string,
    systemPrompt?: string,
    options?: ChatCompletionOptions & { provider?: AIProvider },
  ): Promise<string> {
    const result = await this.chatCompletion(
      [{ role: 'user', content: prompt }],
      { ...options, systemPrompt },
    );
    return result.content;
  }

  /**
   * 流式聊天 - 支持所有 Provider
   */
  async *chatStream(
    messages: ChatMessage[],
    options: ChatCompletionOptions & { provider?: AIProvider } = {},
  ): AsyncGenerator<string> {
    const inferredProvider = this.inferProviderFromModel(options.model);
    const requestedProvider = inferredProvider || options.provider;
    const provider = this.selectProvider(requestedProvider);

    this.logger.log(`[chatStream] provider=${provider}, model=${options.model || 'default'}`);

    try {
      switch (provider) {
        case 'openai':
          yield* this.openaiStream(messages, options);
          return;
        case 'bedrock-opus':
        case 'bedrock-sonnet':
        case 'bedrock-haiku':
          yield* this.bedrockStream(messages, { ...options, provider });
          return;
        case 'gemini':
          yield* this.geminiStream(messages, options);
          return;
        case 'claude':
          yield* this.claudeStream(messages, options);
          return;
        case 'groq':
          yield* this.groqStream(messages, options);
          return;
        case 'deepseek':
          yield* this.deepseekStream(messages, options);
          return;
        default:
          // 非流式回退
          const result = await this.chatCompletion(messages, options);
          yield result.content;
          return;
      }
    } catch (error: any) {
      this.logger.warn(`[chatStream] ${provider} streaming failed: ${error.message}, falling back to non-streaming`);
      const result = await this.chatCompletion(messages, { ...options, provider: requestedProvider });
      yield result.content;
    }
  }

  /**
   * OpenAI 流式
   */
  private async *openaiStream(
    messages: ChatMessage[],
    options: ChatCompletionOptions,
  ): AsyncGenerator<string> {
    if (!this.openai) throw new Error('OpenAI not configured');

    const model = options.model || 'gpt-4o';
    const openaiMessages: OpenAI.ChatCompletionMessageParam[] = [];
    if (options.systemPrompt) {
      openaiMessages.push({ role: 'system', content: options.systemPrompt });
    }
    for (const msg of messages) {
      if (msg.role === 'system' && options.systemPrompt) continue;
      openaiMessages.push({ role: msg.role, content: msg.content });
    }

    const stream = await this.openai.chat.completions.create({
      model,
      messages: openaiMessages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 16384,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) yield content;
    }
  }

  /**
   * AWS Bedrock 流式 (Claude Opus/Sonnet/Haiku via invoke-with-response-stream)
   */
  private async *bedrockStream(
    messages: ChatMessage[],
    options: ChatCompletionOptions & { provider?: AIProvider },
  ): AsyncGenerator<string> {
    if (!this.bedrockToken) throw new Error('AWS Bedrock not configured');

    const defaultModels: Record<string, string> = {
      'bedrock-opus': 'arn:aws:bedrock:us-east-1:696737009512:inference-profile/us.anthropic.claude-opus-4-6-v1',
      'bedrock-sonnet': 'us.anthropic.claude-sonnet-4-5-20250929-v1:0',
      'bedrock-haiku': 'us.anthropic.claude-haiku-4-5-20251001-v1:0',
    };
    const modelId = options.model || defaultModels[options.provider || 'bedrock-sonnet'] || defaultModels['bedrock-sonnet'];

    const claudeMessages = messages.filter(m => m.role !== 'system').map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    }));

    const systemMessage = messages.find(m => m.role === 'system');
    const body: any = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: options.maxTokens ?? 16384,
      messages: claudeMessages,
    };
    if (options.systemPrompt) {
      body.system = options.systemPrompt;
    } else if (systemMessage) {
      body.system = systemMessage.content;
    }
    if (options.temperature !== undefined) {
      body.temperature = options.temperature;
    }

    // Use non-streaming invoke endpoint and yield the full response.
    // Bedrock's invoke-with-response-stream returns a binary AWS event stream
    // that requires the @aws-sdk to parse properly. Using invoke is simpler
    // and the chatStream caller already handles single-chunk yields.
    const encodedModelId = encodeURIComponent(modelId);
    const url = `https://bedrock-runtime.${this.bedrockRegion}.amazonaws.com/model/${encodedModelId}/invoke`;

    this.logger.log(`[bedrockStream] model=${modelId}, region=${this.bedrockRegion} (invoke-as-stream)`);

    const response = await axios.post(url, body, {
      headers: {
        'Authorization': `Bearer ${this.bedrockToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      httpsAgent: this.proxyAgent || undefined,
      proxy: false,
      timeout: 600000,
    });

    const content = response.data?.content?.[0]?.text || '';
    if (content) {
      // Yield in smaller chunks to simulate streaming for the SSE consumer
      const chunkSize = 80;
      for (let i = 0; i < content.length; i += chunkSize) {
        yield content.slice(i, i + chunkSize);
      }
    }
  }

  /**
   * Gemini 流式
   */
  private async *geminiStream(
    messages: ChatMessage[],
    options: ChatCompletionOptions,
  ): AsyncGenerator<string> {
    if (!this.gemini) throw new Error('Gemini not configured');

    const modelName = options.model || 'gemini-2.0-flash';
    const model = this.gemini.getGenerativeModel({ model: modelName });

    const history: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];
    let systemInstruction = options.systemPrompt || '';

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemInstruction = msg.content;
      } else {
        history.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        });
      }
    }

    const lastUserMessage = history.pop();
    if (!lastUserMessage || lastUserMessage.role !== 'user') {
      throw new Error('Last message must be from user');
    }

    const normalizedSystemInstruction = systemInstruction
      ? { role: 'system' as const, parts: [{ text: systemInstruction }] }
      : undefined;

    try {
      const chat = model.startChat({
        history,
        generationConfig: {
          temperature: options.temperature ?? 0.7,
          maxOutputTokens: options.maxTokens ?? 16384,
        },
        systemInstruction: normalizedSystemInstruction,
      });

      const result = await chat.sendMessageStream(lastUserMessage.parts[0].text);

      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) yield text;
      }
    } catch (error: any) {
      // Quota error - 直接抛出，不做模型降级（1.5系列已404）
      const errorMessage = `${error?.message || ''} ${JSON.stringify(error?.response?.data || {})}`;
      const isQuotaError = /RESOURCE_EXHAUSTED|quota|429|Too Many Requests/i.test(errorMessage);

      if (isQuotaError) {
        this.logger.warn(`[geminiStream] model ${modelName} quota exceeded on current key`);
      }
      throw error;
    }
  }

  /**
   * Claude (Anthropic Direct) 流式
   */
  private async *claudeStream(
    messages: ChatMessage[],
    options: ChatCompletionOptions,
  ): AsyncGenerator<string> {
    if (!this.anthropic) throw new Error('Claude/Anthropic not configured');

    const model = options.model || 'claude-sonnet-4-20250514';
    const claudeMessages: Anthropic.MessageParam[] = [];

    for (const msg of messages) {
      if (msg.role !== 'system') {
        claudeMessages.push({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content,
        });
      }
    }

    const derivedSystemPrompt = options.systemPrompt || messages.find(m => m.role === 'system')?.content;

    const stream = this.anthropic.messages.stream({
      model,
      max_tokens: options.maxTokens ?? 16384,
      system: derivedSystemPrompt,
      messages: claudeMessages,
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield event.delta.text;
      }
    }
  }

  /**
   * DeepSeek 流式 (OpenAI-compatible)
   */
  /**
   * Groq Stream (OpenAI-compatible)
   */
  private async *groqStream(
    messages: ChatMessage[],
    options: ChatCompletionOptions = {},
  ): AsyncGenerator<string> {
    if (!this.groq) throw new Error('Groq not initialized');
    const model = options.model || 'llama-3.3-70b-versatile';
    const stream = await this.groq.chat.completions.create({
      model,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens || 4096,
      stream: true,
    });
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) yield content;
    }
  }

  private async *deepseekStream(
    messages: ChatMessage[],
    options: ChatCompletionOptions,
  ): AsyncGenerator<string> {
    if (!this.deepseek) throw new Error('DeepSeek not configured');

    const model = options.model || 'deepseek-chat';
    const dsMessages: OpenAI.ChatCompletionMessageParam[] = [];
    const derivedSystemPrompt = options.systemPrompt || messages.find(m => m.role === 'system')?.content;

    if (derivedSystemPrompt) {
      dsMessages.push({ role: 'system', content: derivedSystemPrompt });
    }
    for (const msg of messages) {
      if (msg.role === 'system') continue;
      dsMessages.push({ role: msg.role, content: msg.content });
    }

    const stream = await this.deepseek.chat.completions.create({
      model,
      messages: dsMessages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 16384,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) yield content;
    }
  }
}
