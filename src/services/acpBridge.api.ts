/**
 * ACP Bridge API 鈥?绉诲姩绔?Agent Client Protocol 妗ユ帴
 * P4: Session 绠＄悊 / Action 璋冪敤 / 璺?session 娑堟伅杞彂
 */
import { apiFetch } from './api';

export type AcpSessionStatus = 'active' | 'paused' | 'completed' | 'error' | 'killed';

export interface AcpSession {
  sessionId: string;
  agentId?: string;
  userId: string;
  status: AcpSessionStatus;
  createdAt: string;
  lastActivityAt: string;
  metadata?: Record<string, any>;
}

export interface AcpAction {
  name: string;
  description: string;
  operationId: string;
  url: string;
  parameters: Record<string, any>;
  pricing?: { model: string; priceUsd?: number };
}

export interface AcpSteerCommand {
  type: 'pause' | 'resume' | 'cancel' | 'redirect';
  targetSessionId?: string;
  reason?: string;
}

// 鈹€鈹€ Session Lifecycle 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

export async function createAcpSession(
  agentId?: string,
  metadata?: Record<string, any>,
): Promise<AcpSession> {
  return apiFetch<AcpSession>('/acp/sessions', {
    method: 'POST',
    body: JSON.stringify({ agentId, metadata }),
  });
}

export async function getAcpSession(sessionId: string): Promise<AcpSession> {
  return apiFetch<AcpSession>(`/acp/sessions/${sessionId}`);
}

export async function listAcpSessions(): Promise<AcpSession[]> {
  return apiFetch<AcpSession[]>('/acp/sessions');
}

export async function steerAcpSession(sessionId: string, command: AcpSteerCommand): Promise<AcpSession> {
  return apiFetch<AcpSession>(`/acp/sessions/${sessionId}/steer`, {
    method: 'POST',
    body: JSON.stringify(command),
  });
}

export async function killAcpSession(sessionId: string, reason?: string): Promise<void> {
  return apiFetch<void>(`/acp/sessions/${sessionId}`, {
    method: 'DELETE',
    body: JSON.stringify({ reason }),
  });
}

// 鈹€鈹€ Reply Dispatch 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

export async function replyDispatch(params: {
  fromSessionId: string;
  toSessionId: string;
  message: string;
  metadata?: Record<string, any>;
}): Promise<{ delivered: boolean; targetStatus: AcpSessionStatus }> {
  return apiFetch<{ delivered: boolean; targetStatus: AcpSessionStatus }>('/acp/dispatch', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

// 鈹€鈹€ Actions (Skills) 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

export async function listAcpActions(): Promise<AcpAction[]> {
  return apiFetch<AcpAction[]>('/acp/actions');
}

export async function invokeAcpAction(
  actionId: string,
  sessionId: string,
  parameters: Record<string, any>,
): Promise<{ success: boolean; sessionId: string; skillId: string; result: any }> {
  return apiFetch(`/acp/actions/${actionId}/invoke`, {
    method: 'POST',
    body: JSON.stringify({ sessionId, parameters }),
  });
}

// 鈹€鈹€ MCP Mobile Proxy 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

export async function proxyMcpToolCall(
  serverIdOrName: string,
  toolName: string,
  args: Record<string, any>,
): Promise<{ result: any }> {
  return apiFetch<{ result: any }>('/mcp-servers/mobile-proxy/call', {
    method: 'POST',
    body: JSON.stringify({ serverIdOrName, toolName, args }),
  });
}