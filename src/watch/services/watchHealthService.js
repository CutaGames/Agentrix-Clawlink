import { API_BASE } from '../../config/env';
const DEVICE_ID = 'watch-builtin';
const DEVICE_NAME = 'Agentrix Watch';
/**
 * Upload buffered health samples to backend.
 */
export async function uploadHealthSamples(samples, token) {
    if (samples.length === 0)
        return { success: true };
    const payload = {
        deviceId: DEVICE_ID,
        deviceName: DEVICE_NAME,
        samples,
        uploadedAt: new Date().toISOString(),
    };
    try {
        const headers = { 'Content-Type': 'application/json' };
        if (token)
            headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch(`${API_BASE}/wearable-telemetry/upload`, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
        });
        if (!res.ok)
            return { success: false, error: `HTTP ${res.status}` };
        return { success: true };
    }
    catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'Network error' };
    }
}
/**
 * Fetch latest device readings from backend.
 */
export async function fetchLatestReadings(token) {
    try {
        const headers = { 'Content-Type': 'application/json' };
        if (token)
            headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch(`${API_BASE}/wearable-telemetry/devices/${DEVICE_ID}/latest`, {
            headers,
        });
        if (!res.ok)
            return null;
        return res.json();
    }
    catch {
        return null;
    }
}
