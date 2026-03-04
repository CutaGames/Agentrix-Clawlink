'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ShieldCheck,
  Sparkles,
  CreditCard,
  TimerReset,
  X as XIcon,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { AgentrixLogo } from '../common/AgentrixLogo';
import { TransakWidget } from './TransakWidget';
import { paymentApi, PaymentInfo } from '@/lib/api/payment.api';
import { FiatPaymentSteps, FiatPaymentStep } from './FiatPaymentSteps';

interface OrderSummary {
  id: string;
  amount: number;
  currency: string;
  description: string;
  merchantId: string;
  metadata?: Record<string, any>;
}

interface ProviderQuoteOption {
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
}

interface TransakWhiteLabelModalProps {
  open: boolean;
  order: OrderSummary;
  cryptoAmount?: number; // USDC 金额（法币转换后的值）
  providerOption?: ProviderQuoteOption | null;
  providerOptions?: ProviderQuoteOption[];
  userProfile?: any;
  initialStage?: 'selection' | 'widget';
  onClose: () => void;
  onSuccess?: (result: PaymentInfo) => void;
  onError?: (message: string) => void;
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

export function TransakWhiteLabelModal({
  open,
  order,
  cryptoAmount: propCryptoAmount,
  providerOption,
  providerOptions,
  userProfile,
  initialStage = 'selection',
  onClose,
  onSuccess,
  onError,
}: TransakWhiteLabelModalProps) {
  const [stage, setStage] = useState<'selection' | 'widget'>(initialStage);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  // 默认使用 BSC Testnet 的 Commission 合约地址
  const DEFAULT_COMMISSION_ADDRESS = process.env.NEXT_PUBLIC_COMMISSION_CONTRACT_ADDRESS || '0x4d10DA389E0ADe7E7a7E3232531048aEaCa4021C';
  const [commissionContractAddress, setCommissionContractAddress] = useState<string | undefined>(
    providerOption?.commissionContractAddress || DEFAULT_COMMISSION_ADDRESS,
  );
  const defaultOption = providerOption || providerOptions?.[0] || null;
  const [activeOption, setActiveOption] = useState<ProviderQuoteOption | null>(defaultOption);
  
  // 支付流程步骤状态
  const [paymentStep, setPaymentStep] = useState<FiatPaymentStep>('price');
  
  // 根据 stage 自动更新步骤
  // Transak 流程：选择支付 → 邮箱验证 → 身份认证(KYC) → 支付 → 完成
  useEffect(() => {
    if (stage === 'selection') {
      setPaymentStep('price');
    } else if (stage === 'widget') {
      // 进入 widget 阶段，Transak 首先显示邮箱验证
      // 即使用户之前验证过，Transak 也会显示验证界面
      setPaymentStep('email');
    }
  }, [stage]);

  const kycCompleted = userProfile?.kycLevel && userProfile.kycLevel !== 'none' && userProfile.kycLevel !== 'NONE';

  const selectionList = useMemo(() => {
    if (providerOptions && providerOptions.length > 0) {
      return providerOptions;
    }
    return providerOption ? [providerOption] : [];
  }, [providerOption, providerOptions]);

  useEffect(() => {
    setActiveOption(providerOption || providerOptions?.[0] || null);
  }, [providerOption, providerOptions]);

  // Update stage when initialStage prop changes
  useEffect(() => {
    setStage(initialStage);
  }, [initialStage]);

  useEffect(() => {
    if (!open) {
      setStage('selection');
      setErrorMessage(null);
      setIsRecording(false);
    }
  }, [open]);

  // 在 Modal 打开时就获取合约地址，不等到 widget 阶段
  useEffect(() => {
    if (open && !commissionContractAddress) {
      paymentApi
        .getContractAddress()
        .then((contractInfo) => {
          if (contractInfo.commissionContractAddress) {
            console.log('✅ 获取到 Commission 合约地址:', contractInfo.commissionContractAddress);
            setCommissionContractAddress(contractInfo.commissionContractAddress);
          }
        })
        .catch((error) => {
          console.warn('获取合约地址失败:', error);
        });
    }
  }, [open, commissionContractAddress]);

  const needsGlobalKYC = !userProfile || !userProfile.kycLevel || userProfile.kycLevel === 'none' || userProfile.kycLevel === 'NONE';
  const selectedFiatCurrency = activeOption?.currency || order.currency;
  const lockedAmount = activeOption?.price ?? order.amount;
  const providerFeeValue = Math.max(
    activeOption?.providerFee ??
      (activeOption?.fee ?? 0) - (activeOption?.agentrixFee ?? 0),
    0,
  );
  const agentrixFeeValue = Math.max(activeOption?.agentrixFee ?? 0, 0);

  const highlights = [
    {
      icon: <ShieldCheck size={18} className="text-emerald-600" />,
      label: needsGlobalKYC ? '合规校验' : 'KYC 已完成',
      description: needsGlobalKYC ? '自动唤醒 Transak KYC 流程' : '已验证，可直接支付',
    },
    {
      icon: <Sparkles size={18} className="text-indigo-500" />,
      label: '白标体验',
      description: '全程保持 Agentrix 品牌界面',
    },
    {
      icon: <CreditCard size={18} className="text-sky-500" />,
      label: '多通道',
      description: '支持 Google / Apple / VISA / 本地通道',
    },
    {
      icon: <TimerReset size={18} className="text-amber-500" />,
      label: '到账时效',
      description: activeOption?.estimatedTime || '约 2-5 分钟',
    },
  ];

  if (!open) {
    return null;
  }

  const breakdown = [
    { label: '商品金额', value: formatFiatAmount(order.amount, order.currency) },
    {
      label: '通道手续费',
      value: formatFiatAmount(providerFeeValue, selectedFiatCurrency),
    },
    {
      label: 'Agentrix 0.1% 平台费',
      value: formatFiatAmount(agentrixFeeValue, selectedFiatCurrency),
    },
  ];

  const activeDirectPayment = Boolean(!needsGlobalKYC && !activeOption?.requiresKYC);

  const handleStartPayment = (option: ProviderQuoteOption) => {
    if (option.available === false) {
      return;
    }
    setActiveOption(option);
    setStage('widget');
    // 进入 widget 阶段，Transak 首先要求邮箱验证
    setPaymentStep('email');
    setErrorMessage(null);
  };
  
  // Transak Widget 事件回调 - 根据 Transak 真实流程更新步骤状态
  // Transak 流程：Widget打开 → 邮箱验证 → 确认订单 → KYC(如需) → 支付
  const handleTransakEvent = (eventType: string, data?: any) => {
    console.log('📨 Transak event:', eventType, data);
    switch (eventType) {
      case 'TRANSAK_WIDGET_INITIALISED':
      case 'TRANSAK_WIDGET_OPEN':
        // Widget 初始化或打开，用户看到邮箱输入界面
        console.log('🔧 Transak Widget 已就绪');
        setPaymentStep('email');
        break;
        
      case 'TRANSAK_ORDER_CREATED':
        // 订单创建成功，说明邮箱已验证完成
        // 如果用户已经完成过 KYC，Transak 可能会直接跳到支付
        // 否则需要先进行 KYC
        console.log('📝 Transak 订单已创建');
        if (kycCompleted || !activeOption?.requiresKYC) {
          // 已完成 KYC 或不需要 KYC，直接进入支付阶段
          setPaymentStep('payment');
        } else {
          // 需要 KYC
          setPaymentStep('kyc');
        }
        break;

      case 'TRANSAK_KYC_INIT':
      case 'KYC_INIT':
        console.log('🆔 Transak KYC 流程开始');
        setPaymentStep('kyc');
        break;

      case 'TRANSAK_KYC_VERIFIED':
      case 'KYC_VERIFIED':
        console.log('✅ Transak KYC 已验证');
        setPaymentStep('payment');
        break;
        
      case 'TRANSAK_ORDER_PROCESSING':
        // 订单处理中，说明用户已经提交了支付（如输入了卡号并点击支付）
        console.log('⏳ Transak 订单处理中，进入支付确认阶段');
        setPaymentStep('payment');
        break;
        
      case 'TRANSAK_ORDER_SUCCESSFUL':
        // 支付成功
        console.log('✅ Transak 支付成功');
        setPaymentStep('complete');
        break;
        
      case 'TRANSAK_ORDER_FAILED':
        // 支付失败
        console.log('❌ Transak 支付失败');
        break;
        
      // Transak 特有的事件
      case 'TRANSAK_KYC_INIT':
      case 'KYC_INIT':
        // KYC 开始
        console.log('🔐 Transak KYC 开始');
        setPaymentStep('kyc');
        break;
        
      case 'TRANSAK_KYC_VERIFIED':
      case 'KYC_VERIFIED':
        // KYC 验证通过，进入支付阶段
        console.log('✅ Transak KYC 验证通过，进入支付阶段');
        setPaymentStep('payment');
        break;
    }
  };

  const handleTransakSuccess = async (transakData: any) => {
    try {
      setPaymentStep('complete');
      setIsRecording(true);
      const result = await paymentApi.process({
        amount: order.amount,
        currency: order.currency,
        paymentMethod: 'transak',
        merchantId: order.merchantId,
        description: order.description,
        metadata: {
          provider: 'transak',
          transakOrderId: transakData?.orderId,
          transactionHash: transakData?.transactionHash,
          quote: activeOption,
          widgetPayload: transakData,
        },
      });
      setIsRecording(false);
      setErrorMessage(null);
      if (onSuccess) {
        onSuccess(result);
      }
      onClose();
    } catch (error: any) {
      console.error('记录 Transak 支付失败:', error);
      const message = error?.response?.data?.message || error.message || '支付成功，但记录失败，请稍后查看订单状态';
      setErrorMessage(message);
      setIsRecording(false);
      if (onError) {
        onError(message);
      }
    }
  };

  const handleWidgetError = (error: any) => {
    if (error?.fallbackToRedirect) {
      return;
    }
    const message = error?.message || '支付未完成，请重试';
    setErrorMessage(message);
    if (onError) {
      onError(message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-2 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl my-2 sm:my-4 max-h-[98vh] flex flex-col">
        {/* Header - 只显示 Logo、步骤指示器和关闭按钮 */}
        <div className="flex items-center justify-between border-b border-slate-100 px-4 sm:px-6 py-2 sm:py-3 shrink-0">
          <AgentrixLogo size="sm" showText />
          
          {/* 支付流程步骤指示器 */}
          <div className="flex-1 flex justify-center">
            <FiatPaymentSteps 
              currentStep={paymentStep} 
              kycCompleted={kycCompleted}
            />
          </div>
          
          <button
            type="button"
            onClick={() => {
              setStage('selection');
              setPaymentStep('price');
              setErrorMessage(null);
              onClose();
            }}
            className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            aria-label="关闭"
          >
            <XIcon size={20} />
          </button>
        </div>

        {/* 根据 stage 显示不同内容 */}
        {stage === 'selection' ? (
          /* 选择支付渠道阶段 */
          <div className="p-6">
            {/* 支付摘要 */}
            <div className="mb-6 rounded-2xl border border-slate-100 bg-slate-50/70 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">支付金额</div>
                  <div className="mt-1 text-2xl font-bold text-slate-900">
                    {formatFiatAmount(order.amount, order.currency)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500">预计到账</div>
                  <div className="text-sm font-semibold text-slate-700">{activeOption?.estimatedTime || '约 2-5 分钟'}</div>
                </div>
              </div>
              <p className="mt-2 text-sm text-slate-500">{order.description}</p>
            </div>

            {/* 支付渠道选择 */}
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 mb-3">选择支付方式</div>
            <div className="grid gap-3 sm:grid-cols-2">
              {selectionList.length > 0 ? (
                selectionList.map((option) => {
                  const disabled = option.available === false;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => handleStartPayment(option)}
                      className={`rounded-2xl border p-4 text-left transition ${
                        disabled 
                          ? 'opacity-60 cursor-not-allowed border-slate-200' 
                          : 'border-slate-200 hover:border-indigo-300 hover:shadow-md cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                          {option.name}
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            option.requiresKYC ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {option.requiresKYC ? 'KYC' : '免KYC'}
                          </span>
                        </div>
                        <div className="text-base font-bold text-slate-900">
                          {formatFiatAmount(option.price, option.currency)}
                        </div>
                      </div>
                      <div className="mt-2 text-[11px] text-slate-500">
                        {option.provider?.toUpperCase?.() || 'Transak'} • {option.estimatedTime || '2-5分钟'}
                      </div>
                      {option.minAmount && disabled && (
                        <div className="text-[11px] text-red-500 mt-1">
                          最低 {formatFiatAmount(option.minAmount, option.currency)}
                        </div>
                      )}
                    </button>
                  );
                })
              ) : (
                <div className="col-span-2 rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500 text-center">
                  正在获取支付渠道报价...
                </div>
              )}
            </div>

            {/* 亮点说明 */}
            <div className="mt-6 grid gap-2 sm:grid-cols-4">
              {highlights.map((item) => (
                <div key={item.label} className="flex items-center gap-2 rounded-xl bg-slate-50 p-2 text-[11px] text-slate-600">
                  {item.icon}
                  <span className="font-medium">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* 支付进行中阶段 - 只显示 Transak Widget */
          <div className="p-3 sm:p-4 flex-1 overflow-y-auto">
            {/* 简化的支付信息 */}
            <div className="mb-3 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
              <div className="flex items-center gap-2">
                <div className="text-xs sm:text-sm text-slate-500">支付金额</div>
                <div className="text-base sm:text-lg font-bold text-slate-900">
                  {formatFiatAmount(lockedAmount, selectedFiatCurrency)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setStage('selection');
                  setPaymentStep('price');
                }}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              >
                ← 更换
              </button>
            </div>

            {/* Transak Widget - 增加高度以确保所有内容可见 */}
            <div className="relative rounded-xl border border-slate-100 bg-white overflow-hidden" style={{ height: '700px' }}>
              {/* 确保 walletAddress 有值才渲染 Widget，钱打到我们的合约地址 */}
              {commissionContractAddress ? (
                <TransakWidget
                  apiKey={process.env.NEXT_PUBLIC_TRANSAK_API_KEY || ''}
                  environment={(process.env.NEXT_PUBLIC_TRANSAK_ENVIRONMENT as 'STAGING' | 'PRODUCTION') || 'STAGING'}
                  // V3.1: 使用 cryptoAmount (USDC 金额)，不是法币金额
                  // 如果没有传入 cryptoAmount，对 USDC/USDT 订单使用原始金额，否则报错
                  amount={propCryptoAmount ?? (order.currency === 'USDC' || order.currency === 'USDT' ? order.amount : undefined)}
                  fiatCurrency={activeOption?.currency || order.currency || 'USD'}
                  cryptoCurrency="USDC"
                  network="bsc"
                  walletAddress={commissionContractAddress}
                  orderId={order.id}
                  userId={userProfile?.id}
                  email={userProfile?.email}
                  directPayment={activeDirectPayment}
                  onSuccess={handleTransakSuccess}
                  onError={handleWidgetError}
                  onEvent={handleTransakEvent}
                  onClose={() => {
                    setStage('selection');
                    setPaymentStep('price');
                    setErrorMessage(null);
                    onClose();
                  }}
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <div className="text-center text-slate-500">
                    <div className="animate-spin h-8 w-8 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto mb-2" />
                    <p className="text-sm">正在加载支付配置...</p>
                  </div>
                </div>
              )}
            </div>

            {/* 状态提示 */}
            {isRecording && (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
                <CheckCircle2 size={16} />
                <span>支付成功，正在同步订单状态…</span>
              </div>
            )}

            {errorMessage && (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                <AlertCircle size={16} />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
