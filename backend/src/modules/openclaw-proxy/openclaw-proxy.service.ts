import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadGatewayException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgentAccount, AgentAccountStatus } from '../../entities/agent-account.entity';
import { OpenClawInstance, OpenClawInstanceStatus } from '../../entities/openclaw-instance.entity';
import { OpenClawConnectionService } from '../openclaw-connection/openclaw-connection.service';
import { ClaudeIntegrationService } from '../ai-integration/claude/claude-integration.service';
import { TokenQuotaService, estimateTokens } from '../token-quota/token-quota.service';
import { SkillExecutorService, ExecutionContext } from '../skill/skill-executor.service';
import { AGENT_PRESET_SKILLS, getDefaultEnabledSkills, PresetSkill } from '../skill/agent-preset-skills.config';
import { SkillService } from '../skill/skill.service';
import { RelayRegistry } from '../openclaw-connection/telegram-bot.service';
import { Response } from 'express';

export interface ChatMessageDto {
  message: string;
  sessionId?: string;
  context?: Record<string, any>;
  model?: string;
}

interface RuntimePermissionProfile {
  agentAccountId?: string;
  agentAccountName?: string;
  agentAccountStatus?: string;
  allowedToolNames: string[];
  deniedToolNames: string[];
}

@Injectable()
export class OpenClawProxyService {
  private readonly logger = new Logger(OpenClawProxyService.name);

  constructor(
    private readonly connectionService: OpenClawConnectionService,
    private readonly tokenQuotaService: TokenQuotaService,
    @Inject(forwardRef(() => ClaudeIntegrationService))
    private readonly claudeIntegrationService: ClaudeIntegrationService,
    @Inject(forwardRef(() => SkillExecutorService))
    private readonly skillExecutorService: SkillExecutorService,
    @Inject(forwardRef(() => SkillService))
    private readonly skillService: SkillService,
    @InjectRepository(OpenClawInstance)
    private instanceRepo: Repository<OpenClawInstance>,
    @InjectRepository(AgentAccount)
    private agentAccountRepo: Repository<AgentAccount>,
  ) {}

  private async ensureOwnedInstance(userId: string, instanceId: string): Promise<OpenClawInstance> {
    return this.connectionService.getInstanceById(userId, instanceId);
  }

  private async resolveInstance(userId: string, instanceId: string): Promise<OpenClawInstance> {
    const instance = await this.ensureOwnedInstance(userId, instanceId);
    if (instance.status !== OpenClawInstanceStatus.ACTIVE) {
      throw new BadGatewayException(`Instance "${instance.name}" is not active (status: ${instance.status})`);
    }
    if (!instance.instanceUrl) {
      throw new BadGatewayException('Instance has no URL configured');
    }
    return instance;
  }

  private isPlatformHosted(instance: OpenClawInstance): boolean {
    return !instance.instanceUrl || !!(instance.capabilities as any)?.platformHosted;
  }

  private buildPlatformToolSchema(skill: PresetSkill) {
    // Per-skill tailored schemas so Claude knows exactly what each tool accepts
    const schemas: Record<string, { properties: Record<string, any>; required?: string[] }> = {
      skill_search: {
        properties: {
          query: { type: 'string', description: 'Search query — keyword, skill name, or description' },
          category: { type: 'string', description: 'Filter by category (e.g. utility, social, finance)' },
          limit: { type: 'number', description: 'Max results to return (default 10)' },
        },
        required: ['query'],
      },
      skill_install: {
        properties: {
          query: { type: 'string', description: 'Skill name or search query to find and install' },
          skillId: { type: 'string', description: 'Direct skill ID or slug if known' },
        },
      },
      skill_execute: {
        properties: {
          query: { type: 'string', description: 'Skill name or search query to find and execute' },
          skillId: { type: 'string', description: 'Direct skill ID or slug if known' },
          input: { type: 'object', description: 'Structured input payload for the skill' },
          prompt: { type: 'string', description: 'Natural-language prompt for prompt-based skills' },
        },
      },
      skill_recommend: {
        properties: {
          intent: { type: 'string', description: 'What the user wants to accomplish' },
          category: { type: 'string', description: 'Preferred category' },
          limit: { type: 'number', description: 'Max recommendations' },
        },
      },
      skill_publish: {
        properties: {
          name: { type: 'string', description: 'Skill name (alphanumeric, underscores, hyphens)' },
          displayName: { type: 'string', description: 'Human-readable display name' },
          description: { type: 'string', description: 'Skill description' },
          category: { type: 'string', description: 'Category: utility, social, finance, etc.' },
          tags: { type: 'array', items: { type: 'string' }, description: 'Tags for discoverability' },
          price: { type: 'number', description: 'Price per call (0 for free)' },
        },
        required: ['name', 'description'],
      },
      search_products: {
        properties: {
          query: { type: 'string', description: 'Search query for physical goods, digital resources, or paid services (NOT skills — use skill_search for skills)' },
          category: { type: 'string', description: 'Product category' },
          limit: { type: 'number', description: 'Max results' },
        },
        required: ['query'],
      },
      marketplace_purchase: {
        properties: {
          skillId: { type: 'string', description: 'Skill ID to purchase' },
          itemId: { type: 'string', description: 'Item ID to purchase' },
          paymentMethod: { type: 'string', description: 'wallet, stripe, quickpay' },
        },
      },
      task_search: {
        properties: {
          query: { type: 'string', description: 'Task search query' },
          category: { type: 'string', description: 'Task category' },
          limit: { type: 'number', description: 'Max results' },
        },
      },
      task_post: {
        properties: {
          title: { type: 'string', description: 'Task title' },
          description: { type: 'string', description: 'Task description and requirements' },
          budget: { type: 'number', description: 'Task budget amount' },
          currency: { type: 'string', description: 'Currency code (USD, CNY)' },
        },
        required: ['title', 'description'],
      },
      task_accept: {
        properties: {
          taskId: { type: 'string', description: 'Task ID to accept' },
        },
        required: ['taskId'],
      },
      task_submit: {
        properties: {
          taskId: { type: 'string', description: 'Task ID' },
          message: { type: 'string', description: 'Submission message or notes' },
          deliverables: { type: 'array', items: { type: 'string' }, description: 'URLs or descriptions of deliverables' },
        },
        required: ['taskId'],
      },
      get_balance: {
        properties: {
          chain: { type: 'string', description: 'Blockchain network (optional, default: all chains)' },
        },
      },
      resource_search: {
        properties: {
          query: { type: 'string', description: 'Search query for resources, services, APIs' },
          category: { type: 'string', description: 'Category filter' },
          limit: { type: 'number', description: 'Max results' },
        },
        required: ['query'],
      },
      create_order: {
        properties: {
          productId: { type: 'string', description: 'Product or resource ID to order' },
          quantity: { type: 'number', description: 'Quantity (default 1)' },
          shippingAddress: { type: 'string', description: 'Shipping address (for physical goods)' },
        },
        required: ['productId'],
      },
      x402_pay: {
        properties: {
          url: { type: 'string', description: 'X402 payment URL or resource endpoint' },
          amount: { type: 'number', description: 'Payment amount' },
          currency: { type: 'string', description: 'Currency (USDC, ETH, etc.)' },
        },
      },
      quickpay_execute: {
        properties: {
          amount: { type: 'number', description: 'Payment amount' },
          currency: { type: 'string', description: 'Currency' },
          recipient: { type: 'string', description: 'Recipient address or agent ID' },
          description: { type: 'string', description: 'Payment description' },
        },
      },
      agent_discover: {
        properties: {
          query: { type: 'string', description: 'Search query for finding agents' },
          capability: { type: 'string', description: 'Required agent capability' },
          limit: { type: 'number', description: 'Max results' },
        },
      },
      agent_invoke: {
        properties: {
          agentId: { type: 'string', description: 'Target agent ID to invoke' },
          task: { type: 'string', description: 'Task description for the agent' },
          input: { type: 'object', description: 'Structured input for the agent' },
        },
        required: ['agentId', 'task'],
      },
      asset_overview: {
        properties: {
          chain: { type: 'string', description: 'Blockchain network filter (optional)' },
        },
      },
      resource_publish: {
        properties: {
          name: { type: 'string', description: 'Resource name' },
          description: { type: 'string', description: 'Detailed description' },
          resourceType: { type: 'string', enum: ['api', 'dataset', 'model', 'workflow', 'service', 'product'], description: 'Resource type' },
          price: { type: 'number', description: 'Price' },
          currency: { type: 'string', description: 'Currency (default USDC)' },
        },
        required: ['name', 'description'],
      },
    };

    const specific = schemas[skill.handlerName];
    return {
      name: skill.handlerName,
      description: skill.description,
      input_schema: {
        type: 'object' as const,
        properties: specific?.properties ?? {
          query: { type: 'string', description: 'Search query or natural-language request' },
          input: { type: 'object', description: 'Structured input payload' },
          params: { type: 'object', description: 'Generic structured params' },
        },
        ...(specific?.required ? { required: specific.required } : {}),
        additionalProperties: true,
      },
    };
  }

  private buildMarketplaceSkillToolName(name: string): string {
    return `installed_${String(name || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')}`;
  }

  private async resolveRuntimePermissionProfile(userId: string, instance: OpenClawInstance): Promise<RuntimePermissionProfile | null> {
    const agentAccountId = typeof instance.metadata?.agentAccountId === 'string'
      ? instance.metadata.agentAccountId
      : undefined;

    if (!agentAccountId) return null;

    const agentAccount = await this.agentAccountRepo.findOne({ where: { id: agentAccountId, ownerId: userId } });
    if (!agentAccount) {
      return null;
    }

    const p = agentAccount.permissions || {} as any;
    const deniedToolNames = new Set<string>();

    // Only fully deny tools for SUSPENDED or REVOKED accounts
    // DRAFT and ACTIVE accounts get full tool access (gated by granular permissions below)
    if (agentAccount.status === AgentAccountStatus.SUSPENDED || agentAccount.status === AgentAccountStatus.REVOKED) {
      AGENT_PRESET_SKILLS.forEach((skill) => deniedToolNames.add(skill.handlerName));
    }

    // Granular permission checks — only deny when EXPLICITLY set to false
    if (p.skillSearchEnabled === false) {
      ['skill_search', 'skill_recommend'].forEach((n) => deniedToolNames.add(n));
    }
    if (p.skillInstallEnabled === false) {
      deniedToolNames.add('skill_install');
    }
    if (p.skillExecuteEnabled === false) {
      deniedToolNames.add('skill_execute');
    }
    if (p.skillPublishEnabled === false) {
      deniedToolNames.add('skill_publish');
    }
    if (p.commerceBrowseEnabled === false) {
      ['search_products', 'resource_search'].forEach((n) => deniedToolNames.add(n));
    }
    if (p.commercePurchaseEnabled === false) {
      ['marketplace_purchase', 'create_order'].forEach((n) => deniedToolNames.add(n));
    }
    if (p.walletReadEnabled === false) {
      ['get_balance', 'asset_overview'].forEach((n) => deniedToolNames.add(n));
    }
    if (p.quickpayEnabled === false) {
      deniedToolNames.add('quickpay_execute');
    }
    if (p.x402PayEnabled === false) {
      deniedToolNames.add('x402_pay');
    }
    if (p.autonomousPaymentEnabled === false) {
      ['create_order', 'x402_pay', 'quickpay_execute', 'marketplace_purchase'].forEach((n) => deniedToolNames.add(n));
    }
    if (p.a2aDiscoverEnabled === false) {
      deniedToolNames.add('agent_discover');
    }
    if (p.a2aInvokeEnabled === false) {
      deniedToolNames.add('agent_invoke');
    }
    if (p.taskSearchEnabled === false) {
      deniedToolNames.add('task_search');
    }
    if (p.taskPostEnabled === false) {
      deniedToolNames.add('task_post');
    }
    if (p.taskAcceptEnabled === false) {
      deniedToolNames.add('task_accept');
    }
    if (p.taskSubmitEnabled === false) {
      deniedToolNames.add('task_submit');
    }
    if (p.resourceSearchEnabled === false) {
      deniedToolNames.add('resource_search');
    }
    if (p.resourcePublishEnabled === false) {
      deniedToolNames.add('resource_publish');
    }
    if (p.webSearchEnabled === false) {
      deniedToolNames.add('search_web');
    }
    if (p.telegramEnabled === false) {
      deniedToolNames.add('agent_invoke');
    }
    if (p.twitterEnabled === false) {
      deniedToolNames.add('resource_publish');
    }

    const allPresetToolNames = AGENT_PRESET_SKILLS.map((skill) => skill.handlerName);
    return {
      agentAccountId: agentAccount.id,
      agentAccountName: agentAccount.name,
      agentAccountStatus: agentAccount.status,
      allowedToolNames: allPresetToolNames.filter((name) => !deniedToolNames.has(name)),
      deniedToolNames: [...deniedToolNames],
    };
  }

  private async buildPlatformHostedTools(userId: string, instance: OpenClawInstance): Promise<{
    additionalTools: any[];
    onToolCall: (name: string, args: any) => Promise<any>;
  }> {
    const permissionProfile = await this.resolveRuntimePermissionProfile(userId, instance);
    const installations = await this.skillService.findEffectiveInstalledSkillsForInstance(instance.id, userId);
    const enabledInstallations = installations.filter((installation: any) => installation?.isEnabled && installation?.skill);

    const presetTools = AGENT_PRESET_SKILLS
      .filter((skill) => skill.enabledByDefault || skill.handlerName === 'skill_publish' || skill.handlerName === 'resource_publish')
      .filter((skill) => !permissionProfile?.deniedToolNames.includes(skill.handlerName))
      .map((skill) => this.buildPlatformToolSchema(skill));
    const installedToolEntries = enabledInstallations.map((installation: any) => {
      const skill = installation.skill;
      return {
        toolName: this.buildMarketplaceSkillToolName(skill.displayName || skill.name || skill.id),
        skill,
        schema: {
          name: this.buildMarketplaceSkillToolName(skill.displayName || skill.name || skill.id),
          description: skill.description || `Execute installed marketplace skill ${skill.displayName || skill.name}`,
          input_schema: skill.inputSchema || {
            type: 'object' as const,
            properties: {
              input: { type: 'string' },
            },
            additionalProperties: true,
          },
        },
      };
    });

    const installedToolMap = new Map(installedToolEntries.map((entry) => [entry.toolName, entry.skill]));

    return {
      additionalTools: [
        ...presetTools,
        ...installedToolEntries.map((entry) => entry.schema),
      ],
      onToolCall: async (name: string, args: any) => {
        const preset = AGENT_PRESET_SKILLS.find((skill) => skill.handlerName === name);
        const ctx: ExecutionContext = {
          userId,
          sessionId: undefined,
          metadata: {
            instanceId: instance.id,
            source: 'platform-hosted-chat',
            agentAccountId: permissionProfile?.agentAccountId,
            permissionProfile,
          },
        };

        if (permissionProfile?.deniedToolNames.includes(name)) {
          throw new ForbiddenException(`Tool ${name} is disabled by the bound Agent Account permission profile.`);
        }

        if (preset) {
          return this.skillExecutorService.executeInternal(name, args || {}, ctx);
        }

        const installedSkill = installedToolMap.get(name);
        if (installedSkill) {
          return this.skillExecutorService.execute(installedSkill.id, args || {}, ctx);
        }

        return undefined;
      },
    };
  }

  private extractSkillIntentQuery(message: string): string {
    let q = String(message || '')
      .replace(/(?:帮我|请|麻烦|能否|可以|could you|please)/gi, ' ')
      .replace(/(?:在|从)?\s*(?:openclaw|clawhub)\s*(?:hub|市场)?/gi, ' ')
      .replace(/(?:install|add|enable|search|find|look for|retrieve|use|装上|安装|添加|启用|搜索|检索|查找|找一下)/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    // If stripping removed everything (e.g. "搜索openclaw skill"), keep original minus action words
    if (!q || q === 'skill' || q === 'skills' || q === '技能') {
      q = String(message || '')
        .replace(/(?:帮我|请|麻烦|能否|可以|could you|please)/gi, ' ')
        .replace(/(?:install|add|enable|search|find|look for|retrieve|use|装上|安装|添加|启用|搜索|检索|查找|找一下)/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }
    return q;
  }

  private async tryHandleDirectSkillIntent(
    userId: string,
    instance: OpenClawInstance,
    message: string,
  ): Promise<{
    sessionId: string;
    reply: { id: string; role: 'assistant'; content: string; createdAt: string };
    toolCalls: any[];
    platformHosted: true;
  } | null> {
    const normalized = String(message || '').toLowerCase();
    const mentionsHub = /(openclaw|clawhub|技能|skill|市场|marketplace|hub)/i.test(message);
    if (!mentionsHub) return null;

    const ctx: ExecutionContext = {
      userId,
      sessionId: `platform-${Date.now()}`,
      metadata: { instanceId: instance.id, source: 'platform-hosted-chat' },
    };

    const query = this.extractSkillIntentQuery(message) || message.trim();

    if (/(install|add|enable|装上|安装|添加|启用)/i.test(normalized)) {
      try {
        const installResult = await this.skillExecutorService.executeInternal('skill_install', { query }, ctx);
        return {
          sessionId: ctx.sessionId!,
          reply: {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: installResult?.message || `Skill ${query} installed successfully.`,
            createdAt: new Date().toISOString(),
          },
          toolCalls: [{ name: 'skill_install', input: { query }, output: installResult }],
          platformHosted: true,
        };
      } catch (err: any) {
        this.logger.warn(`Direct skill install intent failed: ${err.message}`);
        return null;
      }
    }

    if (/(search|find|look for|retrieve|搜索|搜一下|搜搜|检索|查找|找一下|找找|浏览|看看|有什么|有哪些|browse|list|show)/i.test(normalized)) {
      try {
        const searchResult = await this.skillExecutorService.executeInternal('skill_search', { query, limit: 10 }, ctx);
        const skills = Array.isArray(searchResult?.skills) ? searchResult.skills : [];
        const content = skills.length > 0
          ? `Found ${searchResult.total || skills.length} skills:\n` + skills
              .slice(0, 10)
              .map((skill: any, index: number) => `${index + 1}. **${skill.name || skill.id}**${skill.source ? ` [${skill.source}]` : ''} - ${skill.description || 'No description'}`)
              .join('\n')
          : `No matching skills found for "${query}". Try broader keywords.`;

        return {
          sessionId: ctx.sessionId!,
          reply: {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content,
            createdAt: new Date().toISOString(),
          },
          toolCalls: [{ name: 'skill_search', input: { query, limit: 10 }, output: searchResult }],
          platformHosted: true,
        };
      } catch (err: any) {
        this.logger.warn(`Direct skill search intent failed: ${err.message}`);
        return null; // fall through to LLM path
      }
    }

    if (/(execute|run|call|invoke|执行|运行|调用|用一下)/i.test(normalized)) {
      try {
        const executeResult = await this.skillExecutorService.executeInternal('skill_execute', { query }, ctx);
        return {
          sessionId: ctx.sessionId!,
          reply: {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: executeResult?.result?.output || executeResult?.message || `Skill executed successfully.`,
            createdAt: new Date().toISOString(),
          },
          toolCalls: [{ name: 'skill_execute', input: { query }, output: executeResult }],
          platformHosted: true,
        };
      } catch (err: any) {
        return {
          sessionId: ctx.sessionId!,
          reply: {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: `Failed to execute skill "${query}": ${err.message}`,
            createdAt: new Date().toISOString(),
          },
          toolCalls: [],
          platformHosted: true,
        };
      }
    }

    return null;
  }

  /**
   * Parse user message for image attachment URLs and build Claude multimodal content blocks.
   * If images are found, returns an array of content blocks; otherwise returns the plain string.
   */
  private buildUserContent(message: string): string | Array<{ type: string; [k: string]: any }> {
    const imageUrlPattern = /URL:\s*(https?:\/\/\S+\.(?:jpg|jpeg|png|gif|webp)(?:\?\S*)?)/gi;
    const imageUrls: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = imageUrlPattern.exec(message)) !== null) {
      imageUrls.push(match[1]);
    }

    if (imageUrls.length === 0) {
      return message;
    }

    // Build multimodal content blocks for Claude vision
    const contentBlocks: Array<{ type: string; [k: string]: any }> = [];
    for (const url of imageUrls) {
      contentBlocks.push({
        type: 'image',
        source: { type: 'url', url },
      });
    }
    contentBlocks.push({ type: 'text', text: message });
    return contentBlocks;
  }

  private async runPlatformHostedChat(
    userId: string,
    instance: OpenClawInstance,
    dto: ChatMessageDto,
  ) {
    const directSkillIntent = await this.tryHandleDirectSkillIntent(userId, instance, dto.message);
    if (directSkillIntent) {
      return directSkillIntent;
    }

    const { additionalTools, onToolCall } = await this.buildPlatformHostedTools(userId, instance);
    const permissionProfile = await this.resolveRuntimePermissionProfile(userId, instance);
    const sessionId = dto.sessionId || `platform-${Date.now()}`;
    const messages = [
      {
        role: 'system' as const,
        content:
          `You are "${instance.name || 'Agent'}", the user's personal AI claw. ` +
          `You are not Agentrix customer support, not a platform helpdesk, and not a generic service bot. ` +
          `Act like the user's own agent with built-in marketplace abilities.\n\n` +
          `## OpenClaw Hub & Marketplace\n` +
          `You have FULL access to the OpenClaw Hub marketplace with thousands of skills. Use these tools:\n` +
          `- **skill_search**: Search skills by keyword, name, or description. Always call this when the user asks about available skills.\n` +
          `- **skill_install**: Install a skill by name or ID onto this claw.\n` +
          `- **skill_execute**: Run/execute a skill with input parameters.\n` +
          `- **skill_recommend**: Get personalized skill recommendations.\n` +
          `- **skill_publish**: Publish a new skill to the marketplace.\n` +
          `- **resource_publish**: Publish resources, APIs, datasets, or workflows to the marketplace.\n` +
          `- **marketplace_purchase**: Purchase a paid skill or resource.\n\n` +
          `## Commerce & Payment\n` +
          `You have FULL payment and commerce capabilities:\n` +
          `- **search_products**: Search physical goods, digital resources, paid services.\n` +
          `- **resource_search**: Search resources, APIs, and service listings.\n` +
          `- **create_order**: Place orders for products and services.\n` +
          `- **get_balance**: Check the agent's wallet balance, funds, and available currencies.\n` +
          `- **asset_overview**: Get comprehensive view of wallet assets, balances, and X402 status.\n` +
          `- **x402_pay**: Execute X402 protocol payments for paid APIs and services.\n` +
          `- **quickpay_execute**: One-click micro-payments.\n\n` +
          `## Task Marketplace\n` +
          `Full task/bounty lifecycle:\n` +
          `- **task_search**: Browse available tasks and bounties.\n` +
          `- **task_post**: Post new tasks with budgets.\n` +
          `- **task_accept**: Accept available tasks.\n` +
          `- **task_submit**: Submit deliverables for completed tasks.\n\n` +
          `## Agent-to-Agent (A2A)\n` +
          `- **agent_discover**: Find other agents for collaboration or delegation.\n` +
          `- **agent_invoke**: Delegate tasks to other agents via A2A protocol.\n\n` +
          `## Client UI Capabilities\n` +
          `The chat client is a rich mobile app, NOT a plain-text terminal:\n` +
          `- **Images**: Any image URL (ending in .png/.jpg/.gif/.webp etc.) or markdown image syntax ![alt](url) you include in your reply will be rendered as an inline image card. ALWAYS include image URLs directly in your text when you generate or reference images.\n` +
          `- **Audio/TTS**: Every assistant message has a "Play Audio" button. The client will use TTS to read your reply aloud. Voice recording/playback is fully handled by the client. NEVER say the chat cannot play audio.\n` +
          `- **Files**: File URLs (pdf/txt/csv etc.) are rendered as downloadable file cards.\n` +
          `- **User Attachments**: Users can send images, photos, and files as attachments. Treat attachment URLs as usable inputs.\n\n` +
          `## Image Generation\n` +
          `You CAN generate images. To do so:\n` +
          `1. Call skill_search to find image generation skills (e.g. "image generation", "DALL-E", "stable diffusion").\n` +
          `2. If not installed, call skill_install to install the skill.\n` +
          `3. Call skill_execute with the image prompt to generate the image.\n` +
          `4. Include the returned image URL in your reply using ![description](url) so the client renders it.\n` +
          `NEVER say "I cannot generate images" or "I don't have image generation capability". Use skill_search to find and use one.\n\n` +
          `## Screenshot & Browser Automation\n` +
          `You CAN take screenshots and automate browsers via installable skills:\n` +
          `- Call skill_search for "screenshot", "browser automation", "puppeteer", "selenium".\n` +
          `- Install and execute the appropriate skill. NEVER say screenshots are unavailable.\n\n` +
          `## Rules\n` +
          `1. When the user asks to search, install, execute, buy, pay for, publish, or manage skills: ALWAYS use the appropriate tool. NEVER say you cannot access the marketplace.\n` +
          `2. When the user asks to generate, analyze, edit, upload, or send images/files/media: use skill_search, skill_install, or skill_execute to obtain that capability. NEVER say you are a "text-only interface" or that the chat "does not support" images, audio, or media. The client renders all of these.\n` +
          `3. When a tool returns media or file URLs, include those URLs plainly in your reply so the client can render rich cards. Use markdown image syntax ![description](url) for images.\n` +
          `4. Voice capture and playback are handled by the client. NEVER tell the user that voice conversation is unsupported.\n` +
          `5. When tool results are returned, summarize them clearly. Do not claim lack of access.\n` +
          `6. If a search returns no results, suggest different keywords or broader queries.\n` +
          `7. Reply in the same language as the user, stay concise, and focus on getting the task done.\n` +
          `8. When the user asks about wallet balance, funds, or financial status: call get_balance or asset_overview. NEVER guess balances.\n` +
          `${permissionProfile
            ? `9. This instance is bound to Agent Account "${permissionProfile.agentAccountName}" (${permissionProfile.agentAccountStatus}). Disabled tools: ${permissionProfile.deniedToolNames.length > 0 ? permissionProfile.deniedToolNames.join(', ') : 'none'}. Never claim a disabled action succeeded; explain that the bound permission profile blocked it.`
            : '9. No Agent Account permission profile is currently bound to this instance.'}`,
      },
      { role: 'user' as const, content: this.buildUserContent(dto.message) },
    ];

    const result = await this.claudeIntegrationService.chatWithFunctions(messages, {
      model: dto.model || (instance.capabilities as any)?.activeModel || process.env.DEFAULT_MODEL || 'claude-haiku-4-5',
      context: { userId, sessionId },
      additionalTools,
      onToolCall,
    });

    const text = result?.text || '';
    const inputTokens = estimateTokens(dto.message);
    const outputTokens = estimateTokens(text);
    this.tokenQuotaService.deductTokens(userId, inputTokens, outputTokens).catch(
      (err) => this.logger.warn(`Token deduct failed: ${err.message}`),
    );

    return {
      sessionId,
      reply: {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: text,
        createdAt: new Date().toISOString(),
      },
      toolCalls: result?.toolCalls || null,
      platformHosted: true,
    };
  }

  private async streamPlatformHostedChat(
    userId: string,
    instance: OpenClawInstance,
    dto: ChatMessageDto,
    res: Response,
  ): Promise<void> {
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders();
    }

    try {
      const result = await this.runPlatformHostedChat(userId, instance, dto);
      const text = result.reply?.content || 'Sorry, I could not generate a response.';
      const chunks = text.match(/.{1,12}/gs) || [text];
      for (const chunk of chunks) {
        if (res.writableEnded) break;
        res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
        if ((res as any).flush) (res as any).flush();
      }
      if (!res.writableEnded) {
        res.write('data: [DONE]\n\n');
      }
    } catch (err: any) {
      this.logger.error(`Platform-hosted stream error: ${err.message}`);
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      }
    } finally {
      if (!res.writableEnded) res.end();
    }
  }

  private buildHeaders(instance: OpenClawInstance): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (instance.instanceToken) {
      headers['Authorization'] = `Bearer ${instance.instanceToken}`;
    }
    return headers;
  }

  /** Proxy a chat message to the instance and return full JSON response */
  async sendChat(userId: string, instanceId: string, dto: ChatMessageDto) {
    // Check quota before forwarding (throws ForbiddenException if exhausted)
    await this.tokenQuotaService.getOrCreateCurrentQuota(userId);

    const instance = await this.ensureOwnedInstance(userId, instanceId);
    if (this.isPlatformHosted(instance)) {
      return this.runPlatformHostedChat(userId, instance, dto);
    }

    const resolvedInstance = await this.resolveInstance(userId, instanceId);
    const url = `${resolvedInstance.instanceUrl}/api/chat`;

    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: this.buildHeaders(resolvedInstance),
        body: JSON.stringify({
          message: dto.message,
          sessionId: dto.sessionId,
          context: dto.context,
          model: dto.model || (resolvedInstance.capabilities as any)?.activeModel || process.env.DEFAULT_MODEL || 'claude-haiku-4-5',
        }),
        signal: AbortSignal.timeout(30_000),
      });

      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        throw new BadGatewayException(`Instance returned ${resp.status}: ${text}`);
      }

      const result = await resp.json();

      // Deduct tokens (estimate = prompt + response text length / 4)
      const inputTokens = estimateTokens(dto.message);
      const outputTokens = estimateTokens(
        typeof result?.reply === 'string' ? result.reply :
        typeof result?.message === 'string' ? result.message : '',
      );
      this.tokenQuotaService.deductTokens(userId, inputTokens, outputTokens).catch(
        err => this.logger.warn(`Token deduct failed: ${err.message}`),
      );

      return result;
    } catch (err: any) {
      if (err instanceof BadGatewayException || err instanceof ForbiddenException) throw err;
      this.logger.error(`Proxy chat error for instance ${instanceId}: ${err.message}`);
      throw new BadGatewayException(`Failed to reach OpenClaw instance: ${err.message}`);
    }
  }

  /** Stream a chat response back via Server-Sent Events (SSE) */
  async streamChat(
    userId: string,
    instanceId: string,
    dto: ChatMessageDto,
    res: Response,
  ): Promise<void> {
    const instance = await this.ensureOwnedInstance(userId, instanceId);
    if (this.isPlatformHosted(instance)) {
      return this.streamPlatformHostedChat(userId, instance, dto, res);
    }

    const resolvedInstance = await this.resolveInstance(userId, instanceId);
    const url = `${resolvedInstance.instanceUrl}/api/chat/stream`;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    try {
      const upstreamResp = await fetch(url, {
        method: 'POST',
        headers: { ...this.buildHeaders(resolvedInstance), Accept: 'text/event-stream' },
        body: JSON.stringify({
          message: dto.message,
          sessionId: dto.sessionId,
          model: dto.model || (resolvedInstance.capabilities as any)?.activeModel || process.env.DEFAULT_MODEL || 'claude-haiku-4-5',
        }),
        signal: AbortSignal.timeout(60_000),
      });

      if (!upstreamResp.ok || !upstreamResp.body) {
        res.write(`data: ${JSON.stringify({ error: 'Instance stream unavailable' })}\n\n`);
        res.end();
        return;
      }

      const reader = upstreamResp.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        res.write(chunk);
        if ((res as any).flush) (res as any).flush();
      }
    } catch (err: any) {
      this.logger.error(`Proxy stream error: ${err.message}`);
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      }
    } finally {
      if (!res.writableEnded) res.end();
    }
  }

  /** Get chat history from the instance */
  async getChatHistory(userId: string, instanceId: string, sessionId?: string) {
    const instance = await this.resolveInstance(userId, instanceId);
    const url = sessionId
      ? `${instance.instanceUrl}/api/sessions/${sessionId}/history`
      : `${instance.instanceUrl}/api/sessions`;

    try {
      const resp = await fetch(url, {
        headers: this.buildHeaders(instance),
        signal: AbortSignal.timeout(10_000),
      });
      if (!resp.ok) return [];
      return resp.json();
    } catch {
      return [];
    }
  }

  /** Get installed skills from the instance */
  async getInstanceSkills(userId: string, instanceId: string) {
    const instance = await this.ensureOwnedInstance(userId, instanceId);
    if (this.isPlatformHosted(instance)) {
      const installations = await this.skillService.findEffectiveInstalledSkillsForInstance(instanceId, userId);
      return installations
        .filter((installation: any) => !!installation?.skill)
        .map((installation: any) => ({
          id: installation.skill.id,
          name: installation.skill.displayName || installation.skill.name,
          enabled: installation.isEnabled,
          version: installation.skill.version || '1.0.0',
          description: installation.skill.description,
          installedAt: installation.installedAt,
          source: 'marketplace',
          platformHosted: true,
        }));
    }

    const resolvedInstance = await this.resolveInstance(userId, instanceId);
    try {
      const resp = await fetch(`${resolvedInstance.instanceUrl}/api/skills`, {
        headers: this.buildHeaders(resolvedInstance),
        signal: AbortSignal.timeout(10_000),
      });
      if (!resp.ok) return [];
      return resp.json();
    } catch {
      return [];
    }
  }

  /** Toggle a skill on/off */
  async toggleSkill(userId: string, instanceId: string, skillId: string, enabled: boolean) {
    const instance = await this.ensureOwnedInstance(userId, instanceId);
    if (this.isPlatformHosted(instance)) {
      const isInstalledOnInstance = await this.skillService.isSkillInstalledForInstance(instanceId, skillId);
      if (isInstalledOnInstance) {
        await this.skillService.updateInstanceInstalledSkill(instanceId, skillId, { isEnabled: enabled });
      } else {
        await this.skillService.updateInstalledSkill(userId, skillId, { isEnabled: enabled });
      }
      return { success: true, platformHosted: true, enabled };
    }

    const resolvedInstance = await this.resolveInstance(userId, instanceId);
    try {
      const resp = await fetch(`${resolvedInstance.instanceUrl}/api/skills/${skillId}/toggle`, {
        method: 'POST',
        headers: this.buildHeaders(resolvedInstance),
        body: JSON.stringify({ enabled }),
        signal: AbortSignal.timeout(10_000),
      });
      return { success: resp.ok };
    } catch {
      return { success: false };
    }
  }

  /** Push-install a skill package to the instance */
  async installSkill(userId: string, instanceId: string, skillPackageUrl: string, skillId: string) {
    const instance = await this.connectionService.getInstanceById(userId, instanceId);

    if (this.isPlatformHosted(instance)) {
      try {
        await this.skillService.installSkillForInstance(instanceId, skillId, userId);
      } catch (error: any) {
        if (!String(error?.message || '').includes('already installed')) {
          throw error;
        }
      }

      return {
        success: true,
        status: 200,
        pendingDeploy: false,
        platformHosted: true,
        skillActive: true,
        message: `Skill is now active on "${instance.name}" and available in chat immediately.`,
      };
    }

    // Allow install even if instance is not fully connected yet
    // The install record is created in /skills/{id}/install (step 1).
    // Step 2: push to instance via HTTP (cloud) or WebSocket relay (local).
    if (!instance.instanceUrl) {
      // No HTTP URL — try relay (local agents connect via WebSocket)
      if (instance.relayConnected) {
        try {
          RelayRegistry.emitToAgent(instanceId, {
            type: 'install-skill',
            skillId,
            packageUrl: skillPackageUrl,
          });
          return {
            success: true,
            status: 200,
            message: 'Skill install sent to your local agent via relay.',
            pendingDeploy: false,
          };
        } catch (err: any) {
          this.logger.warn(`Relay install to ${instanceId} failed: ${err.message}`);
        }
      }
      return {
        success: true,
        status: 200,
        message: 'Skill saved to your account. It will sync when your agent reconnects.',
        pendingDeploy: true,
      };
    }
    if (instance.status !== OpenClawInstanceStatus.ACTIVE) {
      return {
        success: true,
        status: 200,
        message: `Skill saved. Agent "${instance.name}" will sync when active.`,
        pendingDeploy: true,
      };
    }

    try {
      const resp = await fetch(`${instance.instanceUrl}/api/skills/install`, {
        method: 'POST',
        headers: this.buildHeaders(instance),
        body: JSON.stringify({ packageUrl: skillPackageUrl, skillId }),
        signal: AbortSignal.timeout(30_000),
      });
      return { success: resp.ok, status: resp.status };
    } catch (err: any) {
      // Instance unreachable — try relay fallback if connected
      this.logger.warn(`Skill push to instance ${instanceId} failed: ${err.message}`);
      if (instance.relayConnected) {
        try {
          RelayRegistry.emitToAgent(instanceId, {
            type: 'install-skill',
            skillId,
            packageUrl: skillPackageUrl,
          });
          return { success: true, status: 200, message: 'Skill install sent via relay.' };
        } catch (_) {}
      }
      return {
        success: true,
        status: 200,
        message: 'Skill saved. Push to agent failed — it will sync when agent reconnects.',
        pendingDeploy: true,
      };
    }
  }

  /** Restart the instance process */
  async restartInstance(userId: string, instanceId: string) {
    const instance = await this.resolveInstance(userId, instanceId);
    try {
      const resp = await fetch(`${instance.instanceUrl}/api/admin/restart`, {
        method: 'POST',
        headers: this.buildHeaders(instance),
        signal: AbortSignal.timeout(10_000),
      });
      return { success: resp.ok };
    } catch {
      return { success: false };
    }
  }

  /** Proxy GET /status from the instance */
  async getInstanceStatus(userId: string, instanceId: string) {
    const instance = await this.ensureOwnedInstance(userId, instanceId);
    if (this.isPlatformHosted(instance)) {
      return {
        online: true,
        status: 200,
        platformHosted: true,
        model: (instance.capabilities as any)?.activeModel || process.env.DEFAULT_MODEL || 'claude-haiku-4-5',
      };
    }

    const resolvedInstance = await this.resolveInstance(userId, instanceId);
    try {
      const resp = await fetch(`${resolvedInstance.instanceUrl}/api/health`, {
        headers: this.buildHeaders(resolvedInstance),
        signal: AbortSignal.timeout(5_000),
      });
      const data = resp.ok ? await resp.json().catch(() => ({})) : {};
      return { online: resp.ok, status: resp.status, ...data };
    } catch {
      return { online: false };
    }
  }

  // ═══════════════════════════════════════════════════════════
  // Platform Tools — Execute Agentrix platform skills through the claw proxy
  // ═══════════════════════════════════════════════════════════

  /**
   * Get available platform tools for this claw instance.
   * Returns preset skills + any user-installed skills as tool definitions.
   */
  async getAvailablePlatformTools(userId: string, instanceId: string) {
    // Validate ownership
    const instance = await this.ensureOwnedInstance(userId, instanceId);

    // Preset skills available to all claws
    const presets = AGENT_PRESET_SKILLS.map((s) => ({
      name: s.handlerName,
      displayName: s.displayName,
      description: s.description,
      category: s.category,
      enabledByDefault: s.enabledByDefault,
      icon: s.icon,
      type: 'platform' as const,
    }));

    const installations = await this.skillService.findEffectiveInstalledSkillsForInstance(instance.id, userId);
    const installedTools = installations
      .filter((installation: any) => !!installation?.skill)
      .map((installation: any) => ({
        name: this.buildMarketplaceSkillToolName(installation.skill.displayName || installation.skill.name || installation.skill.id),
        displayName: installation.skill.displayName || installation.skill.name,
        description: installation.skill.description,
        category: installation.skill.category,
        enabledByDefault: installation.isEnabled,
        icon: '⚡',
        type: 'installed-skill' as const,
        skillId: installation.skill.id,
      }));

    return {
      tools: [...presets, ...installedTools],
      total: presets.length + installedTools.length,
      defaultEnabled: getDefaultEnabledSkills().map((s) => s.handlerName),
    };
  }

  /**
   * Execute a platform tool on behalf of the claw.
   * The claw (OpenClaw instance) or mobile app can call this to execute
   * Agentrix platform capabilities (skill search, install, purchase, publish, etc.)
   */
  async executePlatformTool(
    userId: string,
    instanceId: string,
    toolName: string,
    params: Record<string, any>,
  ) {
    // Validate instance ownership
    await this.ensureOwnedInstance(userId, instanceId);

    // Validate tool name exists as a registered handler
    const presetNames = AGENT_PRESET_SKILLS.map((s) => s.handlerName);
    if (!presetNames.includes(toolName)) {
      throw new BadRequestException(
        `Unknown platform tool: "${toolName}". Available: ${presetNames.join(', ')}`,
      );
    }

    const context: ExecutionContext = {
      userId,
      sessionId: params._sessionId,
      metadata: { instanceId, source: 'openclaw-proxy' },
    };

    const startTime = Date.now();

    try {
      const result = await this.skillExecutorService.executeInternal(toolName, params, context);
      return {
        success: true,
        tool: toolName,
        result,
        executionTime: Date.now() - startTime,
      };
    } catch (err: any) {
      this.logger.error(`Platform tool "${toolName}" execution failed: ${err.message}`);
      return {
        success: false,
        tool: toolName,
        error: err.message,
        executionTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Batch-execute multiple platform tools (for agent autonomous workflows).
   */
  async executePlatformToolBatch(
    userId: string,
    instanceId: string,
    calls: Array<{ tool: string; params: Record<string, any> }>,
  ) {
    await this.ensureOwnedInstance(userId, instanceId);

    const results = [];
    for (const call of calls) {
      try {
        const result = await this.executePlatformTool(userId, instanceId, call.tool, call.params);
        results.push(result);
      } catch (err: any) {
        results.push({ success: false, tool: call.tool, error: err.message });
      }
    }

    return {
      results,
      total: calls.length,
      succeeded: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
    };
  }
}
