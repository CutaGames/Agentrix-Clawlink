import { Platform, Vibration } from 'react-native';
const VIBRATION_PATTERNS = {
    high: [0, 200, 100, 200, 100, 400], // urgent triple-pulse
    normal: [0, 200, 100, 200], // double-pulse
    low: [0, 150], // single short pulse
};
/**
 * Trigger haptic notification on watch.
 * On Wear OS, uses Android Vibrator API via RN bridge.
 */
export function notifyWithHaptic(notification) {
    const pattern = VIBRATION_PATTERNS[notification.priority];
    if (Platform.OS === 'android') {
        Vibration.vibrate(pattern);
    }
}
/**
 * Cancel all pending vibrations.
 */
export function cancelHaptic() {
    Vibration.cancel();
}
