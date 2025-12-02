/**
 * Merchant types for PayMind SDK
 */

export interface Product {
  id: string;
  merchantId: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  category?: string;
  imageUrl?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductRequest {
  name: string;
  description: string;
  price: number;
  currency: string;
  category?: string;
  imageUrl?: string;
  media?: string[]; // Multiple images/videos
  inventory?: number; // Stock quantity
  attributes?: Record<string, any>; // Product attributes (size, color, etc.)
  availableToAgents?: boolean; // Whether product is available in Marketplace for AI Agents
  commissionRate?: number; // Commission rate for agents (0.0 to 1.0)
  delivery?: string; // Delivery information
  metadata?: Record<string, any>;
}

export interface Order {
  id: string;
  merchantId: string;
  userId: string;
  productId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
  paymentId?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

