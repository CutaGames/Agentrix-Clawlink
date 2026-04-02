/**
 * deviceDiscovery.service.ts
 *
 * Detects online desktop Agentrix instances for the current user.
 * Uses the backend unified device registry so presence from both
 * desktop-sync and agent-presence are visible to mobile.
 */
import * as Crypto from 'expo-crypto';
import { apiFetch } from './api';
import { mmkv } from '../stores/mmkvStorage';
const MOBILE_DEVICE_ID_KEY = 'agentrix_mobile_device_id';
export function getMobileDeviceId() {
    const cached = mmkv.getString(MOBILE_DEVICE_ID_KEY);
    if (cached)
        return cached;
    const next = `mobile-${Crypto.randomUUID()}`;
    mmkv.set(MOBILE_DEVICE_ID_KEY, next);
    return next;
}
let _pollTimer = null;
let _listeners = [];
let _lastDevices = [];
async function fetchOnlineDevices() {
    try {
        const devices = await apiFetch('/agent-presence/devices/unified/online');
        return Array.isArray(devices)
            ? devices.filter((device) => device.deviceType === 'desktop' || device.source === 'desktop-sync')
            : [];
    }
    catch {
        return [];
    }
}
function notify(devices) {
    _lastDevices = devices;
    for (const fn of _listeners)
        fn(devices);
}
export function startDeviceDiscovery(intervalMs = 30000) {
    if (_pollTimer)
        return;
    const poll = async () => {
        const devices = await fetchOnlineDevices();
        notify(devices);
    };
    poll();
    _pollTimer = setInterval(poll, intervalMs);
}
export function stopDeviceDiscovery() {
    if (_pollTimer) {
        clearInterval(_pollTimer);
        _pollTimer = null;
    }
}
export function onDevicesChanged(fn) {
    _listeners.push(fn);
    // Immediately call with last known state
    if (_lastDevices.length > 0)
        fn(_lastDevices);
    return () => {
        _listeners = _listeners.filter((l) => l !== fn);
    };
}
export function getLastDiscoveredDevices() {
    return _lastDevices;
}
