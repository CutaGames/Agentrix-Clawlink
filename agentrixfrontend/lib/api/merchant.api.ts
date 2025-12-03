import { apiClient } from './client';

export interface AutoOrderConfig {
  merchantId: string;
  enabled: boolean;
  autoAcceptThreshold?: number;
  autoRejectReasons?: string[];
  aiDecisionEnabled: boolean;
  workingHours?: {
    start: string;
    end: string;
  };
}

export interface AICustomerServiceConfig {
  merchantId: string;
  enabled: boolean;
  language: string;
  tone: 'professional' | 'friendly' | 'casual';
  autoReplyEnabled: boolean;
  workingHours?: {
    start: string;
    end: string;
  };
  outOfHoursMessage?: string;
}

export interface AutoMarketingConfig {
  merchantId: string;
  enabled: boolean;
  strategies: {
    abandonedCart?: {
      enabled: boolean;
      delayHours: number;
      discountPercent?: number;
    };
    newCustomer?: {
      enabled: boolean;
      welcomeDiscount?: number;
    };
    repeatCustomer?: {
      enabled: boolean;
      loyaltyReward?: number;
    };
    lowStock?: {
      enabled: boolean;
      threshold: number;
    };
    priceDrop?: {
      enabled: boolean;
      dropPercent: number;
    };
  };
}

export const merchantApi = {
  // ========== 自动接单 ==========
  async configureAutoOrder(config: Partial<AutoOrderConfig>): Promise<AutoOrderConfig> {
    const response = await apiClient.post<AutoOrderConfig>('/merchant/auto-order/configure', config);
    if (response === null) {
      throw new Error('无法配置自动接单，请稍后重试');
    }
    return response;
  },

  async getAutoOrderConfig(): Promise<AutoOrderConfig | null> {
    const response = await apiClient.get<AutoOrderConfig | null>('/merchant/auto-order/config');
    return response;
  },

  async processOrder(orderId: string, orderData: any): Promise<{ success: boolean }> {
    const response = await apiClient.post<{ success: boolean }>('/merchant/auto-order/process', {
      orderId,
      orderData,
    });
    if (response === null) {
      throw new Error('无法处理订单，请稍后重试');
    }
    return response;
  },

  // ========== AI客服 ==========
  async configureAICustomer(config: Partial<AICustomerServiceConfig>): Promise<AICustomerServiceConfig> {
    const response = await apiClient.post<AICustomerServiceConfig>('/merchant/ai-customer/configure', config);
    if (response === null) {
      throw new Error('无法配置AI客服，请稍后重试');
    }
    return response;
  },

  async getAICustomerConfig(): Promise<AICustomerServiceConfig | null> {
    const response = await apiClient.get<AICustomerServiceConfig | null>('/merchant/ai-customer/config');
    return response;
  },

  async handleCustomerMessage(message: any): Promise<{ reply: string }> {
    const response = await apiClient.post<{ reply: string }>('/merchant/ai-customer/message', message);
    if (response === null) {
      throw new Error('无法处理客户消息，请稍后重试');
    }
    return response;
  },

  // ========== 自动营销 ==========
  async configureAutoMarketing(config: Partial<AutoMarketingConfig>): Promise<AutoMarketingConfig> {
    const response = await apiClient.post<AutoMarketingConfig>('/merchant/auto-marketing/configure', config);
    if (response === null) {
      throw new Error('无法配置自动营销，请稍后重试');
    }
    return response;
  },

  async getAutoMarketingConfig(): Promise<AutoMarketingConfig | null> {
    const response = await apiClient.get<AutoMarketingConfig | null>('/merchant/auto-marketing/config');
    return response;
  },

  async triggerMarketingCampaigns(): Promise<{ campaigns: string[] }> {
    const response = await apiClient.post<{ campaigns: string[] }>('/merchant/auto-marketing/trigger');
    if (response === null) {
      throw new Error('无法触发营销活动，请稍后重试');
    }
    return response;
  },

  async sendCampaign(campaignId: string): Promise<{ success: boolean }> {
    const response = await apiClient.post<{ success: boolean }>(`/merchant/auto-marketing/campaign/${campaignId}/send`);
    if (response === null) {
      throw new Error('无法发送营销活动，请稍后重试');
    }
    return response;
  },

  // ========== P0功能：Webhook处理 ==========
  async configureWebhook(config: { url: string; events: string[]; secret?: string }): Promise<any> {
    const result = await apiClient.post<any>('/merchant/webhook/configure', config);
    if (result === null) {
      throw new Error('无法配置Webhook，请稍后重试');
    }
    return result;
  },

  async getWebhookConfig(): Promise<any> {
    const result = await apiClient.get<any>('/merchant/webhook/config');
    if (result === null) {
      throw new Error('无法获取Webhook配置，请稍后重试');
    }
    return result;
  },

  async getWebhookLogs(limit?: number): Promise<any[]> {
    const result = await apiClient.get<any[]>(`/merchant/webhook/logs?limit=${limit || 50}`);
    return result ?? [];
  },

  // ========== P0功能：自动发货 ==========
  async getFulfillmentRecords(): Promise<any[]> {
    const result = await apiClient.get<any[]>('/merchant/fulfillment/records');
    return result ?? [];
  },

  async autoFulfill(paymentId: string): Promise<any> {
    const result = await apiClient.post<any>('/merchant/fulfillment/auto', { paymentId });
    if (result === null) {
      throw new Error('无法自动发货，请稍后重试');
    }
    return result;
  },

  // ========== P0功能：多链账户 ==========
  async getMultiChainSummary(): Promise<any> {
    const result = await apiClient.get<any>('/merchant/multi-chain/summary');
    if (result === null) {
      throw new Error('无法获取多链账户摘要，请稍后重试');
    }
    return result;
  },

  async getChainBalance(chain: string, currency: string): Promise<number> {
    const result = await apiClient.get<number>(`/merchant/multi-chain/balance?chain=${chain}&currency=${currency}`);
    if (result === null) {
      throw new Error('无法获取链余额，请稍后重试');
    }
    return result;
  },

  // ========== P0功能：自动对账 ==========
  async performReconciliation(startDate?: string, endDate?: string): Promise<any> {
    const result = await apiClient.post<any>('/merchant/reconciliation/perform', { startDate, endDate });
    if (result === null) {
      throw new Error('无法执行自动对账，请稍后重试');
    }
    return result;
  },

  async getReconciliationRecords(): Promise<any[]> {
    const result = await apiClient.get<any[]>('/merchant/reconciliation/records');
    return result ?? [];
  },

  // ========== P0功能：结算规则 ==========
  async createSettlementRule(rule: any): Promise<any> {
    const result = await apiClient.post<any>('/merchant/settlement/rules', rule);
    if (result === null) {
      throw new Error('无法创建结算规则，请稍后重试');
    }
    return result;
  },

  async getSettlementRule(): Promise<any> {
    const result = await apiClient.get<any>('/merchant/settlement/rules');
    if (result === null) {
      throw new Error('无法获取结算规则，请稍后重试');
    }
    return result;
  },

  async performSettlement(period?: string): Promise<any> {
    const result = await apiClient.post<any>('/merchant/settlement/perform', { period });
    if (result === null) {
      throw new Error('无法执行结算，请稍后重试');
    }
    return result;
  },

  // ========== 支付配置 ==========

  async getPaymentSettings(): Promise<{
    paymentConfig: 'fiat_only' | 'crypto_only' | 'both';
    autoOffRampEnabled: boolean;
    preferredFiatCurrency: string;
    bankAccount?: string;
    minOffRampAmount: number;
  }> {
    const result = await apiClient.get<{
      paymentConfig: 'fiat_only' | 'crypto_only' | 'both';
      autoOffRampEnabled: boolean;
      preferredFiatCurrency: string;
      bankAccount?: string;
      minOffRampAmount: number;
    }>('/merchant/payment-settings');
    if (result === null) {
      throw new Error('无法获取支付配置，请稍后重试');
    }
    return result;
  },

  async updatePaymentSettings(settings: {
    paymentConfig: 'fiat_only' | 'crypto_only' | 'both';
    autoOffRampEnabled: boolean;
    preferredFiatCurrency: string;
    bankAccount?: string;
    minOffRampAmount: number;
  }): Promise<{ success: boolean; settings: any }> {
    const result = await apiClient.post<{ success: boolean; settings: any }>(
      '/merchant/payment-settings',
      settings
    );
    if (result === null) {
      throw new Error('无法保存支付配置，请稍后重试');
    }
    return result;
  },
};

