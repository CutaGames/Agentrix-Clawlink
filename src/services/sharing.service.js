// ClawLink Share Card & Referral Service
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import { apiFetch } from './api';
const SHARE_BASE = 'https://agentrix.top/i';
const API_BASE = 'https://api.agentrix.top/api';
// Create a referral / share short-link via backend
export async function createShareLink(opts) {
    try {
        const res = await apiFetch('/referral/links', {
            method: 'POST',
            body: JSON.stringify({
                type: opts.type === 'invite' ? 'GENERAL' : 'SKILL',
                contentId: opts.contentId,
                channel: opts.channel,
            }),
        });
        const url = `${SHARE_BASE}/${res.shortCode}`;
        return { code: res.shortCode, url, fullUrl: url };
    }
    catch {
        // Fallback: generate local code
        const code = Math.random().toString(36).slice(2, 10).toUpperCase();
        const url = `${SHARE_BASE}/${code}`;
        return { code, url, fullUrl: url };
    }
}
// Build share text based on content type
export function buildShareText(type, opts) {
    const url = opts.url ?? 'https://agentrix.top';
    const isChinese = opts.lang?.startsWith('zh');
    switch (type) {
        case 'install_success':
            return isChinese
                ? `我刚拥有了自己的 AI Agent「${opts.agentName ?? 'My Agent'}」！ 🤖\n\n你也可以免费拥有一个 → ${url}`
                : `I just got my own AI Agent "${opts.agentName ?? 'My Agent'}"! 🤖\n\nYou can get one for free → ${url}`;
        case 'agent_result':
            return isChinese
                ? `我的 AI Agent「${opts.agentName ?? 'Agent'}」刚帮我完成了一个任务！ ✨\n\n用 Agentrix-Claw 免费试试 → ${url}`
                : `My AI Agent "${opts.agentName ?? 'Agent'}" just completed an amazing task! ✨\n\nTry Agentrix-Claw for free → ${url}`;
        case 'skill':
            return isChinese
                ? `推荐这个 OpenClaw 技能：「${opts.skillName ?? 'Skill'}」 🔧\n\n一键安装 → ${url}`
                : `Check out this OpenClaw skill: "${opts.skillName ?? 'Skill'}" 🔧\n\nOne-tap install → ${url}`;
        case 'invite':
        default:
            return isChinese
                ? `加入 Agentrix-Claw，30 秒免费拥有你的 AI Agent！ 🚀\n\n${url}`
                : `Join Agentrix-Claw and get your own AI Agent in 30 seconds, for free! 🚀\n\n${url}`;
    }
}
// Share via system share sheet
export async function shareViaSystem(text) {
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
        // For text-only sharing, we use Clipboard + alert as RN doesn't support text-only sharing natively
        await Clipboard.setStringAsync(text);
    }
}
// Copy link to clipboard
export async function copyLinkToClipboard(url) {
    await Clipboard.setStringAsync(url);
}
// Track a share event
export async function trackShare(opts) {
    try {
        await apiFetch(`/referral/r/${opts.shortCode}/resolve`, {
            method: 'GET',
        });
    }
    catch {
        // Non-critical, ignore errors
    }
}
// Get user's referral stats
export async function getReferralStats() {
    return apiFetch('/referral/stats');
}
// Get user's referral links
export async function getMyLinks() {
    return apiFetch('/referral/links');
}
// Get pending commissions
export async function getPendingCommissions() {
    return apiFetch('/referral/commissions/pending');
}
