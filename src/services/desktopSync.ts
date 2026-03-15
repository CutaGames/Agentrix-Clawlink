import { apiFetch } from './api';

export type MobileDesktopApprovalDecision = 'approved' | 'rejected';

export interface MobileDesktopSyncState {
  devices: Array<{
    deviceId: string;
    platform: string;
    appVersion?: string;
    lastSeenAt: string;
    context?: {
      activeWindowTitle?: string;
      processName?: string;
      workspaceHint?: string;
      fileHint?: string;
      clipboardTextPreview?: string;
    };
  }>;
  tasks: Array<{
    taskId: string;
    deviceId: string;
    title: string;
    summary?: string;
    status: 'idle' | 'executing' | 'need-approve' | 'completed' | 'failed';
    updatedAt: string;
    timeline: Array<{
      id: string;
      title: string;
      detail?: string;
      kind: string;
      riskLevel: 'L0' | 'L1' | 'L2' | 'L3';
      status: 'running' | 'waiting-approval' | 'completed' | 'failed' | 'rejected';
      startedAt: number;
      finishedAt?: number;
      output?: string;
    }>;
  }>;
  approvals: Array<{
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
    rememberForSession: boolean;
  }>;
  pendingApprovalCount: number;
  serverTime: string;
}

export const desktopSyncService = {
  async getState(): Promise<MobileDesktopSyncState> {
    return apiFetch('/desktop-sync/state');
  },

  async getPendingApprovals(deviceId?: string) {
    const query = deviceId ? `?deviceId=${encodeURIComponent(deviceId)}` : '';
    return apiFetch<{ approvals: MobileDesktopSyncState['approvals'] }>(`/desktop-sync/approvals/pending${query}`);
  },

  async respondToApproval(
    approvalId: string,
    payload: { decision: MobileDesktopApprovalDecision; rememberForSession?: boolean; deviceId?: string },
  ) {
    return apiFetch(`/desktop-sync/approvals/${approvalId}/respond`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};