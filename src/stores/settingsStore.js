// 设置 Store
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvStorage } from './mmkvStorage';
import { API_BASE, APP_ENV } from '../config/env';
/** Hardcoded fallback models — used only when backend is unreachable */
export const SUPPORTED_MODELS = [
    { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5 (平台默认 API)', provider: 'Agentrix Platform', icon: '🤖', badge: 'Default', availability: 'available', costTier: 'free_trial' },
];
const API_URLS = {
    sandbox: 'https://staging-api.agentrix.top/api',
    production: 'https://api.agentrix.top/api',
    local: 'http://localhost:3001/api',
};
const DEFAULT_ENVIRONMENT = APP_ENV === 'production' ? 'production' : 'sandbox';
const DEFAULT_WAKE_WORD_CONFIG = {
    enabled: true,
    engine: 'auto',
    fallbackPhrases: [
        'Hey Agentrix',
        'Hi Agentrix',
        'Agentrix',
        'Hey Agent Tricks',
        'Hi Agent Tricks',
        'Agent Tricks',
        'Hey Agent Rix',
        'Agent Rix',
        '嘿 Agentrix',
        '你好 Agentrix',
    ],
    displayName: 'Hey Agentrix',
    sensitivity: 0.65,
    localModel: null,
};
export const useSettingsStore = create()(persist((set) => ({
    environment: DEFAULT_ENVIRONMENT,
    apiBaseUrl: API_BASE,
    customApiKeys: {},
    setCustomApiKey: (provider, key) => set((state) => ({
        customApiKeys: { ...state.customApiKeys, [provider]: key },
    })),
    selectedModelId: 'claude-haiku-4-5',
    uiComplexity: 'beginner',
    wakeWordConfig: DEFAULT_WAKE_WORD_CONFIG,
    speechRate: 1.0,
    silenceTimeoutMs: 1800,
    notificationsEnabled: false,
    airdropNotifications: false,
    earningsNotifications: false,
    paymentNotifications: false,
    biometricEnabled: false,
    setEnvironment: (env) => set({
        environment: env,
        apiBaseUrl: API_URLS[env] || API_BASE,
    }),
    setApiBaseUrl: (url) => set({ apiBaseUrl: url }),
    setSelectedModel: (modelId) => set({ selectedModelId: modelId }),
    setUiComplexity: (level) => set({ uiComplexity: level }),
    setWakeWordConfig: (patch) => set((state) => ({
        wakeWordConfig: {
            ...state.wakeWordConfig,
            ...patch,
        },
    })),
    resetWakeWordConfig: () => set({ wakeWordConfig: DEFAULT_WAKE_WORD_CONFIG }),
    setSpeechRate: (rate) => set({ speechRate: Math.max(0.8, Math.min(1.5, rate)) }),
    setSilenceTimeoutMs: (ms) => set({ silenceTimeoutMs: Math.max(800, Math.min(3000, ms)) }),
    toggleNotifications: (enabled) => set({
        notificationsEnabled: enabled,
        airdropNotifications: enabled,
        earningsNotifications: enabled,
        paymentNotifications: enabled,
    }),
    toggleBiometric: (enabled) => set({ biometricEnabled: enabled }),
}), {
    name: 'agentrix-settings-storage',
    storage: createJSONStorage(() => mmkvStorage),
    version: 3,
    migrate: (persistedState, version) => {
        if (!persistedState || version >= 3) {
            return persistedState;
        }
        return {
            ...persistedState,
            notificationsEnabled: false,
            airdropNotifications: false,
            earningsNotifications: false,
            paymentNotifications: false,
            wakeWordConfig: {
                ...DEFAULT_WAKE_WORD_CONFIG,
                ...(persistedState.wakeWordConfig || {}),
            },
        };
    },
}));
