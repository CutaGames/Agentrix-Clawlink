/**
 * HQ AI Service
 * 
 * 统一的 AI 模型集成服务
 * 支持:
 * - AWS Bedrock (Claude Opus 4.5, Claude Sonnet 4.5)
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
}

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  usage: {
    totalTokens: number;
  };
}

// Agent 专用 Provider - 每个 Agent 绑定特定模型
export type AIProvider = 'openai' | 'claude' | 'gemini' | 'deepseek' | 'bedrock-opus' | 'bedrock-sonnet' | 'bedrock-haiku' | 'auto';

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
  private gemini: GoogleGenerativeAI | null = null;
  
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
  // 注意：Claude 4 需要使用 cross-region inference profile ID
  // 规则：ARCH/CODER -> Bedrock (Opus/Sonnet)
  //      GROWTH/BD -> Bedrock Haiku 4.5
  //      其他 -> Gemini 2.5 Flash（额度用完回退 Gemini 1.5 Flash -> Bedrock Haiku 4.5）
  private readonly agentAIMapping: Map<string, AgentAIMapping> = new Map([
    // 核心团队 - 使用 Bedrock Claude
    ['ARCHITECT-01', { agentCode: 'ARCHITECT-01', provider: 'bedrock-opus', model: 'us.anthropic.claude-opus-4-5-20251101-v1:0', description: '首席架构师 - Claude Opus 4.5 via Bedrock' }],
    ['CODER-01', { agentCode: 'CODER-01', provider: 'bedrock-sonnet', model: 'us.anthropic.claude-sonnet-4-5-20250929-v1:0', description: '高级开发工程师 - Claude Sonnet 4.5 via Bedrock' }],
    ['GROWTH-01', { agentCode: 'GROWTH-01', provider: 'bedrock-haiku', model: 'us.anthropic.claude-haiku-4-5-20251001-v1:0', description: '全球增长负责人 - Claude Haiku 4.5 via Bedrock' }],
    ['BD-01', { agentCode: 'BD-01', provider: 'bedrock-haiku', model: 'us.anthropic.claude-haiku-4-5-20251001-v1:0', description: '全球生态发展负责人 - Claude Haiku 4.5 via Bedrock' }],
    
    // 其他成员 - 使用 Gemini 2.5 Flash（额度用完回退）
    ['ANALYST-01', { agentCode: 'ANALYST-01', provider: 'gemini', model: 'gemini-2.5-flash', description: '业务分析师 - Gemini 2.5 Flash' }],
    ['SOCIAL-01', { agentCode: 'SOCIAL-01', provider: 'gemini', model: 'gemini-2.5-flash', description: '社交媒体运营官 - Gemini 2.5 Flash' }],
    ['CONTENT-01', { agentCode: 'CONTENT-01', provider: 'gemini', model: 'gemini-2.5-flash', description: '内容创作官 - Gemini 2.5 Flash' }],
    ['SUPPORT-01', { agentCode: 'SUPPORT-01', provider: 'gemini', model: 'gemini-2.5-flash', description: '客户成功经理 - Gemini 2.5 Flash' }],
    ['SECURITY-01', { agentCode: 'SECURITY-01', provider: 'gemini', model: 'gemini-2.5-flash', description: '安全审计官 - Gemini 2.5 Flash' }],
    ['DEVREL-01', { agentCode: 'DEVREL-01', provider: 'gemini', model: 'gemini-2.5-flash', description: '开发者关系 - Gemini 2.5 Flash' }],
    ['LEGAL-01', { agentCode: 'LEGAL-01', provider: 'gemini', model: 'gemini-2.5-flash', description: '合规顾问 - Gemini 2.5 Flash' }],
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

    // 初始化 Gemini
    const geminiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (geminiKey) {
      this.gemini = new GoogleGenerativeAI(geminiKey);
      this.logger.log('Google Gemini initialized');
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
    // 如果配置了中转，优先使用中转
    if (this.relayUrl) {
      return this.relayChatCompletion(messages, options);
    }

    const inferredProvider = this.inferProviderFromModel(options.model);
    const provider = this.selectProvider(inferredProvider || options.provider);
    
    switch (provider) {
      case 'bedrock-opus':
        return this.bedrockChat(messages, { ...options, model: options.model || 'us.anthropic.claude-opus-4-5-20251101-v1:0' });
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
      case 'deepseek':
        return this.deepseekChat(messages, options);
      default:
        throw new Error(`Unknown provider: ${provider}`);
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
        timeout: 120000,
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
      max_tokens: options.maxTokens ?? 4096,
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
        timeout: 120000, // 2 分钟超时
      });

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
   * Gemini 聊天 (Gemini 2.5 Flash)
   */
  private async geminiChat(
    messages: ChatMessage[],
    options: ChatCompletionOptions,
  ): Promise<ChatCompletionResult> {
    if (!this.gemini) {
      throw new Error('Gemini not configured. Set GEMINI_API_KEY');
    }

    const modelName = options.model || 'gemini-2.5-flash';
    const model = this.gemini.getGenerativeModel({ model: modelName });

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
          maxOutputTokens: options.maxTokens ?? 4096,
        },
        systemInstruction: normalizedSystemInstruction,
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
    } catch (error: any) {
      if (normalizedSystemInstruction && String(error?.message || '').includes('system_instruction')) {
        this.logger.warn('Gemini system_instruction rejected, retrying without system instruction');
        const chat = model.startChat({
          history,
          generationConfig: {
            temperature: options.temperature ?? 0.7,
            maxOutputTokens: options.maxTokens ?? 4096,
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
        if (modelName !== 'gemini-1.5-flash') {
          this.logger.warn('Gemini quota exceeded, fallback to gemini-1.5-flash');
          return this.geminiChat(messages, { ...options, model: 'gemini-1.5-flash' });
        }
        if (this.bedrockToken) {
          this.logger.warn('Gemini quota exceeded, fallback to Bedrock Haiku 4.5');
          return this.bedrockChat(messages, { ...options, model: 'us.anthropic.claude-haiku-4-5-20251001-v1:0' });
        }
      }

      this.logger.error(`Gemini error: ${error.message}`);
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
      max_tokens: options.maxTokens ?? 4096,
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
      max_tokens: options.maxTokens ?? 4096,
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
      max_tokens: options.maxTokens ?? 4096,
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
   * 流式聊天 (TODO)
   */
  async *chatStream(
    messages: ChatMessage[],
    options: ChatCompletionOptions & { provider?: AIProvider } = {},
  ): AsyncGenerator<string> {
    const provider = this.selectProvider(options.provider);
    
    if (provider === 'openai' && this.openai) {
      const model = options.model || 'gpt-4o';
      
      const openaiMessages: OpenAI.ChatCompletionMessageParam[] = [];
      if (options.systemPrompt) {
        openaiMessages.push({ role: 'system', content: options.systemPrompt });
      }
      for (const msg of messages) {
        openaiMessages.push({ role: msg.role, content: msg.content });
      }

      const stream = await this.openai.chat.completions.create({
        model,
        messages: openaiMessages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 4096,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }
    } else {
      // 非流式回退
      const result = await this.chatCompletion(messages, options);
      yield result.content;
    }
  }
}
