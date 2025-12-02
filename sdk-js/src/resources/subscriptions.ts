/**
 * Subscription resource for PayMind SDK
 */

import { PayMindClient } from '../client';

export interface CreateSubscriptionRequest {
  planId: string;
  userId: string;
  paymentMethod?: string;
  metadata?: Record<string, any>;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  status: 'active' | 'cancelled' | 'expired' | 'past_due';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  amount: number;
  currency: string;
  interval: 'day' | 'week' | 'month' | 'year';
  intervalCount: number;
  metadata?: Record<string, any>;
}

export class SubscriptionResource {
  constructor(private client: PayMindClient) {}

  /**
   * Create a subscription
   */
  async create(request: CreateSubscriptionRequest): Promise<Subscription> {
    if (!request.planId) {
      throw new Error('Plan ID is required');
    }
    if (!request.userId) {
      throw new Error('User ID is required');
    }
    return this.client.post<Subscription>('/subscriptions', request);
  }

  /**
   * Get subscription by ID
   */
  async get(id: string): Promise<Subscription> {
    if (!id) {
      throw new Error('Subscription ID is required');
    }
    return this.client.get<Subscription>(`/subscriptions/${id}`);
  }

  /**
   * Cancel a subscription
   */
  async cancel(id: string, cancelAtPeriodEnd: boolean = true): Promise<Subscription> {
    if (!id) {
      throw new Error('Subscription ID is required');
    }
    return this.client.post<Subscription>(`/subscriptions/${id}/cancel`, {
      cancelAtPeriodEnd,
    });
  }

  /**
   * Resume a cancelled subscription
   */
  async resume(id: string): Promise<Subscription> {
    if (!id) {
      throw new Error('Subscription ID is required');
    }
    return this.client.post<Subscription>(`/subscriptions/${id}/resume`);
  }

  /**
   * List subscriptions
   */
  async list(params?: {
    page?: number;
    limit?: number;
    status?: string;
    userId?: string;
  }): Promise<{ data: Subscription[]; pagination: any }> {
    return this.client.get('/subscriptions', { params });
  }

  /**
   * Create a subscription plan
   */
  async createPlan(plan: {
    name: string;
    description: string;
    amount: number;
    currency: string;
    interval: 'day' | 'week' | 'month' | 'year';
    intervalCount?: number;
    metadata?: Record<string, any>;
  }): Promise<SubscriptionPlan> {
    return this.client.post<SubscriptionPlan>('/subscriptions/plans', plan);
  }

  /**
   * List subscription plans
   */
  async listPlans(params?: {
    page?: number;
    limit?: number;
  }): Promise<{ data: SubscriptionPlan[]; pagination: any }> {
    return this.client.get('/subscriptions/plans', { params });
  }
}

