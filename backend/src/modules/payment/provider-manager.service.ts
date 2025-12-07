import { Injectable, Logger } from '@nestjs/common';
import { IProvider, ProviderQuote } from './provider-abstract.service';
import { MockProviderService } from './mock-provider.service';
import { TransakProviderService } from './transak-provider.service';
import { OSLProviderService } from './osl-provider.service';

/**
 * Provider 管理器
 * 统一管理所有 Provider，支持比价和选择最优 Provider
 */
@Injectable()
export class ProviderManagerService {
  private readonly logger = new Logger(ProviderManagerService.name);
  private providers: Map<string, IProvider> = new Map();

  constructor(
    private mockProvider: MockProviderService,
    private transakProvider?: TransakProviderService,
    private oslProvider?: OSLProviderService,
  ) {
    // 注册 Mock Provider（用于测试）
    this.registerProvider(mockProvider);

    // 注册 Transak Provider（如果已配置）
    if (transakProvider) {
      try {
        this.registerProvider(transakProvider);
        this.logger.log('Transak Provider registered successfully');
      } catch (error) {
        this.logger.warn('Transak Provider not available (credentials not configured)');
      }
    }

    // 注册 OSL Pay Provider（如果已配置）
    if (oslProvider) {
      try {
        this.registerProvider(oslProvider);
        this.logger.log('OSL Pay Provider registered successfully');
      } catch (error) {
        this.logger.warn('OSL Pay Provider not available (credentials not configured)');
      }
    }
  }

  /**
   * 注册 Provider
   */
  registerProvider(provider: IProvider) {
    this.providers.set(provider.id, provider);
    this.logger.log(`Provider registered: ${provider.id} (${provider.name})`);
  }

  /**
   * 获取 Provider
   */
  getProvider(providerId: string): IProvider | null {
    return this.providers.get(providerId) || null;
  }

  /**
   * 获取所有支持 On-ramp 的 Provider
   */
  getOnRampProviders(): IProvider[] {
    return Array.from(this.providers.values()).filter((p) => p.supportsOnRamp);
  }

  /**
   * 获取所有支持 Off-ramp 的 Provider
   */
  getOffRampProviders(): IProvider[] {
    return Array.from(this.providers.values()).filter((p) => p.supportsOffRamp);
  }

  /**
   * 选择最优 Provider（比价）
   */
  async selectBestProvider(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
    type: 'onramp' | 'offramp',
  ): Promise<IProvider | null> {
    const candidates =
      type === 'onramp' ? this.getOnRampProviders() : this.getOffRampProviders();

    if (candidates.length === 0) {
      this.logger.warn(`No ${type} providers available`);
      return null;
    }

    // 获取所有 Provider 的报价
    const quotes = await Promise.all(
      candidates.map(async (provider) => {
        try {
          const quote = await provider.getQuote(amount, fromCurrency, toCurrency);
          return { provider, quote };
        } catch (error) {
          this.logger.warn(`Failed to get quote from ${provider.id}: ${error.message}`);
          return null;
        }
      }),
    );

    // 过滤失败的报价
    const validQuotes = quotes.filter((q) => q !== null) as Array<{
      provider: IProvider;
      quote: ProviderQuote;
    }>;

    if (validQuotes.length === 0) {
      this.logger.warn(`No valid quotes from ${type} providers`);
      return null;
    }

    // 选择最优报价（费率最低，即 estimatedAmount 最高）
    const best = validQuotes.reduce((best, current) => {
      return current.quote.estimatedAmount > best.quote.estimatedAmount
        ? current
        : best;
    });

    this.logger.log(
      `Selected best provider: ${best.provider.id} (rate: ${best.quote.rate}, estimated: ${best.quote.estimatedAmount})`,
    );

    return best.provider;
  }

  /**
   * 获取所有 Provider 的报价（用于前端显示）
   */
  async getAllQuotes(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
    type: 'onramp' | 'offramp',
  ): Promise<Array<{ provider: IProvider; quote: ProviderQuote }>> {
    const candidates =
      type === 'onramp' ? this.getOnRampProviders() : this.getOffRampProviders();

    const quotes = await Promise.all(
      candidates.map(async (provider) => {
        try {
          const quote = await provider.getQuote(amount, fromCurrency, toCurrency);
          return { provider, quote };
        } catch (error) {
          this.logger.warn(`Failed to get quote from ${provider.id}: ${error.message}`);
          return null;
        }
      }),
    );

    return quotes.filter((q) => q !== null) as Array<{
      provider: IProvider;
      quote: ProviderQuote;
    }>;
  }
}

