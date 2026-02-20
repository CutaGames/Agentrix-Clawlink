import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

import {
  OpenClawInstance,
  OpenClawInstanceStatus,
  OpenClawInstanceType,
} from '../../entities/openclaw-instance.entity';

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

@Injectable()
export class OpenClawConnectionService {
  private readonly logger = new Logger(OpenClawConnectionService.name);

  constructor(
    @InjectRepository(OpenClawInstance)
    private instanceRepo: Repository<OpenClawInstance>,
  ) {}

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
    });

    return this.instanceRepo.save(instance);
  }

  async provisionCloudInstance(userId: string, dto: ProvisionCloudDto): Promise<OpenClawInstance> {
    // Idempotent — if already provisioning, return existing record
    const existing = await this.instanceRepo.findOne({
      where: { userId, instanceType: OpenClawInstanceType.CLOUD, status: OpenClawInstanceStatus.PROVISIONING },
    });
    if (existing) return existing;

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
      this.logger.log(`Starting cloud provisioning for ${cloudInstanceId}...`); 

      // 1. SSH parameters from .env
      const host = process.env.CLOUD_HOST || '18.139.157.116';
      const user = process.env.CLOUD_USER || 'ubuntu';
      const pemPath = process.env.CLOUD_PEM_PATH || '/root/.ssh/hq.pem';        

      // 2. Map provider id → OpenClaw env var name and fetch platform API key
      // The platform owns the API keys — users never need to configure them.
      // 'default' maps to the platform-preferred provider (currently deepseek for cost efficiency,
      //  or bedrock for internal team testing).
      const resolvedProvider = llmProvider === 'default'
        ? (process.env.PLATFORM_DEFAULT_LLM_PROVIDER || 'deepseek')
        : llmProvider;

      const providerEnvMap: Record<string, string[]> = {
        openai:    ['PLATFORM_OPENAI_API_KEY', 'OPENAI_API_KEY'],
        deepseek:  ['PLATFORM_DEEPSEEK_API_KEY', 'DEEPSEEK_API_KEY', 'deepseek_API_KEY'],
        anthropic: ['PLATFORM_ANTHROPIC_API_KEY', 'ANTHROPIC_API_KEY'],
        gemini:    ['PLATFORM_GEMINI_API_KEY', 'GEMINI_API_KEY'],
        bedrock:   ['AWS_ACCESS_KEY_ID'],  // Bedrock uses AWS IAM credentials
      };

      const providerTargetEnv: Record<string, string> = {
        openai: 'OPENAI_API_KEY',
        deepseek: 'DEEPSEEK_API_KEY',
        anthropic: 'ANTHROPIC_API_KEY',
        gemini: 'GEMINI_API_KEY',
        bedrock: 'AWS_ACCESS_KEY_ID',
      };
      const targetEnvVar = providerTargetEnv[resolvedProvider] ?? 'OPENAI_API_KEY';

      // Build LLM env flags — Bedrock needs extra AWS env vars
      let llmEnvFlags: string;
      if (resolvedProvider === 'bedrock') {
        const accessKeyId = process.env.AWS_ACCESS_KEY_ID || '';
        const secretKey = process.env.AWS_SECRET_ACCESS_KEY || '';
        const region = process.env.AWS_BEDROCK_REGION || process.env.AWS_REGION || 'us-east-1';
        const modelId = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-5-sonnet-20241022-v2:0';
        if (!accessKeyId || !secretKey) {
          this.logger.warn('AWS credentials missing for Bedrock provider. Container may not function.');
        }
        llmEnvFlags = `-e LLM_PROVIDER=bedrock -e AWS_ACCESS_KEY_ID=${accessKeyId} -e AWS_SECRET_ACCESS_KEY=${secretKey} -e AWS_REGION=${region} -e BEDROCK_MODEL_ID=${modelId}`;
      } else {
        const candidates = providerEnvMap[resolvedProvider] ?? ['OPENAI_API_KEY'];
        const platformApiKey = candidates.map(k => process.env[k]).find(v => !!v) || '';
        if (!platformApiKey) {
          this.logger.warn(`No platform API key found for provider ${resolvedProvider}. Container will start without LLM key.`);
        }
        llmEnvFlags = platformApiKey
          ? `-e LLM_PROVIDER=${resolvedProvider} -e ${targetEnvVar}=${platformApiKey}`
          : `-e LLM_PROVIDER=${resolvedProvider}`;
      }

      // 3. Run container with LLM env vars injected; -p 0:3001 = random host port
      const sshCmd = `ssh -o StrictHostKeyChecking=no -i ${pemPath} ${user}@${host} "docker run -d -p 0:3001 --name oc-${cloudInstanceId} --restart=unless-stopped ${llmEnvFlags} openclaw/openclaw:latest"`;

      this.logger.log(`Executing SSH deploy for ${cloudInstanceId} (provider: ${resolvedProvider})`);
      const { stdout: containerId } = await execAsync(sshCmd);

      // 4. Get assigned host port
      const portCmd = `ssh -o StrictHostKeyChecking=no -i ${pemPath} ${user}@${host} "docker port ${containerId.trim()} 3001"`;
      const { stdout: portOutput } = await execAsync(portCmd);

      // portOutput: "0.0.0.0:32768\n" or ":::32768\n"
      const portMatch = portOutput.match(/:(\d+)/);
      const assignedPort = portMatch ? portMatch[1] : '3001';
      const instanceUrl = `http://${host}:${assignedPort}`;

      // 5. Retrieve the API token OpenClaw generates on first start
      // Wait briefly for container to initialize, then query its /api/token endpoint
      await new Promise((r) => setTimeout(r, 5000));
      let instanceToken = `cloud-token-${cloudInstanceId}`;
      try {
        const tokenResp = await fetch(`${instanceUrl}/api/token`, { signal: AbortSignal.timeout(8000) });
        if (tokenResp.ok) {
          const tokenData = await tokenResp.json() as { token?: string };
          if (tokenData.token) instanceToken = tokenData.token;
        }
      } catch {
        this.logger.warn(`Could not fetch auto-token from ${instanceUrl}, using generated token`);
      }

      await this.instanceRepo.update(instanceId, {
        status: OpenClawInstanceStatus.ACTIVE,
        instanceUrl,
        instanceToken,
      });
      this.logger.log(`Cloud instance ${cloudInstanceId} live at ${instanceUrl} (LLM: ${llmProvider})`);
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
    const relayToken = randomBytes(24).toString('hex');
    const instance = this.instanceRepo.create({
      userId,
      name: dto.name || 'My Local Agent',
      personality: dto.personality,
      instanceType: OpenClawInstanceType.LOCAL,
      status: OpenClawInstanceStatus.PROVISIONING,
      relayToken,
      isPrimary: true,
    });
    const saved = await this.instanceRepo.save(instance);

    const appDomain = process.env.APP_DOMAIN ?? 'api.agentrix.top';
    return {
      instanceId: saved.id,
      relayToken,
      wsRelayUrl: `wss://${appDomain}/relay`,
      downloadUrls: {
        win: `https://${appDomain}/downloads/clawlink-agent-win.exe`,
        mac: `https://${appDomain}/downloads/clawlink-agent-mac`,
      },
    };
  }

  async getRelayStatus(userId: string, instanceId: string): Promise<{ connected: boolean; instanceId: string }> {
    const instance = await this.getInstanceById(userId, instanceId);
    return { connected: instance.relayConnected ?? false, instanceId };
  }
}
