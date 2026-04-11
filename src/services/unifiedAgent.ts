/**
 * Unified Agent Service 鈥?缁熶竴 Agent API
 *
 * 鏇夸唬 agentPresenceAccount.ts锛屼娇鐢?/agents/unified 绔偣銆? * 姣忎釜 Agent = OpenClawInstance + AgentAccount锛?:1 缁戝畾锛夈€? */
import { apiFetch } from './api';

export interface UnifiedAgent {
  id: string;              // OpenClawInstance.id
  name: string;
  description?: string;
  personality?: string;
  status: string;
  instanceType: string;

  // 杩愯鏃?  instanceUrl?: string;
  isPrimary: boolean;
  defaultModel?: string;
  capabilities?: Record<string, any>;
  delegationLevel?: string;
  channelBindings?: any[];
  systemPrompt?: string;

  // 缁忔祹韬唤
  agentAccountId?: string;
  agentUniqueId?: string;
  creditScore?: number;
  spendingLimits?: {
    singleTxLimit: number;
    dailyLimit: number;
    monthlyLimit: number;
    currency: string;
  };
  agentType?: string;

  // 鍥㈤槦
  teamTemplateSlug?: string;
  codename?: string;
  modelTier?: string;

  createdAt: string;
  updatedAt: string;
}

export interface CreateUnifiedAgentDto {
  name: string;
  description?: string;
  personality?: string;
  defaultModel?: string;
  spendingLimits?: {
    singleTxLimit: number;
    dailyLimit: number;
    monthlyLimit: number;
    currency: string;
  };
}

const extractData = <T>(response: any): T => {
  if (response?.data !== undefined) return response.data as T;
  return response as T;
};

export async function fetchUnifiedAgents(): Promise<UnifiedAgent[]> {
  const res = await apiFetch<{ success: boolean; data: UnifiedAgent[] }>('/agents/unified');
  return extractData<UnifiedAgent[]>(res) ?? [];
}

export async function getUnifiedAgent(id: string): Promise<UnifiedAgent> {
  const res = await apiFetch<{ success: boolean; data: UnifiedAgent }>(`/agents/unified/${id}`);
  return extractData<UnifiedAgent>(res);
}

export async function createUnifiedAgent(dto: CreateUnifiedAgentDto): Promise<UnifiedAgent> {
  const res = await apiFetch<{ success: boolean; data: UnifiedAgent }>('/agents/create', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
  return extractData<UnifiedAgent>(res);
}

/**
 * 缁戝畾宸叉湁 OpenClaw 瀹炰緥鍒板洟闃熻鑹? */
export async function bindInstanceToTeamRole(
  teamSlug: string,
  codename: string,
  instanceId: string,
): Promise<{ agentId: string; instanceId: string }> {
  const res = await apiFetch<{ success: boolean; data: { agentId: string; instanceId: string } }>(
    `/agent-teams/my-teams/${teamSlug}/roles/${codename}/bind-instance`,
    {
      method: 'POST',
      body: JSON.stringify({ instanceId }),
    },
  );
  return extractData<{ agentId: string; instanceId: string }>(res);
}