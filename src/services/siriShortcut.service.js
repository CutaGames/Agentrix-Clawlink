/**
 * Siri Shortcut Bridge — iOS zero-cost wake-up solution.
 *
 * Allows users to trigger Agentrix voice mode via Siri:
 *   "Hey Siri, open Agentrix" → App opens in voice mode
 *
 * This works by:
 * 1. Registering a Siri Shortcut (NSUserActivity) when voice mode is used
 * 2. Handling the deep link when Siri triggers it
 * 3. Navigating to voice chat screen automatically
 *
 * No additional SDK needed — uses expo-linking + native NSUserActivity.
 *
 * Setup:
 *   1. Add shortcut activity type in Info.plist (NSUserActivityTypes)
 *   2. Register the shortcut after first voice interaction
 *   3. User can add to Siri via Settings or prompted in-app
 */
import { Platform, Linking, NativeModules } from 'react-native';
const ACTIVITY_TYPE = 'com.agentrix.voiceChat';
const DEEP_LINK_URL = 'agentrix://voice';
/**
 * Check if Siri Shortcuts are supported (iOS 12+).
 */
export function isSiriShortcutSupported() {
    if (Platform.OS !== 'ios')
        return false;
    const version = parseInt(Platform.Version, 10);
    return version >= 12;
}
/**
 * Register a Siri Shortcut for voice activation.
 * This "donates" the shortcut to iOS so users can add it to Siri.
 *
 * Call this after the user successfully uses voice mode for the first time.
 */
export async function donateVoiceShortcut() {
    if (!isSiriShortcutSupported())
        return;
    try {
        // Try expo-shortcuts if available
        const ExpoShortcuts = getNativeShortcutsModule();
        if (ExpoShortcuts?.donateShortcut) {
            await ExpoShortcuts.donateShortcut({
                activityType: ACTIVITY_TYPE,
                title: 'Start Voice Chat',
                suggestedInvocationPhrase: 'Open Agentrix',
                isEligibleForSearch: true,
                isEligibleForPrediction: true,
                userInfo: { mode: 'voice' },
            });
            console.log('[SiriShortcut] Shortcut donated successfully');
            return;
        }
        // Fallback: use Linking to suggest the user add it manually
        console.log('[SiriShortcut] Native module not available. User can add shortcut manually via Settings.');
    }
    catch (error) {
        console.warn('[SiriShortcut] Failed to donate shortcut:', error?.message);
    }
}
/**
 * Set up the deep link listener for Siri shortcut activation.
 * Call this once at app startup.
 */
export function setupSiriShortcutListener(config) {
    if (Platform.OS !== 'ios')
        return () => { };
    const handleUrl = (event) => {
        if (event.url === DEEP_LINK_URL || event.url.startsWith('agentrix://voice')) {
            console.log('[SiriShortcut] Activated via deep link');
            config.onActivate();
            config.navigateToVoiceChat?.();
        }
    };
    // Handle URL when app is already running
    const subscription = Linking.addEventListener('url', handleUrl);
    // Handle URL that opened the app
    Linking.getInitialURL().then((url) => {
        if (url && (url === DEEP_LINK_URL || url.startsWith('agentrix://voice'))) {
            console.log('[SiriShortcut] Activated via initial URL');
            config.onActivate();
            config.navigateToVoiceChat?.();
        }
    }).catch(() => { });
    return () => {
        subscription.remove();
    };
}
/**
 * Prompt the user to add the voice shortcut to Siri.
 * Shows the native iOS "Add to Siri" dialog.
 */
export async function presentAddToSiriDialog() {
    if (!isSiriShortcutSupported())
        return false;
    try {
        const ExpoShortcuts = getNativeShortcutsModule();
        if (ExpoShortcuts?.presentShortcut) {
            const result = await ExpoShortcuts.presentShortcut({
                activityType: ACTIVITY_TYPE,
                title: 'Start Agentrix Voice',
                suggestedInvocationPhrase: 'Open Agentrix',
            });
            return result?.status === 'added';
        }
    }
    catch (error) {
        console.warn('[SiriShortcut] Add to Siri dialog failed:', error?.message);
    }
    return false;
}
/**
 * Try to get the native shortcuts module (expo-shortcuts or custom native module).
 */
function getNativeShortcutsModule() {
    try {
        return NativeModules.ExpoShortcuts || NativeModules.RNSiriShortcuts || null;
    }
    catch {
        return null;
    }
}
