/**
 * Agent Capabilities Resource
 * 
 * 为 Agent 提供自动能力注入功能
 * 接入 SDK 的 Agent 自动拥有所有 PayMind Marketplace 交易能力
 */

import { PayMindClient } from '../client';
import { AIPlatform } from '../types/agent-capabilities';

export interface MarketplaceOptions {
  autoSearch?: boolean; // 自动语义搜索
  showPrices?: boolean; // 显示价格
  enableCart?: boolean; // 启用购物车
  enableRAG?: boolean; // 启用 RAG 智能推荐
}

export interface CapabilityInfo {
  platform: string;
  functions: any[];
  count: number;
}

export class AgentCapabilitiesResource {
  private marketplaceEnabled: boolean = false;
  private marketplaceOptions: MarketplaceOptions = {};
  private cachedCapabilities: Map<string, CapabilityInfo> = new Map();

  constructor(private client: PayMindClient) {}

  /**
   * 启用 Marketplace 能力
   * 一行代码让 Agent 拥有所有交易能力
   */
  enableMarketplace(options: MarketplaceOptions = {}): void {
    this.marketplaceEnabled = true;
    this.marketplaceOptions = {
      autoSearch: true,
      showPrices: true,
      enableCart: true,
      enableRAG: true,
      ...options,
    };

    // 自动获取所有平台的能力
    this.loadAllCapabilities().catch((error) => {
      console.warn('Failed to load capabilities:', error);
    });
  }

  /**
   * 获取指定平台的所有能力
   */
  async getPlatformCapabilities(platform: AIPlatform): Promise<CapabilityInfo> {
    // 检查缓存
    const cached = this.cachedCapabilities.get(platform);
    if (cached) {
      return cached;
    }

    try {
      const result = await this.client.get<CapabilityInfo>(
        `/ai-capability/platform/${platform}`,
      );
      this.cachedCapabilities.set(platform, result);
      return result;
    } catch (error) {
      throw new Error(`Failed to get capabilities for platform ${platform}: ${error.message}`);
    }
  }

  /**
   * 获取所有已注册的平台
   */
  async getAllPlatforms(): Promise<string[]> {
    try {
      const result = await this.client.get<{ platforms: string[]; count: number }>(
        '/ai-capability/platforms',
      );
      return result.platforms;
    } catch (error) {
      throw new Error(`Failed to get platforms: ${error.message}`);
    }
  }

  /**
   * 加载所有平台的能力
   */
  private async loadAllCapabilities(): Promise<void> {
    try {
      const platforms = await this.getAllPlatforms();
      const promises = platforms.map((platform) => this.getPlatformCapabilities(platform));
      await Promise.all(promises);
    } catch (error) {
      console.warn('Failed to load all capabilities:', error);
    }
  }

  /**
   * 检查 Marketplace 是否已启用
   */
  isMarketplaceEnabled(): boolean {
    return this.marketplaceEnabled;
  }

  /**
   * 获取 Marketplace 选项
   */
  getMarketplaceOptions(): MarketplaceOptions {
    return { ...this.marketplaceOptions };
  }

  /**
   * 执行能力
   */
  async executeCapability(
    executor: string,
    params: Record<string, any>,
    context?: {
      userId?: string;
      sessionId?: string;
      apiKey?: string;
      metadata?: Record<string, any>;
    },
  ): Promise<any> {
    try {
      const result = await this.client.post('/ai-capability/execute', {
        executor,
        params,
        context: context || {},
      });
      return result;
    } catch (error) {
      throw new Error(`Failed to execute capability: ${error.message}`);
    }
  }

  /**
   * 使用 RAG API 进行智能推荐
   */
  async ragSearch(
    query: string,
    options?: {
      context?: {
        userId?: string;
        sessionId?: string;
        location?: { country?: string; city?: string };
        preferences?: {
          preferredPaymentMethods?: string[];
          preferredMerchants?: string[];
          priceRange?: { min?: number; max?: number };
          categories?: string[];
        };
        history?: {
          previousPurchases?: string[];
          preferredCategories?: string[];
          searchHistory?: string[];
        };
      };
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
    },
  ): Promise<any> {
    if (!this.marketplaceOptions.enableRAG) {
      throw new Error('RAG is not enabled. Call enableMarketplace({ enableRAG: true }) first.');
    }

    try {
      const result = await this.client.post('/ai/rag/search', {
        query,
        ...options,
      });
      return result;
    } catch (error) {
      throw new Error(`RAG search failed: ${error.message}`);
    }
  }
}

