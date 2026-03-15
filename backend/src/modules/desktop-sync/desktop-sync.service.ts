import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../../entities/notification.entity';
import {
  DesktopSession,
  DesktopTask,
  DesktopApproval,
  DesktopCommand,
} from '../../entities/desktop-sync.entity';
import {
  ClaimDesktopCommandDto,
  CompleteDesktopCommandDto,
  CreateDesktopCommandDto,
  CreateDesktopApprovalDto,
  DesktopCommandStatus,
  DesktopCommandKind,
  DesktopApprovalDecision,
  DesktopApprovalRiskLevel,
  DesktopHeartbeatDto,
  DesktopSessionDeviceType,
  DesktopSessionMessageDto,
  DesktopTaskStatus,
  DesktopTimelineStatus,
  DesktopTimelineEntryDto,
  RespondDesktopApprovalDto,
  UpsertDesktopSessionDto,
  UpsertDesktopTaskDto,
} from './dto/desktop-sync.dto';
import { emitDesktopSyncEvent } from './desktop-sync.events';

interface DesktopDeviceRecord {
  deviceId: string;
  platform: string;
  appVersion?: string;
  context?: DesktopHeartbeatDto['context'];
  lastSeenAt: string;
}

@Injectable()
export class DesktopSyncService {
  private readonly logger = new Logger(DesktopSyncService.name);
  // Devices are transient presence data — keep in memory
  private readonly devices = new Map<string, Map<string, DesktopDeviceRecord>>();

  constructor(
    private readonly notificationService: NotificationService,
    @InjectRepository(DesktopSession)
    private readonly sessionRepo: Repository<DesktopSession>,
    @InjectRepository(DesktopTask)
    private readonly taskRepo: Repository<DesktopTask>,
    @InjectRepository(DesktopApproval)
    private readonly approvalRepo: Repository<DesktopApproval>,
    @InjectRepository(DesktopCommand)
    private readonly commandRepo: Repository<DesktopCommand>,
  ) {}

  async heartbeat(userId: string, dto: DesktopHeartbeatDto) {
    const next: DesktopDeviceRecord = {
      deviceId: dto.deviceId,
      platform: dto.platform,
      appVersion: dto.appVersion,
      context: dto.context,
      lastSeenAt: new Date().toISOString(),
    };

    this.userMap(this.devices, userId).set(dto.deviceId, next);
    emitDesktopSyncEvent(userId, 'desktop-sync:presence', next);

    return {
      ok: true,
      device: next,
      serverTime: new Date().toISOString(),
    };
  }

  async upsertTask(userId: string, dto: UpsertDesktopTaskDto) {
    let entity = await this.taskRepo.findOne({ where: { userId, taskId: dto.taskId } });
    if (!entity) {
      entity = this.taskRepo.create({ userId, taskId: dto.taskId });
    }

    entity.deviceId = dto.deviceId;
    entity.sessionId = dto.sessionId;
    entity.title = dto.title;
    entity.summary = dto.summary;
    entity.status = dto.status as any;
    entity.startedAt = dto.startedAt ?? entity.startedAt ?? Date.now();
    entity.finishedAt = dto.finishedAt;
    entity.timeline = this.normalizeTimeline(dto.timeline ?? entity.timeline ?? []);
    entity.context = dto.context;

    entity = await this.taskRepo.save(entity);

    const record = this.taskEntityToRecord(entity);
    emitDesktopSyncEvent(userId, 'desktop-sync:task', record);

    return { ok: true, task: record };
  }

  async createApproval(userId: string, dto: CreateDesktopApprovalDto) {
    const entity = this.approvalRepo.create({
      userId,
      deviceId: dto.deviceId,
      taskId: dto.taskId,
      timelineEntryId: dto.timelineEntryId,
      title: dto.title,
      description: dto.description,
      riskLevel: dto.riskLevel,
      sessionKey: dto.sessionKey,
      status: 'pending',
      rememberForSession: false,
      context: dto.context,
    });

    const saved = await this.approvalRepo.save(entity);
    const approvalId = saved.id;

    await this.bumpTaskStatusForApproval(
      userId,
      dto.taskId,
      dto.timelineEntryId,
      DesktopTimelineStatus.WAITING_APPROVAL,
    );

    const record = this.approvalEntityToRecord(saved);
    emitDesktopSyncEvent(userId, 'desktop-sync:approval', record);

    const message = this.formatApprovalMessage(saved);
    await this.notificationService.createNotification(userId, {
      type: NotificationType.SYSTEM,
      title: `Desktop approval required · ${saved.riskLevel}`,
      message,
    });
    await this.notificationService.sendPushNotification(userId, {
      title: 'Desktop approval required',
      body: message,
      data: {
        type: 'desktop_approval_required',
        approvalId,
        taskId: dto.taskId,
        deviceId: dto.deviceId,
      },
      channelId: 'developer',
    });

    return { ok: true, approval: record };
  }

  async respondToApproval(userId: string, approvalId: string, dto: RespondDesktopApprovalDto) {
    const entity = await this.approvalRepo.findOne({ where: { userId, id: approvalId } });
    if (!entity) {
      throw new NotFoundException('Approval request not found');
    }

    entity.status = dto.decision === DesktopApprovalDecision.APPROVED ? 'approved' : 'rejected';
    entity.respondedAt = new Date();
    entity.responseDeviceId = dto.deviceId;
    entity.rememberForSession = Boolean(dto.rememberForSession);
    entity.metadata = dto.metadata;

    await this.approvalRepo.save(entity);

    await this.bumpTaskStatusForApproval(
      userId,
      entity.taskId,
      entity.timelineEntryId,
      dto.decision === DesktopApprovalDecision.APPROVED
        ? DesktopTimelineStatus.RUNNING
        : DesktopTimelineStatus.REJECTED,
    );

    const record = this.approvalEntityToRecord(entity);
    emitDesktopSyncEvent(userId, 'desktop-sync:approval-response', record);

    return { ok: true, approval: record };
  }

  async getState(userId: string) {
    const devices = Array.from(this.userMap(this.devices, userId).values()).sort((a, b) =>
      b.lastSeenAt.localeCompare(a.lastSeenAt),
    );

    const taskEntities = await this.taskRepo.find({ where: { userId }, order: { updatedAt: 'DESC' }, take: 100 });
    const tasks = taskEntities.map((e) => this.taskEntityToRecord(e));

    const approvalEntities = await this.approvalRepo.find({ where: { userId }, order: { createdAt: 'DESC' }, take: 100 });
    const approvals = approvalEntities.map((e) => this.approvalEntityToRecord(e));

    const sessions = await this.listSessions(userId);
    const commands = await this.listCommands(userId);

    return {
      devices,
      tasks,
      approvals,
      sessions,
      commands,
      pendingApprovalCount: approvals.filter((item) => item.status === 'pending').length,
      serverTime: new Date().toISOString(),
    };
  }

  async getPendingApprovals(userId: string, deviceId?: string) {
    const qb = this.approvalRepo.createQueryBuilder('a')
      .where('a.userId = :userId', { userId })
      .andWhere('a.status = :status', { status: 'pending' })
      .orderBy('a.createdAt', 'DESC');

    if (deviceId) {
      qb.andWhere('a.deviceId = :deviceId', { deviceId });
    }

    const entities = await qb.getMany();
    return entities.map((e) => this.approvalEntityToRecord(e));
  }

  async upsertSession(userId: string, dto: UpsertDesktopSessionDto) {
    let entity = await this.sessionRepo.findOne({ where: { userId, sessionId: dto.sessionId } });
    if (!entity) {
      entity = this.sessionRepo.create({ userId, sessionId: dto.sessionId });
    }

    entity.title = dto.title;
    entity.messageCount = dto.messages.length;
    entity.deviceId = dto.deviceId;
    entity.deviceType = dto.deviceType;
    entity.messages = dto.messages.slice(-80);

    entity = await this.sessionRepo.save(entity);

    const meta = this.sessionEntityToMeta(entity);
    emitDesktopSyncEvent(userId, 'session:updated', {
      sessionId: entity.sessionId,
      messages: entity.messages,
      meta,
    });

    return { ok: true, session: entity };
  }

  async listSessions(userId: string) {
    const entities = await this.sessionRepo.find({
      where: { userId },
      order: { updatedAt: 'DESC' },
      take: 50,
      select: ['id', 'sessionId', 'title', 'messageCount', 'updatedAt', 'deviceId', 'deviceType'],
    });
    return entities.map((e) => this.sessionEntityToMeta(e));
  }

  async getSession(userId: string, sessionId: string) {
    const entity = await this.sessionRepo.findOne({ where: { userId, sessionId } });
    if (!entity) {
      throw new NotFoundException('Desktop session not found');
    }

    return {
      sessionId: entity.sessionId,
      messages: entity.messages,
      meta: this.sessionEntityToMeta(entity),
    };
  }

  async createCommand(userId: string, dto: CreateDesktopCommandDto) {
    const entity = this.commandRepo.create({
      userId,
      title: dto.title,
      kind: dto.kind,
      status: DesktopCommandStatus.PENDING,
      targetDeviceId: dto.targetDeviceId,
      requesterDeviceId: dto.requesterDeviceId,
      sessionId: dto.sessionId,
      payload: dto.payload,
    });

    const saved = await this.commandRepo.save(entity);
    const record = this.commandEntityToRecord(saved);
    emitDesktopSyncEvent(userId, 'desktop-sync:command', record);

    return { ok: true, command: record };
  }

  async listCommands(userId: string, deviceId?: string) {
    const qb = this.commandRepo.createQueryBuilder('c')
      .where('c.userId = :userId', { userId })
      .orderBy('c.updatedAt', 'DESC')
      .take(60);

    if (deviceId) {
      qb.andWhere('(c.targetDeviceId IS NULL OR c.targetDeviceId = :deviceId)', { deviceId });
    }

    const entities = await qb.getMany();
    return entities.map((e) => this.commandEntityToRecord(e));
  }

  async getPendingCommands(userId: string, deviceId?: string) {
    const all = await this.listCommands(userId, deviceId);
    return all.filter((command) => command.status === DesktopCommandStatus.PENDING);
  }

  async claimCommand(userId: string, commandId: string, dto: ClaimDesktopCommandDto) {
    const entity = await this.commandRepo.findOne({ where: { userId, id: commandId } });
    if (!entity) {
      throw new NotFoundException('Desktop command not found');
    }

    if (entity.targetDeviceId && entity.targetDeviceId !== dto.deviceId) {
      throw new NotFoundException('Desktop command is not targeted to this device');
    }

    if (entity.status !== DesktopCommandStatus.PENDING) {
      return { ok: true, command: this.commandEntityToRecord(entity) };
    }

    entity.status = DesktopCommandStatus.CLAIMED;
    entity.claimedAt = new Date();
    entity.claimedByDeviceId = dto.deviceId;
    await this.commandRepo.save(entity);

    const record = this.commandEntityToRecord(entity);
    emitDesktopSyncEvent(userId, 'desktop-sync:command-updated', record);

    return { ok: true, command: record };
  }

  async completeCommand(userId: string, commandId: string, dto: CompleteDesktopCommandDto) {
    const entity = await this.commandRepo.findOne({ where: { userId, id: commandId } });
    if (!entity) {
      throw new NotFoundException('Desktop command not found');
    }

    entity.status = dto.status;
    entity.completedAt = new Date();
    entity.claimedByDeviceId = entity.claimedByDeviceId ?? dto.deviceId;
    entity.result = dto.result;
    entity.error = dto.error;
    await this.commandRepo.save(entity);

    const record = this.commandEntityToRecord(entity);
    emitDesktopSyncEvent(userId, 'desktop-sync:command-updated', record);

    return { ok: true, command: record };
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private userMap<T>(root: Map<string, Map<string, T>>, userId: string) {
    if (!root.has(userId)) {
      root.set(userId, new Map<string, T>());
    }
    return root.get(userId)!;
  }

  private normalizeTimeline(entries: DesktopTimelineEntryDto[]) {
    return [...entries]
      .sort((a, b) => (a.startedAt || 0) - (b.startedAt || 0))
      .slice(-40);
  }

  private async bumpTaskStatusForApproval(
    userId: string,
    taskId: string,
    timelineEntryId: string | undefined,
    timelineStatus: DesktopTimelineEntryDto['status'],
  ) {
    const entity = await this.taskRepo.findOne({ where: { userId, taskId } });
    if (!entity) return;

    if (timelineEntryId) {
      entity.timeline = (entity.timeline || []).map((entry: any) =>
        entry.id === timelineEntryId ? { ...entry, status: timelineStatus } : entry,
      );
    }

    if (timelineStatus === 'waiting-approval') {
      entity.status = DesktopTaskStatus.NEED_APPROVE as any;
    } else if (timelineStatus === 'running') {
      entity.status = DesktopTaskStatus.EXECUTING as any;
    } else if (timelineStatus === 'rejected') {
      entity.status = DesktopTaskStatus.FAILED as any;
    }

    await this.taskRepo.save(entity);
    emitDesktopSyncEvent(userId, 'desktop-sync:task', this.taskEntityToRecord(entity));
  }

  private formatApprovalMessage(approval: DesktopApproval) {
    const deviceLabel = (approval.context as any)?.workspaceHint || approval.deviceId;
    return `${approval.title} on ${deviceLabel}. ${approval.description.slice(0, 120)}`;
  }

  private sessionEntityToMeta(e: DesktopSession) {
    return {
      sessionId: e.sessionId,
      title: e.title,
      messageCount: e.messageCount,
      updatedAt: e.updatedAt?.getTime?.() ?? Date.now(),
      deviceId: e.deviceId,
      deviceType: e.deviceType,
    };
  }

  private taskEntityToRecord(e: DesktopTask) {
    return {
      taskId: e.taskId,
      deviceId: e.deviceId,
      sessionId: e.sessionId,
      title: e.title,
      summary: e.summary,
      status: e.status,
      startedAt: e.startedAt ? Number(e.startedAt) : undefined,
      finishedAt: e.finishedAt ? Number(e.finishedAt) : undefined,
      updatedAt: e.updatedAt?.toISOString?.() ?? new Date().toISOString(),
      timeline: e.timeline || [],
      context: e.context,
    };
  }

  private approvalEntityToRecord(e: DesktopApproval) {
    return {
      approvalId: e.id,
      deviceId: e.deviceId,
      taskId: e.taskId,
      timelineEntryId: e.timelineEntryId,
      title: e.title,
      description: e.description,
      riskLevel: e.riskLevel,
      sessionKey: e.sessionKey,
      status: e.status,
      requestedAt: e.createdAt?.toISOString?.() ?? new Date().toISOString(),
      respondedAt: e.respondedAt?.toISOString?.(),
      responseDeviceId: e.responseDeviceId,
      rememberForSession: e.rememberForSession,
      context: e.context,
      metadata: e.metadata,
    };
  }

  private commandEntityToRecord(e: DesktopCommand) {
    return {
      commandId: e.id,
      title: e.title,
      kind: e.kind,
      status: e.status,
      targetDeviceId: e.targetDeviceId,
      requesterDeviceId: e.requesterDeviceId,
      sessionId: e.sessionId,
      payload: e.payload,
      createdAt: e.createdAt?.toISOString?.() ?? new Date().toISOString(),
      updatedAt: e.updatedAt?.toISOString?.() ?? new Date().toISOString(),
      claimedAt: e.claimedAt?.toISOString?.(),
      claimedByDeviceId: e.claimedByDeviceId,
      completedAt: e.completedAt?.toISOString?.(),
      result: e.result,
      error: e.error,
    };
  }
}
