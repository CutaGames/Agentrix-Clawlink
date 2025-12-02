/**
 * Marketplace resource for PayMind SDK
 * 
 * This resource provides semantic search and retrieval capabilities for AI Agents
 * to discover and recommend products from the PayMind Marketplace.
 * 
 * Key features:
 * - Unified semantic search API (cloud-based)
 * - Optional local embedding support with cloud fallback
 * - Client-side re-ranking with user preferences
 * - Automatic payment link generation
 */

import { PayMindClient } from '../client';
import { LocalEmbeddingModel, reRankResults, formatSearchResults, ReRankOptions, SearchResult } from '../utils/semantic-search';

export interface MarketplaceProduct {
  productId: string;
  merchantId: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  stock: number;
  category?: string;
  delivery?: string;
  payUrl?: string;
  media?: string[];
  attributes?: Record<string, any>;
  commissionRate?: number;
  availableToAgents: boolean;
  createdAt: string;
  updatedAt: string;
  metadata?: {
    relevance?: number;
    paymentMethods?: string[];
    [key: string]: any;
  };
}

export interface SearchProductsRequest {
  query: string; // Natural language query (e.g., "跑步鞋", "running shoes")
  filters?: {
    priceMin?: number;
    priceMax?: number;
    currency?: string;
    category?: string;
    inStock?: boolean;
    merchantId?: string;
  };
  limit?: number;
  offset?: number;
  sortBy?: 'relevance' | 'price_asc' | 'price_desc' | 'newest';
}

export interface SearchProductsResponse {
  products: MarketplaceProduct[];
  total: number;
  query: string;
  filters?: SearchProductsRequest['filters'];
}

export interface CreateOrderRequest {
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
}

export interface Order {
  id: string;
  productId: string;
  merchantId: string;
  userId: string;
  quantity: number;
  amount: number;
  currency: string;
  status: 'draft' | 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  paymentId?: string;
  shippingAddress?: any;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export class MarketplaceResource {
  private localEmbedding: LocalEmbeddingModel;
  private useLocalEmbedding: boolean = false;

  constructor(private client: PayMindClient) {
    this.localEmbedding = new LocalEmbeddingModel();
  }

  /**
   * Initialize local embedding model (optional)
   * Falls back to cloud API if local model is not available
   */
  async initializeLocalEmbedding(model: 'minilm' | 'qwen' = 'minilm'): Promise<boolean> {
    const available = await this.localEmbedding.initialize(model);
    this.useLocalEmbedding = available;
    return available;
  }

  /**
   * Semantic search for products in the marketplace
   * 
   * This uses PayMind's unified semantic search API:
   * 1. Query → Embedding conversion (local model if available, else cloud)
   * 2. Vector search in PayMind's vector database
   * 3. Client-side re-ranking with user preferences
   * 4. Automatic payment link generation
   * 
   * Agent developers only need to call this API - no embedding/vector DB knowledge required.
   */
  async searchProducts(
    request: SearchProductsRequest,
    reRankOptions?: ReRankOptions
  ): Promise<SearchProductsResponse> {
    if (!request.query || request.query.trim().length === 0) {
      throw new Error('Search query is required');
    }

    // Step 1: Generate embedding (local if available, else cloud)
    let embedding: number[] | null = null;
    if (this.useLocalEmbedding && this.localEmbedding.isAvailable()) {
      try {
        embedding = await this.localEmbedding.embed(request.query);
      } catch (error) {
        console.warn('Local embedding failed, falling back to cloud');
        embedding = null;
      }
    }

    // Step 2: Call PayMind semantic search API
    const response = await this.client.post<{
      products: MarketplaceProduct[];
      total: number;
      query: string;
      filters?: SearchProductsRequest['filters'];
    }>('/marketplace/products/search', {
      query: request.query,
      embedding: embedding, // Include local embedding if available
      filters: request.filters,
      limit: request.limit || 20,
      offset: request.offset || 0,
      sortBy: request.sortBy || 'relevance',
    });

    // Step 3: Convert to SearchResult format with payment links
    const searchResults: SearchResult[] = response.products.map((product) => ({
      merchantId: product.merchantId,
      productId: product.productId,
      title: product.title,
      description: product.description,
      paymentMethods: product.metadata?.paymentMethods || ['USDC', 'SOL', 'Visa', 'Apple Pay'],
      actions: [
        {
          type: 'payment_link' as const,
          url: product.payUrl || `https://paymind.ai/checkout/${product.productId}`,
          metadata: {
            productId: product.productId,
            merchantId: product.merchantId,
            price: product.price,
            currency: product.currency,
          },
        },
        {
          type: 'checkout' as const,
          url: `https://paymind.ai/checkout/${product.productId}`,
          metadata: {
            productId: product.productId,
          },
        },
      ],
      score: 0, // Will be calculated in re-ranking
      relevance: product.metadata?.relevance || 0.5,
      metadata: {
        ...product.metadata,
        price: product.price,
        currency: product.currency,
        stock: product.stock,
        category: product.category,
        delivery: product.delivery,
        commissionRate: product.commissionRate,
      },
    }));

    // Step 4: Client-side re-ranking with user preferences
    const reRankedResults = reRankOptions
      ? reRankResults(searchResults, reRankOptions)
      : searchResults.sort((a, b) => b.relevance - a.relevance);

    // Step 5: Format results
    const formattedResults = formatSearchResults(reRankedResults, {
      includePaymentLinks: true,
      maxResults: request.limit || 20,
    });

    return {
      products: formattedResults.map((result) => ({
        productId: result.productId || '',
        merchantId: result.merchantId,
        title: result.title,
        description: result.description,
        price: result.metadata?.price || 0,
        currency: result.metadata?.currency || 'USD',
        stock: result.metadata?.stock || 0,
        category: result.metadata?.category,
        delivery: result.metadata?.delivery,
        payUrl: result.actions[0]?.url,
        media: result.metadata?.media || [],
        attributes: result.metadata?.attributes || {},
        commissionRate: result.metadata?.commissionRate,
        availableToAgents: true,
        createdAt: result.metadata?.createdAt || new Date().toISOString(),
        updatedAt: result.metadata?.updatedAt || new Date().toISOString(),
      })),
      total: response.total,
      query: response.query,
      filters: response.filters,
    };
  }

  /**
   * Simple search method for quick queries
   * Agent developers can use this for basic searches
   */
  async search(
    query: string,
    options?: {
      filters?: SearchProductsRequest['filters'];
      limit?: number;
      reRank?: ReRankOptions;
    }
  ): Promise<SearchResult[]> {
    const response = await this.searchProducts(
      {
        query,
        filters: options?.filters,
        limit: options?.limit || 10,
      },
      options?.reRank
    );

    return response.products.map((product) => ({
      merchantId: product.merchantId,
      productId: product.productId,
      title: product.title,
      description: product.description,
      paymentMethods: ['USDC', 'SOL', 'Visa', 'Apple Pay'], // Default, can be enhanced
      actions: [
        {
          type: 'payment_link' as const,
          url: product.payUrl || `https://paymind.ai/checkout/${product.productId}`,
          metadata: {
            productId: product.productId,
            merchantId: product.merchantId,
          },
        },
      ],
      score: 0,
      relevance: 0.5,
      metadata: {
        price: product.price,
        currency: product.currency,
      },
    }));
  }

  /**
   * Get product details from marketplace
   */
  async getProduct(productId: string): Promise<MarketplaceProduct> {
    if (!productId) {
      throw new Error('Product ID is required');
    }
    return this.client.get<MarketplaceProduct>(`/marketplace/products/${productId}`);
  }

  /**
   * Create an order for a product
   * This will:
   * 1. Create order draft in PayMind OMS
   * 2. Call merchant callback API to get real-time price/inventory
   * 3. Merchant confirms and returns to PayMind
   * 4. PayMind generates final order and payment link
   */
  async createOrder(request: CreateOrderRequest): Promise<Order> {
    if (!request.productId) {
      throw new Error('Product ID is required');
    }
    if (!request.userId) {
      throw new Error('User ID is required');
    }

    return this.client.post<Order>('/marketplace/orders', request);
  }

  /**
   * Get order status
   */
  async getOrder(orderId: string): Promise<Order> {
    if (!orderId) {
      throw new Error('Order ID is required');
    }
    return this.client.get<Order>(`/marketplace/orders/${orderId}`);
  }

  /**
   * List orders for a user or agent
   */
  async listOrders(params?: {
    userId?: string;
    agentId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: Order[]; pagination: any }> {
    return this.client.get('/marketplace/orders', { params });
  }

  /**
   * Get recommended products for an agent
   * Based on agent's recommendation history and performance
   */
  async getRecommendedProducts(agentId: string, params?: {
    limit?: number;
    category?: string;
  }): Promise<{ products: MarketplaceProduct[] }> {
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
   * 创建商品（商家通过SDK上传商品到Marketplace）
   * 商品会自动索引到向量数据库，支持语义检索
   */
  async createProduct(request: {
    name: string;
    description?: string;
    price: number;
    stock: number;
    category: string;
    commissionRate?: number;
    productType?: 'physical' | 'service' | 'nft' | 'ft' | 'game_asset' | 'rwa';
    currency?: string;
    metadata?: {
      image?: string;
      images?: string[];
      attributes?: Record<string, any>;
      [key: string]: any;
    };
  }): Promise<MarketplaceProduct> {
    if (!request.name || !request.price || request.stock === undefined || !request.category) {
      throw new Error('Product name, price, stock, and category are required');
    }

    const response = await this.client.post<MarketplaceProduct>('/products', {
      name: request.name,
      description: request.description,
      price: request.price,
      stock: request.stock,
      category: request.category,
      commissionRate: request.commissionRate || 5,
      metadata: {
        productType: request.productType || 'physical',
        currency: request.currency || 'CNY',
        ...request.metadata,
      },
    });

    return response;
  }

  /**
   * 更新商品
   * 更新后会自动重新索引到向量数据库
   */
  async updateProduct(
    productId: string,
    updates: {
      name?: string;
      description?: string;
      price?: number;
      stock?: number;
      category?: string;
      commissionRate?: number;
      metadata?: Record<string, any>;
    },
  ): Promise<MarketplaceProduct> {
    if (!productId) {
      throw new Error('Product ID is required');
    }

    const response = await this.client.put<MarketplaceProduct>(`/products/${productId}`, updates);
    return response;
  }

  /**
   * 删除商品
   */
  async deleteProduct(productId: string): Promise<{ message: string }> {
    if (!productId) {
      throw new Error('Product ID is required');
    }

    return this.client.delete(`/products/${productId}`);
  }

}