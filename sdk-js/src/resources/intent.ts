/**
 * Intent resource for Agentrix SDK
 * 
 * Converts natural language user queries into structured payment intents
 */

import { AgentrixClient } from '../client';

export interface ParseIntentRequest {
  query: string; // Natural language query
  context?: {
    userId?: string;
    location?: {
      country?: string;
      city?: string;
    };
    preferences?: {
      preferredPaymentMethods?: string[];
      preferredCurrency?: string;
    };
  };
}

export interface PaymentIntent {
  type: 'payment' | 'subscription' | 'tip' | 'purchase';
  amount?: number;
  currency?: string;
  recipient?: string;
  merchantId?: string;
  productId?: string;
  quantity?: number;
  description?: string;
  paymentMethod?: 'crypto' | 'fiat' | 'auto';
  metadata?: {
    shippingAddress?: {
      name: string;
      address: string;
      city: string;
      state?: string;
      country: string;
      zipCode: string;
    };
    attributes?: Record<string, any>;
    [key: string]: any;
  };
  confidence: number; // 0.0 to 1.0
  missingFields?: string[]; // Fields that need to be filled
}

export interface IntentParseResponse {
  intent: PaymentIntent;
  alternatives?: PaymentIntent[]; // Alternative interpretations
  suggestions?: {
    field: string;
    value: string;
    reason: string;
  }[];
}

export class IntentResource {
  constructor(private client: AgentrixClient) {}

  /**
   * Parse natural language query into structured payment intent
   */
  async parseIntent(request: ParseIntentRequest): Promise<IntentParseResponse> {
    if (!request.query || request.query.trim().length === 0) {
      throw new Error('Query is required');
    }

    return this.client.post<IntentParseResponse>('/intent/parse', {
      query: request.query,
      context: request.context,
    });
  }

  /**
   * Complete an intent with missing fields
   */
  async completeIntent(
    intentId: string,
    missingFields: Record<string, any>
  ): Promise<PaymentIntent> {
    if (!intentId) {
      throw new Error('Intent ID is required');
    }
    return this.client.post<PaymentIntent>(`/intent/${intentId}/complete`, {
      missingFields,
    });
  }

  /**
   * Convert intent to executable payment request
   */
  async toPaymentRequest(intent: PaymentIntent): Promise<{
    paymentRequest: any;
    orderRequest?: any;
  }> {
    return this.client.post('/intent/to-payment', { intent });
  }
}

