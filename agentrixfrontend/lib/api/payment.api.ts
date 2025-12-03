import { apiClient } from './client';
import type { PaymentRoutingInfo, ExchangeQuote, X402Authorization, AgentPaymentInfo, EscrowInfo } from '../../types/payment-types';

export interface PaymentInfo {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded';
  description?: string;
  merchantId?: string;
  agentId?: string;
  transactionHash?: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentRouting extends PaymentRoutingInfo {
  recommendedMethod: string;
  channels: Array<{
    method: string;
    priority: number;
    minAmount: number;
    maxAmount: number;
    cost: number;
    speed: number;
    available: boolean;
    kycRequired?: boolean;
    crossBorder?: boolean;
    supportedCurrencies?: string[];
  }>;
  scenarioMeta?: {
    type: string;
    title: string;
    description: string;
  };
  recommendedRoute?: {
    id: string;
    label: string;
    method: string;
    scenario: string;
    provider?: string;
    cost: number;
    speed: number;
  };
  flowType?: 'fiat' | 'fiat_to_crypto' | 'crypto';
}

export interface ProviderSessionInfo {
  sessionId: string;
  provider: string;
  checkoutUrl: string;
  expiresAt: string;
  status?: string;
  transactionHash?: string;
}

export interface CreatePaymentIntentDto {
  amount: number;
  currency: string;
  paymentMethod: string;
  description?: string;
  merchantId?: string;
  agentId?: string;
  metadata?: any;
}

export interface ProcessPaymentDto {
  amount: number;
  currency: string;
  paymentMethod: string;
  paymentIntentId?: string;
  description?: string;
  merchantId?: string;
  agentId?: string;
  metadata?: any;
}

export interface ExchangeRateInfo {
  from: string;
  to: string;
  rate: number;
  timestamp: number;
  source: string;
}

export interface ExchangeRateLock {
  lockId: string;
  rate: number;
  cryptoAmount: number;
  expiresAt: number;
  from: string;
  to: string;
  amount: number;
}

export interface ExchangeRateLockInfo {
  valid: boolean;
  lockId: string;
  rate: number;
  expiresAt: number;
}

export const paymentApi = {
  /**
   * 创建支付意图（Stripe）
   */
  createIntent: async (
    dto: CreatePaymentIntentDto,
  ): Promise<{ clientSecret: string; paymentIntentId: string }> => {
    const result = await apiClient.post<{ clientSecret: string; paymentIntentId: string }>('/payments/create-intent', dto);
    if (result === null) {
      throw new Error('无法创建支付意图，请稍后重试');
    }
    return result;
  },

  /**
   * 处理支付
   */
  process: async (dto: ProcessPaymentDto): Promise<PaymentInfo> => {
    const result = await apiClient.post<PaymentInfo>('/payments/process', dto);
    if (result === null) {
      throw new Error('无法处理支付，请稍后重试');
    }
    return result;
  },

  /**
   * 获取支付路由建议
   * V3.0新增：支持订单类型和Agent ID参数
   */
  getRouting: async (
    amount: number,
    currency: string = 'CNY',
    isOnChain?: boolean,
    userCountry?: string,
    merchantCountry?: string,
    merchantPaymentConfig?: 'fiat_only' | 'crypto_only' | 'both',
    orderType?: 'nft' | 'virtual' | 'service' | 'product' | 'physical',
    agentId?: string,
    walletConnected?: boolean,
    scenario?: 'qr_pay' | 'micro_sub' | 'wallet_direct' | 'standard',
  ): Promise<PaymentRouting> => {
    const params = new URLSearchParams({
      amount: amount.toString(),
      currency,
      ...(isOnChain !== undefined && { isOnChain: isOnChain.toString() }),
      ...(userCountry && { userCountry }),
      ...(merchantCountry && { merchantCountry }),
      ...(merchantPaymentConfig && { merchantPaymentConfig }),
      ...(orderType && { orderType }),
      ...(agentId && { agentId }),
      ...(walletConnected !== undefined && { walletConnected: walletConnected.toString() }),
      ...(scenario && { scenario }),
    });
    const result = await apiClient.get<PaymentRouting>(`/payments/routing?${params}`);
    if (result === null) {
      throw new Error('无法获取支付路由建议，请稍后重试');
    }
    return result;
  },

  /**
   * 查询支付状态
   */
  getPayment: async (paymentId: string): Promise<PaymentInfo> => {
    const result = await apiClient.get<PaymentInfo>(`/payments/${paymentId}`);
    if (result === null) {
      throw new Error('无法获取支付信息，请稍后重试');
    }
    return result;
  },

  /**
   * 更新支付状态
   */
  updatePaymentStatus: async (
    paymentId: string,
    status: string,
    transactionHash?: string,
  ): Promise<PaymentInfo> => {
    const result = await apiClient.put<PaymentInfo>(`/payments/${paymentId}/status`, {
      status,
      transactionHash,
    });
    if (result === null) {
      throw new Error('无法更新支付状态，请稍后重试');
    }
    return result;
  },

  /**
   * 创建Provider支付会话
   */
  createProviderSession: async (request: {
    amount: number;
    currency: string;
    toCurrency?: string;
    providerId: string;
    paymentRail: string;
    routeId?: string;
    quote?: any;
    metadata?: any;
    merchantId?: string;
    description?: string;
  }): Promise<ProviderSessionInfo> => {
    const result = await apiClient.post<ProviderSessionInfo>('/payments/provider/session', request);
    if (result === null) {
      throw new Error('无法创建Provider支付会话，请稍后重试');
    }
    return result;
  },

  /**
   * 估算手续费
   */
  estimateFee: async (params: {
    amount: number;
    currency: string;
    paymentMethod: string;
    chain?: string;
    isCrossBorder?: boolean;
    userCountry?: string;
    merchantCountry?: string;
  }): Promise<any> => {
    const queryParams = new URLSearchParams({
      amount: params.amount.toString(),
      currency: params.currency,
      paymentMethod: params.paymentMethod,
      ...(params.chain && { chain: params.chain }),
      ...(params.isCrossBorder !== undefined && { isCrossBorder: params.isCrossBorder.toString() }),
      ...(params.userCountry && { userCountry: params.userCountry }),
      ...(params.merchantCountry && { merchantCountry: params.merchantCountry }),
    });
    const result = await apiClient.get<any>(`/payments/estimate-fees?${queryParams}`);
    if (result === null) {
      throw new Error('无法估算手续费，请稍后重试');
    }
    return result;
  },

  /**
   * 对比所有支付方式成本
   */
  compareCosts: async (params: {
    amount: number;
    currency?: string;
    chain?: string;
    targetCurrency?: string;
  }): Promise<any[]> => {
    const queryParams = new URLSearchParams({
      amount: params.amount.toString(),
      currency: params.currency || 'USD',
      ...(params.chain && { chain: params.chain }),
      ...(params.targetCurrency && { targetCurrency: params.targetCurrency }),
    });
    const result = await apiClient.get<any[]>(`/payments/compare-costs?${queryParams}`);
    return result ?? [];
  },

  /**
   * 评估交易风险
   */
  assessRisk: async (params: {
    amount: number;
    paymentMethod: string;
    metadata?: any;
  }): Promise<any> => {
    const result = await apiClient.post<any>('/payments/assess-risk', params);
    if (result === null) {
      throw new Error('无法评估交易风险，请稍后重试');
    }
    return result;
  },

  /**
   * 获取用户的Agent代付记录
   */
  getUserAgentPayments: async (): Promise<any[]> => {
    const result = await apiClient.get<any[]>('/payments/agent/user-list');
    return result ?? [];
  },

  /**
   * 处理QuickPay支付
   */
  processQuickPay: async (request: {
    amount: number;
    currency: string;
    description?: string;
    merchantId?: string;
  }): Promise<PaymentInfo> => {
    const result = await apiClient.post<PaymentInfo>('/payments/quickpay', request);
    if (result === null) {
      throw new Error('无法处理QuickPay支付，请稍后重试');
    }
    return result;
  },

  /**
   * 处理数字货币支付
   */
  processCryptoPayment: async (request: {
    amount: number;
    currency: string;
    method: string;
    description?: string;
  }): Promise<PaymentInfo> => {
    const result = await apiClient.post<PaymentInfo>('/payments/crypto', request);
    if (result === null) {
      throw new Error('无法处理数字货币支付，请稍后重试');
    }
    return result;
  },

  /**
   * 处理Provider支付
   */
  processProviderPayment: async (request: {
    amount: number;
    currency: string;
    provider: string;
    description?: string;
  }): Promise<PaymentInfo> => {
    const result = await apiClient.post<PaymentInfo>('/payments/provider', request);
    if (result === null) {
      throw new Error('无法处理Provider支付，请稍后重试');
    }
    return result;
  },

  /**
   * 处理法币支付
   */
  processFiatPayment: async (request: {
    amount: number;
    currency: string;
    method: string;
    description?: string;
  }): Promise<PaymentInfo> => {
    const result = await apiClient.post<PaymentInfo>('/payments/fiat', request);
    if (result === null) {
      throw new Error('无法处理法币支付，请稍后重试');
    }
    return result;
  },

  /**
   * Pre-Flight Check（200ms 路由决策）
   */
  preflightCheck: async (params: {
    amount: string;
    currency?: string;
  }): Promise<{
    recommendedRoute: 'quickpay' | 'wallet' | 'crypto-rail' | 'local-rail';
    quickPayAvailable: boolean;
    sessionLimit?: {
      singleLimit: string;
      dailyLimit: string;
      dailyRemaining: string;
    };
    walletBalance?: string;
    requiresKYC?: boolean;
    estimatedTime?: string;
    fees?: {
      gasFee?: string;
      providerFee?: string;
      total?: string;
    };
  }> => {
    const queryParams = new URLSearchParams({
      amount: params.amount,
      currency: params.currency || 'USDC',
    });
    const result = await apiClient.get<{
      recommendedRoute: 'quickpay' | 'wallet' | 'crypto-rail' | 'local-rail';
      quickPayAvailable: boolean;
      sessionLimit?: {
        singleLimit: string;
        dailyLimit: string;
        dailyRemaining: string;
      };
      walletBalance?: string;
      requiresKYC?: boolean;
      estimatedTime?: string;
      fees?: {
        gasFee?: string;
        providerFee?: string;
        total?: string;
      };
    }>(`/payment/preflight?${queryParams}`);
    if (result === null) {
      throw new Error('无法执行Pre-Flight检查，请稍后重试');
    }
    return result;
  },

  /**
   * Relayer QuickPay（Agent 调用）
   */
  relayerQuickPay: async (request: {
    sessionId: string;
    paymentId: string;
    to: string;
    amount: string;
    signature: string;
    nonce: number;
  }): Promise<{
    success: boolean;
    paymentId: string;
    confirmedAt: Date;
    txHash?: string;
  }> => {
    const result = await apiClient.post<{
      success: boolean;
      paymentId: string;
      confirmedAt: Date;
      txHash?: string;
    }>('/relayer/quickpay', request);
    if (result === null) {
      throw new Error('无法执行Relayer QuickPay，请稍后重试');
    }
    return result;
  },

  /**
   * 创建 Session（ERC-8004）
   */
  createSession: async (request: {
    signer: string;
    sessionId?: string;
    singleLimit: number;
    dailyLimit: number;
    expiryDays: number;
    signature: string;
    agentId?: string;
  }): Promise<{
    sessionId: string;
    signer: string;
    singleLimit: string;
    dailyLimit: string;
    expiry: Date;
  }> => {
    const result = await apiClient.post<{
      sessionId: string;
      signer: string;
      singleLimit: string;
      dailyLimit: string;
      expiry: Date;
    }>('/sessions', request);
    if (result === null) {
      throw new Error('无法创建Session，请稍后重试');
    }
    return result;
  },

  /**
   * 撤销 Session
   */
  revokeSession: async (sessionId: string): Promise<void> => {
    return apiClient.delete(`/sessions/${sessionId}`);
  },

  /**
   * 获取用户的 Session 列表
   */
  getSessions: async (): Promise<any[]> => {
    const result = await apiClient.get<any[]>('/sessions');
    return result ?? [];
  },

  /**
   * 获取活跃 Session
   */
  getActiveSession: async (): Promise<any> => {
    const result = await apiClient.get<any>('/sessions/active');
    if (result === null) {
      throw new Error('无法获取活跃Session，请稍后重试');
    }
    return result;
  },

  /**
   * 获取实时汇率
   */
  getExchangeRate: async (from: string, to: string): Promise<ExchangeRateInfo> => {
    const result = await apiClient.get<ExchangeRateInfo>(
      `/payments/exchange-rate/quotes?from=${from}&to=${to}`
    );
    if (result === null) {
      throw new Error('无法获取汇率，请稍后重试');
    }
    return result;
  },

  /**
   * 锁定汇率
   */
  lockExchangeRate: async (params: {
    from: string;
    to: string;
    amount: number;
    expiresIn?: number;
  }): Promise<ExchangeRateLock> => {
    const result = await apiClient.post<ExchangeRateLock>(
      '/payments/exchange-rate/lock',
      params
    );
    if (result === null) {
      throw new Error('无法锁定汇率，请稍后重试');
    }
    return result;
  },

  /**
   * 验证锁定汇率
   */
  getExchangeRateLock: async (lockId: string): Promise<ExchangeRateLockInfo> => {
    const result = await apiClient.get<ExchangeRateLockInfo>(
      `/payments/exchange-rate/lock/${lockId}`
    );
    if (result === null) {
      throw new Error('无法获取锁定汇率，请稍后重试');
    }
    return result;
  },

  /**
   * 获取合约地址
   */
  getContractAddress: async (): Promise<{
    commissionContractAddress: string;
    erc8004ContractAddress?: string;
    usdcAddress?: string;
  }> => {
    const result = await apiClient.get<{
      commissionContractAddress: string;
      erc8004ContractAddress?: string;
      usdcAddress?: string;
    }>('/payments/contract-address');
    if (result === null) {
      throw new Error('无法获取合约地址，请稍后重试');
    }
    return result;
  },
};
