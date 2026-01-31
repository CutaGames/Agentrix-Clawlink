"use client";

import { useState, useEffect, useCallback } from 'react';
import { DashboardStats, Alert, getDashboardStats, getAlerts } from '@/lib/api';

// Mock data for development (will be replaced with real API calls)
const mockStats: DashboardStats = {
  revenue24h: 1234.56,
  revenueChange: 0.201,
  activeAgents: 4,
  totalAgents: 5,
  activeMerchants: 128,
  newMerchants24h: 3,
  riskLevel: 'LOW',
  systemHealth: 'HEALTHY',
};

const mockAlerts: Alert[] = [
  { id: '1', type: 'risk', title: 'Suspicious Login Blocked', message: 'Merchant #992 attempted login from unknown IP.', timestamp: new Date(Date.now() - 2 * 60000).toISOString(), read: false },
  { id: '2', type: 'biz', title: 'New Opportunity', message: '"AI Agent Tools" search volume +300% on Twitter.', timestamp: new Date(Date.now() - 15 * 60000).toISOString(), read: false },
  { id: '3', type: 'sys', title: 'Deployment Success', message: 'Frontend v2.2.0 deployed successfully.', timestamp: new Date(Date.now() - 60 * 60000).toISOString(), read: true },
  { id: '4', type: 'ops', title: 'Auto-Refund', message: 'Refunded txn_0x882... (Reason: timeout).', timestamp: new Date(Date.now() - 3 * 60 * 60000).toISOString(), read: true },
];

export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      // Try real API first, fall back to mock
      try {
        const data = await getDashboardStats();
        setStats(data);
      } catch {
        // Use mock data if API fails
        setStats(mockStats);
      }
      setError(null);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    // Refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  return { stats, loading, error, refetch: fetchStats };
}

export function useAlerts(limit = 10) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      try {
        const data = await getAlerts(limit);
        setAlerts(data);
      } catch {
        // Use mock data if API fails
        setAlerts(mockAlerts.slice(0, limit));
      }
      setError(null);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchAlerts();
    // Refresh every 60 seconds for alerts (reduced from 10s to avoid flicker)
    const interval = setInterval(fetchAlerts, 60000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  return { alerts, loading, error, refetch: fetchAlerts };
}

export function formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}
