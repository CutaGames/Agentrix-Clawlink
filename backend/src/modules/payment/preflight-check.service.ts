import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { JsonRpcProvider, Contract, parseUnits, formatUnits } from 'ethers';
import { User } from '../../entities/user.entity';
import { WalletConnection } from '../../entities/wallet-connection.entity';
import { ExchangeRateService } from './exchange-rate.service';

export interface PreflightResult {
  recommendedRoute: 'quickpay' | 'wallet' | 'crypto-rail' | 'local-rail';
  quickPayAvailable: boolean;
  sessionLimit?: {
    singleLimit: string;
    dailyLimit: string;
    dailyRemaining: string;
  };
  walletBalance?: string;
  walletBalanceIsMock?: boolean; // 标记余额是否为 mock 值
  requiresKYC?: boolean;
  estimatedTime?: string;
  fees?: {
    gasFee?: string;
    providerFee?: string;
    total?: string;
  };
}

// ERC8004SessionManager ABI (简化版)
const ERC8004_ABI = [
  'function getSession(bytes32) view returns (tuple(address signer, address owner, uint256 singleLimit, uint256 dailyLimit, uint256 usedToday, uint256 expiry, uint256 lastResetDate, bool isActive))',
  'function getUserSessions(address) view returns (bytes32[])',
];

// USDC ABI (简化版)
const USDC_ABI = ['function balanceOf(address) view returns (uint256)'];

@Injectable()
export class PreflightCheckService {
  private readonly logger = new Logger(PreflightCheckService.name);
  private provider: JsonRpcProvider;
  private sessionManagerContract: Contract | null = null;
  private usdcContract: Contract | null = null;

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(WalletConnection)
    private walletRepository: Repository<WalletConnection>,
    private configService: ConfigService,
    private exchangeRateService: ExchangeRateService,
  ) {
    this.initializeContracts();
  }

  /**
   * 初始化合约连接
   */
  private initializeContracts() {
    try {
      const rpcUrl = this.configService.get<string>('RPC_URL') || 'http://localhost:8545';
      this.provider = new JsonRpcProvider(rpcUrl);

      const contractAddress = this.configService.get<string>('ERC8004_CONTRACT_ADDRESS');
      if (contractAddress) {
        this.sessionManagerContract = new Contract(
          contractAddress,
          ERC8004_ABI,
          this.provider,
        );
      }

      const usdcAddress = this.configService.get<string>('USDC_ADDRESS');
      if (usdcAddress) {
        this.usdcContract = new Contract(usdcAddress, USDC_ABI, this.provider);
      }
    } catch (error: any) {
      this.logger.warn(`Failed to initialize contracts: ${error.message}`);
    }
  }

  /**
   * Pre-Flight Check（200ms 内返回）
   */
  async check(
    userId: string,
    amount: number, // 原始金额
    currency: string, // 原始货币
  ): Promise<PreflightResult> {
    const startTime = Date.now();

    try {
      // 0. 货币转换：如果是法币，转换为 USDC
      let amountInUSDC = amount;
      const isFiatCurrency = ['CNY', 'USD', 'EUR', 'GBP', 'JPY'].includes(currency.toUpperCase());
      
      if (isFiatCurrency) {
        // 法币需要转换为 USDC 才能检查 QuickPay 额度
        try {
          const rate = await this.exchangeRateService.getExchangeRate(currency, 'USDC');
          amountInUSDC = amount * rate;
          this.logger.log(`货币转换: ${amount} ${currency} = ${amountInUSDC} USDC (汇率: ${rate})`);
        } catch (error) {
          this.logger.warn(`汇率转换失败: ${error.message}，使用默认汇率`);
          // 使用默认汇率
          const defaultRates: Record<string, number> = {
            'CNY': 0.142, // 1 CNY = 0.142 USDC
            'USD': 1.0,
            'EUR': 1.08,
            'GBP': 1.27,
            'JPY': 0.0067,
          };
          amountInUSDC = amount * (defaultRates[currency.toUpperCase()] || 1.0);
        }
        
        // 法币支付应该走 Provider 通道，但需要检查是否可以用 QuickPay（如果金额在限额内）
        // 这里不直接返回，继续检查 QuickPay 可用性
      }

      // 1. 获取用户钱包地址
      const wallet = await this.walletRepository.findOne({
        where: { userId, isDefault: true },
      });

      if (!wallet) {
        return {
          recommendedRoute: 'crypto-rail',
          quickPayAvailable: false,
          requiresKYC: true,
          estimatedTime: '2-5 minutes',
        };
      }

      // 2. 并行查询（提高速度）
      const [balanceResult, sessions, user] = await Promise.all([
        this.getWalletBalance(wallet.walletAddress),
        this.getUserSessions(wallet.walletAddress),
        this.userRepository.findOne({ where: { id: userId } }),
      ]);

      const balance = balanceResult.balance;
      const isMockBalance = balanceResult.isMock;
      // 使用转换后的 USDC 金额（如果是法币，已经转换为 USDC）
      // 先四舍五入到 6 位小数，避免 parseUnits 精度错误
      // 使用 parseFloat 确保精度正确，避免浮点数精度问题
      const amountInUSDCFixed = parseFloat(amountInUSDC.toFixed(6));
      // 确保金额是有效的正数
      if (isNaN(amountInUSDCFixed) || amountInUSDCFixed <= 0) {
        throw new Error(`Invalid amount after conversion: ${amountInUSDC}`);
      }
      const amountBN = parseUnits(amountInUSDCFixed.toFixed(6), 6); // USDC 6 decimals

      // 3. 检查 QuickPay 可用性
      let quickPayAvailable = false;
      let sessionLimit: PreflightResult['sessionLimit'] | undefined;

      if (sessions && sessions.length > 0) {
        // 获取第一个活跃 Session
        for (const sessionId of sessions) {
          const session = await this.getSessionFromChain(sessionId);
          if (session && session.isActive) {
            // 检查每日限额重置
            const currentDate = Math.floor(Date.now() / 86400000);
            const sessionDate = Number(session.lastResetDate) / 86400;
            let usedToday = session.usedToday;

            if (currentDate > sessionDate) {
              // 每日限额已重置
              usedToday = BigInt(0);
            }

            const dailyRemaining = session.dailyLimit - usedToday;

            // 检查单笔限额和每日限额
            // 1. 金额必须 <= 单次限额
            // 2. 金额必须 <= 每日剩余限额
            // 3. 钱包余额必须足够（如果不是 mock）
            const withinSingleLimit = amountBN <= session.singleLimit;
            const withinDailyLimit = amountBN <= dailyRemaining;
            const hasBalance = isMockBalance || balance >= amountBN;

            this.logger.debug(
              `QuickPay检查: 金额=${formatUnits(amountBN, 6)} USDC, ` +
              `单次限额=${formatUnits(session.singleLimit, 6)}, ` +
              `每日剩余=${formatUnits(dailyRemaining, 6)}, ` +
              `单次通过=${withinSingleLimit}, 每日通过=${withinDailyLimit}, 余额足够=${hasBalance}`,
            );

            if (withinSingleLimit && withinDailyLimit && hasBalance) {
              quickPayAvailable = true;
              sessionLimit = {
                singleLimit: formatUnits(session.singleLimit, 6),
                dailyLimit: formatUnits(session.dailyLimit, 6),
                dailyRemaining: formatUnits(dailyRemaining, 6),
              };
              break;
            }
          }
        }
      }

      // 4. 路由决策
      let recommendedRoute: PreflightResult['recommendedRoute'];
      let estimatedTime = '2-5 minutes';
      let fees: PreflightResult['fees'] | undefined;

      if (quickPayAvailable) {
        recommendedRoute = 'quickpay';
        estimatedTime = '< 1 second';
        fees = {
          gasFee: '0',
          providerFee: '0',
          total: '0',
        };
      } else if (!isMockBalance && balance >= amountBN) {
        recommendedRoute = 'wallet';
        estimatedTime = '30-60 seconds';
        fees = {
          gasFee: '~$0.50',
          total: '~$0.50',
        };
      } else {
        recommendedRoute = 'crypto-rail';
        estimatedTime = '2-5 minutes';
        fees = {
          providerFee: '~2.9%',
          total: `~$${(amount * 0.029).toFixed(2)}`,
        };
      }

      const elapsed = Date.now() - startTime;
      this.logger.log(`Pre-flight check completed in ${elapsed}ms`);

      return {
        recommendedRoute,
        quickPayAvailable,
        sessionLimit,
        walletBalance: isMockBalance ? '0' : formatUnits(balance, 6), // 如果是 mock，返回 0
        walletBalanceIsMock: isMockBalance, // 标记是否为 mock 值
        requiresKYC: user?.kycLevel === 'none',
        estimatedTime,
        fees,
      };
    } catch (error) {
      this.logger.error(`Pre-flight check failed: ${error.message}`);
      // 降级到默认路由
      return {
        recommendedRoute: 'crypto-rail',
        quickPayAvailable: false,
        requiresKYC: true,
        estimatedTime: '2-5 minutes',
      };
    }
  }

  /**
   * 获取钱包余额（链上查询）
   */
  private async getWalletBalance(walletAddress: string): Promise<{ balance: bigint; isMock: boolean }> {
    if (!this.usdcContract) {
      // Mock mode - 返回 0 而不是默认值，避免误导用户
      return { balance: BigInt(0), isMock: true };
    }

    try {
      const balance = await this.usdcContract.balanceOf(walletAddress);
      return { balance, isMock: false };
    } catch (error: any) {
      this.logger.warn(`Failed to get balance: ${error.message}`);
      return { balance: BigInt(0), isMock: true };
    }
  }

  /**
   * 获取用户的所有 Session（链上查询）
   */
  private async getUserSessions(walletAddress: string): Promise<string[]> {
    if (!this.sessionManagerContract) {
      return [];
    }

    try {
      return await this.sessionManagerContract.getUserSessions(walletAddress);
    } catch (error) {
      this.logger.warn(`Failed to get user sessions: ${error.message}`);
      return [];
    }
  }

  /**
   * 从链上获取 Session 信息
   */
  private async getSessionFromChain(sessionId: string): Promise<{
    signer: string;
    owner: string;
    singleLimit: bigint;
    dailyLimit: bigint;
    usedToday: bigint;
    expiry: bigint;
    lastResetDate: bigint;
    isActive: boolean;
  } | null> {
    if (!this.sessionManagerContract) {
      return null;
    }

    try {
      const session = await this.sessionManagerContract.getSession(sessionId);
      return {
        signer: session.signer,
        owner: session.owner,
        singleLimit: session.singleLimit,
        dailyLimit: session.dailyLimit,
        usedToday: session.usedToday,
        expiry: session.expiry,
        lastResetDate: session.lastResetDate,
        isActive: session.isActive,
      };
    } catch (error) {
      this.logger.warn(`Failed to get session: ${error.message}`);
      return null;
    }
  }
}

