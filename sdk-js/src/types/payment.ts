/**
 * Payment types for Agentrix SDK
 */

export type PaymentMethod = 'stripe' | 'wallet' | 'x402' | 'apple_pay' | 'google_pay' | 'crypto';
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface CreatePaymentRequest {
  amount: number;
  currency: string;
  description: string;
  merchantId?: string;
  agentId?: string;
  paymentMethod?: PaymentMethod;
  metadata?: {
    orderId?: string;
    productId?: string;
    countryCode?: string; // 国家代码（新增）
    regionCode?: string; // 区域代码（新增）
    isOnChain?: boolean;
    isCrossBorder?: boolean;
    userCountry?: string;
    merchantCountry?: string;
    escrow?: boolean;
    commissionRate?: number;
    recommendationAgentId?: string; // 推荐Agent ID（新增）
    [key: string]: any;
  };
}

export interface Payment {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  description: string;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  transactionHash?: string;
  merchantId?: string;
  agentId?: string;
  countryCode?: string; // 国家代码（新增）
  taxAmount?: number; // 税费金额（新增）
  taxRate?: number; // 税费率（新增）
  channelFee?: number; // 通道费用（新增）
  commissionRate?: number; // 佣金比例（新增）
  sessionId?: string; // Session ID（新增）
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentRouting {
  recommendedMethod: PaymentMethod;
  reason: string;
  channels: PaymentChannel[];
  requiresKYC?: boolean;
  crossBorderRoute?: boolean;
}

export interface PaymentChannel {
  method: PaymentMethod;
  cost: number;
  speed: string;
  kycRequired: boolean;
  crossBorder: boolean;
  supportedCurrencies: string[];
}

export interface CreatePaymentIntentRequest {
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  description?: string;
}

export interface PaymentIntent {
  paymentIntentId: string;
  clientSecret?: string;
  status: string;
}

