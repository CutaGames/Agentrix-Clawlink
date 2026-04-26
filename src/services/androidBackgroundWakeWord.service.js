import { NativeModules, Platform } from 'react-native';
const nativeModule = (Platform.OS === 'android'
    ? NativeModules.AndroidBackgroundWakeWord
    : null);
export function isAndroidBackgroundWakeWordAvailable() {
    return Platform.OS === 'android' && nativeModule != null;
}
export async function getAndroidOverlayPermissionStatus() {
    if (!isAndroidBackgroundWakeWordAvailable()) {
        return false;
    }
    return nativeModule.isOverlayPermissionGranted();
}
export async function requestAndroidOverlayPermission() {
    if (!isAndroidBackgroundWakeWordAvailable()) {
        return;
    }
    await nativeModule.requestOverlayPermission();
}
export async function syncAndroidBackgroundWakeWordConfig(payload) {
    if (!isAndroidBackgroundWakeWordAvailable()) {
        return;
    }
    await nativeModule.syncConfig(JSON.stringify(payload));
}
export async function startAndroidBackgroundWakeWordService() {
    if (!isAndroidBackgroundWakeWordAvailable()) {
        return;
    }
    await nativeModule.startService();
}
export async function stopAndroidBackgroundWakeWordService() {
    if (!isAndroidBackgroundWakeWordAvailable()) {
        return;
    }
    await nativeModule.stopService();
}
export async function isAndroidBackgroundWakeWordRunning() {
    if (!isAndroidBackgroundWakeWordAvailable()) {
        return false;
    }
    return nativeModule.isServiceRunning();
}
