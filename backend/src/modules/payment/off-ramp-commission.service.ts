import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Off-ramp 分佣计算服务
 * 处理商家数字货币转法币时的Agentrix分佣（可配置，默认0.1%，可设为0）
 * 
 * 重要说明：
 * - 分佣为0不与非托管原则冲突，因为：
 *   1. 资金始终在智能合约中，Agentrix从未"持有"资金
 *   2. 分账由智能合约自动执行，Agentrix无法干预
 *   3. Agentrix只是技术服务商，不涉及资金托管
 * - 分佣是"服务费"，不是"托管资金"
 * - 可以通过环境变量 AGENTRIX_OFF_RAMP_RATE 设置为0以避免法规风险
 */
@Injectable()
export class OffRampCommissionService {
  private readonly logger = new Logger(OffRampCommissionService.name);
  
  // Agentrix Off-ramp 分佣费率（可配置，默认0.1%，可设为0）
  private readonly AGENTRIX_OFF_RAMP_RATE: number;

  constructor(private configService: ConfigService) {
    // 从环境变量读取费率，默认0.1%（0.001），可以设为0
    const customRate = this.configService.get<number>('AGENTRIX_OFF_RAMP_RATE');
    this.AGENTRIX_OFF_RAMP_RATE = customRate !== undefined ? customRate : 0.001; // 默认0.1%
    
    if (this.AGENTRIX_OFF_RAMP_RATE === 0) {
      this.logger.log('⚠️  Agentrix Off-ramp commission rate is set to 0% (no service fee)');
    } else {
      this.logger.log(`Agentrix Off-ramp commission rate: ${this.AGENTRIX_OFF_RAMP_RATE * 100}%`);
    }
  }

  /**
   * 计算 Off-ramp 分佣
   * @param cryptoAmount 商家要转换的数字货币金额（USDT/USDC）
   * @param providerRate Provider费率（如0.02 = 2%）
   * @returns Off-ramp分佣计算结果
   */
  calculateOffRampCommission(
    cryptoAmount: number,
    providerRate: number = 0.02, // 默认2%
  ): {
    providerFee: number;      // Provider费用
    agentrixFee: number;       // Agentrix分佣（0.1%）
    merchantAmount: number;   // 商家实际收到金额（扣除所有费用后）
    totalDeduction: number;    // 总扣除金额
  } {
    // 1. 计算Provider费用
    const providerFee = cryptoAmount * providerRate;
    
    // 2. 计算Agentrix Off-ramp分佣（可配置，可为0）
    const agentrixFee = this.AGENTRIX_OFF_RAMP_RATE > 0 
      ? cryptoAmount * this.AGENTRIX_OFF_RAMP_RATE 
      : 0;
    
    // 3. 计算总扣除金额
    const totalDeduction = providerFee + agentrixFee;
    
    // 4. 计算商家实际收到金额
    const merchantAmount = cryptoAmount - totalDeduction;
    
    this.logger.log(
      `Off-ramp Commission Calculation: ` +
      `Amount=${cryptoAmount}, ` +
      `ProviderFee=${providerFee.toFixed(6)} (${(providerRate * 100).toFixed(2)}%), ` +
      `AgentrixFee=${agentrixFee.toFixed(6)} (${this.AGENTRIX_OFF_RAMP_RATE > 0 ? (this.AGENTRIX_OFF_RAMP_RATE * 100).toFixed(2) : '0'}%), ` +
      `MerchantAmount=${merchantAmount.toFixed(6)}`
    );
    
    return {
      providerFee,
      agentrixFee,
      merchantAmount,
      totalDeduction,
    };
  }

  /**
   * 计算商家需要支付的数字货币金额（用于Off-ramp）
   * 给定法币目标金额，计算需要多少数字货币
   * @param fiatAmount 目标法币金额
   * @param exchangeRate 汇率（1 USDT = X CNY）
   * @param providerRate Provider费率
   * @returns 需要的数字货币金额
   */
  calculateRequiredCryptoAmount(
    fiatAmount: number,
    exchangeRate: number,
    providerRate: number = 0.02,
  ): {
    requiredCrypto: number;   // 需要的数字货币金额
    providerFee: number;      // Provider费用
    agentrixFee: number;       // Agentrix分佣
    totalCrypto: number;       // 总数字货币金额
  } {
    // 目标法币金额对应的数字货币（不考虑费用）
    const baseCrypto = fiatAmount / exchangeRate;
    
    // 考虑费用后的计算公式：
    // fiatAmount = (cryptoAmount - providerFee - agentrixFee) * exchangeRate
    // fiatAmount = cryptoAmount * (1 - providerRate - agentrixRate) * exchangeRate
    // cryptoAmount = fiatAmount / (exchangeRate * (1 - providerRate - agentrixRate))
    
    const totalRate = providerRate + this.AGENTRIX_OFF_RAMP_RATE;
    const requiredCrypto = fiatAmount / (exchangeRate * (1 - totalRate));
    
    const providerFee = requiredCrypto * providerRate;
    const agentrixFee = requiredCrypto * this.AGENTRIX_OFF_RAMP_RATE;
    const totalCrypto = requiredCrypto;
    
    this.logger.log(
      `Off-ramp Required Crypto Calculation: ` +
      `FiatAmount=${fiatAmount}, ` +
      `ExchangeRate=${exchangeRate}, ` +
      `RequiredCrypto=${requiredCrypto.toFixed(6)}`
    );
    
    return {
      requiredCrypto,
      providerFee,
      agentrixFee,
      totalCrypto,
    };
  }

  /**
   * 获取Agentrix Off-ramp分佣费率
   */
  getAgentrixRate(): number {
    return this.AGENTRIX_OFF_RAMP_RATE;
  }
}

