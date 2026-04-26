import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../services/api';
/**
 * Fetches the current user's token quota status.
 * Polls every 30 seconds so the bar stays roughly up-to-date.
 */
export function useTokenQuota() {
    return useQuery({
        queryKey: ['token-quota'],
        queryFn: async () => {
            return apiFetch('/token-quota/me');
        },
        refetchInterval: 30000, // refresh every 30 seconds
        staleTime: 20000,
    });
}
/**
 * Format token count for display.
 * 5_000_000 → "5M"   1_250_000 → "1.25M"   500_000 → "500K"
 */
export function formatTokens(n) {
    if (n >= 1000000)
        return `${+(n / 1000000).toFixed(2).replace(/\.?0+$/, '')}M`;
    if (n >= 1000)
        return `${Math.round(n / 1000)}K`;
    return String(n);
}
