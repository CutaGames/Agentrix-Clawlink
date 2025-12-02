/**
 * usePayment hook for React
 */

import { useState, useCallback } from 'react';
import { useAgentrix } from '../AgentrixProvider';
import { CreatePaymentRequest, Payment } from '@agentrix/sdk';

interface UsePaymentReturn {
  createPayment: (request: CreatePaymentRequest) => Promise<Payment>;
  getPayment: (id: string) => Promise<Payment>;
  cancelPayment: (id: string) => Promise<Payment>;
  getRouting: (params: {
    amount: number;
    currency: string;
    userCountry?: string;
    merchantCountry?: string;
  }) => Promise<any>;
  loading: boolean;
  error: Error | null;
}

export function usePayment(): UsePaymentReturn {
  const agentrix = useAgentrix();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createPayment = useCallback(
    async (request: CreatePaymentRequest): Promise<Payment> => {
      setLoading(true);
      setError(null);
      try {
        const payment = await agentrix.payments.create(request);
        return payment;
      } catch (err: any) {
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [agentrix]
  );

  const getPayment = useCallback(
    async (id: string): Promise<Payment> => {
      setLoading(true);
      setError(null);
      try {
        const payment = await agentrix.payments.get(id);
        return payment;
      } catch (err: any) {
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [agentrix]
  );

  const cancelPayment = useCallback(
    async (id: string): Promise<Payment> => {
      setLoading(true);
      setError(null);
      try {
        const payment = await agentrix.payments.cancel(id);
        return payment;
      } catch (err: any) {
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [agentrix]
  );

  const getRouting = useCallback(
    async (params: {
      amount: number;
      currency: string;
      userCountry?: string;
      merchantCountry?: string;
    }) => {
      setLoading(true);
      setError(null);
      try {
        const routing = await agentrix.payments.getRouting(params);
        return routing;
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
    createPayment,
    getPayment,
    cancelPayment,
    getRouting,
    loading,
    error,
  };
}

