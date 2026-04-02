/**
 * Background Voice Service — Mobile background audio session management.
 *
 * Keeps voice sessions alive when the app is backgrounded:
 * - iOS: Uses Background Audio mode + AVAudioSession category
 * - Android: Uses Foreground Service with notification
 *
 * Prerequisites:
 *   iOS: Add "audio" to UIBackgroundModes in Info.plist
 *   Android: Add FOREGROUND_SERVICE permission in AndroidManifest.xml
 *
 * This service manages the audio session lifecycle so that:
 * 1. Recording continues in background (for wake word / duplex)
 * 2. TTS playback continues in background
 * 3. A persistent notification shows voice session status (Android)
 * 4. Session auto-pauses after configurable timeout if no activity
 */
import { Platform, AppState } from 'react-native';
let Audio = null;
try {
    Audio = require('expo-av').Audio;
}
catch { }
let TaskManager = null;
try {
    TaskManager = require('expo-task-manager');
}
catch { }
let Notifications = null;
try {
    Notifications = require('expo-notifications');
}
catch { }
const BACKGROUND_VOICE_TASK = 'AGENTRIX_BACKGROUND_VOICE';
export class BackgroundVoiceService {
    constructor() {
        this.config = null;
        this.isActive = false;
        this.backgroundTimer = null;
        this.appStateSubscription = null;
        this.currentAppState = 'active';
        // ── Private ──
        this.handleAppStateChange = (nextState) => {
            const prevState = this.currentAppState;
            this.currentAppState = nextState;
            if (!this.isActive)
                return;
            if (prevState === 'active' && nextState.match(/inactive|background/)) {
                // App going to background
                this.config?.onBackground?.();
                this.startBackgroundTimer();
            }
            else if (prevState.match(/inactive|background/) && nextState === 'active') {
                // App returning to foreground
                this.clearBackgroundTimer();
                this.config?.onForeground?.();
            }
        };
    }
    /**
     * Initialize background voice handling.
     */
    async init(config) {
        this.config = config;
        // Configure audio session for background playback/recording
        if (Audio) {
            try {
                await Audio.setAudioModeAsync({
                    allowsRecordingIOS: true,
                    playsInSilentModeIOS: true,
                    staysActiveInBackground: true,
                    // iOS: use playAndRecord so both mic and speaker work
                    ...(Platform.OS === 'ios' ? {
                        interruptionModeIOS: 1, // DoNotMix
                    } : {}),
                    // Android: use default mode
                    ...(Platform.OS === 'android' ? {
                        shouldDuckAndroid: true,
                        playThroughEarpieceAndroid: false,
                    } : {}),
                });
            }
            catch (err) {
                console.warn('[BackgroundVoice] Audio mode setup failed:', err);
            }
        }
        // Listen for app state changes
        this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
    }
    /**
     * Mark voice session as active (enables background persistence).
     */
    activate() {
        this.isActive = true;
        if (Platform.OS === 'android') {
            this.showAndroidNotification();
        }
    }
    /**
     * Mark voice session as inactive (disables background persistence).
     */
    deactivate() {
        this.isActive = false;
        this.clearBackgroundTimer();
        if (Platform.OS === 'android') {
            this.dismissAndroidNotification();
        }
        // Reset audio mode
        if (Audio) {
            Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
                playsInSilentModeIOS: true,
                staysActiveInBackground: false,
            }).catch(() => { });
        }
    }
    /**
     * Clean up all resources.
     */
    destroy() {
        this.deactivate();
        if (this.appStateSubscription) {
            this.appStateSubscription.remove();
            this.appStateSubscription = null;
        }
        this.config = null;
    }
    get active() {
        return this.isActive;
    }
    get isInBackground() {
        return this.currentAppState !== 'active';
    }
    startBackgroundTimer() {
        this.clearBackgroundTimer();
        const timeout = this.config?.maxBackgroundDurationMs || 5 * 60 * 1000;
        this.backgroundTimer = setTimeout(() => {
            console.log('[BackgroundVoice] Background timeout reached');
            this.config?.onTimeout?.();
            this.deactivate();
        }, timeout);
    }
    clearBackgroundTimer() {
        if (this.backgroundTimer) {
            clearTimeout(this.backgroundTimer);
            this.backgroundTimer = null;
        }
    }
    showAndroidNotification() {
        if (Platform.OS !== 'android' || !Notifications)
            return;
        try {
            Notifications.scheduleNotificationAsync({
                content: {
                    title: 'Agentrix Voice Active',
                    body: 'Voice session is running. Tap to return.',
                    sticky: true,
                    autoDismiss: false,
                    categoryIdentifier: 'voice-session',
                },
                trigger: null, // immediate
                identifier: 'voice-session-active',
            }).catch(() => { });
        }
        catch { }
    }
    dismissAndroidNotification() {
        if (Platform.OS !== 'android' || !Notifications)
            return;
        try {
            Notifications.dismissNotificationAsync('voice-session-active').catch(() => { });
        }
        catch { }
    }
}
