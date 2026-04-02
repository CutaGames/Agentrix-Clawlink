// OpenClaw Connection Service
import { apiFetch } from './api';
// Bind a new OpenClaw instance (manual input or QR scan result)
export async function bindOpenClaw(payload) {
    // Map client-side field names to backend DTO field names
    const body = {
        instanceUrl: payload.instanceUrl,
        instanceToken: payload.apiToken ?? '',
        name: payload.instanceName || 'My Local Agent',
        deployType: payload.deployType,
    };
    return apiFetch('/openclaw/bind', {
        method: 'POST',
        body: JSON.stringify(body),
    });
}
// Create a new QR bind session (get a QR code for user to scan from their OpenClaw)
export async function createBindSession() {
    return apiFetch('/openclaw/bind-session', { method: 'POST' });
}
// Poll bind session status (after user scans QR on their OpenClaw)
export async function pollBindSession(sessionId) {
    return apiFetch(`/openclaw/bind-session/${sessionId}`);
}
// Provision a new cloud-hosted OpenClaw instance
export async function provisionCloudAgent(opts) {
    return apiFetch('/openclaw/cloud/provision', {
        method: 'POST',
        body: JSON.stringify(opts),
    });
}
// Get all user's instances
export async function getMyInstances() {
    return apiFetch('/openclaw/instances');
}
// Get a single instance by ID (used to poll for async SSH provisioning)
export async function getInstanceById(instanceId) {
    return apiFetch(`/openclaw/instances/${instanceId}`);
}
export async function bindAgentAccountToInstance(instanceId, agentAccountId) {
    return apiFetch(`/openclaw/instances/${instanceId}/agent-account`, {
        method: 'PATCH',
        body: JSON.stringify({ agentAccountId: agentAccountId ?? null }),
    });
}
// Get instance status / health
export async function getInstanceStatus(instanceId) {
    return apiFetch(`/openclaw/proxy/${instanceId}/status`);
}
// Send a chat message to an agent via the instance
export async function sendAgentMessage(instanceId, message, sessionId, model) {
    return apiFetch(`/openclaw/proxy/${instanceId}/chat`, {
        method: 'POST',
        body: JSON.stringify({ message, sessionId, model }),
    });
}
// Get agent chat history
export async function getAgentHistory(instanceId, sessionId, limit = 50) {
    const q = new URLSearchParams({ limit: String(limit) });
    if (sessionId)
        q.set('sessionId', sessionId);
    return apiFetch(`/openclaw/proxy/${instanceId}/history?${q}`);
}
// Get skills installed on instance
export async function getInstanceSkills(instanceId) {
    return apiFetch(`/openclaw/proxy/${instanceId}/skills`);
}
// Toggle skill enable/disable
export async function toggleSkill(instanceId, skillId, enabled) {
    return apiFetch(`/openclaw/proxy/${instanceId}/skills/${skillId}/toggle`, {
        method: 'PUT',
        body: JSON.stringify({ enabled }),
    });
}
// Install a marketplace skill: first records to Agentrix DB, then pushes to OpenClaw instance
export async function installSkillToInstance(instanceId, skillId) {
    let dbRecorded = false;
    let dbError = null;
    let proxyError = null;
    // 1. Record installation in Agentrix marketplace DB
    try {
        await apiFetch(`/skills/${skillId}/install`, { method: 'POST' });
        dbRecorded = true;
    }
    catch (e) {
        // Hub skills may not have marketplace entries — always try bridge endpoint as fallback
        // (Hub skills can have UUID IDs or various prefixes)
        try {
            await apiFetch(`/openclaw/bridge/${instanceId}/skill-hub-install`, {
                method: 'POST',
                body: JSON.stringify({ skillId }),
            });
            dbRecorded = true;
        }
        catch (bridgeErr) {
            if (e?.message?.includes('already installed') || e?.message?.includes('Conflict')) {
                dbRecorded = true; // Already installed is fine
            }
            else {
                dbError = bridgeErr?.message || e?.message || 'Install failed';
            }
        }
    }
    // 2. Activate on the target claw (platform-hosted claws activate immediately;
    // disconnected local claws may explicitly return pendingDeploy=true).
    let proxyResult = {};
    try {
        proxyResult = await apiFetch(`/openclaw/proxy/${instanceId}/skills/install`, {
            method: 'POST',
            body: JSON.stringify({ skillId }),
        });
    }
    catch (proxyErr) {
        proxyError = proxyErr?.message || 'Skill activation failed on claw';
        proxyResult = { success: false, pendingDeploy: false, proxyFailed: true, message: proxyError };
    }
    // If both DB record and proxy push failed, throw an error
    if (!dbRecorded && proxyResult?.pendingDeploy !== true && !proxyResult?.success) {
        throw new Error(dbError || 'Install failed. Please try again.');
    }
    // DB-only success is not enough for a live claw unless backend explicitly said pendingDeploy.
    if (dbRecorded && proxyError && proxyResult?.pendingDeploy !== true) {
        throw new Error(`Skill was saved to your account, but activation on this claw failed: ${proxyError}`);
    }
    return { ...(proxyResult || {}), dbRecorded, dbError, proxyError };
}
// Restart instance
export async function restartInstance(instanceId) {
    return apiFetch(`/openclaw/proxy/${instanceId}/restart`, { method: 'POST' });
}
// Disconnect / unbind instance
export async function unbindInstance(instanceId) {
    return apiFetch(`/openclaw/instances/${instanceId}`, { method: 'DELETE' });
}
// Batch delete instances by status (e.g. 'error')
export async function batchCleanupInstances(status = 'error') {
    return apiFetch(`/openclaw/instances?status=${encodeURIComponent(status)}`, { method: 'DELETE' });
}
/** Fetch available models from backend */
export async function getAvailableModels() {
    return apiFetch('/openclaw/models');
}
/** Get the currently active model for an instance */
export async function getInstanceModel(instanceId) {
    return apiFetch(`/openclaw/instances/${instanceId}/model`);
}
/** Switch model for an instance (both cloud and local) */
export async function switchInstanceModel(instanceId, modelId) {
    return apiFetch(`/openclaw/instances/${instanceId}/model`, {
        method: 'PATCH',
        body: JSON.stringify({ modelId }),
    });
}
/** Create a new LOCAL-type instance and get relay token + download links */
export async function provisionLocalAgent(opts) {
    return apiFetch('/openclaw/local/provision', {
        method: 'POST',
        body: JSON.stringify(opts),
    });
}
export async function registerLocalRelayAgent(opts) {
    return apiFetch('/openclaw/local/register', {
        method: 'POST',
        body: JSON.stringify(opts),
    });
}
/** Check whether the local agent binary is connected to the relay */
export async function getRelayStatus(instanceId) {
    return apiFetch(`/openclaw/local/${instanceId}/relay-status`);
}
/** Generate a Telegram deep-link QR for binding this instance */
export async function generateTelegramQr(instanceId) {
    return apiFetch('/openclaw/social/telegram/qr', {
        method: 'POST',
        body: JSON.stringify({ instanceId }),
    });
}
/** Unlink Telegram from an instance */
export async function unlinkTelegram(instanceId) {
    return apiFetch(`/openclaw/social/telegram/${instanceId}`, { method: 'DELETE' });
}
// Stream chat using WebSocket — returns cleanup function
export function streamAgentChat(instanceId, message, sessionId, onChunk, onDone, onError, token) {
    const WS_BASE = 'wss://api.agentrix.top';
    const ws = new WebSocket(`${WS_BASE}/openclaw/proxy/${instanceId}/stream?token=${encodeURIComponent(token)}`);
    let fullText = '';
    ws.onopen = () => {
        ws.send(JSON.stringify({ message, sessionId }));
    };
    ws.onmessage = (e) => {
        try {
            const data = JSON.parse(e.data);
            if (data.type === 'chunk') {
                fullText += data.content;
                onChunk(data.content);
            }
            else if (data.type === 'done') {
                onDone(fullText);
                ws.close();
            }
        }
        catch (_) {
            onChunk(e.data);
            fullText += e.data;
        }
    };
    ws.onerror = () => onError('Connection error');
    ws.onclose = (_e) => { };
    return () => ws.close();
}
/** Fetch current user's storage usage and available plans */
export async function getStorageInfo() {
    return apiFetch('/openclaw/storage/info');
}
/** Initiate plan upgrade (returns a Stripe/payment checkout URL) */
export async function upgradeStoragePlan(tier) {
    return apiFetch('/openclaw/storage/upgrade', {
        method: 'POST',
        body: JSON.stringify({ tier }),
    });
}
/** Get available platform tools for a claw instance */
export async function getPlatformTools(instanceId) {
    return apiFetch(`/openclaw/proxy/${instanceId}/platform-tools`);
}
/** Execute a single platform tool */
export async function executePlatformTool(instanceId, tool, params = {}) {
    return apiFetch(`/openclaw/proxy/${instanceId}/platform-tools/execute`, {
        method: 'POST',
        body: JSON.stringify({ tool, params }),
    });
}
/** Batch-execute multiple platform tools */
export async function executePlatformToolBatch(instanceId, calls) {
    return apiFetch(`/openclaw/proxy/${instanceId}/platform-tools/batch`, {
        method: 'POST',
        body: JSON.stringify({ calls }),
    });
}
// Convenience wrappers for common platform tools
/** Search marketplace + ClawHub skills via platform tool */
export async function agentSkillSearch(instanceId, query, category, limit = 10) {
    return executePlatformTool(instanceId, 'skill_search', { query, category, limit });
}
/** Install a skill via platform tool */
export async function agentSkillInstall(instanceId, skillId, config) {
    return executePlatformTool(instanceId, 'skill_install', { skillId, config });
}
/** Get AI skill recommendations via platform tool */
export async function agentSkillRecommend(instanceId, intent, category, limit = 5) {
    return executePlatformTool(instanceId, 'skill_recommend', { intent, category, limit });
}
/** Purchase a skill from marketplace via platform tool */
export async function agentMarketplacePurchase(instanceId, skillId, paymentMethod = 'wallet') {
    return executePlatformTool(instanceId, 'marketplace_purchase', { skillId, paymentMethod });
}
/** Post a task/bounty via platform tool */
export async function agentTaskPost(instanceId, title, description, budget, currency = 'USDC') {
    return executePlatformTool(instanceId, 'task_post', { title, description, budget, currency });
}
/** Search tasks on marketplace via platform tool */
export async function agentTaskSearch(instanceId, query, limit = 10) {
    return executePlatformTool(instanceId, 'task_search', { query, limit });
}
