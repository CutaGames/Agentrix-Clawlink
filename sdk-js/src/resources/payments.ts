/**
 * Payment resource for PayMind SDK
 */

import { PayMindClient } from '../client';
import { PaymentStatus } from '../types/payment';
import {
  CreatePaymentRequest,
  Payment,
  PaymentRouting,
  CreatePaymentIntentRequest,
  PaymentIntent,
} from '../types/payment';
import { validatePaymentRequest } from '../utils/validation';

export class PaymentResource {
  constructor(private client: PayMindClient) {}

  /**
   * Create a new payment
   */
  async create(request: CreatePaymentRequest): Promise<Payment> {
    validatePaymentRequest(request);
    return this.client.post<Payment>('/payments', request);
  }

  /**
   * Get payment by ID
   */
  async get(id: string): Promise<Payment> {
    if (!id) {
      throw new Error('Payment ID is required');
    }
    return this.client.get<Payment>(`/payments/${id}`);
  }

  /**
   * Cancel a payment
   */
  async cancel(id: string): Promise<Payment> {
    if (!id) {
      throw new Error('Payment ID is required');
    }
    return this.client.post<Payment>(`/payments/${id}/cancel`);
  }

  /**
   * Get payment routing recommendation
   */
  async getRouting(params: {
    amount: number;
    currency: string;
    isOnChain?: boolean;
    userCountry?: string;
    merchantCountry?: string;
  }): Promise<PaymentRouting> {
    return this.client.get<PaymentRouting>('/payments/routing', {
      params,
    });
  }

  /**
   * Create a payment intent (for Stripe, Apple Pay, Google Pay)
   */
  async createIntent(request: CreatePaymentIntentRequest): Promise<PaymentIntent> {
    return this.client.post<PaymentIntent>('/payments/create-intent', request);
  }

  /**
   * Create a Stripe payment intent
   */
  async createStripePayment(request: {
    amount: number;
    currency: string;
    description?: string;
    metadata?: Record<string, any>;
  }): Promise<PaymentIntent> {
    return this.createIntent({
      ...request,
      paymentMethod: 'stripe',
    });
  }

  /**
   * Process a payment
   */
  async process(request: {
    amount: number;
    currency: string;
    paymentMethod?: string;
    description?: string;
    paymentIntentId?: string;
    merchantId?: string;
    agentId?: string;
    metadata?: Record<string, any>;
  }): Promise<Payment> {
    return this.client.post<Payment>('/payments/process', request);
  }

  /**
   * Get payment history
   */
  async list(params?: {
    page?: number;
    limit?: number;
    status?: string;
    paymentMethod?: string;
  }): Promise<{ data: Payment[]; pagination: any }> {
    return this.client.get('/payments', { params });
  }

  /**
   * Create batch payments
   */
  async createBatch(requests: CreatePaymentRequest[]): Promise<Payment[]> {
    if (!requests || requests.length === 0) {
      throw new Error('At least one payment request is required');
    }
    if (requests.length > 100) {
      throw new Error('Maximum 100 payments per batch');
    }
    
    // Validate all requests
    requests.forEach(validatePaymentRequest);
    
    return this.client.post<Payment[]>('/payments/batch', { payments: requests });
  }

  /**
   * Poll payment status until completion or timeout
   */
  async pollStatus(
    id: string,
    options?: {
      interval?: number;
      timeout?: number;
      onStatusChange?: (status: PaymentStatus) => void;
    }
  ): Promise<Payment> {
    const interval = options?.interval || 2000; // 2 seconds default
    const timeout = options?.timeout || 60000; // 60 seconds default
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          const payment = await this.get(id);
          
          if (options?.onStatusChange) {
            options.onStatusChange(payment.status);
          }

          if (payment.status === 'completed' || payment.status === 'failed' || payment.status === 'cancelled') {
            resolve(payment);
            return;
          }

          if (Date.now() - startTime > timeout) {
            reject(new Error('Payment status polling timeout'));
            return;
          }

          setTimeout(poll, interval);
        } catch (error) {
          reject(error);
        }
      };

      poll();
    });
  }

  /**
   * Refund a payment
   */
  async refund(id: string, amount?: number, reason?: string): Promise<Payment> {
    if (!id) {
      throw new Error('Payment ID is required');
    }
    return this.client.post<Payment>(`/payments/${id}/refund`, {
      amount,
      reason,
    });
  }
}

