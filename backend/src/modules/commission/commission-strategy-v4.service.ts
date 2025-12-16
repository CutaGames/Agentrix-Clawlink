import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommissionSettlement, SettlementStatus } from '../../entities/commission-settlement.entity';
import { CommissionAllocation } from '../../entities/commission-allocation.entity';

export interface SplitRoles {
  promoter?: string; // Wallet Address or ID
  referrer?: string;
  executor?: string;
}

export interface SplitResult {
  merchant: bigint;
  platform: bigint;
  channel: bigint; // ARN 0.3%
  promoter: bigint;
  referrer: bigint;
  executor: bigint;
  platformFund: bigint;
}

@Injectable()
export class CommissionStrategyV4Service {
  
  constructor(
    @InjectRepository(CommissionSettlement)
    private settlementRepo: Repository<CommissionSettlement>,
    @InjectRepository(CommissionAllocation)
    private allocationRepo: Repository<CommissionAllocation>,
  ) {}

  // Rates based on V4.0 Design
  private readonly RATES = {
    physical: { pool: 0.022, platform: 0.005, channel: 0.003 },
    service: { pool: 0.037, platform: 0.010, channel: 0.003 },
    virtual: { pool: 0.022, platform: 0.005, channel: 0.003 },
    nft: { pool: 0.017, platform: 0.005, channel: 0.003 },
  };

  calculate(amount: bigint, productType: 'physical' | 'service' | 'virtual' | 'nft', roles: SplitRoles): SplitResult {
    const rates = this.RATES[productType] || this.RATES.physical;
    
    // 1. Base Fees
    // Use BigInt arithmetic, assuming amount is in smallest unit (wei/cents)
    // To avoid precision loss, we multiply by 10000 for rate calculation then divide
    
    const channelFee = this.calculateShare(amount, rates.channel);
    const platformFeeTotal = this.calculateShare(amount, rates.platform);
    const incentivePool = this.calculateShare(amount, rates.pool);
    
    // 2. Platform Fee Allocation (Promoter Logic)
    // Promoter gets 20% of Platform Fee
    let promoterShare = 0n;
    let platformNet = platformFeeTotal;
    
    if (roles.promoter) {
        promoterShare = platformFeeTotal * 20n / 100n;
        platformNet -= promoterShare;
    }
    
    // 3. Incentive Pool Allocation (Agent Logic)
    let executorShare = 0n;
    let referrerShare = 0n;
    let platformFund = 0n;
    
    // Executor (70%)
    const executorBudget = incentivePool * 70n / 100n;
    if (roles.executor) {
        executorShare = executorBudget;
    } else {
        platformFund += executorBudget;
    }
    
    // Referrer (30%)
    const referrerBudget = incentivePool * 30n / 100n;
    if (roles.referrer) {
        referrerShare = referrerBudget;
    } else {
        platformFund += referrerBudget;
    }
    
    // Merchant Net
    const merchantNet = amount - channelFee - platformFeeTotal - incentivePool;
    
    return {
        merchant: merchantNet,
        platform: platformNet,
        channel: channelFee,
        promoter: promoterShare,
        referrer: referrerShare,
        executor: executorShare,
        platformFund: platformFund
    };
  }
  
  private calculateShare(amount: bigint, rate: number): bigint {
      // Rate is like 0.03 (3%)
      // We want amount * 0.03
      // = amount * 300 / 10000
      const bps = BigInt(Math.round(rate * 10000));
      return amount * bps / 10000n;
  }

  async calculateAndRecordCommission(
    orderId: string,
    amount: string, // Decimal string
    productType: 'physical' | 'service' | 'virtual' | 'nft',
    roles: SplitRoles
  ): Promise<CommissionSettlement> {
      const decimals = 6;
      const amountBigInt = this.parseDecimal(amount, decimals);
      
      const result = this.calculate(amountBigInt, productType, roles);
      
      // Save Settlement
      const settlement = this.settlementRepo.create({
          orderId,
          totalAmount: amount,
          merchantAmount: this.formatDecimal(result.merchant, decimals),
          platformFee: this.formatDecimal(result.platform + result.platformFund, decimals),
          channelFee: this.formatDecimal(result.channel, decimals),
          status: SettlementStatus.PENDING,
      });
      
      const savedSettlement = await this.settlementRepo.save(settlement);
      
      // Save Allocations
      const allocations = [];
      
      // Promoter
      if (result.promoter > 0n && roles.promoter) {
          allocations.push(this.allocationRepo.create({
              settlement: savedSettlement,
              agentWallet: roles.promoter,
              role: 'promoter',
              amount: this.formatDecimal(result.promoter, decimals),
              status: 'pending'
          }));
      }
      
      // Executor
      if (result.executor > 0n && roles.executor) {
          allocations.push(this.allocationRepo.create({
              settlement: savedSettlement,
              agentWallet: roles.executor,
              role: 'executor',
              amount: this.formatDecimal(result.executor, decimals),
              status: 'pending'
          }));
      }
      
      // Referrer
      if (result.referrer > 0n && roles.referrer) {
          allocations.push(this.allocationRepo.create({
              settlement: savedSettlement,
              agentWallet: roles.referrer,
              role: 'referrer',
              amount: this.formatDecimal(result.referrer, decimals),
              status: 'pending'
          }));
      }
      
      if (allocations.length > 0) {
          await this.allocationRepo.save(allocations);
      }
      
      return savedSettlement;
  }
  
  private parseDecimal(value: string, decimals: number): bigint {
      const [intPart, fracPart = ''] = value.split('.');
      const paddedFrac = fracPart.padEnd(decimals, '0').slice(0, decimals);
      return BigInt(intPart + paddedFrac);
  }
  
  private formatDecimal(value: bigint, decimals: number): string {
      const s = value.toString().padStart(decimals + 1, '0');
      const intPart = s.slice(0, -decimals);
      const fracPart = s.slice(-decimals);
      return `${intPart}.${fracPart}`;
  }
}
