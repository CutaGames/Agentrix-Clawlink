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
import { payIntentApi } from '@/lib/api/pay-intent.api';
import { sessionApi } from '@/lib/api/session.api';
import { userApi } from '@/lib/api/user.api';
import { useSessionManager } from '@/hooks/useSessionManager';
import { useWeb3 } from '@/contexts/Web3Context';
import { SessionManager } from './SessionManager';
import { AgentrixLogo } from '../common/AgentrixLogo';
import { TransakWhiteLabelModal } from './TransakWhiteLabelModal';
import { ethers } from 'ethers';
import QRCode from 'qrcode.react';

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

type RouteType = 'quickpay' | 'provider' | 'wallet' | 'local-rail' | 'crypto-rail' | 'qrcode';
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
      '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd', // BSC Testnet USDC often uses same address or similar
    fallbackDecimals: 18,
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
    case 'INR':
      return '₹'; // 印度卢比符号
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
  const [paymentResult, setPaymentResult] = useState<any>(null);
  const [payIntent, setPayIntent] = useState<any>(null);
  const [routeType, setRouteType] = useState<RouteType>('quickpay');
  const [preflightResult, setPreflightResult] = useState<PreflightResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [connectingWalletId, setConnectingWalletId] = useState<string | null>(null);
  const [showKYCGuide, setShowKYCGuide] = useState(false);
  const [showQuickPayGuide, setShowQuickPayGuide] = useState(false);
  const [showSessionManager, setShowSessionManager] = useState(false);
  const [sessionKeyMissing, setSessionKeyMissing] = useState(false);
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [showWalletSelector, setShowWalletSelector] = useState(false);
  const [selectedProviderOption, setSelectedProviderOption] = useState<ProviderOption | null>(null);
  const { activeSession, loadActiveSession, createSession, loading: sessionLoading } = useSessionManager();
  const { isConnected, defaultWallet, connect, connectors } = useWeb3();
  const tokenMetadataCache = useRef<Record<string, { address: string; decimals: number }>>({});
  const providerModalAutoOpened = useRef(false);

  const normalizedCurrency = (order.currency || 'USDC').toUpperCase();
  // 支持的法币列表（包括 INR 印度卢比）
  const isFiatOrderCurrency = ['CNY', 'USD', 'EUR', 'GBP', 'JPY', 'INR'].includes(normalizedCurrency);
  const merchantConfig = order.metadata?.merchantPaymentConfig || 'both';
  const merchantAllowsCrypto = merchantConfig === 'both' || merchantConfig === 'crypto_only';
  const providerOptions = preflightResult?.providerOptions || [];
  const topFiatOptions = providerOptions.slice(0, 4);
  const hasFiatOptions = topFiatOptions.length > 0;
  
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
    // V3.0: 只要是法币订单，就获取汇率用于显示（即使商家只收法币）
    const needsExchangeRate = isFiatOrderCurrency;

    let isMounted = true;

    if (!needsExchangeRate) {
      setExchangeRate(null);
      // If it's not fiat, we can directly use the order amount as crypto amount (assuming 1:1 for stablecoins)
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
  // ⚠️ QuickPay 使用 Session 的链上授权，不需要检查 ERC20 allowance
  // 只有 Wallet Pay 模式需要检查
  useEffect(() => {
    const session = currentSession || activeSession;
    // 如果有活跃 Session，QuickPay 不需要检查 allowance
    if (session) {
        console.log('✅ 有活跃 Session，跳过 allowance 检查');
        setNeedsApproval(false);
        return;
    }
    // 如果 Session 还在加载中，等待加载完成
    if (sessionLoading) {
        console.log('⏳ Session 加载中（sessionLoading=true），暂不检查 allowance');
        return;
    }
    // 如果整体状态还是 loading，说明初始化未完成，等待
    if (status === 'loading') {
        console.log('⏳ 页面初始化中（status=loading），暂不检查 allowance');
        return;
    }
    // 如果 preflightResult 显示 quickPayAvailable，说明后端认为有可用 Session，等待 Session 数据
    if (preflightResult?.quickPayAvailable && !session) {
        console.log('⏳ Preflight 显示 QuickPay 可用，等待 Session 数据...');
        return;
    }
    // 没有 Session，Wallet Pay 模式需要检查 allowance
    if (isConnected && (cryptoAmount || order.amount)) {
        console.log('🔍 没有活跃 Session，检查 Wallet Pay allowance');
        checkAllowance();
    }
  }, [isConnected, cryptoAmount, order.amount, order.currency, currentSession, activeSession, sessionLoading, status, preflightResult?.quickPayAvailable]);

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
        // ⚠️ 后端 Session API 返回的 dailyLimit 已经是人类可读格式（例如 100 表示 100 USDT）
        // 不需要再除以 1e6，直接使用
        const dailyLimitHuman = parseFloat(String(session.dailyLimit)) || 100;
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
    
    // 检查本地是否有 Session Key（私钥）
    // Session 数据存储在后端，但私钥存储在浏览器本地
    // 如果用户清除了浏览器数据或换了浏览器，私钥会丢失
    const sessionKeys = await SessionKeyManager.listSessionKeys();
    const hasLocalSessionKey = sessionKeys.includes(session.signer);
    
    if (!hasLocalSessionKey) {
      console.warn('⚠️ Session Key 私钥在本地不存在，可能是浏览器数据被清除或换了浏览器');
      console.warn('Session signer:', session.signer);
      console.warn('本地存储的 Session Keys:', sessionKeys);
      setSessionKeyMissing(true);
      throw new Error('Session 密钥已丢失（浏览器数据被清除或换了浏览器），请重新创建 QuickPay Session 或使用钱包支付');
    }
    
    let paymentAmount = order.amount;
    let paymentCurrency = order.currency || 'USDC';
    let lockId = exchangeRateLockId;
    
    const currency = order.currency || 'USDC';
    const isFiatCurrency = ['CNY', 'USD', 'EUR', 'GBP', 'JPY', 'INR'].includes(currency.toUpperCase());
    
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

    const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 97); 
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
        recipientAddress = process.env.NEXT_PUBLIC_COMMISSION_CONTRACT_ADDRESS || order.to;
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

    // Check if X402 V2 params are provided
    const isX402V2 = order.x402Params?.scheme === 'exact' || order.x402Params?.network;

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
          isX402: true, // Flag for X402 payment - channel fee deducted from platform fee
          x402Version: isX402V2 ? 'v2' : 'v1',
          x402Params: order.x402Params, // Pass X402 V2 params if provided
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
    setPaymentResult(result);
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
        const isFiatCurrency = ['CNY', 'USD', 'EUR', 'GBP', 'JPY', 'INR'].includes(paymentCurrency.toUpperCase());

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
        const result = await paymentApi.process({
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

        setPaymentResult(result);
        setStatus('success');
        if (onSuccess) onSuccess(result);
    } catch (error: any) {
        console.error('Wallet payment failed:', error);
        setError(error.message || 'Payment failed');
        setStatus('error');
    }
  };

  const handleQRCodePay = async () => {
    setStatus('processing');
    setError(null);
    try {
      // 如果是法币，尝试使用转换后的加密货币金额
      const isFiat = ['CNY', 'USD', 'EUR', 'GBP', 'JPY', 'INR'].includes((order.currency || 'USDC').toUpperCase());
      // V3.0: 统一使用 USD 作为显示货币，避免后端验证 USDT 失败
      const finalAmount = isFiat 
        ? (cryptoAmount || (order.amount * (normalizedCurrency === 'CNY' ? 0.14 : 1.0))) 
        : order.amount;
      const finalCurrency = isFiat ? 'USD' : (order.currency || 'USDC');

      // 获取收款地址
      let toAddress = order.to;
      if (!toAddress) {
        try {
          const contractAddresses = await paymentApi.getContractAddress();
          toAddress = contractAddresses.commissionContractAddress;
        } catch (e) {
          toAddress = process.env.NEXT_PUBLIC_COMMISSION_CONTRACT_ADDRESS;
        }
      }

      const intent = await payIntentApi.create({
        type: 'order_payment',
        amount: finalAmount,
        currency: finalCurrency,
        description: order.description,
        orderId: order.id,
        merchantId: order.merchantId,
        paymentMethod: {
          type: 'qrcode'
        },
        metadata: {
          to: toAddress,
          originalAmount: order.amount,
          originalCurrency: order.currency,
          isFiat: isFiat
        }
      });
      setPayIntent(intent);
      setRouteType('qrcode');
      setStatus('ready');
    } catch (err: any) {
      console.error('Failed to create QR code pay intent:', err);
      setError(err.message || 'Failed to generate QR code');
      setStatus('ready');
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

            {/* QR Code Pay Card */}
            <div 
                onClick={() => {
                    handleQRCodePay();
                }}
                className={`relative group cursor-pointer rounded-xl border p-4 transition-all ${
                    routeType === 'qrcode'
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-200' 
                    : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-md'
                }`}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                            routeType === 'qrcode' ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-600'
                        }`}>
                            <Smartphone size={20} />
                        </div>
                        <div>
                            <div className={`font-bold ${routeType === 'qrcode' ? 'text-white' : 'text-slate-900'}`}>
                                Scan to Pay
                            </div>
                            <div className={`text-xs ${routeType === 'qrcode' ? 'text-emerald-100' : 'text-slate-500'}`}>
                                Pay with any mobile wallet
                            </div>
                        </div>
                    </div>
                    <div className={`text-sm font-bold ${routeType === 'qrcode' ? 'text-white' : 'text-slate-900'}`}>
                        {cryptoAmount ? `≈ ${cryptoAmount.toFixed(2)} USDT` : ''}
                    </div>
                </div>
            </div>
        </div>
      </div>
    );
  };

  const FiatSection = () => {
    // 默认支付通道配置
    const defaultChannels: Array<{
      id: string;
      name: string;
      icon: string;
    }> = [
        { id: 'google_pay', name: 'Google Pay', icon: 'https://assets.transak.com/images/payment-methods/google_pay.svg' },
        { id: 'apple_pay', name: 'Apple Pay', icon: 'https://assets.transak.com/images/payment-methods/apple_pay.svg' },
        { id: 'credit_debit_card', name: 'Credit/Debit Card', icon: 'https://assets.transak.com/images/payment-methods/credit_debit_card.svg' },
    ];

    // 根据货币动态添加本地支付方式
    const currency = order.currency?.toUpperCase();
    if (currency === 'EUR') {
        defaultChannels.push({ id: 'sepa_bank_transfer', name: 'SEPA Bank Transfer', icon: 'https://assets.transak.com/images/payment-methods/sepa_bank_transfer.svg' });
    } else if (currency === 'GBP') {
        defaultChannels.push({ id: 'gbp_bank_transfer', name: 'Faster Payments', icon: 'https://assets.transak.com/images/payment-methods/gbp_bank_transfer.svg' });
    } else if (currency === 'USD') {
        defaultChannels.push({ id: 'usa_bank_transfer', name: 'Fedwire / ACH', icon: 'https://assets.transak.com/images/payment-methods/usa_bank_transfer.svg' });
    } else if (currency === 'CNY') {
        defaultChannels.push({
            id: 'cny_bank_transfer',
            name: '本地银行卡',
            icon: 'https://assets.transak.com/images/payment-methods/cny_bank_transfer.svg'
        });
        defaultChannels.push({
            id: 'alipay',
            name: '支付宝',
            icon: 'https://assets.transak.com/images/payment-methods/alipay.svg'
        });
    } else {
        // 其他货币默认添加本地银行转账
        defaultChannels.push({ id: 'local_bank_transfer', name: 'Local Bank Transfer', icon: 'https://assets.transak.com/images/payment-methods/local_bank_transfer.svg' });
    }

    // ID 映射：前端 channel ID -> 后端 providerOption ID
    const channelIdMapping: Record<string, string[]> = {
        'google_pay': ['google', 'google_pay'],
        'apple_pay': ['apple', 'apple_pay'],
        'credit_debit_card': ['card', 'credit_debit_card', 'debit_card', 'credit_card'],
        'sepa_bank_transfer': ['sepa', 'sepa_bank_transfer'],
        'gbp_bank_transfer': ['gbp', 'gbp_bank_transfer', 'faster_payments'],
        'usa_bank_transfer': ['usa', 'usa_bank_transfer', 'ach', 'fedwire'],
        'cny_bank_transfer': ['cny', 'cny_bank_transfer', 'local'],
        'alipay': ['alipay'],
        'local_bank_transfer': ['local', 'local_bank_transfer'],
    };

    // 合并 API 数据获取费用和限额
    const channelsWithData = defaultChannels.map(channel => {
        // 查找匹配的 API 选项（使用 ID 映射）
        const possibleIds = channelIdMapping[channel.id] || [channel.id];
        const apiOption = preflightResult?.providerOptions?.find(opt =>
            possibleIds.includes(opt.id) || possibleIds.includes(opt.paymentMethod || '')
        ) || preflightResult?.providerOptions?.[0]; // 回退到通用选项

        // 使用 API 返回的价格和货币（如果有），否则使用订单原始值
        const displayAmount = apiOption?.price ?? order.amount;
        const displayCurrency = apiOption?.currency || order.currency || 'USD';

        // 使用 API 返回的费用（如果有），否则估算
        let estimatedFee = apiOption?.fee;
        if (estimatedFee === undefined || estimatedFee === 0) {
            const isCard = channel.id.includes('card') || channel.id.includes('pay');
            const rate = isCard ? 0.035 : 0.01;
            estimatedFee = order.amount * rate;
        }

        // 使用 API 返回的最低金额（如果有），否则使用默认值
        const minAmount = apiOption?.minAmount || (channel.id.includes('transfer') ? 20 : 10);

        return {
            ...channel,
            fee: estimatedFee,
            providerFee: apiOption?.providerFee,
            agentrixFee: apiOption?.agentrixFee,
            minAmount: minAmount,
            estimatedTime: apiOption?.estimatedTime || (channel.id.includes('transfer') ? '1-3 Days' : 'Instant'),
            currency: displayCurrency,
            totalPrice: displayAmount,
            available: order.amount >= minAmount,
        };
    });
    
    const [iconErrors, setIconErrors] = React.useState<Set<string>>(new Set());
    
    const handleIconError = (channelId: string) => {
      setIconErrors(prev => new Set(prev).add(channelId));
    };

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
                    disabled={!channel.available}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all group ${
                        channel.available
                            ? 'border-slate-100 bg-white hover:border-emerald-200 hover:bg-emerald-50/30'
                            : 'border-slate-100 bg-slate-50/50 opacity-60 cursor-not-allowed'
                    }`}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center p-2 border border-slate-100">
                            {!iconErrors.has(channel.id) ? (
                                <img 
                                    src={channel.icon} 
                                    alt={channel.name} 
                                    className="w-full h-full object-contain" 
                                    onError={() => handleIconError(channel.id)}
                                />
                            ) : (
                                <CreditCard size={20} className="text-slate-400" />
                            )}
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
                                    Total: {formatFiatSymbol(channel.currency)}{channel.totalPrice.toFixed(2)} • {channel.estimatedTime}
                                </div>
                            </div>
                        </div>
                    </div>
                    <ChevronRight size={16} className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
                </button>
            ))}
        </div>
      </div>
    );
  };

  // QuickPay View
  const QuickPayView = () => {
    const session = currentSession || activeSession;

    if (!session) {
      return (
        <div className="animate-fade-in">
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <Zap className="text-yellow-600" size={20} />
              <div>
                <div className="text-sm font-medium text-yellow-900">未创建 QuickPay Session</div>
                <div className="text-xs text-yellow-700">请先创建 QuickPay Session 以使用免密支付</div>
              </div>
            </div>
            <button
              onClick={() => setShowSessionManager(true)}
              className="w-full bg-yellow-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-yellow-700 transition-colors"
            >
              创建 Session
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="p-6 bg-white flex-1">
        <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 bg-indigo-100 rounded-lg text-indigo-600">
                <Zap size={16} />
            </div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">QuickPay</h3>
        </div>

        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-indigo-900">Session 状态</div>
            <div className="text-xs text-indigo-600 bg-indigo-100 px-2 py-1 rounded">
              ✓ 已激活
            </div>
          </div>
          <div className="text-xs text-indigo-700 space-y-1">
            <div>额度: ¥{preflightResult?.sessionLimit?.singleLimit || '10'}</div>
            <div>有效期: {session.expiry ? new Date(session.expiry).toLocaleDateString() : '永久'}</div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600">
                  <Zap size={20} />
                </div>
                <div>
                  <div className="font-bold text-slate-900">QuickPay 免密支付</div>
                  <div className="text-xs text-slate-500">无需钱包确认，快速完成支付</div>
                </div>
              </div>
              <div className="text-sm font-bold text-slate-900">
                {cryptoAmount ? `≈ ${cryptoAmount.toFixed(2)} USDT` : ''}
              </div>
            </div>

            <button
              onClick={() => handlePay('quickpay')}
              disabled={status === 'processing'}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === 'processing' ? '处理中...' : '确认支付'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // 场景3: Wallet Pay
  const WalletView = () => {
    if (!isConnected) {
      return (
        <div className="animate-fade-in">
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <Wallet className="text-yellow-600" size={20} />
              <div>
                <div className="text-sm font-medium text-yellow-900">未连接钱包</div>
                <div className="text-xs text-yellow-700">请先连接钱包以使用钱包支付</div>
              </div>
            </div>
            <button
              onClick={async () => {
                try {
                  setStatus('loading');
                  setError(null);
                  // 尝试连接MetaMask（最常见的钱包）
                  // 检查 window.ethereum 是否存在（MetaMask 或其他注入式钱包）
                  if (window.ethereum) {
                    // 如果 window.ethereum 存在，尝试连接
                    // 使用类型断言，因为 connect 函数可能接受更多类型
                    try {
                      await connect('metamask' as any);
                      setStatus('ready');
                    } catch (connectError) {
                      // 如果 metamask 连接失败，尝试查找其他可用的连接器
                      const availableConnector = connectors.find(c => c.isInstalled);
                      if (availableConnector) {
                        await connect(availableConnector.id as any);
                        setStatus('ready');
                      } else {
                        setError('请先安装MetaMask钱包，或点击右上角用户菜单中的"连接钱包"选项。');
                        setStatus('ready');
                      }
                    }
                  } else {
                    // 如果没有 window.ethereum，尝试使用可用的连接器
                    const availableConnector = connectors.find(c => c.isInstalled);
                    if (availableConnector) {
                      await connect(availableConnector.id as any);
                      setStatus('ready');
                    } else {
                      setError('请先安装MetaMask钱包，或点击右上角用户菜单中的"连接钱包"选项。');
                      setStatus('ready');
                    }
                  }
                } catch (error: any) {
                  console.error('钱包连接失败:', error);
                  setError(error.message || '钱包连接失败，请重试或点击右上角用户菜单中的"连接钱包"选项。');
                  setStatus('ready');
                }
              }}
              className="w-full bg-yellow-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-yellow-700 transition-colors"
            >
              连接钱包
            </button>
          </div>
          <div className="text-center text-xs text-slate-500 mb-4">
            或使用其他支付方式
          </div>
        </div>
      );
    }

    // 钱包已连接，显示钱包支付详情
    return (
      <div className="p-6 bg-white flex-1">
        <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 bg-slate-100 rounded-lg text-slate-600">
                <Wallet size={16} />
            </div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">钱包支付</h3>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-slate-900">已连接钱包</div>
            <div className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
              ✓ 已连接
            </div>
          </div>
          <div className="text-xs text-slate-600 space-y-1">
            <div>地址: {defaultWallet?.address ? `${defaultWallet.address.slice(0, 8)}...${defaultWallet.address.slice(-6)}` : 'N/A'}</div>
            <div>网络: BSC Testnet</div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slate-100 text-slate-600">
                  <Wallet size={20} />
                </div>
                <div>
                  <div className="font-bold text-slate-900">直接钱包支付</div>
                  <div className="text-xs text-slate-500">需要钱包确认，自付Gas费</div>
                </div>
              </div>
              <div className="text-sm font-bold text-slate-900">
                {cryptoAmount ? `≈ ${cryptoAmount.toFixed(2)} USDT` : ''}
              </div>
            </div>

            <button
              onClick={() => handleWalletPay()}
              disabled={status === 'processing'}
              className="w-full bg-slate-800 text-white py-3 rounded-lg font-medium hover:bg-slate-900 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {status === 'processing' && routeType === 'wallet' ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  请在钱包中确认...
                </>
              ) : (
                <>
                  <Wallet size={16} />
                  使用钱包支付
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // QR Code View
  const QRCodeView = () => {
    if (!payIntent || !payIntent.metadata?.qrCode) {
      return (
        <div className="p-12 flex flex-col items-center justify-center text-center">
          <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
          <p className="text-slate-500">Generating QR Code...</p>
        </div>
      );
    }

    return (
      <div className="p-6 bg-white flex-1 flex flex-col items-center">
        <div className="w-full flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-100 rounded-lg text-emerald-600">
                    <Smartphone size={16} />
                </div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Scan to Pay</h3>
            </div>
            <div className="px-2 py-1 bg-amber-100 text-amber-700 text-[10px] font-bold rounded uppercase tracking-wider">
                BSC Testnet
            </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border-2 border-slate-100 shadow-sm mb-6">
          <img 
            src={payIntent.metadata.qrCode} 
            alt="Payment QR Code" 
            className="w-48 h-48"
          />
        </div>

        <div className="text-center space-y-2 mb-8">
          <div className="text-lg font-bold text-slate-900">
            {cryptoAmount ? `≈ ${cryptoAmount.toFixed(2)} USDT` : `${order.amount} ${order.currency}`}
          </div>
          <p className="text-sm text-slate-500 max-w-[240px]">
            Scan this QR code with your mobile wallet (MetaMask, Trust Wallet, OKX, etc.) to complete the payment.
          </p>
        </div>

        <div className="w-full p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Network</span>
            <span className="font-medium text-slate-900">BSC Testnet</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Status</span>
            <span className="flex items-center gap-1.5 text-amber-600 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              Waiting for payment...
            </span>
          </div>
        </div>
        
        <button 
          onClick={() => setRouteType('quickpay')}
          className="mt-6 text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
        >
          <ChevronRight size={12} className="rotate-180" />
          Back to other methods
        </button>
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
        {routeType === 'qrcode' ? (
          <QRCodeView />
        ) : (
          <>
            <CryptoSection />
            <div className="h-px bg-slate-100 w-full relative">
                <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 text-xs text-slate-400 font-medium">
                    OR
                </div>
            </div>
            <FiatSection />
          </>
        )}
      </div>

      {/* Footer / Status */}
      {status === 'error' && error && (
          <div className="p-4 bg-red-50 text-red-600 text-sm text-center border-t border-red-100">
              <div className="mb-2">{error}</div>
              {sessionKeyMissing && (
                <button 
                  onClick={() => {
                    setSessionKeyMissing(false);
                    setError(null);
                    setStatus('ready');
                    setShowSessionManager(true);
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors"
                >
                  重新创建授权 (Re-authorize)
                </button>
              )}
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

      {/* Success View - Only show when successful */}
      {status === 'success' && (
          <div className="flex flex-col items-center justify-center py-8 px-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="text-green-600" size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-1">Payment Successful</h3>
            <p className="text-sm text-slate-500 mb-8 text-center">Your transaction has been processed and verified by Agentrix Audit Protocol.</p>
            
            <div className="w-full bg-slate-50 rounded-2xl p-5 space-y-4 border border-slate-100">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">AX ID</span>
                <span className="text-sm font-bold text-slate-900">{userProfile?.agentrixId || 'Anonymous'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Amount</span>
                <span className="text-sm font-bold text-slate-900">
                  {paymentResult?.amount || order.amount} {paymentResult?.currency || order.currency}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Status</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-bold text-green-600">Verified</span>
                </div>
              </div>
              <div className="pt-3 border-t border-slate-200">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Audit Proof</span>
                  <span className="text-[10px] font-mono text-slate-400 break-all text-right max-w-[180px]">
                    {paymentResult?.transactionHash || paymentResult?.metadata?.txHash || 'Pending...'}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-indigo-600 font-medium">
                  <ShieldCheck size={10} />
                  <span>Secured by ERC8004 & EAS</span>
                </div>
              </div>
            </div>

            <div className="mt-8 w-full space-y-3">
              <button 
                onClick={() => {
                  const hash = paymentResult?.transactionHash || paymentResult?.metadata?.txHash;
                  if (hash) {
                    window.open(`https://testnet.bscscan.com/tx/${hash}`, '_blank');
                  }
                }}
                className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all"
              >
                <Globe size={16} />
                View on Explorer
              </button>
              <button 
                onClick={() => onSuccess && onSuccess(paymentResult)}
                className="w-full py-3 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all"
              >
                Return to Merchant
              </button>
            </div>
          </div>
        )}

      {/* Modals */}

        {/* KYC 引导弹窗 */}
        {showKYCGuide && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900">需要完成 KYC 认证</h3>
                <button
                  onClick={() => setShowKYCGuide(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <XIcon size={20} />
                </button>
              </div>
              <div className="mb-6">
                <p className="text-sm text-slate-600 mb-4">
                  为了使用银行卡支付，您需要完成身份验证（KYC）。这通常只需要几分钟时间。
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="text-sm font-medium text-blue-900 mb-2">需要准备的材料：</div>
                  <ul className="text-xs text-blue-700 space-y-1">
                    <li>• 身份证或护照照片</li>
                    <li>• 地址证明（如水电费账单）</li>
                    <li>• 自拍照片（用于人脸识别）</li>
                  </ul>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowKYCGuide(false);
                    router.push('/app/merchant/kyc');
                  }}
                  className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                >
                  开始 KYC 认证
                </button>
                <button
                  onClick={() => setShowKYCGuide(false)}
                  className="px-4 py-3 text-slate-600 hover:text-slate-800"
                >
                  稍后
                </button>
              </div>
            </div>
          </div>
        )}

        {/* QuickPay 引导弹窗 */}
        {showQuickPayGuide && (
          <div 
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowQuickPayGuide(false);
              }
            }}
          >
            <div className="bg-white rounded-2xl p-6 max-w-md w-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900">启用 QuickPay</h3>
                <button
                  onClick={() => setShowQuickPayGuide(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <XIcon size={20} />
                </button>
              </div>
              <div className="mb-6">
                <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="text-indigo-600" size={20} />
                    <div className="text-sm font-medium text-indigo-900">QuickPay 的优势</div>
                  </div>
                  <ul className="text-xs text-indigo-700 space-y-1">
                    <li>• 无需钱包确认，一键支付</li>
                    <li>• 零 Gas 费用</li>
                    <li>• 即时到账</li>
                    <li>• 安全可靠，由您的钱包授权</li>
                  </ul>
                </div>
                <p className="text-sm text-slate-600">
                  您符合 QuickPay 使用条件，但还没有创建 Session。创建 Session 后，您就可以享受快速支付体验了。
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowQuickPayGuide(false);
                    setShowSessionManager(true);
                  }}
                  className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                >
                  创建 Session
                </button>
                <button
                  onClick={() => {
                    setShowQuickPayGuide(false);
                    setRouteType('wallet');
                  }}
                  className="px-4 py-3 text-slate-600 hover:text-slate-800"
                >
                  使用钱包支付
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Session Manager 弹窗 */}
        {showSessionManager && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <SessionManager 
                onClose={() => {
                  setShowSessionManager(false);
                  loadActiveSession().then(s => s && setCurrentSession(s));
                }} 
              />
            </div>
          </div>
        )}

        <TransakWhiteLabelModal
          open={showProviderModal}
          order={order}
          cryptoAmount={cryptoAmount ?? undefined}
          providerOption={selectedProviderOption || preflightResult?.providerOptions?.[0] || null}
          providerOptions={providerOptions}
          userProfile={userProfile}
          initialStage={selectedProviderOption?.paymentMethod ? 'widget' : 'selection'}
          onClose={() => {
            setShowProviderModal(false);
          }}
          onSuccess={(result: any) => {
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

