/**
 * useAgent hook for React
 */

import { useState, useCallback } from 'react';
import { useAgentrix } from '../AgentrixProvider';

interface UseAgentReturn {
  createAutoPayGrant: (params: {
    agentId: string;
    singleLimit: number;
    dailyLimit: number;
    currency?: string;
    expiresInDays?: number;
  }) => Promise<any>;
  getAutoPayGrant: () => Promise<any>;
  getEarnings: (agentId: string, params?: {
    startDate?: string;
    endDate?: string;
  }) => Promise<any>;
  getCommissions: (agentId: string, params?: {
    page?: number;
    limit?: number;
    status?: string;
  }) => Promise<any>;
  loading: boolean;
  error: Error | null;
}

export function useAgent(): UseAgentReturn {
  const agentrix = useAgentrix();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createAutoPayGrant = useCallback(
    async (params: {
      agentId: string;
      singleLimit: number;
      dailyLimit: number;
      currency?: string;
      expiresInDays?: number;
    }) => {
      setLoading(true);
      setError(null);
      try {
        const grant = await agentrix.agents.createAutoPayGrant(params);
        return grant;
      } catch (err: any) {
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [agentrix]
  );

  const getAutoPayGrant = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const grant = await agentrix.agents.getAutoPayGrant();
      return grant;
    } catch (err: any) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [agentrix]);

  const getEarnings = useCallback(
    async (agentId: string, params?: {
      startDate?: string;
      endDate?: string;
    }) => {
      setLoading(true);
      setError(null);
      try {
        const earnings = await agentrix.agents.getEarnings(agentId, params);
        return earnings;
      } catch (err: any) {
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [agentrix]
  );

  const getCommissions = useCallback(
    async (agentId: string, params?: {
      page?: number;
      limit?: number;
      status?: string;
    }) => {
      setLoading(true);
      setError(null);
      try {
        const commissions = await agentrix.agents.getCommissions(agentId, params);
        return commissions;
      } catch (err: any) {
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [agentrix]
  );

  return {
    createAutoPayGrant,
    getAutoPayGrant,
    getEarnings,
    getCommissions,
    loading,
    error,
  };
}

