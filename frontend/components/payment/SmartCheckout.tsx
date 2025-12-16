'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Zap,
  CreditCard,
  Wallet,
  ShieldCheck,
  ChevronRight,
  Loader2,
  Fingerprint,
  Settings,
  History,
  AlertCircle,
  CheckCircle2,
  Smartphone,
  Globe,
  X as XIcon,
  ArrowRight,
} from 'lucide-react';
import { useRouter } from 'next/router';
import { SessionKeyManager } from '@/lib/session-key-manager';
import { paymentApi } from '@/lib/api/payment.api';
import { userApi } from '@/lib/api/user.api';
import { useSessionManager } from '@/hooks/useSessionManager';
import { useWeb3 } from '@/contexts/Web3Context';
import { SessionManager } from './SessionManager';
import { AgentrixLogo } from '../common/AgentrixLogo';
import { TransakWhiteLabelModal } from './TransakWhiteLabelModal';
import { ethers } from 'ethers';

interface SmartCheckoutProps {
  order: {
    id: string;
    amount: number;
    currency: string;
    description: string;
    merchantId: string;
    to?: string;
    metadata?: Record<string, any>;
    // X402 V2 Params
    x402Params?: {
        scheme: string;
        network: string;
        token?: string;
    };
  };
  onSuccess?: (result: any) => void;
  onCancel?: () => void;
}

type RouteType = 'quickpay' | 'provider' | 'wallet' | 'local-rail' | 'crypto-rail';
type Status = 'loading' | 'ready' | 'processing' | 'success' | 'error';

const TESTNET_NETWORK = {
  name: 'BSC Testnet',
  chainIdHex: '0x61',
  note: '请使用 BSC 测试网的 USDT 与 BNB Gas 进行支付调试',
};

const DEFAULT_BSC_TESTNET_RPC =
  process.env.NEXT_PUBLIC_BSC_TESTNET_RPC_URL || 'https://bsc-testnet.publicnode.com';

const TOKEN_CONFIG: Record<
  string,
  {
    address: `0x${string}`;
    fallbackDecimals: number;
  }
> = {
  USDT: {
    address:
      (process.env.NEXT_PUBLIC_BSC_TESTNET_USDT_ADDRESS as `0x${string}`) ||
      '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd',
    fallbackDecimals: 18,
  },
  USDC: {
    address:
      (process.env.NEXT_PUBLIC_BSC_TESTNET_USDC_ADDRESS as `0x${string}`) ||
      '0x64544969ed7EBf5f083679233325356EbE738930',
    fallbackDecimals: 6,
  },
};

const ERC20_ABI = [
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function decimals() external view returns (uint8)',
  'function balanceOf(address account) external view returns (uint256)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function approve(address spender, uint256 amount) external returns (bool)',
];

interface ProviderOption {
  id: string;
  name: string;
  price: number;
  currency: string;
  requiresKYC: boolean;
  provider: string;
  estimatedTime?: string;
  fee?: number;
  providerFee?: number;
  agentrixFee?: number;
  commissionContractAddress?: string;
  minAmount?: number;
  available?: boolean;
  paymentMethod?: string; // Added for specific payment method selection
}

interface PreflightResult {
  recommendedRoute: RouteType;
  quickPayAvailable: boolean;
  sessionLimit?: {
    singleLimit: string;
    dailyLimit: string;
    dailyRemaining: string;
  };
  walletBalance?: string;
  walletBalanceIsMock?: boolean;
  requiresKYC?: boolean;
  estimatedTime?: string;
  fees?: {
    gasFee?: string;
    providerFee?: string;
    total?: string;
  };
  providerOptions?: ProviderOption[];
}

const formatFiatSymbol = (currency?: string) => {
  const code = currency?.toUpperCase() || 'USD';
  switch (code) {
    case 'CNY':
    case 'JPY':
      return '¥';
    case 'EUR':
      return '€';
    case 'GBP':
      return '£';
    case 'USD':
    default:
      return '$';
  }
};

const formatFiatAmount = (value: number, currency?: string) => {
  const code = currency?.toUpperCase() || 'USD';
  const digits = code === 'JPY' ? 0 : 2;
  return `${formatFiatSymbol(code)}${value.toFixed(digits)} ${code}`;
};

export function SmartCheckout({ order, onSuccess, onCancel }: SmartCheckoutProps) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>('loading');
  const [routeType, setRouteType] = useState<RouteType>('quickpay');
  const [preflightResult, setPreflightResult] = useState<PreflightResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [connectingWalletId, setConnectingWalletId] = useState<string | null>(null);
  const [showKYCGuide, setShowKYCGuide] = useState(false);
  const [showQuickPayGuide, setShowQuickPayGuide] = useState(false);
  const [showSessionManager, setShowSessionManager] = useState(false);
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [showWalletSelector, setShowWalletSelector] = useState(false);
  const [selectedProviderOption, setSelectedProviderOption] = useState<ProviderOption | null>(null);
  const { activeSession, loadActiveSession } = useSessionManager();
  const { isConnected, defaultWallet, connect, connectors } = useWeb3();
  const tokenMetadataCache = useRef<Record<string, { address: string; decimals: number }>>({});
  const providerModalAutoOpened = useRef(false);

  const normalizedCurrency = (order.currency || 'USDC').toUpperCase();
  const isFiatOrderCurrency = ['CNY', 'USD', 'EUR', 'GBP', 'JPY'].includes(normalizedCurrency);
  const merchantConfig = order.metadata?.merchantPaymentConfig || 'both';
  const merchantAllowsCrypto = merchantConfig === 'both' || merchantConfig === 'crypto_only';
  
  // 汇率相关状态
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [cryptoAmount, setCryptoAmount] = useState<number | null>(null);
  const [exchangeRateLockId, setExchangeRateLockId] = useState<string | null>(null);
  const [isLoadingExchangeRate, setIsLoadingExchangeRate] = useState(false);

  // Approval State
  const [needsApproval, setNeedsApproval] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [checkingAllowance, setCheckingAllowance] = useState(false);

  // Initialize
  useEffect(() => {
    const initializePayment = async () => {
      try {
        setStatus('loading');
        
        const [profileResult, sessionResult, preflightResult] = await Promise.allSettled([
            userApi.getProfile().catch((e: any): any => {
                console.warn('Failed to load user profile:', e);
                return null;
            }),
            isConnected ? loadActiveSession().catch((e: any): any => {
                console.warn('Failed to load active session:', e);
                return null;
            }) : Promise.resolve(null),
            paymentApi.preflightCheck({
                amount: order.amount.toString(),
                currency: order.currency || 'USDC',
            }).catch((e: any): any => {
                console.error('Pre-flight check failed:', e);
                return { quickPayAvailable: false, providerOptions: [], recommendedRoute: 'provider' };
            })
        ]);

        // Handle Profile
        if (profileResult.status === 'fulfilled' && profileResult.value) {
            setUserProfile(profileResult.value);
        }

        // Handle Session
        let session = null;
        if (sessionResult.status === 'fulfilled' && sessionResult.value) {
            session = sessionResult.value;
            setCurrentSession(session);
        }
        
        if (activeSession && !session) {
          setCurrentSession(activeSession);
          session = activeSession;
        }

        // Handle Preflight
        let result: PreflightResult = { quickPayAvailable: false, providerOptions: [], recommendedRoute: 'provider' };
        if (preflightResult.status === 'fulfilled' && preflightResult.value) {
            result = preflightResult.value as PreflightResult;
            setPreflightResult(result);
        }
          
        // Default route logic
        const finalSession = session || activeSession || currentSession;
        const hasWallet = isConnected && defaultWallet;
        const hasQuickPaySession = Boolean(finalSession);
        const quickPayEligible = hasQuickPaySession && result.quickPayAvailable;

        if (quickPayEligible) {
            setRouteType('quickpay');
        } else if (hasWallet) {
            setRouteType('wallet');
        } else {
            // Default to provider if no wallet, but we will show split UI anyway
            setRouteType('provider');
        }

        setStatus('ready');
      } catch (error: any) {
        console.error('Payment initialization failed:', error);
        setError(error.message || 'Failed to initialize payment');
        setStatus('ready');
      }
    };

    initializePayment();
  }, [order.amount, order.currency, isConnected]);

  // Exchange Rate Logic
  useEffect(() => {
    const requiresCryptoSettlement =
      isFiatOrderCurrency &&
      merchantAllowsCrypto;

    let isMounted = true;

    if (!requiresCryptoSettlement) {
      setExchangeRate(null);
      // If it's not fiat, we can directly use the order amount as crypto amount (assuming 1:1 for stablecoins or handled elsewhere)
      // But wait, if currency is USDC/USDT, we should set cryptoAmount immediately.
      if (['USDC', 'USDT'].includes(normalizedCurrency)) {
          setCryptoAmount(order.amount);
      } else {
          setCryptoAmount(null);
      }
      setExchangeRateLockId(null);
      setIsLoadingExchangeRate(false);
      return () => {
        isMounted = false;
      };
    }

    const fetchExchangeRate = async () => {
      setIsLoadingExchangeRate(true);
      try {
        const rateInfo = await paymentApi.getExchangeRate(normalizedCurrency, 'USDT');
        if (!isMounted) return;
        setExchangeRate(rateInfo.rate);
        setCryptoAmount(order.amount * rateInfo.rate);
      } catch (error) {
        console.warn('获取汇率失败:', error);
        const defaultRate = normalizedCurrency === 'CNY' ? 0.142 : normalizedCurrency === 'USD' ? 1.0 : 0.142;
        if (isMounted) {
          setExchangeRate(defaultRate);
          setCryptoAmount(order.amount * defaultRate);
        }
      } finally {
        if (isMounted) setIsLoadingExchangeRate(false);
      }
    };

    if (exchangeRate === null || cryptoAmount === null) {
      fetchExchangeRate();
    }

    return () => {
      isMounted = false;
    };
  }, [merchantAllowsCrypto, isFiatOrderCurrency, normalizedCurrency, order.amount]);

  // Check allowance when connected or amount changes
  useEffect(() => {
    if (isConnected && (cryptoAmount || order.amount)) {
        checkAllowance();
    }
  }, [isConnected, cryptoAmount, order.amount, order.currency]);

  const getTokenMetadata = (symbol: string) => {
    const tokenSymbol = symbol?.toUpperCase();
    if (!tokenSymbol) throw new Error('未指定支付代币');
    
    // 直接使用缓存或配置，避免异步 RPC 调用导致浏览器拦截钱包弹窗
    if (tokenMetadataCache.current[tokenSymbol]) return tokenMetadataCache.current[tokenSymbol];

    const config = TOKEN_CONFIG[tokenSymbol];
    if (!config?.address) throw new Error(`暂不支持 ${tokenSymbol} 支付`);

    // 信任配置中的 decimals，不再进行实时链上查询
    // 如果需要动态查询，请在组件加载时预先获取
    const metadata = {
        address: config.address,
        decimals: config.fallbackDecimals
    };
    
    tokenMetadataCache.current[tokenSymbol] = metadata;
    return metadata;
  };

  const checkAllowance = async () => {
    if (!isConnected || !defaultWallet) return;
    
    try {
      setCheckingAllowance(true);
      // Use a provider that can read state (doesn't strictly need signer if just reading, but we use browser provider)
      const provider = new ethers.BrowserProvider((window as any).okxwallet || window.ethereum);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();
      
      // Get Commission Contract Address
      const contractInfo = await paymentApi.getContractAddress();
      const commissionAddress = contractInfo.commissionContractAddress;
      
      // Get Token Address
      let tokenSymbol = order.currency || 'USDC';
      if (isFiatOrderCurrency) tokenSymbol = 'USDT'; // Fiat converts to USDT
      const { address: tokenAddress, decimals } = getTokenMetadata(tokenSymbol);
      
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
      const allowance = await tokenContract.allowance(userAddress, commissionAddress);
      
      // Calculate required amount
      const amount = cryptoAmount || order.amount;
      const requiredAmount = ethers.parseUnits(amount.toFixed(decimals), decimals);
      
      if (allowance < requiredAmount) {
        setNeedsApproval(true);
      } else {
        setNeedsApproval(false);
      }
    } catch (e) {
      console.warn('Failed to check allowance:', e);
    } finally {
      setCheckingAllowance(false);
    }
  };

  const handleApprove = async () => {
    if (!isConnected || !defaultWallet) {
        setShowWalletSelector(true);
        return;
    }
    
    try {
      setIsApproving(true);
      const provider = new ethers.BrowserProvider((window as any).okxwallet || window.ethereum);
      const signer = await provider.getSigner();
      
      const contractInfo = await paymentApi.getContractAddress();
      const commissionAddress = contractInfo.commissionContractAddress;
      
      let tokenSymbol = order.currency || 'USDC';
      if (isFiatOrderCurrency) tokenSymbol = 'USDT';
      const { address: tokenAddress, decimals } = getTokenMetadata(tokenSymbol);
      
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
      
      // 使用合理的授权额度，而不是无限授权
      // 如果有 Session，使用 Session 的每日限额 * 3
      // 否则使用当前支付金额 * 10（支持多次支付）
      const session = currentSession || activeSession;
      let approvalAmount: bigint;
      
      if (session) {
        // Session 限额已经是 6 decimals，需要转换为 token decimals
        const dailyLimitHuman = session.dailyLimit / 1e6;
        const approvalHumanAmount = dailyLimitHuman * 3;
        approvalAmount = ethers.parseUnits(approvalHumanAmount.toFixed(6), decimals);
        console.log(`授权额度基于 Session 限额：${approvalHumanAmount} ${tokenSymbol}`);
      } else {
        // 没有 Session，使用当前支付金额 * 10
        const amount = cryptoAmount || order.amount;
        const approvalHumanAmount = amount * 10;
        approvalAmount = ethers.parseUnits(approvalHumanAmount.toFixed(6), decimals);
        console.log(`授权额度基于支付金额：${approvalHumanAmount} ${tokenSymbol}`);
      }
      
      const tx = await tokenContract.approve(commissionAddress, approvalAmount);
      await tx.wait();
      
      setNeedsApproval(false);
    } catch (e: any) {
      console.error('Approval failed:', e);
      setError(e.message || 'Approval failed');
    } finally {
      setIsApproving(false);
    }
  };

  const handlePay = async (overrideRouteType?: 'quickpay' | 'wallet') => {
    const effectiveRouteType = overrideRouteType || routeType;
    if (status === 'processing') return;
    setError(null);
    try {
      setStatus('processing');
      if (effectiveRouteType === 'quickpay') {
        await handleQuickPay();
      } else if (effectiveRouteType === 'wallet') {
        await handleWalletPay();
      }
    } catch (error: any) {
      console.error('Payment failed:', error);
      setError(error.message || 'Payment failed');
      setStatus('error');
    }
  };

  const handleQuickPay = async () => {
    const session = currentSession || activeSession;
    if (!session) throw new Error('No active session found.');
    
    let paymentAmount = order.amount;
    let paymentCurrency = order.currency || 'USDC';
    let lockId = exchangeRateLockId;
    
    const currency = order.currency || 'USDC';
    const isFiatCurrency = ['CNY', 'USD', 'EUR', 'GBP', 'JPY'].includes(currency.toUpperCase());
    
    // For fiat currencies, we MUST convert to crypto (USDT) first
    if (isFiatCurrency) {
        if (!exchangeRate || !cryptoAmount) {
            throw new Error('Exchange rate not available. Please wait and try again.');
        }
        // Lock exchange rate if not already locked
        if (!lockId) {
             try {
                 const lockResult = await paymentApi.lockExchangeRate({
                    from: currency,
                    to: 'USDT',
                    amount: order.amount,
                    expiresIn: 600,
                  });
                  lockId = lockResult.lockId;
                  setExchangeRateLockId(lockId);
                  paymentAmount = lockResult.cryptoAmount;
             } catch (e) {
                 // If lock API fails, use local calculation
                 console.warn('Failed to lock exchange rate, using local calculation:', e);
                 paymentAmount = cryptoAmount;
             }
        } else {
            paymentAmount = cryptoAmount;
        }
        paymentCurrency = 'USDT'; // Always settle in USDT for fiat orders
    }

    const { address: tokenAddress, decimals: tokenDecimals } = getTokenMetadata(paymentCurrency);
    const paymentAmountInSmallestUnit = ethers.parseUnits(paymentAmount.toFixed(tokenDecimals), tokenDecimals);

    // Signature logic
    // ⚠️ CRITICAL: ERC8004SessionManager uses 6 decimals internally for all amounts
    // The contract converts from 6 decimals to token decimals during transfer
    // So we MUST sign with 6 decimals, not token decimals
    const contractDecimals = 6;
    let amountForSignature: bigint;
    
    if (tokenDecimals > contractDecimals) {
        // Convert from higher decimals to 6 decimals (e.g., 18 -> 6)
        // Use Math.pow for compatibility, then convert to BigInt
        const decimalDiff = tokenDecimals - contractDecimals;
        const divisor = BigInt(Math.pow(10, decimalDiff));
        amountForSignature = BigInt(paymentAmountInSmallestUnit.toString()) / divisor;
        console.log(`Signature amount converted from ${tokenDecimals} to ${contractDecimals} decimals:`, 
                    paymentAmountInSmallestUnit.toString(), '->', amountForSignature.toString());
    } else if (tokenDecimals < contractDecimals) {
        // Convert from lower decimals to 6 decimals (unlikely but handle it)
        const decimalDiff = contractDecimals - tokenDecimals;
        const multiplier = BigInt(Math.pow(10, decimalDiff));
        amountForSignature = BigInt(paymentAmountInSmallestUnit.toString()) * multiplier;
    } else {
        amountForSignature = BigInt(paymentAmountInSmallestUnit.toString());
    }

    const chainId = 97; 
    const orderIdBytes32 = ethers.keccak256(ethers.toUtf8Bytes(order.id)) as `0x${string}`;
    
    // ⚠️ CRITICAL: Always prefer Commission Contract Address for QuickPay to ensure fee splitting
    // Only fallback to order.to (Merchant) if Commission Contract is not available
    let recipientAddress: string;
    try {
        const contractInfo = await paymentApi.getContractAddress();
        recipientAddress = contractInfo.commissionContractAddress;
        console.log('Using Commission Contract for signature:', recipientAddress);
    } catch (e) {
        console.warn('Failed to get commission contract address, falling back to order.to', e);
        recipientAddress = order.to;
    }

    if (!recipientAddress) {
        recipientAddress = order.to;
    }

    const sessionIdBytes32 = session.sessionId as `0x${string}`;
    const innerHash = ethers.solidityPackedKeccak256(
      ['bytes32', 'address', 'uint256', 'bytes32', 'uint256'],
      [sessionIdBytes32, recipientAddress, amountForSignature, orderIdBytes32, chainId]
    );

    const signature = await SessionKeyManager.signWithSessionKey(session.signer, innerHash);

    const paymentRequest = {
        amount: paymentAmount,
        currency: paymentCurrency,
        paymentMethod: 'x402',
        merchantId: order.merchantId,
        description: order.description,
        metadata: {
          sessionId: session.sessionId,
          signature,
          nonce: Date.now(),
          to: recipientAddress,
          tokenAddress,
          tokenDecimals,
          amountInSmallestUnit: paymentAmountInSmallestUnit.toString(),
          orderId: order.id,
          from: session.owner || userProfile?.walletAddress, // Pass payer address for quickPaySplitFrom
          walletAddress: session.owner || userProfile?.walletAddress, // Add walletAddress as fallback
          ...(isFiatCurrency && exchangeRate && {
            exchangeRateLockId: lockId,
            originalAmount: order.amount,
            originalCurrency: currency,
            exchangeRate: exchangeRate,
            conversionType: 'fiat_to_crypto',
          }),
        },
    };

    const result = await paymentApi.process(paymentRequest);
    if (result.status === 'failed' || result.status === 'cancelled') {
        throw new Error(result.metadata?.relayerError || 'Payment failed');
    }
    setStatus('success');
    if (onSuccess) onSuccess(result);
  };

  const handleWalletPay = async () => {
    if (!isConnected || !defaultWallet) {
        setShowWalletSelector(true);
        return;
    }

    setError(null);
    setStatus('processing');

    try {
        // Use the provider from the wallet connection, not just window.ethereum
        // This supports OKX and other injected wallets better if they override or coexist
        let provider;
        
        // Respect the connected wallet type
        if (defaultWallet.type === 'okx' && (window as any).okxwallet) {
            provider = new ethers.BrowserProvider((window as any).okxwallet);
        } else if (defaultWallet.type === 'metamask' && window.ethereum) {
            provider = new ethers.BrowserProvider(window.ethereum);
        } else {
            // Fallback: try OKX first if available, then Ethereum
            provider = new ethers.BrowserProvider((window as any).okxwallet || window.ethereum);
        }

        if (!provider) {
            throw new Error('No wallet provider found');
        }

        const signer = await provider.getSigner();
        const from = await signer.getAddress();

        let paymentAmount = order.amount;
        let paymentCurrency = order.currency || 'USDC';
        const isFiatCurrency = ['CNY', 'USD', 'EUR', 'GBP', 'JPY'].includes(paymentCurrency.toUpperCase());

        if (isFiatCurrency) {
             // Exchange rate logic similar to QuickPay
             if (!exchangeRate) throw new Error('Exchange rate not available. Please try again.');
             paymentAmount = cryptoAmount || order.amount * exchangeRate;
             paymentCurrency = 'USDT';
        }

        let to = order.to;
        if (!to) {
            const contractAddresses = await paymentApi.getContractAddress();
            to = contractAddresses.commissionContractAddress;
        }

        const { address: tokenAddress, decimals } = getTokenMetadata(paymentCurrency);
        const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
        const amountInWei = ethers.parseUnits(paymentAmount.toFixed(decimals), decimals);

        // Check balance
        try {
            const balance = await tokenContract.balanceOf(from);
            if (balance < amountInWei) {
                throw new Error(`Insufficient ${paymentCurrency} balance`);
            }
        } catch (err: any) {
            console.warn('Balance check failed:', err);
            // Continue to transfer even if balance check fails (e.g. if method doesn't exist), 
            // but if it was a specific error like insufficient funds, we should probably stop.
            // However, standard ERC20 has balanceOf.
            if (err.message.includes('Insufficient')) throw err;
        }

        const tx = await tokenContract.transfer(to, amountInWei);
        await tx.wait();

        // Record on backend
        await paymentApi.process({
            amount: paymentAmount,
            currency: paymentCurrency,
            paymentMethod: 'wallet',
            merchantId: order.merchantId,
            description: order.description,
            metadata: {
                orderId: order.id,
                to,
                txHash: tx.hash,
                // ... other metadata
            }
        });

        setStatus('success');
        if (onSuccess) onSuccess({ status: 'completed', transactionHash: tx.hash });
    } catch (error: any) {
        console.error('Wallet payment failed:', error);
        setError(error.message || 'Payment failed');
        setStatus('error');
    }
  };

  const handleFiatChannelClick = (methodId: string) => {
    // Map methodId to ProviderOption
    const baseOption = preflightResult?.providerOptions?.[0] || {
        id: 'transak',
        name: 'Transak',
        price: order.amount,
        currency: order.currency,
        requiresKYC: true,
        provider: 'transak'
    };

    const option: ProviderOption = {
        ...baseOption,
        paymentMethod: methodId, // Pass the specific method ID (e.g., 'google_pay')
        id: 'transak' // The provider is still Transak
    };

    setSelectedProviderOption(option);
    setShowProviderModal(true);
  };

  // --- Render Components ---

  const CryptoSection = () => {
    const session = currentSession || activeSession;
    
    // Calculate if QuickPay is affordable/allowed
    // Session limits are returned directly on session object (not nested in 'limit')
    // Backend returns: { singleLimit: number, dailyLimit: number, usedToday: number }
    const singleLimit = session?.singleLimit ? parseFloat(String(session.singleLimit)) : 0;
    const dailyLimit = session?.dailyLimit ? parseFloat(String(session.dailyLimit)) : 0;
    const usedToday = session?.usedToday ? parseFloat(String(session.usedToday)) : 0;
    const dailyRemaining = dailyLimit - usedToday;
    
    // Check if amount exceeds limits (if session exists)
    // Only check limits if session exists AND limits are > 0 (valid)
    const hasValidLimits = singleLimit > 0 && dailyLimit > 0;
    const exceedsLimit = session && hasValidLimits && cryptoAmount && (cryptoAmount > singleLimit || cryptoAmount > dailyRemaining);
    const isQuickPayDisabled = !session || (hasValidLimits && exceedsLimit);

    return (
      <div className="p-6 bg-slate-50/50">
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-100 rounded-lg text-indigo-600">
                    <Wallet size={16} />
                </div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Crypto Payment</h3>
            </div>
            <div className="px-2 py-1 bg-amber-100 text-amber-700 text-[10px] font-bold rounded uppercase tracking-wider">
                BSC Testnet
            </div>
        </div>

        <div className="space-y-3">
            {/* QuickPay Card */}
            <div 
                onClick={() => {
                    if (!session) {
                        setShowSessionManager(true);
                        return;
                    }
                    if (isQuickPayDisabled) {
                        return;
                    }
                    
                    if (needsApproval) {
                        handleApprove();
                        return;
                    }

                    setRouteType('quickpay');
                    handlePay('quickpay');
                }}
                className={`relative group cursor-pointer rounded-xl border p-4 transition-all ${
                    routeType === 'quickpay' && !isQuickPayDisabled && !needsApproval
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200' 
                    : isQuickPayDisabled && session
                        ? 'bg-slate-50 border-slate-100 opacity-70 cursor-not-allowed'
                        : needsApproval 
                            ? 'bg-amber-50 border-amber-200 hover:border-amber-300'
                            : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-md'
                }`}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                            routeType === 'quickpay' && !isQuickPayDisabled && !needsApproval ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-600'
                        } ${isQuickPayDisabled && session ? 'grayscale' : ''}`}>
                            {isApproving ? <Loader2 size={20} className="animate-spin" /> : <Zap size={20} />}
                        </div>
                        <div>
                            <div className={`font-bold ${routeType === 'quickpay' && !isQuickPayDisabled && !needsApproval ? 'text-white' : 'text-slate-900'} ${isQuickPayDisabled && session ? 'text-slate-400' : ''}`}>
                                {needsApproval ? (isApproving ? 'Approving...' : 'Approve Token') : 'QuickPay'}
                            </div>
                            <div className={`text-xs ${routeType === 'quickpay' && !isQuickPayDisabled && !needsApproval ? 'text-indigo-100' : 'text-slate-500'}`}>
                                {needsApproval 
                                    ? 'One-time approval required'
                                    : (session 
                                        ? (exceedsLimit ? 'Exceeds session limit' : 'One-click, Gasless') 
                                        : 'Enable for instant payment')}
                            </div>
                        </div>
                    </div>
                    {session ? (
                        <div className={`text-sm font-bold ${routeType === 'quickpay' && !isQuickPayDisabled ? 'text-white' : 'text-slate-900'} ${isQuickPayDisabled ? 'text-slate-400' : ''}`}>
                            {cryptoAmount ? `≈ ${cryptoAmount.toFixed(2)} USDT` : 'Loading...'}
                        </div>
                    ) : (
                        <div className="flex items-center text-indigo-600 text-xs font-bold bg-indigo-50 px-2 py-1 rounded-full">
                            SETUP <ChevronRight size={12} className="ml-1" />
                        </div>
                    )}
                </div>
            </div>

            {/* Wallet Pay Card */}
            <div 
                onClick={() => {
                    if (!isConnected) {
                        setShowWalletSelector(true);
                    } else {
                        setRouteType('wallet');
                        handleWalletPay();
                    }
                }}
                className={`relative group cursor-pointer rounded-xl border p-4 transition-all ${
                    routeType === 'wallet' && status === 'processing'
                    ? 'bg-slate-800 border-slate-800 text-white'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-md'
                }`}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-slate-100 text-slate-600">
                            <Wallet size={20} />
                        </div>
                        <div>
                            <div className="font-bold text-slate-900">Wallet Pay</div>
                            <div className="text-xs text-slate-500">
                                {isConnected ? `${defaultWallet?.address.slice(0,6)}...` : 'Connect Wallet'}
                            </div>
                        </div>
                    </div>
                     <div className="text-sm font-bold text-slate-900">
                        {cryptoAmount ? `≈ ${cryptoAmount.toFixed(2)} USDT` : ''}
                    </div>
                </div>
                
                {/* Inline Error Display for Wallet Pay */}
                {routeType === 'wallet' && status === 'error' && error && (
                    <div className="mt-3 p-2 bg-red-50 border border-red-100 rounded-lg flex items-start gap-2">
                        <AlertCircle size={14} className="text-red-600 mt-0.5 shrink-0" />
                        <div className="text-xs text-red-600 font-medium break-words">
                            {error}
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>
    );
  };

  const FiatSection = () => {
    // Use provider options from API if available, otherwise fallback to defaults
    const defaultChannels = [
        { id: 'google_pay', name: 'Google Pay', icon: 'https://assets.transak.com/images/payment-methods/google_pay.svg' },
        { id: 'apple_pay', name: 'Apple Pay', icon: 'https://assets.transak.com/images/payment-methods/apple_pay.svg' },
        { id: 'credit_debit_card', name: 'Credit/Debit Card', icon: 'https://assets.transak.com/images/payment-methods/credit_debit_card.svg' },
    ];

    // Add local methods based on currency
    const currency = order.currency?.toUpperCase();
    if (currency === 'EUR') {
        defaultChannels.push({ id: 'sepa_bank_transfer', name: 'SEPA Bank Transfer', icon: 'https://assets.transak.com/images/payment-methods/sepa_bank_transfer.svg' });
    } else if (currency === 'GBP') {
        defaultChannels.push({ id: 'gbp_bank_transfer', name: 'Faster Payments', icon: 'https://assets.transak.com/images/payment-methods/gbp_bank_transfer.svg' });
    } else if (currency === 'USD') {
        defaultChannels.push({ id: 'usa_bank_transfer', name: 'Fedwire / ACH', icon: 'https://assets.transak.com/images/payment-methods/usa_bank_transfer.svg' });
    } else if (currency === 'CNY') {
        // Add local payment methods for CNY
        defaultChannels.push({ 
            id: 'cny_bank_transfer', 
            name: 'Local Bank Card (本地银行卡)', 
            icon: 'https://assets.transak.com/images/payment-methods/cny_bank_transfer.svg' 
        });
        defaultChannels.push({ 
            id: 'alipay', 
            name: 'Alipay (支付宝)', 
            icon: 'https://assets.transak.com/images/payment-methods/alipay.svg' 
        });
    }

    // Merge with API data to get fees and limits
    const channelsWithData = defaultChannels.map(channel => {
        // Find matching option in preflightResult
        // Note: preflightResult.providerOptions usually returns a generic 'transak' option
        // We might need to infer fees from the generic option if specific ones aren't there
        const apiOption = preflightResult?.providerOptions?.find(opt => 
            opt.id === channel.id || opt.paymentMethod === channel.id
        ) || preflightResult?.providerOptions?.[0]; // Fallback to generic transak option for fee estimate

        // Estimate fee if not available (approx 3.5% + fixed fee for cards, 1% for bank transfers)
        let estimatedFee = apiOption?.fee;
        if (estimatedFee === undefined) {
            const isCard = channel.id.includes('card') || channel.id.includes('pay');
            const rate = isCard ? 0.035 : 0.01;
            estimatedFee = order.amount * rate;
        }

        // Estimate min amount if not available
        const minAmount = apiOption?.minAmount || (channel.id.includes('transfer') ? 20 : 10);

        return {
            ...channel,
            fee: estimatedFee,
            minAmount: minAmount,
            estimatedTime: apiOption?.estimatedTime || (channel.id.includes('transfer') ? '1-3 Days' : 'Instant'),
            currency: apiOption?.currency || order.currency,
            totalPrice: order.amount + (estimatedFee || 0)
        };
    });

    return (
      <div className="p-6 bg-white flex-1">
        <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 bg-emerald-100 rounded-lg text-emerald-600">
                <CreditCard size={16} />
            </div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Fiat Payment</h3>
        </div>

        <div className="space-y-3">
            {channelsWithData.map(channel => (
                <button
                    key={channel.id}
                    onClick={() => handleFiatChannelClick(channel.id)}
                    className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-white hover:border-emerald-200 hover:bg-emerald-50/30 transition-all group"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center p-2 border border-slate-100">
                            <img src={channel.icon} alt={channel.name} className="w-full h-full object-contain" onError={(e) => e.currentTarget.style.display = 'none'} />
                        </div>
                        <div className="text-left">
                            <div className="font-semibold text-slate-900">{channel.name}</div>
                            <div className="flex flex-col gap-0.5 text-xs text-slate-500">
                                <div className="flex items-center gap-2">
                                    <span>Min: {formatFiatSymbol(channel.currency)}{channel.minAmount}</span>
                                    <span>•</span>
                                    <span>Fee: {formatFiatSymbol(channel.currency)}{channel.fee?.toFixed(2)}</span>
                                </div>
                                <div className="text-[10px] text-slate-400">
                                    Total: {formatFiatSymbol(channel.currency)}{channel.totalPrice.toFixed(2)}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <ChevronRight size={16} className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
                    </div>
                </button>
            ))}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col h-[85vh] md:h-auto md:min-h-[600px]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
        <AgentrixLogo size="sm" showText />
        {onCancel && (
            <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">
                <XIcon size={20} />
            </button>
        )}
      </div>

      {/* Order Summary */}
      <div className="px-6 py-6 bg-white">
        <div className="text-center">
            <div className="text-sm text-slate-500 mb-1">Total Amount</div>
            <div className="text-4xl font-extrabold text-slate-900">
                {formatFiatAmount(order.amount, order.currency)}
            </div>
            <div className="text-xs text-slate-400 mt-2 bg-slate-50 inline-block px-3 py-1 rounded-full">
                {order.description}
            </div>
        </div>
      </div>

      {/* Split Layout */}
      <div className="flex-1 overflow-y-auto">
        <CryptoSection />
        <div className="h-px bg-slate-100 w-full relative">
            <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 text-xs text-slate-400 font-medium">
                OR
            </div>
        </div>
        <FiatSection />
      </div>

      {/* Footer / Status */}
      {status === 'error' && error && (
          <div className="p-4 bg-red-50 text-red-600 text-sm text-center border-t border-red-100">
              {error}
          </div>
      )}
      
      {status === 'processing' && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="text-center">
                  <Loader2 className="animate-spin text-indigo-600 mx-auto mb-4" size={40} />
                  <div className="font-bold text-slate-900">Processing Payment...</div>
                  <div className="text-sm text-slate-500">
                      {routeType === 'quickpay' ? 'Executing gasless transaction...' : 'Please confirm in your wallet'}
                  </div>
              </div>
          </div>
      )}

      {/* Modals */}
      {showSessionManager && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md">
                <div className="flex justify-between mb-4">
                    <h3 className="font-bold">Setup QuickPay</h3>
                    <button onClick={() => setShowSessionManager(false)}><XIcon size={20} /></button>
                </div>
                <SessionManager onClose={() => {
                    setShowSessionManager(false);
                    loadActiveSession().then(s => s && setCurrentSession(s));
                }} />
            </div>
        </div>
      )}

      <TransakWhiteLabelModal
        open={showProviderModal}
        order={order}
        providerOption={selectedProviderOption || preflightResult?.providerOptions?.[0] || null}
        providerOptions={preflightResult?.providerOptions || []}
        userProfile={userProfile}
        initialStage={selectedProviderOption?.paymentMethod ? 'widget' : 'selection'}
        onClose={() => setShowProviderModal(false)}
        onSuccess={(result) => {
            setShowProviderModal(false);
            if (onSuccess) onSuccess(result);
        }}
        onError={(msg) => setError(msg)}
      />

      {/* Wallet Selector Modal */}
      {showWalletSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-xl">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-slate-900">Connect Wallet</h3>
                    <button onClick={() => setShowWalletSelector(false)} className="text-slate-400 hover:text-slate-600">
                        <XIcon size={20} />
                    </button>
                </div>
                <div className="space-y-3">
                    {connectors.map(connector => (
                        <button
                            key={connector.id}
                            onClick={async () => {
                                try {
                                    setConnectingWalletId(connector.id);
                                    await connect(connector.id);
                                    setShowWalletSelector(false);
                                } catch (e: any) {
                                    console.error(e);
                                    setError(e.message || 'Connection failed');
                                } finally {
                                    setConnectingWalletId(null);
                                }
                            }}
                            disabled={(!connector.isInstalled && connector.id !== 'walletconnect') || connectingWalletId === connector.id}
                            className="w-full flex items-center p-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <span className="text-2xl mr-3">
                                {connectingWalletId === connector.id ? <Loader2 className="animate-spin" size={24} /> : connector.icon}
                            </span>
                            <div className="text-left">
                                <div className="font-semibold text-slate-900">{connector.name}</div>
                                {!connector.isInstalled && connector.id !== 'walletconnect' && (
                                    <div className="text-xs text-slate-500">Not Installed</div>
                                )}
                                {connectingWalletId === connector.id && (
                                    <div className="text-xs text-indigo-600">Connecting...</div>
                                )}
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
      )}
    </div>
  );
}

