import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { randomBytes } from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

import {
  OpenClawInstance,
  OpenClawInstanceStatus,
  OpenClawInstanceType,
} from '../../entities/openclaw-instance.entity';
import { SkillLayer, SkillPricingType } from '../../entities/skill.entity';
import { getDefaultSkillHandlerNames } from '../skill/agent-preset-skills.config';
import { SkillService } from '../skill/skill.service';

export interface BindOpenClawDto {
  name: string;
  instanceUrl: string;
  instanceToken: string;
  isPrimary?: boolean;
}

export interface ProvisionCloudDto {
  name: string;
  llmProvider?: string;
  personality?: string;
}

/**
 * Available LLM models for user switching.
 * availability: 'available' = ready to use, 'coming_soon' = not yet wired, 'requires_key' = user must provide API key.
 */
export interface AvailableModel {
  id: string;
  label: string;
  provider: string;
  bedrockModelId?: string;
  icon: string;
  badge?: string;
  availability: 'available' | 'coming_soon' | 'requires_key';
  costTier: 'free_trial' | 'starter' | 'pro';
}

export const PLATFORM_MODELS: AvailableModel[] = [
  {
    id: 'claude-haiku-4-5',
    label: 'Claude Haiku 4.5',
    provider: 'AWS Bedrock',
    bedrockModelId: 'anthropic.claude-haiku-4-5-20251001-v1:0',
    icon: '🤖',
    badge: 'Default',
    availability: 'available',
    costTier: 'free_trial',
  },
  {
    id: 'claude-sonnet-4-5',
    label: 'Claude Sonnet 4.5',
    provider: 'AWS Bedrock',
    bedrockModelId: 'anthropic.claude-sonnet-4-5-20250514-v1:0',
    icon: '💎',
    badge: 'Pro',
    availability: 'coming_soon',
    costTier: 'pro',
  },
  {
    id: 'deepseek-v3',
    label: 'DeepSeek V3',
    provider: 'DeepSeek',
    icon: '🔬',
    badge: 'Cost‑efficient',
    availability: 'available',
    costTier: 'free_trial',
  },
  {
    id: 'gemini-2.0-flash',
    label: 'Gemini 2.0 Flash',
    provider: 'Google',
    icon: '✨',
    badge: 'Fast',
    availability: 'available',
    costTier: 'free_trial',
  },
  {
    id: 'llama-3.3-70b',
    label: 'Llama 3.3 70B',
    provider: 'Groq',
    icon: '🦙',
    badge: 'Free',
    availability: 'available',
    costTier: 'free_trial',
  },
  {
    id: 'gpt-4o',
    label: 'GPT-4o',
    provider: 'OpenAI',
    icon: '🧠',
    availability: 'coming_soon',
    costTier: 'pro',
  },
  {
    id: 'claude-opus-4',
    label: 'Claude Opus 4',
    provider: 'AWS Bedrock',
    icon: '🏆',
    badge: 'Max',
    availability: 'coming_soon',
    costTier: 'pro',
  },
];

const DEFAULT_STARTER_CLAW_SKILL_QUERIES = [
  'web search pro',
  'document processor',
  'memory guardian',
  'playwright browser automation',
  'python executor',
  'github assistant',
];

@Injectable()
export class OpenClawConnectionService implements OnModuleInit {
  private readonly logger = new Logger(OpenClawConnectionService.name);

  constructor(
    @InjectRepository(OpenClawInstance)
    private instanceRepo: Repository<OpenClawInstance>,
    private readonly skillService: SkillService,
  ) {}

  private getStarterSkillQueries(): string[] {
    const configured = String(process.env.DEFAULT_STARTER_CLAW_SKILLS || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    return configured.length > 0 ? configured : DEFAULT_STARTER_CLAW_SKILL_QUERIES;
  }

  private scoreStarterSkillCandidate(query: string, skill: any): number {
    const normalizedQuery = String(query || '').trim().toLowerCase();
    const displayName = String(skill?.displayName || '').trim().toLowerCase();
    const name = String(skill?.name || '').trim().toLowerCase();
    const description = String(skill?.description || '').trim().toLowerCase();

    let score = 0;

    if (displayName === normalizedQuery || name === normalizedQuery) score += 100;
    if (displayName.includes(normalizedQuery) || name.includes(normalizedQuery)) score += 40;

    const queryTerms = normalizedQuery.split(/\s+/).filter(Boolean);
    score += queryTerms.filter((term) => displayName.includes(term)).length * 8;
    score += queryTerms.filter((term) => name.includes(term)).length * 6;
    score += queryTerms.filter((term) => description.includes(term)).length * 2;

    return score;
  }

  private async installStarterSkillsForInstance(instanceId: string, userId: string): Promise<void> {
    const queries = this.getStarterSkillQueries();
    if (queries.length === 0) return;

    const installedSkillIds = new Set<string>();

    for (const query of queries) {
      try {
        const marketplace = await this.skillService.findMarketplace(1, 8, undefined, query);
        const candidate = (marketplace.items || [])
          .filter((skill: any) => {
            if (!skill?.id) return false;
            if (installedSkillIds.has(skill.id)) return false;
            if (skill.layer && skill.layer === SkillLayer.RESOURCE) return false;
            if (skill.pricing?.type && skill.pricing.type !== SkillPricingType.FREE) return false;
            return true;
          })
          .sort((a: any, b: any) => this.scoreStarterSkillCandidate(query, b) - this.scoreStarterSkillCandidate(query, a))[0];

        if (!candidate?.id) {
          this.logger.warn(`No starter skill matched query "${query}" for instance ${instanceId}`);
          continue;
        }

        await this.skillService.installSkillForInstance(instanceId, candidate.id, userId, {
          starterPack: true,
          starterQuery: query,
          autoInstalledAt: new Date().toISOString(),
        });
        installedSkillIds.add(candidate.id);
      } catch (error: any) {
        if (!String(error?.message || '').includes('already installed')) {
          this.logger.warn(`Starter skill install failed for "${query}" on ${instanceId}: ${error.message}`);
        }
      }
    }
  }

  /** On startup: auto-fix any ERROR cloud instances left from failed Docker provisioning. */
  async onModuleInit() {
    // Fix any stuck ERROR/PROVISIONING cloud instances from old Docker-based provisioning
    try {
      const broken = await this.instanceRepo.find({
        where: [
          { instanceType: OpenClawInstanceType.CLOUD, status: OpenClawInstanceStatus.ERROR },
          { instanceType: OpenClawInstanceType.CLOUD, status: OpenClawInstanceStatus.PROVISIONING },
        ],
      });
      for (const inst of broken) {
        this.logger.log(`Auto-fixing broken cloud instance ${inst.id} (was ${inst.status}) → platform-hosted`);
        await this.instanceRepo.update(inst.id, {
          status: OpenClawInstanceStatus.ACTIVE,
          instanceUrl: null as any,
          capabilities: {
            platformTools: getDefaultSkillHandlerNames(),
            provisionedAt: new Date().toISOString(),
            llmProvider: 'bedrock',
            platformHosted: true,
            activeModel: 'claude-haiku-4-5',
          } as any,
        });
      }
      if (broken.length > 0) {
        this.logger.log(`Fixed ${broken.length} broken cloud instance(s)`);
      }
    } catch (e: any) {
      this.logger.warn(`Auto-fix cloud instances failed: ${e.message}`);
    }
  }

  async bindInstance(userId: string, dto: BindOpenClawDto): Promise<OpenClawInstance> {
    // Basic connectivity check
    try {
      const resp = await fetch(`${dto.instanceUrl.replace(/\/$/, '')}/api/health`, {
        headers: { Authorization: `Bearer ${dto.instanceToken}` },
        signal: AbortSignal.timeout(6000),
      });
      if (!resp.ok) {
        throw new BadRequestException(`OpenClaw instance responded with ${resp.status}`);
      }
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err;
      this.logger.warn(`Cannot reach instance at ${dto.instanceUrl}: ${err.message}`);
      throw new BadRequestException(
        `Cannot reach OpenClaw instance at ${dto.instanceUrl}. Check the URL and ensure the instance is running.`,
      );
    }

    if (dto.isPrimary) {
      await this.instanceRepo.update({ userId }, { isPrimary: false });
    }

    const instance = this.instanceRepo.create({
      userId,
      name: dto.name,
      instanceType: OpenClawInstanceType.SELF_HOSTED,
      status: OpenClawInstanceStatus.ACTIVE,
      instanceUrl: dto.instanceUrl.replace(/\/$/, ''),
      instanceToken: dto.instanceToken,
      isPrimary: dto.isPrimary ?? false,
      capabilities: {
        platformTools: getDefaultSkillHandlerNames(),
        provisionedAt: new Date().toISOString(),
      },
    });

    const saved = await this.instanceRepo.save(instance);
    await this.installStarterSkillsForInstance(saved.id, userId).catch((e) =>
      this.logger.warn(`Starter skill bootstrap skipped for bound instance ${saved.id}: ${e.message}`),
    );
    return saved;
  }

  async provisionCloudInstance(userId: string, dto: ProvisionCloudDto): Promise<OpenClawInstance> {
    // Idempotent — if already provisioning, return existing record
    const existing = await this.instanceRepo.findOne({
      where: { userId, instanceType: OpenClawInstanceType.CLOUD, status: OpenClawInstanceStatus.PROVISIONING },
    });
    if (existing) return existing;

    // ── Instance limit: 1 cloud instance per user (free tier) ──
    const maxCloud = parseInt(process.env.MAX_CLOUD_INSTANCES_PER_USER || '1', 10);
    const cloudCount = await this.instanceRepo.count({
      where: {
        userId,
        instanceType: OpenClawInstanceType.CLOUD,
        status: In([OpenClawInstanceStatus.ACTIVE, OpenClawInstanceStatus.PROVISIONING]),
      },
    });
    if (cloudCount >= maxCloud) {
      throw new BadRequestException(
        `Free tier allows ${maxCloud} cloud instance(s). Please remove an existing instance first.`,
      );
    }

    const cloudInstanceId = `cloud-${userId.slice(0, 8)}-${Date.now()}`;
    const instance = this.instanceRepo.create({
      userId,
      name: dto.name,
      personality: dto.personality,
      instanceType: OpenClawInstanceType.CLOUD,
      status: OpenClawInstanceStatus.PROVISIONING,
      cloudInstanceId,
      isPrimary: true,
    });

    const saved = await this.instanceRepo.save(instance);

    // Async provisioning — fire SSH Docker deployment with LLM config injected
    this.scheduleCloudProvisioning(saved.id, cloudInstanceId, dto.llmProvider).catch((e) =>
      this.logger.error(`Cloud provisioning failed: ${e.message}`),
    );

    return saved;
  }

  private async scheduleCloudProvisioning(
    instanceId: string,
    cloudInstanceId: string,
    llmProvider = 'deepseek',
  ) {
    try {
      this.logger.log(`Starting cloud provisioning for ${cloudInstanceId} (platform-hosted mode)...`);

      // ── Platform-hosted mode ──
      // Instead of spinning up a Docker container (which requires a pre-built image),
      // we provision the instance as "platform-hosted": chat is routed through the
      // Agentrix backend's own Claude/Bedrock integration with full tool support.
      // This gives every user a working agent with web search, marketplace tools, etc.

      const resolvedProvider = llmProvider === 'default'
        ? (process.env.PLATFORM_DEFAULT_LLM_PROVIDER || 'bedrock')
        : llmProvider;

      await this.instanceRepo.update(instanceId, {
        status: OpenClawInstanceStatus.ACTIVE,
        instanceUrl: null,  // No external URL — routed through platform
        capabilities: {
          platformTools: getDefaultSkillHandlerNames(),
          provisionedAt: new Date().toISOString(),
          llmProvider: resolvedProvider,
          platformHosted: true,
          activeModel: 'claude-haiku-4-5',
        } as any,
      });

      const instance = await this.instanceRepo.findOne({ where: { id: instanceId } });
      if (instance?.userId) {
        await this.installStarterSkillsForInstance(instanceId, instance.userId);
      }

      this.logger.log(`Cloud instance ${cloudInstanceId} provisioned in platform-hosted mode (LLM: ${resolvedProvider})`);
    } catch (error: any) {
      this.logger.error(`Failed to provision cloud instance: ${error.message}`);
      await this.instanceRepo.update(instanceId, {
        status: OpenClawInstanceStatus.ERROR,
      });
    }
  }

  async getInstancesByUser(userId: string): Promise<OpenClawInstance[]> {
    return this.instanceRepo.find({
      where: { userId },
      order: { isPrimary: 'DESC', updatedAt: 'DESC' },
    });
  }

  async getInstanceById(userId: string, instanceId: string): Promise<OpenClawInstance> {
    const instance = await this.instanceRepo.findOneBy({ id: instanceId });
    if (!instance) throw new NotFoundException('OpenClaw instance not found');
    if (instance.userId !== userId) throw new ForbiddenException();
    return instance;
  }

  async setPrimaryInstance(userId: string, instanceId: string): Promise<void> {
    await this.getInstanceById(userId, instanceId);
    await this.instanceRepo.update({ userId }, { isPrimary: false });
    await this.instanceRepo.update({ id: instanceId, userId }, { isPrimary: true });
  }

  async unbindInstance(userId: string, instanceId: string): Promise<void> {
    const instance = await this.getInstanceById(userId, instanceId);
    await this.instanceRepo.update(instance.id, { status: OpenClawInstanceStatus.UNLINKED });
    await this.instanceRepo.delete(instance.id);
  }

  async batchCleanupByStatus(userId: string, status: string): Promise<{ deleted: number }> {
    const validStatuses = Object.values(OpenClawInstanceStatus);
    if (!validStatuses.includes(status as OpenClawInstanceStatus)) {
      return { deleted: 0 };
    }
    const result = await this.instanceRepo.delete({
      userId,
      status: status as OpenClawInstanceStatus,
    });
    this.logger.log(`Batch cleanup: deleted ${result.affected ?? 0} ${status} instances for user ${userId}`);
    return { deleted: result.affected ?? 0 };
  }

  async updateInstanceStatus(instanceId: string, status: OpenClawInstanceStatus): Promise<void> {
    await this.instanceRepo.update(instanceId, { status });
  }

  /** Create a short-lived QR-bind session (stored in metadata for polling) */
  async createBindSession(userId: string): Promise<{ sessionId: string; expiresAt: number }> {
    const sessionId = `bind-${userId.slice(0, 8)}-${Date.now()}`;
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 min
    // Store session in a temporary place — here we use a simple in-memory map
    // In production, use Redis.
    OpenClawConnectionService.bindSessions.set(sessionId, { userId, expiresAt, resolved: false });
    return { sessionId, expiresAt };
  }

  /** Poll—returns bound instance id once QR bind is resolved */
  async pollBindSession(sessionId: string): Promise<{ resolved: boolean; instanceId?: string }> {
    const session = OpenClawConnectionService.bindSessions.get(sessionId);
    if (!session || Date.now() > session.expiresAt) {
      return { resolved: false };
    }
    if (session.resolved && session.instanceId) {
      OpenClawConnectionService.bindSessions.delete(sessionId);
      return { resolved: true, instanceId: session.instanceId };
    }
    return { resolved: false };
  }

  private static bindSessions = new Map<
    string,
    { userId: string; expiresAt: number; resolved: boolean; instanceId?: string }
  >();

  // ── Social relay ────────────────────────────────────────────────────────────

  /** Generate (or reuse) a relay token + Telegram deep-link for an instance */
  async generateSocialBindQr(
    userId: string,
    instanceId: string,
    platform: 'telegram',
  ): Promise<{ deepLink: string; relayToken: string; platform: string }> {
    const instance = await this.getInstanceById(userId, instanceId);

    // Reuse existing relay token or generate a new one
    let token = instance.relayToken;
    if (!token) {
      token = randomBytes(24).toString('hex');
      await this.instanceRepo.update(instance.id, { relayToken: token });
    }

    const botName = process.env.TELEGRAM_BOT_NAME || 'ClawLinkBot';
    const deepLink = `https://t.me/${botName}?start=${token}`;

    return { deepLink, relayToken: token, platform };
  }

  async unlinkSocial(userId: string, instanceId: string, platform: 'telegram'): Promise<void> {
    await this.getInstanceById(userId, instanceId);
    if (platform === 'telegram') {
      await this.instanceRepo.update({ id: instanceId, userId }, { telegramChatId: undefined });
    }
  }

  // ── Local instance provisioning ─────────────────────────────────────────────

  async provisionLocalInstance(userId: string, dto: ProvisionCloudDto): Promise<{
    instanceId: string;
    relayToken: string;
    wsRelayUrl: string;
    downloadUrls: { win: string; mac: string };
  }> {
    // ── Instance limit: 1 local instance per user (free tier) ──
    const maxLocal = parseInt(process.env.MAX_LOCAL_INSTANCES_PER_USER || '1', 10);
    const localCount = await this.instanceRepo.count({
      where: {
        userId,
        instanceType: OpenClawInstanceType.LOCAL,
        status: In([OpenClawInstanceStatus.ACTIVE, OpenClawInstanceStatus.PROVISIONING]),
      },
    });
    if (localCount >= maxLocal) {
      throw new BadRequestException(
        `Free tier allows ${maxLocal} local instance(s). Please remove an existing instance first.`,
      );
    }

    const relayToken = randomBytes(24).toString('hex');
    const instance = this.instanceRepo.create({
      userId,
      name: dto.name || 'My Local Agent',
      personality: dto.personality,
      instanceType: OpenClawInstanceType.LOCAL,
      status: OpenClawInstanceStatus.PROVISIONING,
      relayToken,
      isPrimary: true,
      capabilities: {
        platformTools: getDefaultSkillHandlerNames(),
        provisionedAt: new Date().toISOString(),
      },
    });
    const saved = await this.instanceRepo.save(instance);
    await this.installStarterSkillsForInstance(saved.id, userId).catch((e) =>
      this.logger.warn(`Starter skill bootstrap skipped for local instance ${saved.id}: ${e.message}`),
    );

    const appDomain = process.env.APP_DOMAIN ?? 'api.agentrix.top';
    const webDomain = process.env.WEB_APP_DOMAIN ?? 'agentrix.top';
    return {
      instanceId: saved.id,
      relayToken,
      wsRelayUrl: `wss://${appDomain}/relay`,
      downloadUrls: {
        win: `https://${appDomain}/downloads/Agentrix-Setup.exe`,
        mac: `https://${webDomain}/claw/download?platform=cli`,
      },
    };
  }

  async getRelayStatus(userId: string, instanceId: string): Promise<{ connected: boolean; instanceId: string }> {
    const instance = await this.getInstanceById(userId, instanceId);
    return { connected: instance.relayConnected ?? false, instanceId };
  }

  // ── Model switching ────────────────────────────────────────────────────────

  /**
   * Get available models for the user (respects plan type).
   */
  getAvailableModels(): AvailableModel[] {
    return PLATFORM_MODELS;
  }

  /**
   * Get the active model for an instance.
   */
  async getInstanceModel(userId: string, instanceId: string): Promise<{ modelId: string; model: AvailableModel | null }> {
    const instance = await this.getInstanceById(userId, instanceId);
    const modelId = (instance.capabilities as any)?.activeModel
      || (instance.capabilities as any)?.llmProvider
      || process.env.DEFAULT_MODEL
      || 'claude-haiku-4-5';
    const model = PLATFORM_MODELS.find(m => m.id === modelId) || null;
    return { modelId, model };
  }

  /**
   * Switch the model used by an instance.
   * Updates the instance metadata and attempts to push the config to the running container.
   */
  async switchInstanceModel(userId: string, instanceId: string, modelId: string): Promise<{
    success: boolean;
    modelId: string;
    model: AvailableModel;
    pushed: boolean;
    message: string;
  }> {
    const model = PLATFORM_MODELS.find(m => m.id === modelId);
    if (!model) {
      throw new BadRequestException(`Unknown model: "${modelId}". Available: ${PLATFORM_MODELS.map(m => m.id).join(', ')}`);
    }
    if (model.availability === 'coming_soon') {
      throw new BadRequestException(`Model "${model.label}" is coming soon and not yet available.`);
    }

    const instance = await this.getInstanceById(userId, instanceId);

    // Update capabilities with the active model
    const caps = { ...(instance.capabilities || {}), activeModel: modelId };
    await this.instanceRepo.update(instance.id, { capabilities: caps as any });

    // Try pushing the model change to the running OpenClaw instance
    let pushed = false;
    if (instance.instanceUrl && instance.status === OpenClawInstanceStatus.ACTIVE) {
      try {
        const resp = await fetch(`${instance.instanceUrl}/api/config/model`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(instance.instanceToken ? { Authorization: `Bearer ${instance.instanceToken}` } : {}),
          },
          body: JSON.stringify({
            modelId,
            bedrockModelId: model.bedrockModelId,
            provider: model.provider,
          }),
          signal: AbortSignal.timeout(8_000),
        });
        pushed = resp.ok;
      } catch (err: any) {
        this.logger.warn(`Could not push model switch to instance ${instanceId}: ${err.message}`);
      }
    }

    this.logger.log(`Model switched for instance ${instanceId}: ${modelId} (pushed=${pushed})`);

    return {
      success: true,
      modelId,
      model,
      pushed,
      message: pushed
        ? `Switched to ${model.label}. Active immediately.`
        : `Switched to ${model.label}. Will take effect on next chat (instance config saved).`,
    };
  }
}
