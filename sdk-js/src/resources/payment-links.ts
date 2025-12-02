/**
 * Payment Links resource for Agentrix SDK
 * 
 * Generates agent-friendly payment links that can be used in:
 * - ChatGPT
 * - Claude
 * - DeepSeek
 * - Other AI Agent platforms
 */

import { AgentrixClient } from '../client';

export interface CreatePaymentLinkRequest {
  amount: number;
  currency: string;
  description: string;
  merchantId?: string;
  productId?: string;
  orderId?: string;
  agentId?: string;
  metadata?: Record<string, any>;
  expiresIn?: number; // Expiration in seconds
  shortUrl?: boolean; // Generate short URL
}

export interface PaymentLink {
  id: string;
  url: string;
  shortUrl?: string; // Shortened URL if requested
  amount: number;
  currency: string;
  description: string;
  status: 'active' | 'used' | 'expired' | 'cancelled';
  expiresAt?: string;
  usedAt?: string;
  paymentId?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface AgentPlatformLink {
  chatgpt?: string; // ChatGPT-compatible link
  claude?: string; // Claude-compatible link
  deepseek?: string; // DeepSeek-compatible link
  universal: string; // Universal link that works everywhere
}

export class PaymentLinksResource {
  constructor(private client: AgentrixClient) {}

  /**
   * Create a payment link
   * Generates URLs that can be used in AI Agent platforms
   */
  async create(request: CreatePaymentLinkRequest): Promise<PaymentLink> {
    if (!request.amount || request.amount <= 0) {
      throw new Error('Amount must be a positive number');
    }
    if (!request.currency) {
      throw new Error('Currency is required');
    }
    if (!request.description) {
      throw new Error('Description is required');
    }

    return this.client.post<PaymentLink>('/payment-links', {
      ...request,
      shortUrl: request.shortUrl !== false, // Default to true
    });
  }

  /**
   * Create agent-friendly payment links
   * Returns platform-specific links for ChatGPT, Claude, DeepSeek
   */
  async createAgentFriendly(request: CreatePaymentLinkRequest): Promise<{
    link: PaymentLink;
    platformLinks: AgentPlatformLink;
  }> {
    const link = await this.create(request);

    // Generate platform-specific links
    const platformLinks: AgentPlatformLink = {
      chatgpt: `https://agentrix.ai/pay/${link.id}?platform=chatgpt`,
      claude: `https://agentrix.ai/pay/${link.id}?platform=claude`,
      deepseek: `https://agentrix.ai/pay/${link.id}?platform=deepseek`,
      universal: link.shortUrl || link.url,
    };

    return {
      link,
      platformLinks,
    };
  }

  /**
   * Get payment link by ID
   */
  async get(linkId: string): Promise<PaymentLink> {
    if (!linkId) {
      throw new Error('Link ID is required');
    }
    return this.client.get<PaymentLink>(`/payment-links/${linkId}`);
  }

  /**
   * Cancel a payment link
   */
  async cancel(linkId: string): Promise<PaymentLink> {
    if (!linkId) {
      throw new Error('Link ID is required');
    }
    return this.client.post<PaymentLink>(`/payment-links/${linkId}/cancel`);
  }

  /**
   * List payment links
   */
  async list(params?: {
    agentId?: string;
    merchantId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: PaymentLink[]; pagination: any }> {
    return this.client.get('/payment-links', { params });
  }
}

