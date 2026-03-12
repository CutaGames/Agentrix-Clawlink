import { Controller, Get, Post, Body, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ClaudeIntegrationService } from './claude-integration.service';

@Controller('claude')
export class ClaudeIntegrationController {
  constructor(
    private claudeService: ClaudeIntegrationService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  /** Best-effort userId extraction from Bearer token (no guard — stays public). */
  private extractUserIdFromToken(req: Request): string | undefined {
    const auth = req.headers?.authorization;
    if (!auth?.startsWith('Bearer ')) return undefined;
    try {
      const secret = this.configService.get<string>('JWT_SECRET', 'default-secret');
      const payload = this.jwtService.verify(auth.slice(7), { secret });
      return payload?.sub as string | undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * 获取 Claude Function Schemas
   * GET /api/claude/functions
   */
  @Get('functions')
  async getFunctions() {
    const functions = await this.claudeService.getFunctionSchemas();
    return {
      functions,
      count: functions.length,
    };
  }

  /**
   * 执行 Function Call
   * POST /api/claude/function-call
   */
  @Post('function-call')
  async executeFunctionCall(
    @Req() req: Request,
    @Body()
    body: {
      function: {
        name: string;
        arguments: string | Record<string, any>;
      };
      context?: {
        userId?: string;
        sessionId?: string;
      };
    },
  ) {
    const { function: func, context = {} } = body;

    // Extract userId from JWT if not already in context
    if (!context.userId) {
      context.userId = this.extractUserIdFromToken(req);
    }

    let parameters: Record<string, any> = {};
    try {
      if (typeof func.arguments === 'string') {
        parameters = JSON.parse(func.arguments);
      } else {
        parameters = func.arguments;
      }
    } catch (error) {
      return {
        success: false,
        error: 'INVALID_ARGUMENTS',
        message: '参数格式错误',
      };
    }

    const result = await this.claudeService.executeFunctionCall(
      func.name,
      parameters,
      context,
    );

    return result;
  }

  /**
   * 快速测试接口
   * GET /api/claude/test?query={query}
   */
  @Get('test')
  async testSearch(@Query('query') query: string) {
    if (!query) {
      return { error: 'Query parameter is required' };
    }

    const result = await this.claudeService.executeFunctionCall(
      'search_agentrix_products',
      { query },
      {},
    );

    return result;
  }

  /**
   * 对话接口（带 Function Calling）
   * POST /api/claude/chat
   * 
   * 支持用户提供自己的 Anthropic API Key
   */
  @Post('chat')
  async chat(
    @Req() req: Request,
    @Body()
    body: {
      messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
      anthropicApiKey?: string; // 用户提供的 API Key（可选）
      context?: {
        userId?: string;
        sessionId?: string;
      };
      options?: {
        model?: string;
        temperature?: number;
        maxTokens?: number;
        enableModelRouting?: boolean; // 是否启用模型路由（默认启用）
      };
    },
  ) {
    const { messages, anthropicApiKey, context = {}, options } = body;

    // Extract userId from JWT if not already in context
    if (!context.userId) {
      context.userId = this.extractUserIdFromToken(req);
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return { error: 'messages array is required and must not be empty' };
    }

    // If the client already provides a system message, use it as-is.
    // Otherwise inject the default personal agent system prompt.
    const hasClientSystemMessage = messages.some(m => m.role === 'system');

    const defaultSystemPrompt = `You are the user's own personal AI agent on Agentrix platform. You can help the user with anything they need — answering questions, researching topics, writing, coding, analysis, and more.

The chat client is a rich mobile app with full media support:
- Images: Include image URLs (or markdown ![alt](url)) in your reply and they will render as inline image cards.
- Audio: Every message has a "Play Audio" button for TTS playback. Voice is fully supported.
- Files: File URLs render as downloadable cards.
NEVER say the chat is "text-only" or that it cannot display images, play audio, or handle media.

## Tool Capabilities — USE THEM when relevant:
### Marketplace & Skills
- **Web search** (search_web): search for up-to-date information
- **Marketplace products** (search_agentrix_products): search goods, services, APIs, resources
- **AI Skills** (skill_search, skill_install, skill_execute): search, install, and run AI skills from OpenClaw Hub
- **Publish** (skill_publish, resource_publish): publish new skills or resources to the marketplace

### Commerce & Payment
- **Shopping** (add_to_agentrix_cart, view_agentrix_cart, checkout_agentrix_cart, buy_agentrix_product): full e-commerce flow
- **Orders & Payment** (get_agentrix_order, pay_agentrix_order): order tracking and payment
- **Marketplace purchase** (marketplace_purchase): purchase skills/resources with wallet balance

### Wallet & Finance
- **Wallet Balance** (get_balance): check the agent's wallet balance and available funds — ALWAYS call this when user asks about their balance
- **Asset Overview** (asset_overview): comprehensive view of wallet assets, chains, and protocol status

### Task Marketplace
- **Tasks** (task_search, task_post, task_accept, task_submit): search, post, accept, and complete tasks/bounties

### Share & Social
- **Share** (share_content): generate share links and posters for any marketplace item

## Image Generation
You CAN generate images by searching for image generation skills (call skill_search for "image generation", "DALL-E", etc.), installing them, and executing them. NEVER say "I cannot generate images".

## Screenshot & Browser
You CAN take screenshots via installable skills. Call skill_search for "screenshot" or "browser automation".

${context.userId ? `Authenticated User ID: ${context.userId}` : 'User is not authenticated — some features may be limited.'}
${context.sessionId ? `Session: ${context.sessionId}` : ''}

Always reply in the same language the user uses. When the user asks to do something, call the appropriate tool — never say you cannot do it if a tool exists for it.`;

    const baseMessages = hasClientSystemMessage ? messages : [
      { role: 'system' as const, content: defaultSystemPrompt },
      ...messages,
    ];

    // Convert image attachment URLs in user messages to Claude multimodal content blocks
    const allMessages = baseMessages.map(m => {
      if (m.role !== 'user' || typeof m.content !== 'string') return m;
      const imageUrlPattern = /URL:\s*(https?:\/\/\S+\.(?:jpg|jpeg|png|gif|webp)(?:\?\S*)?)/gi;
      const imageUrls: string[] = [];
      let match: RegExpExecArray | null;
      while ((match = imageUrlPattern.exec(m.content)) !== null) {
        imageUrls.push(match[1]);
      }
      if (imageUrls.length === 0) return m;
      const contentBlocks: any[] = [];
      for (const url of imageUrls) {
        contentBlocks.push({ type: 'image', source: { type: 'url', url } });
      }
      contentBlocks.push({ type: 'text', text: m.content });
      return { ...m, content: contentBlocks };
    });

    const result = await this.claudeService.chatWithFunctions(allMessages, {
      ...options,
      context,
      userApiKey: anthropicApiKey,
    });

    return result;
  }
}

