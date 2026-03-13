import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../../entities/notification.entity';
import { WebSocketGateway } from '../websocket/websocket.gateway';
import {
  CreateDesktopApprovalDto,
  DesktopApprovalDecision,
  DesktopApprovalRiskLevel,
  DesktopHeartbeatDto,
  DesktopTaskStatus,
  DesktopTimelineStatus,
  DesktopTimelineEntryDto,
  RespondDesktopApprovalDto,
  UpsertDesktopTaskDto,
} from './dto/desktop-sync.dto';

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

  constructor(
    private readonly notificationService: NotificationService,
    private readonly wsGateway: WebSocketGateway,
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
    // this.wsGateway.sendDesktopSyncEvent(userId, 'desktop-sync:presence', next);

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
    // this.wsGateway.sendDesktopSyncEvent(userId, 'desktop-sync:task', record);

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
    // this.wsGateway.sendDesktopSyncEvent(userId, 'desktop-sync:approval', record);

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

    // this.wsGateway.sendDesktopSyncEvent(userId, 'desktop-sync:approval-response', approval);

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

    return {
      devices,
      tasks,
      approvals,
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
    // this.wsGateway.sendDesktopSyncEvent(userId, 'desktop-sync:task', task);
  }

  private formatApprovalMessage(approval: DesktopApprovalRecord) {
    const deviceLabel = approval.context?.workspaceHint || approval.deviceId;
    return `${approval.title} on ${deviceLabel}. ${approval.description.slice(0, 120)}`;
  }
}
