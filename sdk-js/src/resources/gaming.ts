/**
 * Gaming resource for Agentrix SDK
 */

import { AgentrixClient } from '../client';
import { Payment } from '../types/payment';

export interface PurchaseItemRequest {
  userId: string;
  itemId: string;
  itemType: 'weapon' | 'skin' | 'currency' | 'boost' | 'other';
  quantity?: number;
  useAutoPay?: boolean; // Use X402 auto-pay if available
  metadata?: Record<string, any>;
}

export interface GameItem {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  itemType: string;
  metadata?: Record<string, any>;
}

export interface GamePurchase extends Payment {
  itemId: string;
  itemType: string;
  quantity: number;
}

export class GamingResource {
  constructor(private client: AgentrixClient) {}

  /**
   * Purchase a game item
   */
  async purchaseItem(request: PurchaseItemRequest): Promise<GamePurchase> {
    if (!request.userId) {
      throw new Error('User ID is required');
    }
    if (!request.itemId) {
      throw new Error('Item ID is required');
    }

    return this.client.post<GamePurchase>('/gaming/purchase', {
      ...request,
      description: `Purchase ${request.itemType}: ${request.itemId}`,
    });
  }

  /**
   * Purchase multiple items in batch
   */
  async purchaseBatch(requests: PurchaseItemRequest[]): Promise<GamePurchase[]> {
    if (!requests || requests.length === 0) {
      throw new Error('At least one purchase request is required');
    }
    if (requests.length > 50) {
      throw new Error('Maximum 50 items per batch');
    }

    return this.client.post<GamePurchase[]>('/gaming/purchase-batch', {
      purchases: requests,
    });
  }

  /**
   * Get game item by ID
   */
  async getItem(itemId: string): Promise<GameItem> {
    if (!itemId) {
      throw new Error('Item ID is required');
    }
    return this.client.get<GameItem>(`/gaming/items/${itemId}`);
  }

  /**
   * List game items
   */
  async listItems(params?: {
    page?: number;
    limit?: number;
    itemType?: string;
    search?: string;
  }): Promise<{ data: GameItem[]; pagination: any }> {
    return this.client.get('/gaming/items', { params });
  }

  /**
   * Get user's purchase history
   */
  async getPurchaseHistory(userId: string, params?: {
    page?: number;
    limit?: number;
    itemType?: string;
  }): Promise<{ data: GamePurchase[]; pagination: any }> {
    if (!userId) {
      throw new Error('User ID is required');
    }
    return this.client.get(`/gaming/users/${userId}/purchases`, { params });
  }
}

