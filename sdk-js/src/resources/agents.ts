/**
 * Agent resource for PayMind SDK
 */

import { PayMindClient } from '../client';
import {
  AutoPayGrant,
  CreateAutoPayGrantRequest,
  AgentEarnings,
  Commission,
} from '../types/agent';

export class AgentResource {
  constructor(private client: PayMindClient) {}

  /**
   * Create an auto-pay grant for an agent
   */
  async createAutoPayGrant(request: CreateAutoPayGrantRequest): Promise<AutoPayGrant> {
    if (!request.agentId) {
      throw new Error('Agent ID is required');
    }
    if (!request.singleLimit || request.singleLimit <= 0) {
      throw new Error('Single limit must be a positive number');
    }
    if (!request.dailyLimit || request.dailyLimit <= 0) {
      throw new Error('Daily limit must be a positive number');
    }

    return this.client.post<AutoPayGrant>('/payments/x402/authorization', {
      agentId: request.agentId,
      singleLimit: request.singleLimit,
      dailyLimit: request.dailyLimit,
      currency: request.currency || 'CNY',
      expiresInDays: request.expiresInDays || 30,
    });
  }

  /**
   * Get auto-pay grant status
   */
  async getAutoPayGrant(): Promise<AutoPayGrant | null> {
    return this.client.get<AutoPayGrant | null>('/payments/x402/authorization');
  }

  /**
   * Get agent earnings
   */
  async getEarnings(agentId: string, params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<AgentEarnings> {
    if (!agentId) {
      throw new Error('Agent ID is required');
    }
    return this.client.get<AgentEarnings>(`/agents/${agentId}/earnings`, {
      params,
    });
  }

  /**
   * Get agent commissions
   */
  async getCommissions(agentId: string, params?: {
    page?: number;
    limit?: number;
    status?: 'pending' | 'settled';
  }): Promise<{ data: Commission[]; pagination: any }> {
    if (!agentId) {
      throw new Error('Agent ID is required');
    }
    return this.client.get(`/agents/${agentId}/commissions`, {
      params,
    });
  }

  /**
   * Create an agent payment (agent pays on behalf of user)
   */
  async createAgentPayment(request: {
    userId: string;
    amount: number;
    currency: string;
    description: string;
    merchantId?: string;
  }): Promise<any> {
    return this.client.post('/payments/agent/create', request);
  }

  /**
   * Confirm an agent payment
   */
  async confirmAgentPayment(paymentId: string): Promise<any> {
    return this.client.post(`/payments/agent/${paymentId}/confirm`);
  }

  /**
   * Search products in the marketplace (semantic search)
   * 
   * This is the core function for AI Agents to discover products.
   * Agent developers only need to call this - no embedding/vector DB knowledge required.
   * 
   * PayMind handles:
   * - Query → Embedding conversion (local or cloud)
   * - Vector search in unified database
   * - Re-ranking with user preferences
   * - Payment link generation
   */
  async searchProducts(
    query: string,
    filters?: {
      priceMin?: number;
      priceMax?: number;
      currency?: string;
      category?: string;
      inStock?: boolean;
    },
    reRankOptions?: {
      userPreferences?: {
        preferredPaymentMethods?: string[];
        preferredMerchants?: string[];
        priceRange?: { min?: number; max?: number };
        categories?: string[];
      };
      location?: {
        country?: string;
        city?: string;
      };
      history?: {
        previousPurchases?: string[];
        preferredCategories?: string[];
      };
    }
  ): Promise<any> {
    if (!query || query.trim().length === 0) {
      throw new Error('Search query is required');
    }

    // Use marketplace resource for semantic search
    // This ensures unified search standard across all agents
    // Note: MarketplaceResource should be injected or accessed via PayMind instance
    // For now, we'll use direct API call which will be handled by PayMind backend
    // with unified embedding and vector search
    
    return this.client.post('/marketplace/products/search', {
      query,
      filters,
      limit: 20,
      sortBy: 'relevance',
      // Include re-ranking options if provided
      reRank: reRankOptions,
    });
  }

  /**
   * Get recommended products for this agent
   */
  async getRecommendedProducts(agentId: string, params?: {
    limit?: number;
    category?: string;
  }): Promise<any> {
    if (!agentId) {
      throw new Error('Agent ID is required');
    }
    return this.client.get(`/marketplace/agents/${agentId}/recommended`, {
      params: {
        limit: params?.limit || 10,
        category: params?.category,
      },
    });
  }

  /**
   * Create an order for a product (Agent-initiated purchase)
   */
  async createOrder(request: {
    productId: string;
    userId: string;
    quantity?: number;
    shippingAddress?: {
      name: string;
      address: string;
      city: string;
      state?: string;
      country: string;
      zipCode: string;
      phone?: string;
    };
    metadata?: Record<string, any>;
  }): Promise<any> {
    if (!request.productId) {
      throw new Error('Product ID is required');
    }
    if (!request.userId) {
      throw new Error('User ID is required');
    }

    return this.client.post('/marketplace/orders', request);
  }

  /**
   * Generate code example (basic)
   * 
   * @param prompt - Code generation prompt
   * @param language - Programming language
   * @returns Generated code example
   * 
   * @example
   * ```typescript
   * const code = await paymind.agents.generateCode(
   *   'Create a payment',
   *   'typescript'
   * );
   * ```
   */
  async generateCode(
    prompt: string,
    language: 'typescript' | 'javascript' | 'python' = 'typescript'
  ): Promise<{
    title: string;
    description: string;
    code: string;
    language: string;
  }> {
    if (!prompt || prompt.trim().length === 0) {
      throw new Error('Prompt is required');
    }

    return this.client.post('/agent/generate-code', {
      prompt,
      language,
    });
  }

  /**
   * Generate enhanced code examples (multiple scenarios)
   * 
   * @param prompt - Code generation prompt
   * @param language - Programming language
   * @returns Array of generated code examples
   * 
   * @example
   * ```typescript
   * const examples = await paymind.agents.generateEnhancedCode(
   *   'Search products and create order',
   *   'typescript'
   * );
   * ```
   */
  async generateEnhancedCode(
    prompt: string,
    language: 'typescript' | 'javascript' | 'python' = 'typescript'
  ): Promise<Array<{
    title: string;
    description: string;
    code: string;
    language: string;
    examples?: string[];
  }>> {
    if (!prompt || prompt.trim().length === 0) {
      throw new Error('Prompt is required');
    }

    return this.client.post('/agent/generate-enhanced-code', {
      prompt,
      language,
    });
  }
}

