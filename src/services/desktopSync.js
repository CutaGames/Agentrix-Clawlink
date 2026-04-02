import { apiFetch } from './api';
export async function fetchDesktopState() {
    return apiFetch('/desktop-sync/state');
}
export async function fetchLatestDesktopClipboard() {
    const state = await fetchDesktopState();
    const candidates = (state.devices || [])
        .filter((device) => typeof device.context?.clipboardTextPreview === 'string' && device.context.clipboardTextPreview.trim().length > 0)
        .sort((left, right) => new Date(right.lastSeenAt).getTime() - new Date(left.lastSeenAt).getTime());
    const latest = candidates[0];
    if (!latest) {
        return null;
    }
    return {
        deviceId: latest.deviceId,
        platform: latest.platform,
        text: latest.context?.clipboardTextPreview?.trim() || '',
        lastSeenAt: latest.lastSeenAt,
    };
}
export async function createRemoteDesktopCommand(payload) {
    return apiFetch('/desktop-sync/commands', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}
export async function respondToDesktopApproval(approvalId, payload) {
    return apiFetch(`/desktop-sync/approvals/${approvalId}/respond`, {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}
export async function fetchDesktopSession(sessionId) {
    return apiFetch(`/desktop-sync/sessions/${encodeURIComponent(sessionId)}`);
}
