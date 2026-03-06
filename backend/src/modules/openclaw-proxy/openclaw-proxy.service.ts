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
import { OpenClawInstance, OpenClawInstanceStatus } from '../../entities/openclaw-instance.entity';
import { UserInstalledSkill } from '../../entities/user-installed-skill.entity';
import { Skill } from '../../entities/skill.entity';
import { OpenClawConnectionService } from '../openclaw-connection/openclaw-connection.service';
import { TokenQuotaService, estimateTokens } from '../token-quota/token-quota.service';
import { SkillExecutorService, ExecutionContext } from '../skill/skill-executor.service';
import { AGENT_PRESET_SKILLS, getDefaultEnabledSkills, PresetSkill } from '../skill/agent-preset-skills.config';
import { RelayRegistry } from '../openclaw-connection/telegram-bot.service';
import { ClaudeIntegrationService } from '../ai-integration/claude/claude-integration.service';
import { Response } from 'express';

export interface ChatMessageDto {
  message: string;
  sessionId?: string;
  context?: Record<string, any>;
  model?: string;
}

@Injectable()
export class OpenClawProxyService {
  private readonly logger = new Logger(OpenClawProxyService.name);

  constructor(
    private readonly connectionService: OpenClawConnectionService,
    private readonly tokenQuotaService: TokenQuotaService,
    @Inject(forwardRef(() => SkillExecutorService))
    private readonly skillExecutorService: SkillExecutorService,
    @Inject(forwardRef(() => ClaudeIntegrationService))
    private readonly claudeService: ClaudeIntegrationService,
    @InjectRepository(OpenClawInstance)
    private instanceRepo: Repository<OpenClawInstance>,
    @InjectRepository(UserInstalledSkill)
    private installedSkillRepo: Repository<UserInstalledSkill>,
  ) {}

  /**
   * Load user-installed marketplace skills and build:
   * 1. `additionalTools` — Anthropic-format tool schemas to pass to LLM
   * 2. `onToolCall` — execution handler for each skill
   */
  private async buildUserSkillTools(userId: string): Promise<{
    additionalTools: any[];
    onToolCall: ((name: string, args: any) => Promise<any>) | undefined;
  }> {
    let records: UserInstalledSkill[] = [];
    try {
      records = await this.installedSkillRepo.find({
        where: { userId, isEnabled: true },
        relations: ['skill'],
      });
    } catch (e: any) {
      this.logger.warn(`Could not load installed skills for ${userId}: ${e.message}`);
    }

    const skillMap = new Map<string, Skill>();
    const additionalTools: any[] = [];

    for (const rec of records) {
      const skill = rec.skill;
      if (!skill) continue;

      // Build a safe tool name (LLM tool names must be alphanumeric + underscores)
      const toolName = `skill_${skill.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`;
      skillMap.set(toolName, skill);

      // Build Anthropic-format tool schema from skill's inputSchema
      const inputSchema = skill.inputSchema || { type: 'object', properties: {}, required: [] };
      additionalTools.push({
        name: toolName,
        description: `${skill.displayName || skill.name}: ${skill.description}`,
        input_schema: {
          type: 'object' as const,
          properties: inputSchema.properties || {},
          required: inputSchema.required || [],
        },
      });
    }

    if (additionalTools.length === 0) {
      return { additionalTools: [], onToolCall: undefined };
    }

    const onToolCall = async (name: string, args: any): Promise<any> => {
      const skill = skillMap.get(name);
      if (!skill) return { error: `Unknown skill: ${name}` };

      const executor = skill.executor;
      if (!executor) return { error: 'Skill has no executor defined' };

      if (executor.type === 'internal' && executor.internalHandler) {
        // Dispatch to internal skill executor
        try {
          const ctx: ExecutionContext = { userId, sessionId: undefined, metadata: {} };
          return await this.skillExecutorService.executeInternal(executor.internalHandler, args, ctx);
        } catch (e: any) {
          return { error: e.message };
        }
      }

      if (executor.type === 'http' && executor.endpoint) {
        // Call the skill's HTTP endpoint
        try {
          const method = executor.method || 'POST';
          const resp = await fetch(executor.endpoint, {
            method,
            headers: {
              'Content-Type': 'application/json',
              ...(executor.headers || {}),
            },
            body: method !== 'GET' ? JSON.stringify({ ...args, _userId: userId }) : undefined,
            signal: AbortSignal.timeout(15_000),
          });
          if (!resp.ok) {
            const text = await resp.text().catch(() => '');
            return { error: `Skill endpoint returned ${resp.status}: ${text}` };
          }
          return resp.json();
        } catch (e: any) {
          return { error: `Skill HTTP call failed: ${e.message}` };
        }
      }

      return { error: `Unsupported skill executor type: ${executor.type}` };
    };

    return { additionalTools, onToolCall };
  }

  private async resolveInstance(userId: string, instanceId: string): Promise<OpenClawInstance> {
    const instance = await this.connectionService.getInstanceById(userId, instanceId);
    if (instance.status !== OpenClawInstanceStatus.ACTIVE) {
      throw new BadGatewayException(`Instance "${instance.name}" is not active (status: ${instance.status})`);
    }
    // Platform-hosted instances have no URL — that's OK, they route through Claude/Bedrock
    if (!instance.instanceUrl && !(instance.capabilities as any)?.platformHosted) {
      throw new BadGatewayException('Instance has no URL configured');
    }
    return instance;
  }

  /** Check if an instance is platform-hosted (uses Agentrix backend LLM, no external URL). */
  private isPlatformHosted(instance: OpenClawInstance): boolean {
    return !instance.instanceUrl || !!(instance.capabilities as any)?.platformHosted;
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

    const instance = await this.resolveInstance(userId, instanceId);

    // Platform-hosted: route through Claude/Bedrock
    if (this.isPlatformHosted(instance)) {
      const model = dto.model || (instance.capabilities as any)?.activeModel || 'claude-haiku-4-5';
      const agentName = instance.name || 'Agent';

      // Load user-installed marketplace skills as additional tools
      const { additionalTools, onToolCall } = await this.buildUserSkillTools(userId);

      const messages = [
        { role: 'system' as const, content: `You are "${agentName}", a personal AI assistant. Reply in the same language the user uses. Be concise and helpful.` },
        { role: 'user' as const, content: dto.message },
      ];
      const result = await this.claudeService.chatWithFunctions(messages, {
        model,
        context: { userId, sessionId: dto.sessionId },
        additionalTools: additionalTools.length > 0 ? additionalTools : undefined,
        onToolCall: onToolCall || undefined,
      });
      const text = result?.text || '';
      const inputTokens = estimateTokens(dto.message);
      const outputTokens = estimateTokens(text);
      this.tokenQuotaService.deductTokens(userId, inputTokens, outputTokens).catch(
        err => this.logger.warn(`Token deduct failed: ${err.message}`),
      );
      return { reply: text, toolCalls: result?.toolCalls || null };
    }

    const url = `${instance.instanceUrl}/api/chat`;

    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: this.buildHeaders(instance),
        body: JSON.stringify({
          message: dto.message,
          sessionId: dto.sessionId,
          context: dto.context,
          model: dto.model || (instance.capabilities as any)?.activeModel || process.env.DEFAULT_MODEL || 'claude-haiku-4-5',
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
    const instance = await this.resolveInstance(userId, instanceId);

    // Platform-hosted instances: route through Agentrix's Claude/Bedrock with full tool support
    if (this.isPlatformHosted(instance)) {
      return this.streamPlatformChat(userId, instance, dto, res);
    }

    const url = `${instance.instanceUrl}/api/chat/stream`;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    try {
      const upstreamResp = await fetch(url, {
        method: 'POST',
        headers: { ...this.buildHeaders(instance), Accept: 'text/event-stream' },
        body: JSON.stringify({
          message: dto.message,
          sessionId: dto.sessionId,
          model: dto.model || (instance.capabilities as any)?.activeModel || process.env.DEFAULT_MODEL || 'claude-haiku-4-5',
        }),
        signal: AbortSignal.timeout(60_000),
      });

      if (!upstreamResp.ok || !upstreamResp.body) {
        // Upstream failed — fallback to platform chat
        this.logger.warn(`Upstream ${url} returned ${upstreamResp.status}, falling back to platform chat`);
        return this.streamPlatformChat(userId, instance, dto, res);
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
      this.logger.error(`Proxy stream error: ${err.message}, falling back to platform chat`);
      if (!res.headersSent) {
        return this.streamPlatformChat(userId, instance, dto, res);
      }
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      }
    } finally {
      if (!res.writableEnded) res.end();
    }
  }

  /**
   * Stream a chat via the platform's own Claude/Bedrock integration.
   * This provides full tool calling (web search, marketplace, etc.).
   */
  private async streamPlatformChat(
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
      const model = dto.model
        || (instance.capabilities as any)?.activeModel
        || process.env.DEFAULT_MODEL
        || 'claude-haiku-4-5';

      // Build system prompt tailored to this agent
      const agentName = instance.name || 'Agent';
      const systemPrompt = `You are "${agentName}", a personal AI assistant on the Agentrix platform.
You can help the user with anything they need — answering questions, researching topics, writing, coding, analysis, and more.

You have the following real capabilities you can use:
- **Web search**: when you need up-to-date information, call the search_web tool
- **Agentrix marketplace**: search and browse products using search_agentrix_products
- **Shopping**: add items to cart, checkout, manage orders

Always reply in the same language the user uses. Be concise, helpful, and friendly.
If the user asks you to search the web, USE the search_web tool — don't say you can't.`;

      // Load user-installed marketplace skills as additional tools
      const { additionalTools, onToolCall } = await this.buildUserSkillTools(userId);

      const messages = [
        { role: 'system' as const, content: systemPrompt },
        { role: 'user' as const, content: dto.message },
      ];

      const result = await this.claudeService.chatWithFunctions(messages, {
        model,
        context: { userId, sessionId: dto.sessionId },
        additionalTools: additionalTools.length > 0 ? additionalTools : undefined,
        onToolCall: onToolCall || undefined,
      });

      const text = result?.text || 'Sorry, I could not generate a response.';

      // Stream output in small chunks for typing effect
      const chunks = text.match(/.{1,8}/gs) || [text];
      for (const chunk of chunks) {
        if (res.writableEnded) break;
        res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
        if ((res as any).flush) (res as any).flush();
      }
      if (!res.writableEnded) {
        res.write('data: [DONE]\n\n');
      }

      // Deduct tokens
      const inputTokens = estimateTokens(dto.message);
      const outputTokens = estimateTokens(text);
      this.tokenQuotaService.deductTokens(userId, inputTokens, outputTokens).catch(
        err => this.logger.warn(`Token deduct failed: ${err.message}`),
      );
    } catch (err: any) {
      this.logger.error(`Platform chat error: ${err.message}`);
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
        res.write('data: [DONE]\n\n');
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
    const instance = await this.resolveInstance(userId, instanceId);
    try {
      const resp = await fetch(`${instance.instanceUrl}/api/skills`, {
        headers: this.buildHeaders(instance),
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
    const instance = await this.resolveInstance(userId, instanceId);
    try {
      const resp = await fetch(`${instance.instanceUrl}/api/skills/${skillId}/toggle`, {
        method: 'POST',
        headers: this.buildHeaders(instance),
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
    const instance = await this.resolveInstance(userId, instanceId);
    // Platform-hosted instances are always "online" as they use the backend's LLM
    if (this.isPlatformHosted(instance)) {
      return { online: true, status: 200, platformHosted: true, model: (instance.capabilities as any)?.activeModel || 'claude-haiku-4-5' };
    }
    try {
      const resp = await fetch(`${instance.instanceUrl}/api/health`, {
        headers: this.buildHeaders(instance),
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
    await this.resolveInstance(userId, instanceId);

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

    return {
      tools: presets,
      total: presets.length,
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
    await this.resolveInstance(userId, instanceId);

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
    await this.resolveInstance(userId, instanceId);

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
