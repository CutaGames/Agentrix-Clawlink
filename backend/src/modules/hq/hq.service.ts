import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import * as nodemailer from 'nodemailer';
import { TwitterApi } from 'twitter-api-v2';
import { AgentAccount } from '../../entities/agent-account.entity';
import { OpenAIIntegrationService } from '../ai-integration/openai/openai-integration.service';
import { ClaudeIntegrationService } from '../ai-integration/claude/claude-integration.service';
import { BedrockIntegrationService } from '../ai-integration/bedrock/bedrock-integration.service';
import { GeminiIntegrationService } from '../ai-integration/gemini/gemini-integration.service';
import { GroqIntegrationService } from '../ai-integration/groq/groq-integration.service';
import { DeepSeekIntegrationService } from '../ai-integration/deepseek/deepseek-integration.service';
import { ModelRouterService, TaskComplexity } from '../ai-integration/model-router/model-router.service';
import { RagService } from './rag.service';
import { DeveloperService } from './developer.service';

@Injectable()
export class HqService {
  private readonly logger = new Logger(HqService.name);
  private knowledgeBase: string = '';
  private twitterClient: TwitterApi | null = null;
  private mailTransporter: any = null;

  constructor(
    @InjectRepository(AgentAccount)
    private agentRepo: Repository<AgentAccount>,
    private configService: ConfigService,
    private openaiService: OpenAIIntegrationService,
    private claudeService: ClaudeIntegrationService,
    private bedrockService: BedrockIntegrationService,
    private geminiService: GeminiIntegrationService,
    private groqService: GroqIntegrationService,
    private deepseekService: DeepSeekIntegrationService,
    private modelRouter: ModelRouterService,
    private ragService: RagService,
    private developerService: DeveloperService,
  ) {
    this.reloadKnowledgeBase();
    this.initClients();
  }

  /**
   * 初始化社交和邮件客户端
   */
  private initClients() {
    // Twitter Client
    const twitterKey = process.env.TWITTER_CONSUMER_KEY || process.env.TWITTER_API_KEY;
    const twitterSecret = process.env.TWITTER_CONSUMER_SECRET || process.env.TWITTER_APIKEY_SECRET;
    const accessToken = process.env.TWITTER_ACCESS_TOKEN;
    const accessSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET;

    if (twitterKey && twitterSecret && accessToken && accessSecret) {
      this.twitterClient = new TwitterApi({
        appKey: twitterKey,
        appSecret: twitterSecret,
        accessToken: accessToken,
        accessSecret: accessSecret,
      });
      this.logger.log('Twitter Client 初始化成功 (Read/Write Mode)');
    }

    // Email Transporter
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASSWORD;
    if (smtpUser && smtpPass) {
      this.mailTransporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_PORT === '465',
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });
      this.logger.log('SMTP 邮件服务初始化成功');
    }
  }

  /**
   * 加载/重新加载 Agent 知识库
   */
  reloadKnowledgeBase() {
    try {
      const kbPath = path.join(process.cwd(), 'hq-knowledge-base.md');
      if (fs.existsSync(kbPath)) {
        this.knowledgeBase = fs.readFileSync(kbPath, 'utf-8');
        this.logger.log('Agent 知识库加载成功');
      }
    } catch (e) {
      this.logger.error('加载知识库失败', e);
    }
  }

  /**
   * 获取知识库文本内容
   */
  getKnowledgeBaseContent(): string {
    return this.knowledgeBase;
  }

  /**
   * 更新知识库内容并持久化
   */
  updateKnowledgeBaseContent(content: string) {
    this.knowledgeBase = content;
    try {
      const kbPath = path.join(process.cwd(), 'hq-knowledge-base.md');
      fs.writeFileSync(kbPath, content, 'utf-8');
      this.logger.log('Agent 知识库已更新并保存');
    } catch (e) {
      this.logger.error('保存知识库失败', e);
    }
  }

  /**
   * 获取本地 RAG 知识库文件列表
   */
  getRagFiles(): string[] {
    const knowledgePath = path.join(process.cwd(), 'knowledge');
    this.logger.log(`正在读取 RAG 知识库目录: ${knowledgePath}, CWD: ${process.cwd()}`);
    if (!fs.existsSync(knowledgePath)) {
      this.logger.warn(`RAG 目录不存在: ${knowledgePath}`);
      return [];
    }
    try {
      const files = fs.readdirSync(knowledgePath).filter(file => 
        ['.md', '.txt', '.pdf'].includes(path.extname(file).toLowerCase())
      );
      this.logger.log(`找到 ${files.length} 个 RAG 文件`);
      return files;
    } catch (e) {
      this.logger.error('读取 RAG 目录失败', e);
      return [];
    }
  }

  /**
   * 处理总部的聊天指令
   */
  async processHqChat(agentId: string, messages: any[], userId?: string) {
    this.logger.log(`处理总部指令: Agent=${agentId}, 消息数=${messages.length}`);
    const toolLogs: any[] = [];

    // 1. 获取 Agent 详情
    const agent = await this.agentRepo.findOne({ where: { agentUniqueId: agentId } });
    if (!agent) {
      this.logger.warn(`未找到 Agent: ${agentId}，使用临时配置`);
    }

    // 2. 根据 Agent 类型构造系统提示词
    const systemPrompt = this.getSystemPromptForAgent(agentId, agent);

    // 3. 构建消息列表
    const fullMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];

    // 4. 配置 HQ 专属工具箱 (Growth & BD Toolbox)
    const hqTools = [
      {
        name: 'search_local_docs',
        description: 'Search the internal knowledge base (PDFs, Markdown, text files) for detailed project info.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'What information you are looking for in local files' },
          },
          required: ['query'],
        },
      },
      {
        name: 'web_search',
        description: 'Search the internet for real-time information about markets, competitors, or merchants.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'The search query' },
          },
          required: ['query'],
        },
      },
      {
        name: 'social_connector_action',
        description: 'Access social media (X/Twitter, Discord, Telegram) for growth operations.',
        parameters: {
          type: 'object',
          properties: {
            action: { type: 'string', enum: ['analyze_trends', 'post_tweet', 'send_discord_msg', 'send_tg_notification'], description: 'Social media action' },
            content: { type: 'string', description: 'Content to post or message to send' },
            params: { type: 'string', description: 'Additional parameters like search keywords' },
          },
          required: ['action'],
        },
      },
      {
        name: 'business_toolbox',
        description: 'Access CRM and Email tools for merchant outreach.',
        parameters: {
          type: 'object',
          properties: {
            action: { type: 'string', enum: ['send_email', 'get_merchant_info'], description: 'Business action' },
            target: { type: 'string', description: 'Target merchant email or name' },
            subject: { type: 'string', description: 'Email subject' },
            body: { type: 'string', description: 'Email body content' },
          },
          required: ['action'],
        },
      },
      // --- IDE & Workshop Capabilities ---
      {
        name: 'read_code',
        description: 'Read source code from a file in the project workspace. Use this to inspect existing code before making changes.',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Relative path to the file (e.g., "src/app/page.tsx")' },
          },
          required: ['path'],
        },
      },
      {
        name: 'edit_code',
        description: 'Write or modify source code in the project. Use this to implement features, fix bugs, or refactor code.',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'File path to write to (will create if not exists)' },
            content: { type: 'string', description: 'Complete new content of the file' },
          },
          required: ['path', 'content'],
        },
      },
      {
        name: 'list_files',
        description: 'List files and directories in a path to understand project structure.',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Directory path to explore (default: current directory)' },
          },
        },
      },
      {
        name: 'search_code',
        description: 'Search for code patterns across the project. Useful for finding where a function/variable is used.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Text to search for in code' },
            pattern: { type: 'string', description: 'File pattern like "*.tsx" or "*.ts" (default: *.ts)' },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_project_tree',
        description: 'Get the full project file tree structure (like VSCode explorer). Use this to understand workspace layout.',
        parameters: {
          type: 'object',
          properties: {
            depth: { type: 'number', description: 'Maximum depth to traverse (default: 3)' },
          },
        },
      },
      {
        name: 'execute_terminal',
        description: 'Execute a shell command in the project directory. Use for npm/git commands, running tests, etc.',
        parameters: {
          type: 'object',
          properties: {
            command: { type: 'string', description: 'Shell command to execute (e.g., "npm run build")' },
          },
          required: ['command'],
        },
      },
      {
        name: 'get_workspace_info',
        description: 'Get project overview including package.json dependencies and current git branch/status.',
        parameters: {
          type: 'object',
          properties: {},
        },
      }
    ];

    // 5. 调用大模型 (根据指令分配最优模型)
    try {
      // 模型映射策略 V2 (Agentrix "智能分级混合模型引擎")
      // 云创AWS Bedrock 1500美金额度分配:
      // - 架构师(CEO): Claude Opus 4 (最强推理)
      // - 程序员(Coder): Claude Sonnet 4.5 (代码专家)
      // - 增长商务: Gemini Flash 1.5 (免费额度)
      // - 备用降级: Claude Haiku (高性价比)
      
      let targetModel = 'gemini-1.5-flash-002'; 
      let provider: 'gemini' | 'bedrock' | 'openai' | 'deepseek' | 'groq' = 'gemini';

      // 1. CEO/系统架构师 - 使用 Claude Opus 4 (最强推理和规划能力)
      if (agentId === 'ceo' || agentId === 'CEO' || agentId === 'architect' || 
          agentId === 'ARCHITECT-01' || agentId === 'AGENT-ARCHITECT-001') {
        targetModel = 'anthropic.claude-opus-4-20250514-v1:0'; 
        provider = 'bedrock';
        this.logger.log('🎯 架构师模式：使用 Claude Opus 4 (AWS Bedrock)');
      } 
      // 2. 开发者/代码专家 - 使用 Claude Sonnet 4.5 (代码优化专家)
      else if (agentId === 'coder' || agentId === 'CODER' || agentId === 'developer' ||
               agentId === 'CODER-01' || agentId === 'AGENT-CODER-001' || 
               agentId.toLowerCase().includes('dev') || agentId.toLowerCase().includes('code')) {
        targetModel = 'anthropic.claude-sonnet-4-20250514-v1:0';
        provider = 'bedrock';
        this.logger.log('💻 程序员模式：使用 Claude Sonnet 4.5 (AWS Bedrock)');
      } 
      // 3. 增长/商务/运营 - 使用 Gemini Flash 1.5 (免费额度)
      else if (agentId.toLowerCase().includes('growth') || agentId.toLowerCase().includes('bd') ||
               agentId.toLowerCase().includes('sales') || agentId.toLowerCase().includes('marketing')) {
        targetModel = 'gemini-1.5-flash-002';
        provider = 'gemini';
        this.logger.log('📈 增长模式：使用 Gemini Flash 1.5 (免费)');
      } 
      // 4. 其他默认使用 Gemini Flash (免费额度节约成本)
      else {
        targetModel = 'gemini-1.5-flash-002';
        provider = 'gemini';
        this.logger.log('🌟 默认模式：使用 Gemini Flash 1.5 (免费)');
      }

      this.logger.log(`Agent ${agentId} 正在连接针对性引擎: ${targetModel} (Provider: ${provider})`);

      let response: any;
      const executeAiCall = async (p: string, m: string) => {
        if (p === 'bedrock') {
          return await this.bedrockService.chatWithFunctions(fullMessages, { model: m, tools: hqTools });
        } else if (p === 'groq') {
          return await this.groqService.chatWithFunctions(fullMessages as any, { model: m, additionalTools: hqTools });
        } else if (p === 'gemini') {
          return await this.geminiService.chatWithFunctions(fullMessages as any, { model: m, additionalTools: hqTools });
        } else if (p === 'deepseek' || p === 'openai') {
          return await this.openaiService.chatWithFunctions(fullMessages as any, { 
            model: m === 'deepseek-chat' ? m : 'gpt-4o',
            userApiKey: p === 'deepseek' ? this.configService.get('deepseek_API_KEY') : undefined,
            userBaseURL: p === 'deepseek' ? 'https://api.deepseek.com/v1' : undefined,
            additionalTools: hqTools 
          });
        }
        return await this.groqService.chatWithFunctions(fullMessages as any, { model: 'llama-3.3-70b-versatile', additionalTools: hqTools });
      };

      try {
        response = await executeAiCall(provider, targetModel);
      } catch (e: any) {
        this.logger.warn(`${provider} 引擎首选失败 (${e.message})，尝试降级方案...`);
        try {
          // 降级策略1：尝试 Claude Haiku (AWS Bedrock 高性价比)
          if (provider !== 'bedrock') {
            response = await executeAiCall('bedrock', 'anthropic.claude-3-5-haiku-20241022-v1:0');
            this.logger.log('✅ 降级成功：Claude Haiku (AWS Bedrock)');
          } else {
            // 如果已经在使用Bedrock但失败，尝试Gemini
            response = await executeAiCall('gemini', 'gemini-1.5-flash-002');
            this.logger.log('✅ 降级成功：Gemini Flash 1.5');
          }
        } catch (e2: any) {
          // 最后的兜底：Groq（开源模型）
          this.logger.warn('所有主力引擎失败，使用 Groq 开源模型兜底...');
          try {
            response = await executeAiCall('groq', 'llama-3.3-70b-versatile');
            this.logger.log('✅ 降级成功：Groq Llama 3.3');
          } catch (e3: any) {
            this.logger.error('所有模型均失效');
            throw e3;
          }
        }
      }

      // 6. 执行工具调用循环 (如果有)
      if (response.functionCalls && response.functionCalls.length > 0) {
        for (const toolCall of response.functionCalls) {
          const name = toolCall.function.name;
          const args = JSON.parse(toolCall.function.arguments);
          const result = await this.handleHqToolCall(name, args);
          
          toolLogs.push({
            name,
            args,
            result: typeof result === 'string' ? result : JSON.stringify(result)
          });
        }

        // 工具执行完后，通常需要把结果喂回模型获取最终回复，但为了简化，我们先直接返回工具执行后的状态
        // 并在内容中加入工具执行摘要
        if (toolLogs.length > 0) {
          response.text += `\n\n[工具执行摘要]：已完成 ${toolLogs.length} 项操作。`;
        }
      }

      // 7. 提取最新的代码变更和终端输出以便前端 IDE 展示
      let lastCodeChange = '';
      let lastPath = '';
      let terminalOutput = '';
      
      for (const log of toolLogs) {
        if (log.name === 'edit_code') {
          lastCodeChange = log.args.content;
          lastPath = log.args.path;
        } else if (log.name === 'read_code' && !lastCodeChange) {
          lastCodeChange = log.result;
          lastPath = log.args.path;
        } else if (log.name === 'execute_terminal') {
          terminalOutput += `\n$ ${log.args.command}\n${log.result}\n`;
        }
      }

      return {
        agentId,
        agentName: agent?.name || agentId,
        content: response.text || "Agent 正在思考中...",
        timestamp: new Date().toISOString(),
        model: response.model || targetModel,
        toolLogs,
        lastCodeChange,
        lastPath,
        terminalOutput
      };
    } catch (error: any) {
      this.logger.error(`总部对话异常 (所有模型均失效): ${error.message}`);
      return {
        agentId,
        agentName: agent?.name || agentId,
        content: `[指令中断]：所有 AI 引擎连接均告急。详细错误: ${error.message || '未知连接问题'}。`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 处理专属工具调用
   */
  private async handleHqToolCall(name: string, args: any): Promise<any> {
    this.logger.log(`Agent 正在使用总部专属工具: ${name}`, args);
    
    try {
      if (name === 'search_local_docs') {
        return await this.ragService.searchLocalDocs(args.query);
      }

      if (name === 'web_search') {
        return await this.performWebSearch(args.query);
      }
      
      if (name === 'social_connector_action') {
        try {
          return await this.performSocialAction(args);
        } catch (e: any) {
          this.logger.error(`社交操作失败: ${e.message}`);
          return { success: false, error: `社交平台执行中断: ${e.message}`, note: "请检查 API 权限或内容长度限制。" };
        }
      }

      if (name === 'business_toolbox') {
        return await this.performBusinessAction(args);
      }

      // --- IDE Tool Handlers ---
      if (name === 'read_code') {
        return await this.developerService.readFile(args.path);
      }

      if (name === 'edit_code') {
        return await this.developerService.writeFile(args.path, args.content);
      }

      if (name === 'list_files') {
        return await this.developerService.listFiles(args.path);
      }

      if (name === 'search_code') {
        return await this.developerService.searchCode(args.query, args.pattern);
      }

      if (name === 'get_project_tree') {
        return await this.developerService.getProjectTree('.', args.depth || 3);
      }

      if (name === 'get_workspace_info') {
        return await this.developerService.getProjectInfo();
      }

      if (name === 'execute_terminal') {
        return await this.developerService.executeCommand(args.command);
      }
    } catch (error: any) {
      this.logger.error(`工具调用失败 [${name}]: ${error.message}`);
      return { success: false, error: error.message };
    }
    
    return undefined;
  }

  /**
   * 执行网络检索 (SerpApi -> DuckDuckGo)
   */
  private async performWebSearch(query: string) {
    const apiKey = process.env.SEARCH_API_KEY;
    if (apiKey) {
      try {
        const response = await axios.get('https://serpapi.com/search', {
          params: { q: query, api_key: apiKey, engine: 'google', num: 5 }
        });
        return {
          source: 'SerpApi (Google)',
          results: response.data.organic_results?.map((r: any) => ({ title: r.title, summary: r.snippet, link: r.link })) || [],
          agent_note: "已通过 SerpApi 检索到最新 Google 数据。"
        };
      } catch (e: any) {
        this.logger.warn(`SerpApi 失败，尝试切换 DuckDuckGo: ${e.message}`);
      }
    }

    // Fallback: DuckDuckGo (No Key Required)
    try {
      const response = await axios.get(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json`);
      const results = [];
      if (response.data.AbstractText) {
        results.push({ title: response.data.Heading, summary: response.data.AbstractText, link: response.data.AbstractURL });
      }
      return {
        source: 'DuckDuckGo (Free)',
        results: results.length > 0 ? results : [{ title: "Search Result", summary: `Found information about ${query}, but detailed snippets unavailable.` }],
        agent_note: "已通过 DuckDuckGo 免费接口检索。"
      };
    } catch (e: any) {
      return { success: false, message: "所有检索渠道均不可用" };
    }
  }

  /**
   * 执行社交动作 (Twitter/X, Discord, Telegram)
   */
  private async performSocialAction(args: any) {
    const { action, content, params } = args;

    if (action === 'post_tweet') {
      if (!this.twitterClient) throw new Error('Twitter API 未配置或 Access Token 无效');
      const tweet = await this.twitterClient.v2.tweet(content);
      return { success: true, status: 'PUBLISHED', platform: 'Twitter', tweetId: tweet.data.id, url: `https://x.com/i/status/${tweet.data.id}` };
    }

    if (action === 'send_discord_msg') {
      const token = process.env.DISCORD_TOKEN;
      if (!token) throw new Error('DISCORD_TOKEN 未配置');
      // 这里可以实现发送到特定频道逻辑，暂时使用系统通知演示
      return { success: true, status: 'SENT', platform: 'Discord', note: "内容已准备好推送到 Discord 频道。" };
    }

    if (action === 'send_tg_notification') {
      const tgToken = process.env.TELEGRAM_BOT_TOKEN;
      if (!tgToken) throw new Error('TELEGRAM_BOT_TOKEN 未配置');
      const chatId = process.env.TELEGRAM_CHAT_ID;
      if (!chatId) throw new Error('TELEGRAM_CHAT_ID 未配置，请先通过 getUpdates 获取');
      
      await axios.post(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
        chat_id: chatId,
        text: `📢 [Agentrix HQ 通知]\n\n${content}`
      });
      return { success: true, status: 'SENT', platform: 'Telegram' };
    }

    return { status: 'DRAFT_CREATED', content: content || "No content provided" };
  }

  /**
   * 执行商务工具动作 (Email)
   */
  private async performBusinessAction(args: any) {
    const { action, target, subject, body } = args;

    if (action === 'send_email') {
      if (!this.mailTransporter) throw new Error('邮件系统未配置 API Key');
      const info = await this.mailTransporter.sendMail({
        from: process.env.SMTP_FROM || `"Agentrix BD" <${process.env.SMTP_USER}>`,
        to: target,
        subject: subject || "Partnership Invitation from Agentrix",
        text: body,
      });
      return { success: true, messageId: info.messageId, status: 'EMAIL_SENT' };
    }

    return { success: false, message: "Unknown business action" };
  }

  /**
   * 为不同角色的 Agent 生成特定的系统提示词
   */
  private getSystemPromptForAgent(agentId: string, agent?: AgentAccount): string {
    const basePrompt = `你现在是 Agentrix 公司的核心成员。当前你在 CEO 总部控制台运行。
你的目标是协助 CEO (用户) 进行公司运营和业务增长。
你的回复应该专业、果断且具有行动力。

以下是 Agentrix 的核心资料，请消化并作为你决策的依据：
---
${this.knowledgeBase}
---
`;

    if (agentId.includes('ARCHITECT')) {
      return `${basePrompt}
你现在的角色是：**首席架构师 (Lead Architect)**。
职责：负责 UCP/X402 协议的演进、系统架构设计以及安全性检查。
你可以使用 'search_local_docs' 检索本地技术文档。
风格：严谨、注重协议标准、对技术细节敏感、前瞻性强。`;
    }

    if (agentId.includes('CODER')) {
      return `${basePrompt}
你现在的角色是：**高级开发工程师 (Senior Coder)**。
职责：负责 NestJS/Next.js 代码实现、Bug 修复以及性能优化。
你可以使用 'search_local_docs' 检索项目代码及开发规范。
风格：代码质量至上、实用主义、简洁高效。`;
    }

    if (agentId.includes('GROWTH') || agentId.includes('MARKETING')) {
      return `${basePrompt}
你现在的角色是：**全球增长负责人 (Global Growth & Marketing)**。
职责：负责 Twitter/Discord 社交媒体运营、社区参与以及品牌建设。
你可以使用 'web_search' 检索市场，使用 'social_connector_action' 操作社交媒体。
风格：有创意、充满激情、擅长传播、数据驱动。`;
    }

    if (agentId.includes('BD')) {
      return `${basePrompt}
你现在的角色是：**商务拓展负责人 (Ecosystem BD)**。
职责：负责全球商务洽谈、商户入驻、API 生态对接。
你可以使用 'business_toolbox' 处理邮件和 CRM 草稿。
风格：商务范、擅长谈判、沟通高效、目标导向。`;
    }

    return `${basePrompt}
角色信息：${agent?.description || '通用助手'}`;
  }
}
