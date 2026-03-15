import { apiFetch } from './api';

export type DesktopCommandKind =
  | 'context'
  | 'active-window'
  | 'list-windows'
  | 'run-command'
  | 'read-file'
  | 'write-file'
  | 'open-browser';

export type DesktopCommandStatus = 'pending' | 'claimed' | 'completed' | 'failed' | 'rejected';

export interface MobileDesktopApproval {
  approvalId: string;
  deviceId: string;
  taskId: string;
  timelineEntryId?: string;
  title: string;
  description: string;
  riskLevel: 'L0' | 'L1' | 'L2' | 'L3';
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  respondedAt?: string;
}

export interface MobileDesktopCommand {
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
  completedAt?: string;
  result?: Record<string, unknown>;
  error?: string;
}

export interface MobileDesktopState {
  devices: Array<{
    deviceId: string;
    platform: string;
    appVersion?: string;
    context?: {
      activeWindowTitle?: string;
      processName?: string;
      workspaceHint?: string;
      fileHint?: string;
      clipboardTextPreview?: string;
    };
    lastSeenAt: string;
  }>;
  tasks: Array<any>;
  approvals: MobileDesktopApproval[];
  sessions: Array<{
    sessionId: string;
    title: string;
    messageCount: number;
    updatedAt: number;
    deviceId: string;
    deviceType: 'desktop' | 'mobile' | 'web';
  }>;
  commands: MobileDesktopCommand[];
  pendingApprovalCount: number;
  serverTime: string;
}

export async function fetchDesktopState(): Promise<MobileDesktopState> {
  return apiFetch('/desktop-sync/state');
}

export async function createRemoteDesktopCommand(payload: {
  title: string;
  kind: DesktopCommandKind;
  targetDeviceId?: string;
  requesterDeviceId?: string;
  sessionId?: string;
  payload?: Record<string, unknown>;
}) {
  return apiFetch<{ ok: boolean; command: MobileDesktopCommand }>('/desktop-sync/commands', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function respondToDesktopApproval(
  approvalId: string,
  payload: { decision: 'approved' | 'rejected'; rememberForSession?: boolean },
) {
  return apiFetch<{ ok: boolean; approval: MobileDesktopApproval }>(`/desktop-sync/approvals/${approvalId}/respond`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchDesktopSession(sessionId: string) {
  return apiFetch<{ sessionId: string; messages: Array<any>; meta: Record<string, unknown> }>(`/desktop-sync/sessions/${encodeURIComponent(sessionId)}`);
}