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
    this.apiKey = this.configService.get<string>('TRANSAK_API_KEY') || '';
    this.environment = (this.configService.get<string>('TRANSAK_ENVIRONMENT') || 'STAGING') as 'STAGING' | 'PRODUCTION';
    this.webhookSecret = this.configService.get<string>('TRANSAK_WEBHOOK_SECRET') || '';
    
    // Transak API 基础 URL
    this.baseUrl = this.environment === 'PRODUCTION' 
      ? 'https://api.transak.com'
      : 'https://api-staging.transak.com';
    
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
   * Transak 的 Off-ramp 也主要通过前端 SDK 完成
   */
  async executeOffRamp(params: OffRampParams): Promise<OffRampResult> {
    this.logger.log(
      `Transak: Execute Off-ramp for ${params.amount} ${params.fromCurrency} -> ${params.toCurrency}`,
    );

    try {
      // Transak 的 Off-ramp 主要通过前端 SDK 完成
      const orderId = `transak_off_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      return {
        transactionId: orderId,
        status: 'pending',
        fiatAmount: 0, // 实际金额由前端 SDK 完成交易后通过 webhook 更新
        fiatCurrency: params.toCurrency,
      };
    } catch (error: any) {
      this.logger.error(`Transak: Off-ramp failed: ${error.message}`);
      throw error;
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

