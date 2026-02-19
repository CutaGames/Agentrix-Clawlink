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

    // Async provisioning — simulate 30s completion
    this.scheduleCloudProvisioning(saved.id, cloudInstanceId).catch((e) =>
      this.logger.error(`Cloud provisioning failed: ${e.message}`),
    );

    return saved;
  }

  private async scheduleCloudProvisioning(instanceId: string, cloudInstanceId: string) {
    await new Promise((r) => setTimeout(r, 5000));
    // In production, call the cloud orchestration API here.
    // For now we mark it active with a placeholder URL.
    await this.instanceRepo.update(instanceId, {
      status: OpenClawInstanceStatus.ACTIVE,
      instanceUrl: `https://cloud.agentrix.top/claw/${cloudInstanceId}`,
      instanceToken: `cloud-token-${cloudInstanceId}`,
    });
    this.logger.log(`Cloud instance ${cloudInstanceId} provisioned.`);
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
