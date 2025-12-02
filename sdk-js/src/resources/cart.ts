/**
 * Cart resource for PayMind SDK
 * 
 * Provides shopping cart management functionality for users
 */

import { PayMindClient } from '../client';

export interface CartItem {
  productId: string;
  quantity: number;
  addedAt: string;
}

export interface Cart {
  userId: string;
  items: CartItem[];
  updatedAt: string;
  total?: number;
  itemCount?: number;
}

export interface CartWithProducts extends Omit<Cart, 'items'> {
  items: Array<{
    product: {
      id: string;
      name: string;
      description?: string;
      price: number;
      currency: string;
      stock: number;
      image?: string;
      category?: string;
    };
    quantity: number;
    addedAt: string;
  }>;
}

export class CartResource {
  constructor(private client: PayMindClient) {}

  /**
   * Get user's shopping cart
   */
  async getCart(): Promise<Cart> {
    return this.client.get<Cart>('/cart');
  }

  /**
   * Get shopping cart with product details
   */
  async getCartWithProducts(): Promise<CartWithProducts> {
    return this.client.get<CartWithProducts>('/cart/products');
  }

  /**
   * Add item to cart
   */
  async addItem(productId: string, quantity: number = 1): Promise<Cart> {
    if (!productId) {
      throw new Error('Product ID is required');
    }
    if (quantity <= 0) {
      throw new Error('Quantity must be greater than 0');
    }

    return this.client.post<Cart>('/cart/items', {
      productId,
      quantity,
    });
  }

  /**
   * Update item quantity in cart
   */
  async updateItem(productId: string, quantity: number): Promise<Cart> {
    if (!productId) {
      throw new Error('Product ID is required');
    }
    if (quantity <= 0) {
      throw new Error('Quantity must be greater than 0');
    }

    return this.client.put<Cart>(`/cart/items/${productId}`, {
      quantity,
    });
  }

  /**
   * Remove item from cart
   */
  async removeItem(productId: string): Promise<Cart> {
    if (!productId) {
      throw new Error('Product ID is required');
    }

    return this.client.delete<Cart>(`/cart/items/${productId}`);
  }

  /**
   * Clear all items from cart
   */
  async clear(): Promise<Cart> {
    return this.client.delete<Cart>('/cart');
  }
}

