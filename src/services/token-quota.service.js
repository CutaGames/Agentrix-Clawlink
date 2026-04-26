/**
 * token-quota.service.ts — Layer 0: Token Usage API
 * Wraps GET /api/token-quota/me
 */
import { apiFetch } from './api';
export const fetchQuotaStatus = () => apiFetch('/token-quota/me');
export const PLAN_LABEL = {
    free_trial: 'Free Trial',
    starter: 'Starter',
    pro: 'Pro',
    unlimited: 'Unlimited',
};
export const PLAN_COLOR = {
    free_trial: '#64748b',
    starter: '#7c3aed',
    pro: '#2563eb',
    unlimited: '#059669',
};
