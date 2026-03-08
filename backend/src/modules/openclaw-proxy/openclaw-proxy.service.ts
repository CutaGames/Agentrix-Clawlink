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
    return {
      name: skill.handlerName,
      description: skill.description,
      input_schema: {
        type: 'object' as const,
        properties: {
          query: { type: 'string', description: 'Search query or natural-language request' },
          skillId: { type: 'string', description: 'Marketplace skill id when already known' },
          itemId: { type: 'string', description: 'Marketplace item id when already known' },
          title: { type: 'string', description: 'Task or listing title' },
          name: { type: 'string', description: 'Skill or resource name' },
          description: { type: 'string', description: 'Task, skill, or resource description' },
          category: { type: 'string', description: 'Marketplace category' },
          resourceType: { type: 'string', description: 'digital, service, physical, data, logic' },
          price: { type: 'number', description: 'Price amount if publishing or buying' },
          budget: { type: 'number', description: 'Task budget' },
          currency: { type: 'string', description: 'Currency code like USD or CNY' },
          paymentMethod: { type: 'string', description: 'wallet, stripe, quickpay, etc.' },
          input: { type: 'object', description: 'Structured input payload for skill execution' },
          params: { type: 'object', description: 'Generic structured params' },
        },
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

  private async buildPlatformHostedTools(userId: string, instance: OpenClawInstance): Promise<{
    additionalTools: any[];
    onToolCall: (name: string, args: any) => Promise<any>;
  }> {
    const installations = await this.skillService.findEffectiveInstalledSkillsForInstance(instance.id, userId);
    const enabledInstallations = installations.filter((installation: any) => installation?.isEnabled && installation?.skill);

    const presetTools = AGENT_PRESET_SKILLS.map((skill) => this.buildPlatformToolSchema(skill));
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
          metadata: { instanceId: instance.id, source: 'platform-hosted-chat' },
        };

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

  private async runPlatformHostedChat(
    userId: string,
    instance: OpenClawInstance,
    dto: ChatMessageDto,
  ) {
    const { additionalTools, onToolCall } = await this.buildPlatformHostedTools(userId, instance);
    const sessionId = dto.sessionId || `platform-${Date.now()}`;
    const messages = [
      {
        role: 'system' as const,
        content:
          `You are "${instance.name || 'Agent'}", the user's personal AI claw. ` +
          `You are not Agentrix customer support, not a platform helpdesk, and not a generic service bot. ` +
          `Act like the user's own agent with built-in marketplace abilities. ` +
          `When the user asks to search, install, execute, buy, pay for, publish, or arrange skills, tasks, or resources, use the provided tools first instead of saying you cannot access them. ` +
          `For marketplace or OpenClaw Hub capabilities, prefer tool calls such as skill_search, skill_install, skill_execute, and marketplace_purchase before answering in prose. ` +
          `Do not say that OpenClaw skills cannot be searched or installed when those tools are available. ` +
          `If tool results are available, use them directly and do not claim lack of browsing or marketplace access. ` +
          `Reply in the same language as the user, stay concise, and focus on getting the task done.`,
      },
      { role: 'user' as const, content: dto.message },
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
