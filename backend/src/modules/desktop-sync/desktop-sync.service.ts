import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../../entities/notification.entity';
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

interface DesktopTaskRecord {
  taskId: string;
  deviceId: string;
  sessionId?: string;
  title: string;
  summary?: string;
  status: DesktopTaskStatus;
  startedAt: number;
  finishedAt?: number;
  updatedAt: string;
  timeline: DesktopTimelineEntryDto[];
  context?: UpsertDesktopTaskDto['context'];
}

interface DesktopSessionRecord {
  sessionId: string;
  title: string;
  messageCount: number;
  updatedAt: number;
  deviceId: string;
  deviceType: DesktopSessionDeviceType;
  messages: DesktopSessionMessageDto[];
  lastSyncedAt: string;
}

interface DesktopCommandRecord {
  commandId: string;
  title: string;
  kind: DesktopCommandKind;
  status: DesktopCommandStatus;
  targetDeviceId?: string;
  requesterDeviceId?: string;
  sessionId?: string;
  payload?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  claimedAt?: string;
  claimedByDeviceId?: string;
  completedAt?: string;
  result?: Record<string, unknown>;
  error?: string;
}

type DesktopApprovalStatus = 'pending' | 'approved' | 'rejected';

interface DesktopApprovalRecord {
  approvalId: string;
  deviceId: string;
  taskId: string;
  timelineEntryId?: string;
  title: string;
  description: string;
  riskLevel: DesktopApprovalRiskLevel;
  sessionKey?: string;
  status: DesktopApprovalStatus;
  requestedAt: string;
  respondedAt?: string;
  responseDeviceId?: string;
  rememberForSession: boolean;
  context?: CreateDesktopApprovalDto['context'];
  metadata?: Record<string, unknown>;
}

@Injectable()
export class DesktopSyncService {
  private readonly logger = new Logger(DesktopSyncService.name);
  private readonly devices = new Map<string, Map<string, DesktopDeviceRecord>>();
  private readonly tasks = new Map<string, Map<string, DesktopTaskRecord>>();
  private readonly approvals = new Map<string, Map<string, DesktopApprovalRecord>>();
  private readonly sessions = new Map<string, Map<string, DesktopSessionRecord>>();
  private readonly commands = new Map<string, Map<string, DesktopCommandRecord>>();

  constructor(private readonly notificationService: NotificationService) {}

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
    const existing = this.userMap(this.tasks, userId).get(dto.taskId);
    const record: DesktopTaskRecord = {
      taskId: dto.taskId,
      deviceId: dto.deviceId,
      sessionId: dto.sessionId,
      title: dto.title,
      summary: dto.summary,
      status: dto.status,
      startedAt: dto.startedAt ?? existing?.startedAt ?? Date.now(),
      finishedAt: dto.finishedAt,
      updatedAt: new Date().toISOString(),
      timeline: this.normalizeTimeline(dto.timeline ?? existing?.timeline ?? []),
      context: dto.context,
    };

    this.userMap(this.tasks, userId).set(dto.taskId, record);
    emitDesktopSyncEvent(userId, 'desktop-sync:task', record);

    return {
      ok: true,
      task: record,
    };
  }

  async createApproval(userId: string, dto: CreateDesktopApprovalDto) {
    const approvalId = crypto.randomUUID();
    const record: DesktopApprovalRecord = {
      approvalId,
      deviceId: dto.deviceId,
      taskId: dto.taskId,
      timelineEntryId: dto.timelineEntryId,
      title: dto.title,
      description: dto.description,
      riskLevel: dto.riskLevel,
      sessionKey: dto.sessionKey,
      status: 'pending',
      requestedAt: new Date().toISOString(),
      rememberForSession: false,
      context: dto.context,
    };

    this.userMap(this.approvals, userId).set(approvalId, record);
    this.bumpTaskStatusForApproval(
      userId,
      dto.taskId,
      dto.timelineEntryId,
      DesktopTimelineStatus.WAITING_APPROVAL,
    );
    emitDesktopSyncEvent(userId, 'desktop-sync:approval', record);

    const message = this.formatApprovalMessage(record);
    await this.notificationService.createNotification(userId, {
      type: NotificationType.SYSTEM,
      title: `Desktop approval required · ${record.riskLevel}`,
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

    return {
      ok: true,
      approval: record,
    };
  }

  async respondToApproval(userId: string, approvalId: string, dto: RespondDesktopApprovalDto) {
    const approval = this.userMap(this.approvals, userId).get(approvalId);
    if (!approval) {
      throw new NotFoundException('Approval request not found');
    }

    approval.status = dto.decision === DesktopApprovalDecision.APPROVED ? 'approved' : 'rejected';
    approval.respondedAt = new Date().toISOString();
    approval.responseDeviceId = dto.deviceId;
    approval.rememberForSession = Boolean(dto.rememberForSession);
    approval.metadata = dto.metadata;

    this.bumpTaskStatusForApproval(
      userId,
      approval.taskId,
      approval.timelineEntryId,
      dto.decision === DesktopApprovalDecision.APPROVED
        ? DesktopTimelineStatus.RUNNING
        : DesktopTimelineStatus.REJECTED,
    );

    emitDesktopSyncEvent(userId, 'desktop-sync:approval-response', approval);

    return {
      ok: true,
      approval,
    };
  }

  getState(userId: string) {
    const devices = Array.from(this.userMap(this.devices, userId).values()).sort((a, b) =>
      b.lastSeenAt.localeCompare(a.lastSeenAt),
    );
    const tasks = Array.from(this.userMap(this.tasks, userId).values()).sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt),
    );
    const approvals = Array.from(this.userMap(this.approvals, userId).values()).sort((a, b) =>
      b.requestedAt.localeCompare(a.requestedAt),
    );
    const sessions = this.listSessions(userId);
    const commands = this.listCommands(userId);

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

  getPendingApprovals(userId: string, deviceId?: string) {
    return Array.from(this.userMap(this.approvals, userId).values())
      .filter((item) => item.status === 'pending')
      .filter((item) => !deviceId || item.deviceId === deviceId)
      .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
  }

  upsertSession(userId: string, dto: UpsertDesktopSessionDto) {
    const record: DesktopSessionRecord = {
      sessionId: dto.sessionId,
      title: dto.title,
      messageCount: dto.messages.length,
      updatedAt: dto.updatedAt ?? Date.now(),
      deviceId: dto.deviceId,
      deviceType: dto.deviceType,
      messages: dto.messages.slice(-80),
      lastSyncedAt: new Date().toISOString(),
    };

    this.userMap(this.sessions, userId).set(dto.sessionId, record);
    emitDesktopSyncEvent(userId, 'session:updated', {
      sessionId: record.sessionId,
      messages: record.messages,
      meta: this.toSessionMeta(record),
    });

    return {
      ok: true,
      session: record,
    };
  }

  listSessions(userId: string) {
    return Array.from(this.userMap(this.sessions, userId).values())
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map((session) => this.toSessionMeta(session));
  }

  getSession(userId: string, sessionId: string) {
    const session = this.userMap(this.sessions, userId).get(sessionId);
    if (!session) {
      throw new NotFoundException('Desktop session not found');
    }

    return {
      sessionId: session.sessionId,
      messages: session.messages,
      meta: this.toSessionMeta(session),
    };
  }

  createCommand(userId: string, dto: CreateDesktopCommandDto) {
    const commandId = crypto.randomUUID();
    const now = new Date().toISOString();
    const record: DesktopCommandRecord = {
      commandId,
      title: dto.title,
      kind: dto.kind,
      status: DesktopCommandStatus.PENDING,
      targetDeviceId: dto.targetDeviceId,
      requesterDeviceId: dto.requesterDeviceId,
      sessionId: dto.sessionId,
      payload: dto.payload,
      createdAt: now,
      updatedAt: now,
    };

    this.userMap(this.commands, userId).set(commandId, record);
    emitDesktopSyncEvent(userId, 'desktop-sync:command', record);

    return {
      ok: true,
      command: record,
    };
  }

  listCommands(userId: string, deviceId?: string) {
    return Array.from(this.userMap(this.commands, userId).values())
      .filter((command) => !deviceId || !command.targetDeviceId || command.targetDeviceId === deviceId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 60);
  }

  getPendingCommands(userId: string, deviceId?: string) {
    return this.listCommands(userId, deviceId).filter((command) => command.status === DesktopCommandStatus.PENDING);
  }

  claimCommand(userId: string, commandId: string, dto: ClaimDesktopCommandDto) {
    const command = this.userMap(this.commands, userId).get(commandId);
    if (!command) {
      throw new NotFoundException('Desktop command not found');
    }

    if (command.targetDeviceId && command.targetDeviceId !== dto.deviceId) {
      throw new NotFoundException('Desktop command is not targeted to this device');
    }

    if (command.status !== DesktopCommandStatus.PENDING) {
      return {
        ok: true,
        command,
      };
    }

    command.status = DesktopCommandStatus.CLAIMED;
    command.claimedAt = new Date().toISOString();
    command.claimedByDeviceId = dto.deviceId;
    command.updatedAt = command.claimedAt;
    emitDesktopSyncEvent(userId, 'desktop-sync:command-updated', command);

    return {
      ok: true,
      command,
    };
  }

  completeCommand(userId: string, commandId: string, dto: CompleteDesktopCommandDto) {
    const command = this.userMap(this.commands, userId).get(commandId);
    if (!command) {
      throw new NotFoundException('Desktop command not found');
    }

    command.status = dto.status;
    command.completedAt = new Date().toISOString();
    command.updatedAt = command.completedAt;
    command.claimedByDeviceId = command.claimedByDeviceId ?? dto.deviceId;
    command.result = dto.result;
    command.error = dto.error;

    emitDesktopSyncEvent(userId, 'desktop-sync:command-updated', command);

    return {
      ok: true,
      command,
    };
  }

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

  private bumpTaskStatusForApproval(
    userId: string,
    taskId: string,
    timelineEntryId: string | undefined,
    timelineStatus: DesktopTimelineEntryDto['status'],
  ) {
    const task = this.userMap(this.tasks, userId).get(taskId);
    if (!task) {
      return;
    }

    if (timelineEntryId) {
      task.timeline = task.timeline.map((entry) =>
        entry.id === timelineEntryId ? { ...entry, status: timelineStatus } : entry,
      );
    }

    if (timelineStatus === 'waiting-approval') {
      task.status = DesktopTaskStatus.NEED_APPROVE;
    } else if (timelineStatus === 'running') {
      task.status = DesktopTaskStatus.EXECUTING;
    } else if (timelineStatus === 'rejected') {
      task.status = DesktopTaskStatus.FAILED;
    }

    task.updatedAt = new Date().toISOString();
    emitDesktopSyncEvent(userId, 'desktop-sync:task', task);
  }

  private formatApprovalMessage(approval: DesktopApprovalRecord) {
    const deviceLabel = approval.context?.workspaceHint || approval.deviceId;
    return `${approval.title} on ${deviceLabel}. ${approval.description.slice(0, 120)}`;
  }

  private toSessionMeta(session: DesktopSessionRecord) {
    return {
      sessionId: session.sessionId,
      title: session.title,
      messageCount: session.messageCount,
      updatedAt: session.updatedAt,
      deviceId: session.deviceId,
      deviceType: session.deviceType,
    };
  }
}
