import { API_BASE, apiFetch } from "./store";
import { getDesktopContext, getDesktopDeviceId, type ApprovalRiskLevel } from "./desktop";

export type DesktopTaskRunState = "idle" | "executing" | "need-approve" | "completed" | "failed";
export type DesktopTimelineStatus = "running" | "waiting-approval" | "completed" | "failed" | "rejected";

export interface DesktopSyncContextPayload {
  activeWindowTitle?: string;
  processName?: string;
  workspaceHint?: string;
  fileHint?: string;
  clipboardTextPreview?: string;
}

export interface DesktopSyncTimelineEntry {
  id: string;
  title: string;
  detail?: string;
  kind: string;
  riskLevel: ApprovalRiskLevel;
  status: DesktopTimelineStatus;
  startedAt: number;
  finishedAt?: number;
  output?: string;
}

export interface DesktopRemoteApproval {
  approvalId: string;
  deviceId: string;
  taskId: string;
  timelineEntryId?: string;
  title: string;
  description: string;
  riskLevel: ApprovalRiskLevel;
  sessionKey?: string;
  status: "pending" | "approved" | "rejected";
  requestedAt: string;
  respondedAt?: string;
  responseDeviceId?: string;
  rememberForSession: boolean;
}

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  return text ? JSON.parse(text) as T : ({} as T);
}

export async function captureDesktopSyncContext(): Promise<DesktopSyncContextPayload> {
  try {
    const context = await getDesktopContext();
    return {
      activeWindowTitle: context.activeWindow?.title || undefined,
      processName: context.activeWindow?.processName || undefined,
      workspaceHint: context.workspaceHint || undefined,
      fileHint: context.fileHint || undefined,
      clipboardTextPreview: context.clipboardTextPreview || undefined,
    };
  } catch {
    return {
      processName: navigator.platform,
    };
  }
}

export async function syncDesktopHeartbeat(token: string) {
  const context = await captureDesktopSyncContext();
  const response = await apiFetch(`${API_BASE}/desktop-sync/heartbeat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      deviceId: getDesktopDeviceId(),
      platform: navigator.platform || "unknown",
      appVersion: "0.1.0",
      context,
    }),
  });
  return readJson<any>(response);
}

export async function syncDesktopTask(
  token: string,
  payload: {
    taskId: string;
    title: string;
    summary?: string;
    sessionId?: string;
    status: DesktopTaskRunState;
    startedAt?: number;
    finishedAt?: number;
    timeline: DesktopSyncTimelineEntry[];
  },
) {
  const context = await captureDesktopSyncContext();
  const response = await apiFetch(`${API_BASE}/desktop-sync/tasks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      deviceId: getDesktopDeviceId(),
      ...payload,
      context,
    }),
  });
  return readJson<any>(response);
}

export async function createDesktopApproval(
  token: string,
  payload: {
    taskId: string;
    timelineEntryId?: string;
    title: string;
    description: string;
    riskLevel: ApprovalRiskLevel;
    sessionKey?: string;
  },
) {
  const context = await captureDesktopSyncContext();
  const response = await apiFetch(`${API_BASE}/desktop-sync/approvals`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      deviceId: getDesktopDeviceId(),
      ...payload,
      context,
    }),
  });
  return readJson<{ ok: boolean; approval: DesktopRemoteApproval }>(response);
}

export async function respondDesktopApproval(
  token: string,
  approvalId: string,
  payload: { decision: "approved" | "rejected"; rememberForSession?: boolean },
) {
  const response = await apiFetch(`${API_BASE}/desktop-sync/approvals/${approvalId}/respond`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      deviceId: getDesktopDeviceId(),
      ...payload,
    }),
  });
  return readJson<{ ok: boolean; approval: DesktopRemoteApproval }>(response);
}

export async function fetchDesktopSyncState(token: string) {
  const response = await apiFetch(`${API_BASE}/desktop-sync/state`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return readJson<{
    devices: Array<any>;
    tasks: Array<any>;
    approvals: DesktopRemoteApproval[];
    pendingApprovalCount: number;
    serverTime: string;
  }>(response);
}