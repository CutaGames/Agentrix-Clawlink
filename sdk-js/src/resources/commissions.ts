/**
 * Commission resource for PayMind SDK
 */

import { PayMindClient } from '../client';

export interface CreateCommissionRequest {
  paymentId: string;
  agentId: string;
  rate: number; // 0.0 to 1.0 (e.g., 0.1 for 10%)
  amount?: number; // Optional: fixed amount instead of rate
  metadata?: Record<string, any>;
}

export interface Commission {
  id: string;
  paymentId: string;
  agentId: string;
  amount: number;
  rate: number;
  currency: string;
  status: 'pending' | 'settled' | 'cancelled';
  settledAt?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export class CommissionResource {
  constructor(private client: PayMindClient) {}

  /**
   * Create a commission
   */
  async create(request: CreateCommissionRequest): Promise<Commission> {
    if (!request.paymentId) {
      throw new Error('Payment ID is required');
    }
    if (!request.agentId) {
      throw new Error('Agent ID is required');
    }
    if (request.rate < 0 || request.rate > 1) {
      throw new Error('Commission rate must be between 0 and 1');
    }
    return this.client.post<Commission>('/commissions', request);
  }

  /**
   * Get commission by ID
   */
  async get(id: string): Promise<Commission> {
    if (!id) {
      throw new Error('Commission ID is required');
    }
    return this.client.get<Commission>(`/commissions/${id}`);
  }

  /**
   * Settle a commission
   */
  async settle(id: string): Promise<Commission> {
    if (!id) {
      throw new Error('Commission ID is required');
    }
    return this.client.post<Commission>(`/commissions/${id}/settle`);
  }

  /**
   * Settle multiple commissions in batch
   */
  async settleBatch(ids: string[]): Promise<Commission[]> {
    if (!ids || ids.length === 0) {
      throw new Error('At least one commission ID is required');
    }
    return this.client.post<Commission[]>('/commissions/batch-settle', { ids });
  }

  /**
   * List commissions
   */
  async list(params?: {
    page?: number;
    limit?: number;
    status?: 'pending' | 'settled' | 'cancelled';
    agentId?: string;
    paymentId?: string;
  }): Promise<{ data: Commission[]; pagination: any }> {
    return this.client.get('/commissions', { params });
  }
}

