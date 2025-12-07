import { Injectable, Logger } from '@nestjs/common';
import { IProvider, ProviderQuote, OnRampParams, OnRampResult, OffRampParams, OffRampResult } from './provider-abstract.service';
import * as crypto from 'crypto';

/**
 * Mock Provider（用于测试，不影响其他场景）
 */
@Injectable()
export class MockProviderService implements IProvider {
  private readonly logger = new Logger(MockProviderService.name);

  id = 'mock';
  name = 'Mock Provider';
  supportsOnRamp = true;
  supportsOffRamp = true;

  async getQuote(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
  ): Promise<ProviderQuote> {
    this.logger.log(
      `Mock Provider: Get quote for ${amount} ${fromCurrency} -> ${toCurrency}`,
    );

    // 返回模拟报价
    return {
      providerId: this.id,
      rate: 1.0, // 1:1 汇率（测试用）
      fee: amount * 0.03, // 3% 手续费
      estimatedAmount: amount * 0.97,
      expiresAt: new Date(Date.now() + 60000), // 1分钟过期
    };
  }

  async executeOnRamp(params: OnRampParams): Promise<OnRampResult> {
    this.logger.log(
      `Mock Provider: Execute On-ramp for ${params.amount} ${params.fromCurrency} -> ${params.toCurrency}`,
    );

    // 模拟 On-ramp 流程
    // 在实际场景中，这里会调用真实的 Provider API
    // 在测试场景中，可以模拟返回成功

    return {
      transactionId: `mock-${Date.now()}`,
      status: 'completed',
      cryptoAmount: params.amount * 0.97, // 扣除手续费
      cryptoCurrency: params.toCurrency,
      transactionHash: `0x${crypto.randomBytes(32).toString('hex')}`, // 模拟交易哈希
    };
  }

  async executeOffRamp(params: OffRampParams): Promise<OffRampResult> {
    this.logger.log(
      `Mock Provider: Execute Off-ramp for ${params.amount} ${params.fromCurrency} -> ${params.toCurrency}`,
    );

    // 模拟 Off-ramp 流程
    return {
      transactionId: `mock-${Date.now()}`,
      status: 'completed',
      fiatAmount: params.amount * 0.97, // 扣除手续费
      fiatCurrency: params.toCurrency,
      transactionHash: `0x${crypto.randomBytes(32).toString('hex')}`, // 模拟交易哈希
    };
  }
}

