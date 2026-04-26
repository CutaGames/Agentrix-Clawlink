/**
 * Environment configuration for ClawLink
 * Switch between dev / staging / production by EAS update channel.
 */
import Constants from 'expo-constants';
function detectEnv() {
    // EAS build channels drive environment selection
    const channel = Constants.expoConfig?.extra?.easUpdateChannel ?? '';
    if (channel === 'production')
        return 'production';
    if (channel === 'staging')
        return 'staging';
    // In local dev (__DEV__ = true), use development config
    if (__DEV__)
        return 'development';
    return 'production';
}
const CONFIGS = {
    development: {
        apiBase: 'https://api.agentrix.top/api',
        wsBase: 'wss://api.agentrix.top',
        appUrl: 'https://www.agentrix.top',
        shareBaseUrl: 'https://clawlink.app', // always prod share URL
    },
    staging: {
        apiBase: 'https://staging-api.agentrix.top/api',
        wsBase: 'wss://staging-api.agentrix.top',
        appUrl: 'https://staging.agentrix.top',
        shareBaseUrl: 'https://clawlink.app',
    },
    production: {
        apiBase: 'https://api.agentrix.top/api',
        wsBase: 'wss://api.agentrix.top',
        appUrl: 'https://www.agentrix.top',
        shareBaseUrl: 'https://clawlink.app',
    },
};
export const APP_ENV = detectEnv();
export const ENV = CONFIGS[APP_ENV];
/** Backend REST API base URL */
export const API_BASE = ENV.apiBase;
/** WebSocket / SSE base URL */
export const WS_BASE = ENV.wsBase;
/** Frontend web base URL */
export const APP_URL = ENV.appUrl;
/** Share / deep link base URL (always production) */
export const SHARE_BASE_URL = ENV.shareBaseUrl;
/** Override API base for self-hosted instances */
export function getBackendBaseUrl() {
    return API_BASE;
}
