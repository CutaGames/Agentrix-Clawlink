import { Platform } from 'react-native';
import { setApiConfig } from '../services/api';
// Stores are imported lazily inside applyVoiceUiE2EBootstrap() to avoid
// circular dependency TDZ errors during module initialization.
// (AgentChatScreen → useVoiceSession → liveSpeech/realtimeVoice → e2e.ts → stores → TDZ)
const VOICE_UI_E2E_SCENARIO = 'voice-ui';
const VOICE_ONBOARDING_KEYS = ['voice_onboarding_completed', 'voice_onboarding_completed_v2'];
function createVoiceUiE2ERuntime() {
    window.__AGENTRIX_VOICE_UI_E2E_LIVE_SPEECH_PERMISSION__ = 'granted';
    const runtime = {
        liveSpeechPermission: 'granted',
        setLiveSpeechPermission(state) {
            runtime.liveSpeechPermission = state;
            window.__AGENTRIX_VOICE_UI_E2E_LIVE_SPEECH_PERMISSION__ = state;
            window.dispatchEvent(new CustomEvent('agentrix:e2e-live-speech-permission', { detail: state }));
        },
        triggerWakeWord() {
            window.dispatchEvent(new CustomEvent('agentrix:e2e-wake-word'));
        },
        emitRealtimeFinalTranscript(text) {
            window.__AGENTRIX_VOICE_UI_E2E_REALTIME_BRIDGE__?.onFinalTranscript(text);
        },
        emitRealtimeAssistantChunk(chunk) {
            window.__AGENTRIX_VOICE_UI_E2E_REALTIME_BRIDGE__?.onAssistantChunk(chunk);
        },
        completeRealtimeAssistantResponse() {
            window.__AGENTRIX_VOICE_UI_E2E_REALTIME_BRIDGE__?.onAssistantEnd();
        },
        emitRealtimeError(message) {
            window.__AGENTRIX_VOICE_UI_E2E_REALTIME_BRIDGE__?.onError(message);
        },
    };
    return runtime;
}
export function setVoiceUiE2ERealtimeBridge(bridge) {
    if (typeof window === 'undefined') {
        return;
    }
    window.__AGENTRIX_VOICE_UI_E2E_REALTIME_BRIDGE__ = bridge;
}
function createJsonResponse(body, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            'Content-Type': 'application/json',
        },
    });
}
function installVoiceUiE2EFetchMock() {
    if (typeof window === 'undefined' || window.__AGENTRIX_VOICE_UI_E2E_FETCH_MOCKED__) {
        return;
    }
    const originalFetch = globalThis.fetch.bind(globalThis);
    const mockedFetch = async (input, init) => {
        const requestUrl = typeof input === 'string'
            ? input
            : input instanceof URL
                ? input.toString()
                : input.url;
        const requestMethod = (init?.method || (typeof Request !== 'undefined' && input instanceof Request ? input.method : 'GET')).toUpperCase();
        const parsedUrl = new URL(requestUrl, window.location.origin);
        const normalizedPath = parsedUrl.pathname.replace(/^\/api/, '');
        if (requestMethod === 'OPTIONS') {
            return new Response(null, { status: 204 });
        }
        if (normalizedPath === '/health') {
            return createJsonResponse({ ok: true, status: 'ok' });
        }
        if (normalizedPath === '/ai-providers/available-models') {
            return createJsonResponse([
                {
                    id: 'claude-haiku-4-5',
                    label: 'Claude Haiku 4.5 (平台默认 API)',
                    provider: 'Agentrix Platform',
                    providerId: 'agentrix-platform',
                    costTier: 'free_trial',
                    isDefault: true,
                },
            ]);
        }
        if (normalizedPath === '/token-quota/me') {
            return createJsonResponse({
                planType: 'free_trial',
                totalQuota: 100000,
                usedTokens: 1250,
                remainingTokens: 98750,
                usagePercent: 1.25,
                callCount: 8,
                periodStart: '2026-03-01T00:00:00.000Z',
                periodEnd: '2026-03-31T23:59:59.999Z',
                quotaExhausted: false,
                energyLevel: 98,
            });
        }
        if (normalizedPath === '/desktop-sync/state') {
            return createJsonResponse({
                devices: [],
                tasks: [],
                approvals: [],
                sessions: [],
                commands: [],
                pendingApprovalCount: 0,
                serverTime: '2026-03-25T00:00:00.000Z',
            });
        }
        if (normalizedPath === '/agent-presence/devices/unified/online') {
            return createJsonResponse([]);
        }
        if (normalizedPath === '/skills/installed') {
            return createJsonResponse({ items: [] });
        }
        if (normalizedPath === '/notifications/recent') {
            return createJsonResponse({ notifications: [] });
        }
        if (normalizedPath === '/agent-presence/agents/e2e-agent-account-1') {
            return createJsonResponse({
                success: true,
                data: {
                    id: 'e2e-agent-account-1',
                    name: 'Voice QA Agent',
                    slug: 'voice-qa-agent',
                    status: 'active',
                    defaultModel: 'claude-haiku-4-5',
                    createdAt: '2026-03-25T00:00:00.000Z',
                    updatedAt: '2026-03-25T00:00:00.000Z',
                    metadata: {
                        voice_id: 'alloy',
                        accountCompatibility: {
                            agentType: 'personal',
                            spendingLimits: {
                                singleTxLimit: 100,
                                dailyLimit: 500,
                                monthlyLimit: 2000,
                                currency: 'USD',
                            },
                            balance: 0,
                            balanceCurrency: 'USD',
                        },
                    },
                },
            });
        }
        if (/^\/openclaw\/proxy\/e2e-instance-1\/skills$/.test(normalizedPath)) {
            return createJsonResponse([]);
        }
        if (/^\/openclaw\/proxy\/e2e-instance-1\/status$/.test(normalizedPath)) {
            return createJsonResponse({
                status: 'active',
                cpuPercent: 12,
                memoryMb: 384,
                uptimeSeconds: 86400,
                version: 'e2e',
            });
        }
        if (/^\/openclaw\/proxy\/e2e-instance-1\/history$/.test(normalizedPath)) {
            return createJsonResponse([]);
        }
        if (/^\/openclaw\/storage\/info$/.test(normalizedPath)) {
            return createJsonResponse({
                tier: 'free',
                totalGb: 10,
                usedGb: 1.2,
                availableGb: 8.8,
                usedPercent: 12,
                isGiftStorage: true,
                upgradePlans: [],
            });
        }
        if (/^\/openclaw\/proxy\/e2e-instance-1\/chat$/.test(normalizedPath) && requestMethod === 'POST') {
            return createJsonResponse({
                sessionId: 'e2e-session',
                reply: {
                    id: 'e2e-reply',
                    role: 'assistant',
                    content: 'Mock voice UI reply',
                    timestamp: Date.now(),
                },
            });
        }
        if (/^\/openclaw\/proxy\/e2e-instance-1\/stream$/.test(normalizedPath) && requestMethod === 'POST') {
            return new Response('data: {"chunk":"Mock voice UI reply."}\n\ndata: [DONE]\n\n', {
                status: 200,
                headers: {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                },
            });
        }
        if (/^\/claude\/chat$/.test(normalizedPath) && requestMethod === 'POST') {
            return createJsonResponse({ text: 'Mock Claude reply' });
        }
        return originalFetch(input, init);
    };
    window.fetch = mockedFetch;
    globalThis.fetch = mockedFetch;
    window.__AGENTRIX_VOICE_UI_E2E_FETCH_MOCKED__ = true;
}
function getWebSearchParam(name) {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
        return null;
    }
    try {
        return new URLSearchParams(window.location.search).get(name);
    }
    catch {
        return null;
    }
}
// Cache the E2E enabled check at first evaluation time because
// React Navigation's web linking rewrites the URL (stripping query params)
// shortly after mount, making later window.location.search checks unreliable.
let _cachedE2EEnabled = null;
export function isVoiceUiE2EEnabled() {
    if (_cachedE2EEnabled !== null)
        return _cachedE2EEnabled;
    _cachedE2EEnabled = getWebSearchParam('e2e') === VOICE_UI_E2E_SCENARIO;
    // Also check the bootstrap flag as a fallback
    if (!_cachedE2EEnabled && typeof window !== 'undefined' && window.__AGENTRIX_VOICE_UI_E2E_BOOTSTRAPPED__) {
        _cachedE2EEnabled = true;
    }
    return _cachedE2EEnabled;
}
export function getVoiceUiE2ERuntime() {
    if (!isVoiceUiE2EEnabled() || typeof window === 'undefined') {
        return null;
    }
    if (!window.__AGENTRIX_VOICE_UI_E2E_RUNTIME__) {
        window.__AGENTRIX_VOICE_UI_E2E_RUNTIME__ = createVoiceUiE2ERuntime();
    }
    return window.__AGENTRIX_VOICE_UI_E2E_RUNTIME__;
}
export function applyVoiceUiE2EBootstrap() {
    if (!isVoiceUiE2EEnabled() || typeof window === 'undefined') {
        return false;
    }
    if (window.__AGENTRIX_VOICE_UI_E2E_BOOTSTRAPPED__) {
        return true;
    }
    const instance = {
        id: 'e2e-instance-1',
        name: 'Voice QA Agent',
        instanceUrl: 'https://agentrix.top/e2e',
        status: 'active',
        deployType: 'cloud',
        metadata: {
            agentAccountId: 'e2e-agent-account-1',
        },
    };
    const user = {
        id: 'e2e-user-1',
        agentrixId: 'voice-ui-e2e',
        nickname: 'Voice UI E2E',
        roles: ['tester'],
        provider: 'email',
        activeInstanceId: instance.id,
        openClawInstances: [instance],
    };
    VOICE_ONBOARDING_KEYS.forEach((key) => {
        const { mmkv } = require('../stores/mmkvStorage');
        mmkv.delete(key);
    });
    const { useAuthStore } = require('../stores/authStore');
    useAuthStore.setState({
        user,
        token: 'e2e-token',
        isAuthenticated: true,
        isLoading: false,
        isInitialized: true,
        hasCompletedOnboarding: true,
        hasValidInvitation: true,
        activeInstance: instance,
    });
    const { useSettingsStore } = require('../stores/settingsStore');
    useSettingsStore.setState((state) => ({
        wakeWordConfig: {
            ...state.wakeWordConfig,
            enabled: false,
        },
    }));
    setApiConfig({ token: 'e2e-token' });
    installVoiceUiE2EFetchMock();
    window.__AGENTRIX_VOICE_UI_E2E_RUNTIME__ = window.__AGENTRIX_VOICE_UI_E2E_RUNTIME__ || createVoiceUiE2ERuntime();
    window.__AGENTRIX_VOICE_UI_E2E_LIVE_SPEECH_PERMISSION__ = 'granted';
    window.__AGENTRIX_VOICE_UI_E2E_BOOTSTRAPPED__ = true;
    return true;
}
