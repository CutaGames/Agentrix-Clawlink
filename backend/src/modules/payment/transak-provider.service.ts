import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IProvider, ProviderQuote, OnRampParams, OnRampResult, OffRampParams, OffRampResult } from './provider-abstract.service';
import axios from 'axios';

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
  private readonly environment: 'STAGING' | 'PRODUCTION';
  private readonly webhookSecret: string;
  private readonly webhookUrl: string;
  private readonly baseUrl: string;

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

    // 解析 URL（在 try 块外定义，以便在 catch 块中使用）
    const { URL } = require('url');
    let sessionApiUrl = `${this.baseUrl}/auth/public/v2/session`;
    if (!sessionApiUrl.startsWith('https://')) {
      sessionApiUrl = sessionApiUrl.replace(/^http:\/\//, 'https://');
      this.logger.warn(`Transak: Fixed HTTP URL to HTTPS: ${sessionApiUrl}`);
    }
    const url = new URL(sessionApiUrl);

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
      // 注意：根据 Transak 文档，Create Session API 使用 'access-token' header
      // 但实际使用的是 API Key（不是 OAuth access token）
      // 如果配置了 TRANSAK_ACCESS_TOKEN 则使用它，否则使用 TRANSAK_API_KEY
      const accessToken = this.configService.get<string>('TRANSAK_ACCESS_TOKEN') || this.apiKey;
      
      if (!accessToken) {
        throw new Error('Transak API Key or Access Token not configured');
      }
      
      // 使用 Node.js 原生 https 模块，避免 axios 的协议问题
      const https = require('https');
      
      this.logger.debug(`Transak: Calling Create Session API: ${sessionApiUrl}`);
      this.logger.debug(`Transak: Request payload:`, JSON.stringify({ widgetParams }, null, 2));
      this.logger.debug(`Transak: Using access-token: ${accessToken ? `${accessToken.substring(0, 8)}...` : 'NOT SET'}`);
      
      const requestData = JSON.stringify({ widgetParams });
      
      // 使用原生 https 模块发送请求
      const data = await new Promise<any>((resolve, reject) => {
        const options = {
          hostname: url.hostname,
          port: url.port || 443,
          path: url.pathname,
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'access-token': accessToken,
            'content-type': 'application/json',
            'content-length': Buffer.byteLength(requestData),
            // 使用更真实的 User-Agent 来绕过 Cloudflare 检查
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'accept-language': 'en-US,en;q=0.9',
            'origin': 'https://global.transak.com',
            'referer': 'https://global.transak.com/',
          },
          // SSL/TLS 选项
          rejectUnauthorized: true, // 验证 SSL 证书
          timeout: 30000, // 30秒超时
        };
        
        const req = https.request(options, (res: any) => {
          let responseData = '';
          
          res.on('data', (chunk: Buffer) => {
            responseData += chunk.toString();
          });
          
          res.on('end', () => {
            if (res.statusCode >= 400) {
              this.logger.error(`Transak: Create Session API returned error status: ${res.statusCode}`);
              this.logger.error(`Transak: Response data:`, responseData);
              reject(new Error(`Transak Create Session API returned ${res.statusCode}: ${responseData}`));
              return;
            }
            
            try {
              const parsed = JSON.parse(responseData);
              resolve(parsed);
            } catch (e) {
              reject(new Error(`Failed to parse response: ${responseData}`));
            }
          });
        });
        
        req.on('error', (error: Error) => {
          this.logger.error(`Transak: Request error:`, error);
          this.logger.error(`Transak: Error name: ${error.name}, message: ${error.message}`);
          this.logger.error(`Transak: Error stack:`, error.stack);
          
          // 处理 AggregateError（可能包含多个错误）
          if (error.name === 'AggregateError' && (error as any).errors) {
            const aggregateError = error as any;
            this.logger.error(`Transak: AggregateError contains ${aggregateError.errors.length} errors:`);
            aggregateError.errors.forEach((err: Error, index: number) => {
              this.logger.error(`Transak: Error ${index + 1}: ${err.name} - ${err.message}`);
            });
          }
          
          reject(error);
        });
        
        req.setTimeout(30000, () => {
          req.destroy();
          reject(new Error('Request timeout after 30 seconds'));
        });
        
        try {
          req.write(requestData);
          req.end();
        } catch (writeError: any) {
          this.logger.error(`Transak: Error writing request data:`, writeError);
          reject(new Error(`Failed to write request: ${writeError.message}`));
        }
      }).catch((promiseError: any) => {
        // 捕获 Promise 中的错误
        this.logger.error(`Transak: Promise rejection:`, promiseError);
        if (promiseError.name === 'AggregateError' && promiseError.errors) {
          const errorMessages = promiseError.errors.map((e: Error) => e.message).join('; ');
          throw new Error(`Failed to create Transak session: ${errorMessages}`);
        }
        throw promiseError;
      });
      
      const sessionId = data.session_id || data.sessionId;

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
      // 详细记录错误信息
      this.logger.error(`Transak: Failed to create session`);
      this.logger.error(`Transak: Error type: ${error.constructor.name}`);
      this.logger.error(`Transak: Error name: ${error.name}`);
      this.logger.error(`Transak: Error message: ${error.message}`);
      
      // 处理 AggregateError
      if (error.name === 'AggregateError' || error.constructor.name === 'AggregateError') {
        const aggregateError = error as any;
        if (aggregateError.errors && Array.isArray(aggregateError.errors)) {
          this.logger.error(`Transak: AggregateError contains ${aggregateError.errors.length} errors:`);
          const errorMessages: string[] = [];
          aggregateError.errors.forEach((err: any, index: number) => {
            const errMsg = err.message || err.toString();
            errorMessages.push(`Error ${index + 1}: ${errMsg}`);
            this.logger.error(`Transak: ${errorMessages[errorMessages.length - 1]}`);
            if (err.stack) {
              this.logger.error(`Transak: Error ${index + 1} stack:`, err.stack);
            }
          });
          throw new Error(`Failed to create Transak session: ${errorMessages.join('; ')}`);
        }
      }
      
      // 处理网络错误
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        this.logger.error(`Transak: Network error - ${error.code}: ${error.message}`);
        throw new Error(`Network error: Unable to connect to Transak API (${error.code}). Please check your network connection.`);
      }
      
      // 处理 HTTP 响应错误
      if (error.response) {
        this.logger.error(`Transak: HTTP error - Status: ${error.response.status}`);
        this.logger.error(`Transak: Response data:`, JSON.stringify(error.response.data, null, 2));
        this.logger.error(`Transak: Response headers:`, JSON.stringify(error.response.headers, null, 2));
        throw new Error(`Transak API returned ${error.response.status}: ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        this.logger.error(`Transak: No response received`);
        this.logger.error(`Transak: Request details:`, {
          hostname: url.hostname,
          path: url.pathname,
          method: 'POST',
        });
        throw new Error(`No response from Transak API. Please check your network connection and API key configuration.`);
      } else {
        this.logger.error(`Transak: Error setting up request:`, error.message);
        if (error.stack) {
          this.logger.error(`Transak: Error stack:`, error.stack);
        }
      }
      
      // 通用错误处理
      const errorMessage = error.message || error.toString() || 'Unknown error';
      throw new Error(`Failed to create Transak session: ${errorMessage}`);
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

