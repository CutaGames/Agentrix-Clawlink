/**
 * Tip resource for PayMind SDK
 */

import { PayMindClient } from '../client';
import { Payment } from '../types/payment';

export interface CreateTipRequest {
  amount: number;
  currency: string;
  creatorId: string;
  message?: string;
  useAutoPay?: boolean; // Use X402 auto-pay if available
  metadata?: Record<string, any>;
}

export interface Tip extends Payment {
  tipType: 'one-time' | 'recurring';
  creatorId: string;
  message?: string;
}

export class TipResource {
  constructor(private client: PayMindClient) {}

  /**
   * Create a tip
   */
  async create(request: CreateTipRequest): Promise<Tip> {
    if (!request.amount || request.amount <= 0) {
      throw new Error('Amount must be a positive number');
    }
    if (!request.currency) {
      throw new Error('Currency is required');
    }
    if (!request.creatorId) {
      throw new Error('Creator ID is required');
    }

    return this.client.post<Tip>('/tips', {
      ...request,
      description: request.message || `Tip to creator ${request.creatorId}`,
    });
  }

  /**
   * Get tip by ID
   */
  async get(id: string): Promise<Tip> {
    if (!id) {
      throw new Error('Tip ID is required');
    }
    return this.client.get<Tip>(`/tips/${id}`);
  }

  /**
   * List tips
   */
  async list(params?: {
    page?: number;
    limit?: number;
    creatorId?: string;
    userId?: string;
  }): Promise<{ data: Tip[]; pagination: any }> {
    return this.client.get('/tips', { params });
  }

  /**
   * Get creator's tip statistics
   */
  async getCreatorStats(creatorId: string, params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<{
    totalTips: number;
    totalAmount: number;
    currency: string;
    tipCount: number;
    averageAmount: number;
  }> {
    if (!creatorId) {
      throw new Error('Creator ID is required');
    }
    return this.client.get(`/tips/creators/${creatorId}/stats`, { params });
  }
}

