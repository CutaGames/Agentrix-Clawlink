import { apiFetch } from './api';
const DEFAULT_LIMITS = {
    singleTxLimit: 100,
    dailyLimit: 500,
    monthlyLimit: 2000,
    currency: 'USD',
};
const extractData = (response) => {
    if (response?.data !== undefined) {
        return response.data;
    }
    return response;
};
const mapStatusToLegacy = (status) => {
    switch (status) {
        case 'paused':
            return 'suspended';
        case 'archived':
            return 'terminated';
        default:
            return status;
    }
};
const mapStatusToPresence = (status) => {
    switch (status) {
        case 'suspended':
            return 'paused';
        case 'terminated':
        case 'revoked':
            return 'archived';
        default:
            return status;
    }
};
const normalizeLimits = (limits) => ({
    singleTxLimit: limits?.singleTxLimit ?? DEFAULT_LIMITS.singleTxLimit,
    dailyLimit: limits?.dailyLimit ?? DEFAULT_LIMITS.dailyLimit,
    monthlyLimit: limits?.monthlyLimit ?? DEFAULT_LIMITS.monthlyLimit,
    currency: limits?.currency ?? DEFAULT_LIMITS.currency,
});
const mapAgent = (agent) => {
    const compatibility = agent.metadata?.accountCompatibility ?? {};
    return {
        id: agent.id,
        name: agent.name,
        description: agent.description,
        agentUniqueId: agent.slug || `presence-${agent.id.slice(0, 8)}`,
        agentType: compatibility.agentType ?? 'personal',
        status: mapStatusToLegacy(agent.status),
        walletAddress: compatibility.linkedWalletAddress,
        preferredModel: agent.defaultModel,
        preferredProvider: agent.settings?.preferredProvider,
        metadata: agent.metadata,
        permissions: agent.metadata?.permissions,
        spendingLimits: normalizeLimits(compatibility.spendingLimits),
        creditScore: compatibility.creditScore ?? 720,
        balance: compatibility.balance ?? 0,
        balanceCurrency: compatibility.balanceCurrency ?? 'USD',
        createdAt: agent.createdAt,
        updatedAt: agent.updatedAt,
    };
};
export async function fetchAgentPresenceAccounts() {
    const res = await apiFetch('/agent-presence/agents');
    return (extractData(res) ?? []).map(mapAgent);
}
export async function getAgentPresenceAccount(id) {
    const res = await apiFetch(`/agent-presence/agents/${id}`);
    return mapAgent(extractData(res));
}
export async function createAgentPresenceAccount(dto) {
    const res = await apiFetch('/agent-presence/agents', {
        method: 'POST',
        body: JSON.stringify({
            name: dto.name,
            description: dto.description,
            metadata: {
                accountCompatibility: {
                    agentType: dto.agentType,
                    spendingLimits: normalizeLimits(dto.spendingLimits),
                    balance: 0,
                    balanceCurrency: 'USD',
                },
            },
        }),
    });
    return mapAgent(extractData(res));
}
export async function updateAgentPresenceAccount(id, dto) {
    const res = await apiFetch(`/agent-presence/agents/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
            name: dto.name,
            description: dto.description,
            defaultModel: dto.preferredModel,
            settings: dto.preferredProvider ? { preferredProvider: dto.preferredProvider } : undefined,
            metadata: {
                ...(dto.metadata ?? {}),
                ...(dto.permissions ? { permissions: dto.permissions } : {}),
                accountCompatibility: {
                    ...(dto.spendingLimits ? { spendingLimits: normalizeLimits(dto.spendingLimits) } : {}),
                    ...(dto.walletAddress ? { linkedWalletAddress: dto.walletAddress } : {}),
                },
            },
        }),
    });
    return mapAgent(extractData(res));
}
export async function setAgentPresenceAccountStatus(id, status, reason) {
    const res = await apiFetch(`/agent-presence/agents/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
            status: mapStatusToPresence(status),
            metadata: reason
                ? {
                    accountCompatibility: {
                        statusReason: reason,
                    },
                }
                : undefined,
        }),
    });
    return mapAgent(extractData(res));
}
