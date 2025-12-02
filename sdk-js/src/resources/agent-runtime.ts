/**
 * Agent Runtime resource for Agentrix SDK
 * 
 * Provides Agent runtime adaptation and environment detection
 */

import { AgentrixClient } from '../client';

export type AgentPlatform = 'chatgpt' | 'claude' | 'deepseek' | 'custom' | 'unknown';

export interface AgentEnvironment {
  platform: AgentPlatform;
  version?: string;
  capabilities: {
    supportsToolCalls: boolean;
    supportsFunctionCalls: boolean;
    supportsJsonMode: boolean;
    supportsMarkdown: boolean;
    supportsImages: boolean;
  };
  metadata?: Record<string, any>;
}

export interface ProductCard {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  imageUrl?: string;
  paymentUrl?: string;
  formattedForAgent: string; // Natural language description for Agent
  structuredData: {
    productId: string;
    merchantId: string;
    category?: string;
    attributes?: Record<string, any>;
  };
}

export class AgentRuntimeResource {
  constructor(private client: AgentrixClient) {}

  /**
   * Detect agent runtime environment
   */
  async detectEnvironment(): Promise<AgentEnvironment> {
    // Try to detect environment from user agent, headers, etc.
    // This is a client-side detection
    const platform = this.detectPlatform();
    
    return {
      platform,
      capabilities: this.getCapabilities(platform),
    };
  }

  /**
   * Detect platform from runtime
   */
  private detectPlatform(): AgentPlatform {
    if (typeof window === 'undefined') {
      // Node.js environment
      return 'custom';
    }

    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('chatgpt') || ua.includes('openai')) {
      return 'chatgpt';
    }
    if (ua.includes('claude') || ua.includes('anthropic')) {
      return 'claude';
    }
    if (ua.includes('deepseek')) {
      return 'deepseek';
    }

    return 'unknown';
  }

  /**
   * Get platform capabilities
   */
  private getCapabilities(platform: AgentPlatform): AgentEnvironment['capabilities'] {
    const baseCapabilities = {
      supportsToolCalls: true,
      supportsFunctionCalls: true,
      supportsJsonMode: true,
      supportsMarkdown: true,
      supportsImages: true,
    };

    switch (platform) {
      case 'chatgpt':
        return {
          ...baseCapabilities,
          supportsToolCalls: true,
          supportsFunctionCalls: true,
        };
      case 'claude':
        return {
          ...baseCapabilities,
          supportsToolCalls: true,
          supportsFunctionCalls: true,
        };
      case 'deepseek':
        return {
          ...baseCapabilities,
          supportsToolCalls: true,
          supportsFunctionCalls: true,
        };
      default:
        return baseCapabilities;
    }
  }

  /**
   * Format product for Agent consumption
   * Generates a product card that can be easily read by LLMs
   */
  async formatProductCard(product: {
    id: string;
    title: string;
    description: string;
    price: number;
    currency: string;
    imageUrl?: string;
    paymentUrl?: string;
    category?: string;
    attributes?: Record<string, any>;
  }): Promise<ProductCard> {
    // Generate natural language description for Agent
    const formattedDescription = this.generateAgentDescription({
      title: product.title,
      description: product.description,
      price: product.price,
      currency: product.currency,
      category: product.category,
      paymentUrl: product.paymentUrl,
    });

    return {
      id: product.id,
      title: product.title,
      description: product.description,
      price: product.price,
      currency: product.currency,
      imageUrl: product.imageUrl,
      paymentUrl: product.paymentUrl,
      formattedForAgent: formattedDescription,
      structuredData: {
        productId: product.id,
        merchantId: product.attributes?.merchantId || '',
        category: product.category,
        attributes: product.attributes,
      },
    };
  }

  /**
   * Generate natural language description for Agent
   */
  private generateAgentDescription(product: {
    title: string;
    description: string;
    price: number;
    currency: string;
    category?: string;
    paymentUrl?: string;
  }): string {
    return `商品：${product.title}
描述：${product.description}
价格：${product.price} ${product.currency}
${product.category ? `分类：${product.category}` : ''}
${product.paymentUrl ? `支付链接：${product.paymentUrl}` : ''}`;
  }

  /**
   * Format message for specific Agent platform
   */
  async formatMessage(
    message: string,
    platform?: AgentPlatform
  ): Promise<{
    formatted: string;
    platform: AgentPlatform;
    format: 'text' | 'markdown' | 'json' | 'tool_call';
  }> {
    const detectedPlatform = platform || (await this.detectEnvironment()).platform;
    const capabilities = this.getCapabilities(detectedPlatform);

    // Format based on platform capabilities
    if (capabilities.supportsMarkdown) {
      return {
        formatted: message,
        platform: detectedPlatform,
        format: 'markdown',
      };
    }

    return {
      formatted: message,
      platform: detectedPlatform,
      format: 'text',
    };
  }

  /**
   * Generate tool call format for Agent platforms
   */
  async generateToolCall(
    functionName: string,
    parameters: Record<string, any>,
    platform?: AgentPlatform
  ): Promise<any> {
    const detectedPlatform = platform || (await this.detectEnvironment()).platform;

    // ChatGPT format
    if (detectedPlatform === 'chatgpt') {
      return {
        type: 'function',
        function: {
          name: functionName,
          arguments: JSON.stringify(parameters),
        },
      };
    }

    // Claude format
    if (detectedPlatform === 'claude') {
      return {
        name: functionName,
        input: parameters,
      };
    }

    // Default format
    return {
      function: functionName,
      parameters,
    };
  }
}

