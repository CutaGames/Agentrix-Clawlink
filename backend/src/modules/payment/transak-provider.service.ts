import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IProvider, ProviderQuote, OnRampParams, OnRampResult, OffRampParams, OffRampResult } from './provider-abstract.service';
import axios, { AxiosError } from 'axios';

/**
 * Transak Provider Service
 * 实现 Transak 的 On-ramp 和 Off-ramp 功能
 * 
 * 文档: https://docs.transak.com/docs
 * Transak 主要通过 SDK/iframe 方式集成，本服务提供后端支持
 */
@Injectable()
export class TransakProviderService implements IProvider {
  private readonly logger = new Logger(TransakProviderService.name);
  
  id = 'transak';
  name = 'Transak';
  supportsOnRamp = true;
  supportsOffRamp = true;

  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly environment: 'STAGING' | 'PRODUCTION';
  private readonly webhookSecret: string;
  private readonly webhookUrl: string;
  private readonly baseUrl: string;
  private readonly gatewayBaseUrl: string;
  private cachedAccessToken: string | null = null;
  private cachedAccessTokenExpiresAt = 0;

  constructor(private configService: ConfigService) {
    // 从环境变量读取 Transak 配置
    const envValue = this.configService.get<string>('TRANSAK_ENVIRONMENT') || 'STAGING';
    this.environment = (envValue.toUpperCase() === 'PRODUCTION' ? 'PRODUCTION' : 'STAGING') as 'STAGING' | 'PRODUCTION';
    
    // 根据环境选择对应的 API Key
    // 支持分别配置：TRANSAK_API_KEY_STAGING 和 TRANSAK_API_KEY_PRODUCTION
    // 也支持统一配置：TRANSAK_API_KEY（如果环境特定的 key 不存在，则使用统一的）
    if (this.environment === 'PRODUCTION') {
      this.apiKey = this.configService.get<string>('TRANSAK_API_KEY_PRODUCTION') || 
                     this.configService.get<string>('TRANSAK_API_KEY') || '';
    } else {
      this.apiKey = this.configService.get<string>('TRANSAK_API_KEY_STAGING') || 
                     this.configService.get<string>('TRANSAK_API_KEY') || '';
    }

    if (this.environment === 'PRODUCTION') {
      this.apiSecret = this.configService.get<string>('TRANSAK_API_SECRET_PRODUCTION') ||
                       this.configService.get<string>('TRANSAK_API_SECRET') || '';
    } else {
      this.apiSecret = this.configService.get<string>('TRANSAK_API_SECRET_STAGING') ||
                       this.configService.get<string>('TRANSAK_API_SECRET') || '';
    }
    
    // 验证配置
    if (!this.apiKey) {
      this.logger.warn('⚠️ Transak API Key not configured. Transak features will be disabled.');
    } else {
      this.logger.log(`✅ Transak configured: Environment=${this.environment}, API Key=${this.apiKey.substring(0, 8)}...`);
      
      // 检查环境与 API Key 是否匹配（简单检查）
      if (this.environment === 'PRODUCTION' && this.apiKey.includes('staging')) {
        this.logger.warn('⚠️ Using PRODUCTION environment but API Key may be for STAGING. Please verify your configuration.');
      }
      if (this.environment === 'STAGING' && this.apiKey.includes('prod')) {
        this.logger.warn('⚠️ Using STAGING environment but API Key may be for PRODUCTION. Please verify your configuration.');
      }
    }

    if (!this.apiSecret) {
      this.logger.warn('⚠️ Transak API Secret not configured. Create Session API will fail until it is provided.');
    }
    
    this.webhookSecret = this.configService.get<string>('TRANSAK_WEBHOOK_SECRET') || '';
    
    // Transak API 基础 URL
    // 注意：api-staging.transak.com 有 DNS 问题（ENOTFOUND），无法访问
    // 因此 STAGING 环境也使用 api.transak.com（但必须使用 staging API Key）
    // api.transak.com 根路径返回 not found 是正常的（API 需要完整端点路径）
    // 完整的 API 端点路径（如 /auth/public/v2/session）应该可以工作
    if (this.environment === 'PRODUCTION') {
      this.baseUrl = 'https://api.transak.com';
    } else {
      // STAGING 环境：api-staging.transak.com 无法访问，使用 api.transak.com
      // 如果配置了备用 URL，优先使用备用 URL
      const alternateApiUrl = this.configService.get<string>('TRANSAK_API_URL_ALTERNATE');
      if (alternateApiUrl) {
        this.baseUrl = alternateApiUrl;
        this.logger.warn(`⚠️ STAGING environment using alternate API URL: ${alternateApiUrl}`);
      } else {
        // 默认使用 api.transak.com（因为 api-staging.transak.com DNS 失败）
        this.baseUrl = 'https://api.transak.com';
        this.logger.warn(`⚠️ STAGING environment using api.transak.com (api-staging.transak.com is not accessible).`);
        this.logger.warn(`⚠️ Ensure you're using a STAGING API Key with api.transak.com.`);
      }
    }

    const gatewayOverride = this.configService.get<string>('TRANSAK_GATEWAY_BASE_URL');
    this.gatewayBaseUrl = gatewayOverride ||
      (this.environment === 'PRODUCTION'
        ? 'https://api-gateway.transak.com'
        : 'https://api-gateway-stg.transak.com');

    if (gatewayOverride) {
      this.logger.warn(`⚠️ Using custom Transak gateway base URL: ${gatewayOverride}`);
    }
    
    // 记录配置信息（用于调试）
    this.logger.debug(`Transak Provider initialized: environment=${this.environment}, baseUrl=${this.baseUrl}, apiKey=${this.apiKey ? `${this.apiKey.substring(0, 8)}...` : 'NOT SET'}`);
    
    this.webhookUrl = this.configService.get<string>('TRANSAK_WEBHOOK_URL') || 
      `${this.configService.get<string>('API_BASE_URL') || 'http://localhost:3001'}/api/payments/provider/transak/webhook`;

    if (!this.apiKey) {
      this.logger.warn('Transak API key not configured. Transak Provider will not work.');
    }
  }

  /**
   * 获取报价
   * Transak 通过 API 获取实时报价
   */
  async getQuote(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
  ): Promise<ProviderQuote> {
    this.logger.log(
      `Transak: Get quote for ${amount} ${fromCurrency} -> ${toCurrency}`,
    );

    try {
      // Transak 提供价格 API
      // 注意：实际 API 端点需要根据 Transak 文档确认
      const response = await axios.get(`${this.baseUrl}/api/v2/currencies/price`, {
        params: {
          fiatCurrency: fromCurrency,
          cryptoCurrency: toCurrency,
          fiatAmount: amount,
        },
        headers: {
          'apiKey': this.apiKey,
        },
        timeout: 10000,
      });

      const data = response.data;
      const cryptoAmount = parseFloat(data.cryptoAmount || data.amount || '0');
      const fee = parseFloat(data.fee || '0');
      const rate = cryptoAmount / amount;

      return {
        providerId: this.id,
        rate,
        fee,
        estimatedAmount: cryptoAmount,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5分钟有效期
      };
    } catch (error: any) {
      this.logger.error(`Transak: Failed to get quote: ${error.message}`);
      throw new Error(`Failed to get quote from Transak: ${error.message}`);
    }
  }

  /**
   * 执行 On-ramp（法币转数字货币）
   * Transak 主要通过前端 SDK/iframe 集成，这里返回用于前端集成的配置
   */
  async executeOnRamp(params: OnRampParams): Promise<OnRampResult> {
    this.logger.log(
      `Transak: Execute On-ramp for ${params.amount} ${params.fromCurrency} -> ${params.toCurrency}`,
    );

    try {
      // Transak 的 On-ramp 主要通过前端 SDK 完成
      // 这里创建一个订单 ID 用于跟踪
      const orderId = `transak_on_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // 返回结果，包含用于前端 SDK 的配置
      return {
        transactionId: orderId,
        status: 'pending',
        cryptoAmount: 0, // 实际金额由前端 SDK 完成交易后通过 webhook 更新
        cryptoCurrency: params.toCurrency,
      };
    } catch (error: any) {
      this.logger.error(`Transak: On-ramp failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * 执行 Off-ramp（数字货币转法币）
   * 用于商家将 MPC 钱包中的数字货币转换成法币
   * 
   * 使用场景：
   * 1. 自动 Off-ramp：商家只接受法币时，合约分佣后自动从 MPC 钱包转换
   * 2. 手动 Off-ramp：商家接受 crypto，但想手动将 MPC 钱包中的数字货币转换成法币
   * 
   * 资金流：
   * - 从商家 MPC 钱包（数字货币）→ 通过 Transak Off-ramp → 打到商家银行账户（法币）
   * 
   * 文档: https://docs.transak.com/docs/transak-off-ramp
   */
  async executeOffRamp(params: OffRampParams): Promise<OffRampResult> {
    this.logger.log(
      `Transak: Execute Off-ramp for ${params.amount} ${params.fromCurrency} -> ${params.toCurrency}`,
    );

    try {
      // Transak Off-ramp API 调用
      // 注意：实际 API 端点需要根据 Transak 文档确认
      const orderId = `transak_off_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // 构建请求参数
      const requestBody = {
        apiKey: this.apiKey,
        cryptoCurrency: params.fromCurrency,
        fiatCurrency: params.toCurrency,
        cryptoAmount: params.amount.toString(),
        walletAddress: params.metadata?.fromWalletAddress, // 从 MPC 钱包地址
        bankAccount: params.bankAccount, // 商家银行账户
        partnerOrderId: orderId,
        webhookURL: this.webhookUrl,
        // 其他可选参数
        ...(params.metadata?.email && { email: params.metadata.email }),
        ...(params.metadata?.countryCode && { countryCode: params.metadata.countryCode }),
      };

      // 调用 Transak Off-ramp API
      const response = await axios.post(
        `${this.baseUrl}/api/v2/offramp/order`,
        requestBody,
        {
          headers: {
            'apiKey': this.apiKey,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        },
      );

      const data = response.data;
      
      // Transak 返回的订单信息
      const transakOrderId = data.orderId || data.id;
      const fiatAmount = parseFloat(data.fiatAmount || data.expectedFiatAmount || '0');
      
      this.logger.log(
        `Transak Off-ramp order created: ${transakOrderId}, expected fiat: ${fiatAmount} ${params.toCurrency}`,
      );

      return {
        transactionId: transakOrderId || orderId,
        status: 'pending', // 等待 Transak 处理，通过 webhook 更新状态
        fiatAmount: fiatAmount || 0,
        fiatCurrency: params.toCurrency,
      };
    } catch (error: any) {
      this.logger.error(`Transak: Off-ramp failed: ${error.message}`, error.stack);
      throw new Error(`Failed to execute Off-ramp with Transak: ${error.message}`);
    }
  }

  /**
   * 验证 Webhook 签名
   * Transak 使用 HMAC SHA256 签名
   */
  verifySignature(payload: string, signature: string): boolean {
    if (!this.webhookSecret) {
      this.logger.warn('Transak webhook secret not configured, skipping signature verification');
      return true; // 开发环境可能没有配置
    }

    try {
      const crypto = require('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(payload)
        .digest('hex');
      
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature),
      );
    } catch (error: any) {
      this.logger.error(`Transak: Signature verification failed: ${error.message}`);
      return false;
    }
  }

  private async getAccessToken(forceRefresh = false): Promise<string> {
    if (
      !forceRefresh &&
      this.cachedAccessToken &&
      Date.now() < this.cachedAccessTokenExpiresAt - 30_000
    ) {
      return this.cachedAccessToken;
    }

    if (!this.apiSecret) {
      throw new Error('Transak API Secret not configured');
    }

    try {
      const tokenUrl = `${this.gatewayBaseUrl}/api/v2/auth/token`;
      this.logger.debug(`Transak: Requesting access token from ${tokenUrl}`);

      const response = await axios.post(
        tokenUrl,
        {
          apiKey: this.apiKey,
          apiSecret: this.apiSecret,
        },
        {
          timeout: 15000,
        },
      );

      const tokenData = response.data || {};
      const accessToken = tokenData.access_token || tokenData.accessToken;
      if (!accessToken) {
        throw new Error('Token response missing access_token');
      }

      const expiresIn = Number(tokenData.expires_in || tokenData.expiresIn || 3600);
      const ttl = Math.max(expiresIn - 30, 30) * 1000;
      this.cachedAccessToken = accessToken;
      this.cachedAccessTokenExpiresAt = Date.now() + ttl;
      this.logger.debug(`Transak: Access token acquired, expires in ~${expiresIn}s`);

      return accessToken;
    } catch (error: any) {
      this.cachedAccessToken = null;
      this.cachedAccessTokenExpiresAt = 0;

      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const data = error.response?.data;
        this.logger.error(
          `Transak: Failed to retrieve access token${status ? ` (status ${status})` : ''}`,
          typeof data === 'object' ? JSON.stringify(data) : data || error.message,
        );
      } else {
        this.logger.error(`Transak: Failed to retrieve access token: ${error.message}`);
      }

      throw new Error(`Failed to fetch Transak access token: ${error.message || error}`);
    }
  }

  /**
   * 创建 Transak Session（使用 Create Session API）
   * 这是 Transak 推荐的方式，可以更好地控制 Widget 参数，包括锁定金额
   * 
   * 文档: https://docs.transak.com/docs/transak-integration-update-mandatory-migration-to-create-session-api
   */
  async createSession(params: {
    amount: number;
    fiatCurrency: string;
    cryptoCurrency: string;
    network?: string;
    walletAddress?: string;
    orderId?: string;
    userId?: string;
    email?: string;
    redirectURL?: string;
    hideMenu?: boolean;
    disableWalletAddressForm?: boolean;
    disableFiatAmountEditing?: boolean;
    isKYCRequired?: boolean;
    referrerDomain?: string;
  }): Promise<{ sessionId: string; widgetUrl: string }> {
    this.logger.log(
      `Transak: Creating session for ${params.amount} ${params.fiatCurrency} -> ${params.cryptoCurrency}`,
    );
    this.logger.debug(`Transak: Environment=${this.environment}, BaseUrl=${this.baseUrl}`);

    try {
      // 获取 referrerDomain（从请求或环境变量中获取）
      const resolvedReferrerDomain = params.referrerDomain ||
        this.configService.get<string>('TRANSAK_REFERRER_DOMAIN') || 
        this.configService.get<string>('FRONTEND_URL')?.replace(/^https?:\/\//, '')?.replace(/\/$/, '') || 
        'localhost:3000';

      // 构建 widgetParams（这些参数会在 Session 创建时锁定）
      const widgetParams: Record<string, any> = {
        referrerDomain: resolvedReferrerDomain,
        fiatAmount: params.amount.toString(),
        fiatCurrency: params.fiatCurrency,
        cryptoCurrencyCode: params.cryptoCurrency,
        ...(params.network && { network: params.network }),
        ...(params.walletAddress && { walletAddress: params.walletAddress }),
        ...(params.orderId && { partnerOrderId: params.orderId }),
        ...(params.email && { email: params.email }),
        ...(params.redirectURL && { redirectURL: params.redirectURL }),
        // 界面控制参数
        ...(params.hideMenu !== undefined && { hideMenu: params.hideMenu.toString() }),
        ...(params.disableWalletAddressForm !== undefined && { 
          disableWalletAddressForm: params.disableWalletAddressForm.toString() 
        }),
        ...(params.disableFiatAmountEditing !== undefined && { 
          disableFiatAmountEditing: params.disableFiatAmountEditing.toString() 
        }),
        ...(params.isKYCRequired !== undefined && { 
          isKYCRequired: params.isKYCRequired.toString() 
        }),
      };

      // 调用 Transak Create Session API
      const sessionUrl = `${this.gatewayBaseUrl}/api/v2/auth/session`;
      const accessToken = await this.getAccessToken();

      this.logger.debug(`Transak: Calling Create Session API: ${sessionUrl}`);
      this.logger.debug(`Transak: Request payload:`, JSON.stringify({ widgetParams }, null, 2));

      const response = await axios.post(
        sessionUrl,
        { widgetParams },
        {
          headers: {
            accept: 'application/json',
            Authorization: `Bearer ${accessToken}`,
            'content-type': 'application/json',
          },
          timeout: 30000,
        },
      );

      const data = response.data?.data || response.data;
      const sessionId = data?.sessionId || data?.session_id;

      if (!sessionId) {
        throw new Error('Transak Create Session API did not return sessionId');
      }

      // 构建 Widget URL（使用 sessionId）
      // 注意：staging-global.transak.com 会重定向到 global-stg.transak.com
      const widgetBaseUrl = this.environment === 'PRODUCTION'
        ? 'https://global.transak.com'
        : 'https://global-stg.transak.com';
      
      const widgetUrl = `${widgetBaseUrl}?apiKey=${this.apiKey}&sessionId=${sessionId}`;

      this.logger.log(`Transak: Session created successfully, sessionId=${sessionId}`);

      return {
        sessionId,
        widgetUrl,
      };
    } catch (error: any) {
      const axiosError = error as AxiosError;
      if (axiosError?.isAxiosError) {
        const status = axiosError.response?.status;
        const data = axiosError.response?.data;
        this.logger.error(
          `Transak: Create Session API failed${status ? ` (status ${status})` : ''}`,
          typeof data === 'object' ? JSON.stringify(data) : data || axiosError.message,
        );

        if (status === 401) {
          this.cachedAccessToken = null;
          this.cachedAccessTokenExpiresAt = 0;
        }
      } else {
        this.logger.error(`Transak: Failed to create session`, error);
      }

      const message = axiosError?.message || error?.message || 'Unknown error';
      throw new Error(`Failed to create Transak session: ${message}`);
    }
  }

  /**
   * 获取前端 SDK 配置
   * 用于前端集成 Transak SDK
   */
  getSDKConfig(params: {
    amount?: number;
    fiatCurrency?: string;
    cryptoCurrency?: string;
    walletAddress?: string;
    orderId?: string;
    userId?: string;
    email?: string;
    redirectURL?: string;
  }): Record<string, any> {
    return {
      apiKey: this.apiKey,
      environment: this.environment,
      widgetHeight: '700px',
      widgetWidth: '500px',
      ...params,
      // Transak 特定配置
      defaultCryptoCurrency: params.cryptoCurrency,
      defaultFiatCurrency: params.fiatCurrency,
      defaultAmount: params.amount,
      walletAddress: params.walletAddress,
      partnerOrderId: params.orderId,
      email: params.email,
      redirectURL: params.redirectURL || `${this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000'}/payment/callback`,
      // Webhook URL
      webhookURL: this.webhookUrl,
    };
  }
}

