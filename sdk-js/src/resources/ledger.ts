/**
 * Ledger and Settlement resource for Agentrix SDK
 * 
 * Handles revenue sharing, commissions, and settlement
 */

import { AgentrixClient } from '../client';

export interface RevenueShare {
  paymentId: string;
  merchantId: string;
  agentId?: string;
  platformCommission: number;
  agentCommission?: number;
  merchantRevenue: number;
  currency: string;
  status: 'pending' | 'settled';
  settledAt?: string;
  metadata?: Record<string, any>;
}

export interface SplitPaymentRequest {
  paymentId: string;
  splits: Array<{
    recipientId: string;
    recipientType: 'merchant' | 'agent' | 'platform' | 'creator';
    amount: number;
    percentage?: number; // Alternative to amount
  }>;
  currency: string;
  metadata?: Record<string, any>;
}

export interface Settlement {
  id: string;
  merchantId?: string;
  agentId?: string;
  period: {
    start: string;
    end: string;
  };
  totalAmount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  transactions: number;
  settledAt?: string;
  transactionHash?: string;
  metadata?: Record<string, any>;
}

export interface Reconciliation {
  id: string;
  date: string;
  totalTransactions: number;
  totalAmount: number;
  currency: string;
  discrepancies: number;
  status: 'pending' | 'completed' | 'has_discrepancies';
  reportUrl?: string;
}

export class LedgerResource {
  constructor(private client: AgentrixClient) {}

  /**
   * Get revenue share for a payment
   */
  async getRevenueShare(paymentId: string): Promise<RevenueShare> {
    if (!paymentId) {
      throw new Error('Payment ID is required');
    }
    return this.client.get<RevenueShare>(`/ledger/revenue-share/${paymentId}`);
  }

  /**
   * Create a split payment (multiple recipients)
   */
  async createSplitPayment(request: SplitPaymentRequest): Promise<RevenueShare> {
    if (!request.paymentId) {
      throw new Error('Payment ID is required');
    }
    if (!request.splits || request.splits.length === 0) {
      throw new Error('At least one split is required');
    }

    // Validate splits sum to 100% or total amount
    const totalPercentage = request.splits
      .filter((s) => s.percentage)
      .reduce((sum, s) => sum + (s.percentage || 0), 0);
    if (totalPercentage > 0 && Math.abs(totalPercentage - 100) > 0.01) {
      throw new Error('Split percentages must sum to 100%');
    }

    return this.client.post<RevenueShare>('/ledger/split-payment', request);
  }

  /**
   * Get settlement records
   */
  async getSettlements(params?: {
    merchantId?: string;
    agentId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: Settlement[]; pagination: any }> {
    return this.client.get('/ledger/settlements', { params });
  }

  /**
   * Create daily reconciliation
   */
  async createReconciliation(date: string): Promise<Reconciliation> {
    if (!date) {
      throw new Error('Date is required (YYYY-MM-DD)');
    }
    return this.client.post<Reconciliation>('/ledger/reconciliation', { date });
  }

  /**
   * Get reconciliation by ID
   */
  async getReconciliation(id: string): Promise<Reconciliation> {
    if (!id) {
      throw new Error('Reconciliation ID is required');
    }
    return this.client.get<Reconciliation>(`/ledger/reconciliation/${id}`);
  }

  /**
   * Export payment ledger
   */
  async exportLedger(params?: {
    startDate?: string;
    endDate?: string;
    merchantId?: string;
    agentId?: string;
    format?: 'csv' | 'json' | 'xlsx';
  }): Promise<{
    downloadUrl: string;
    expiresAt: string;
  }> {
    return this.client.post('/ledger/export', params);
  }

  /**
   * Get platform commission for a period
   */
  async getPlatformCommission(params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<{
    totalCommission: number;
    currency: string;
    transactionCount: number;
    breakdown: Array<{
      date: string;
      commission: number;
      transactions: number;
    }>;
  }> {
    return this.client.get('/ledger/platform-commission', { params });
  }
}

