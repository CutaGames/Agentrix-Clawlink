/**
 * Merchant resource for Agentrix SDK
 */

import { AgentrixClient } from '../client';
import {
  Product,
  CreateProductRequest,
  Order,
} from '../types/merchant';

export class MerchantResource {
  constructor(private client: AgentrixClient) {}

  /**
   * Create a product
   * When availableToAgents is true, the product will be:
   * 1. Stored in database
   * 2. Generate embedding for title + description
   * 3. Indexed in vector database (for semantic search)
   * 4. Synced to Marketplace Catalog service
   * 5. Made available for AI Agent retrieval
   */
  async createProduct(request: CreateProductRequest): Promise<Product> {
    if (!request.name) {
      throw new Error('Product name is required');
    }
    if (!request.price || request.price <= 0) {
      throw new Error('Product price must be a positive number');
    }
    
    // Default availableToAgents to true if not specified
    const productData = {
      ...request,
      availableToAgents: request.availableToAgents !== false, // Default to true
    };
    
    return this.client.post<Product>('/products', productData);
  }

  /**
   * Get product by ID
   */
  async getProduct(id: string): Promise<Product> {
    if (!id) {
      throw new Error('Product ID is required');
    }
    return this.client.get<Product>(`/products/${id}`);
  }

  /**
   * List products
   */
  async listProducts(params?: {
    page?: number;
    limit?: number;
    category?: string;
    search?: string;
  }): Promise<{ data: Product[]; pagination: any }> {
    return this.client.get('/products', { params });
  }

  /**
   * Update a product
   */
  async updateProduct(id: string, updates: Partial<CreateProductRequest>): Promise<Product> {
    if (!id) {
      throw new Error('Product ID is required');
    }
    return this.client.put<Product>(`/products/${id}`, updates);
  }

  /**
   * Delete a product
   */
  async deleteProduct(id: string): Promise<void> {
    if (!id) {
      throw new Error('Product ID is required');
    }
    return this.client.delete(`/products/${id}`);
  }

  /**
   * Get order by ID
   */
  async getOrder(id: string): Promise<Order> {
    if (!id) {
      throw new Error('Order ID is required');
    }
    return this.client.get<Order>(`/orders/${id}`);
  }

  /**
   * List orders
   */
  async listOrders(params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<{ data: Order[]; pagination: any }> {
    return this.client.get('/orders', { params });
  }
}

