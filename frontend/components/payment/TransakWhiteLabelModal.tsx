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
  providerOption?: ProviderQuoteOption | null;
  providerOptions?: ProviderQuoteOption[];
  userProfile?: any;
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
  providerOption,
  providerOptions,
  userProfile,
  onClose,
  onSuccess,
  onError,
}: TransakWhiteLabelModalProps) {
  const [stage, setStage] = useState<'selection' | 'widget'>('selection');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [commissionContractAddress, setCommissionContractAddress] = useState<string | undefined>(
    providerOption?.commissionContractAddress,
  );
  const defaultOption = providerOption || providerOptions?.[0] || null;
  const [activeOption, setActiveOption] = useState<ProviderQuoteOption | null>(defaultOption);

  const selectionList = useMemo(() => {
    if (providerOptions && providerOptions.length > 0) {
      return providerOptions;
    }
    return providerOption ? [providerOption] : [];
  }, [providerOption, providerOptions]);

  useEffect(() => {
    setActiveOption(providerOption || providerOptions?.[0] || null);
  }, [providerOption, providerOptions]);

  useEffect(() => {
    if (!open) {
      setStage('selection');
      setErrorMessage(null);
      setIsRecording(false);
    }
  }, [open]);

  useEffect(() => {
    if (stage === 'widget' && !commissionContractAddress) {
      paymentApi
        .getContractAddress()
        .then((contractInfo) => {
          if (contractInfo.commissionContractAddress) {
            setCommissionContractAddress(contractInfo.commissionContractAddress);
          }
        })
        .catch((error) => {
          console.warn('获取合约地址失败:', error);
        });
    }
  }, [stage, commissionContractAddress]);

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
    setErrorMessage(null);
  };

  const handleTransakSuccess = async (transakData: any) => {
    try {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-5xl rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-8 py-6">
          <AgentrixLogo size="sm" showText />
          <div className="flex items-center gap-3">
            <div className="text-xs uppercase tracking-[0.3em] text-slate-400">Agentrix Pay</div>
            <button
              type="button"
              onClick={() => {
                setStage('selection');
                setErrorMessage(null);
                onClose();
              }}
              className="rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              aria-label="关闭"
            >
              <XIcon size={18} />
            </button>
          </div>
        </div>

        <div className="grid gap-8 px-8 py-6 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-6">
              <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">支付摘要</div>
              <div className="mt-3 text-3xl font-bold text-slate-900">
                {formatFiatAmount(order.amount, order.currency)}
              </div>
              <p className="mt-2 text-sm text-slate-500">{order.description}</p>

              <div className="mt-6 space-y-3 text-sm">
                <div className="flex items-center justify-between text-slate-600">
                  <span>法币金额（含费用）</span>
                  <span className="font-semibold text-slate-900">{formatFiatAmount(lockedAmount, selectedFiatCurrency)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>预计到账</span>
                  <span className="font-semibold text-slate-900">{activeOption?.estimatedTime || '约 2-5 分钟'}</span>
                </div>
              </div>

              <div className="mt-6 rounded-xl border border-dashed border-slate-200 bg-white/70 p-4">
                {breakdown.map((item) => (
                  <div key={item.label} className="flex items-center justify-between text-xs text-slate-500 py-1">
                    <span>{item.label}</span>
                    <span className="font-semibold text-slate-800">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-3 rounded-2xl border border-slate-100 p-4 shadow-sm sm:grid-cols-2">
              {highlights.map((item) => (
                <div key={item.label} className="flex gap-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                  {item.icon}
                  <div>
                    <div className="font-semibold text-slate-900">{item.label}</div>
                    <div>{item.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.4em] text-slate-400">
              <span>可选支付渠道</span>
              <span>{activeOption?.requiresKYC || needsGlobalKYC ? 'KYC + Pay' : 'Instant Pay'}</span>
            </div>

            <div className="mt-4 space-y-3">
              {selectionList.length > 0 ? (
                selectionList.map((option) => {
                  const disabled = option.available === false;
                  return (
                    <div
                      key={option.id}
                      className={`rounded-2xl border px-4 py-3 transition ${
                        option.id === activeOption?.id
                          ? 'border-slate-900 bg-slate-900/5'
                          : 'border-slate-200 bg-white'
                      } ${disabled ? 'opacity-60' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                            {option.name}
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                              option.requiresKYC ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                            }`}>
                              {option.requiresKYC ? '需 KYC' : '免 KYC'}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-1">
                            Powered by {option.provider?.toUpperCase?.() || 'Transak'}
                            {option.estimatedTime && ` • ${option.estimatedTime}`}
                          </div>
                          {option.minAmount && option.available === false && (
                            <div className="text-[11px] text-red-500 mt-1">
                              最低 {formatFiatAmount(option.minAmount, option.currency)}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-base font-bold text-slate-900">
                            {formatFiatAmount(option.price, option.currency)}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            含费用 {option.fee ? `${formatFiatSymbol(option.currency)}${option.fee.toFixed(2)}` : '获取中'}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-500">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5">
                          Google Pay
                        </span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5">
                          Apple Pay
                        </span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5">
                          VISA/Master
                        </span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5">
                          本地通道
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => handleStartPayment(option)}
                          className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                            disabled
                              ? 'bg-slate-100 text-slate-400'
                              : option.id === activeOption?.id && stage === 'widget'
                              ? 'bg-slate-900 text-white'
                              : 'bg-slate-900/5 text-slate-900 hover:bg-slate-900/10'
                          }`}
                        >
                          {option.id === activeOption?.id && stage === 'widget' ? '正在支付' : '立即支付'}
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                  尚未获取报价，请稍后重试。
                </div>
              )}
            </div>

            {stage === 'widget' && activeOption ? (
              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.4em] text-slate-400">
                  <span>Secure Checkout</span>
                  <button
                    type="button"
                    onClick={() => setStage('selection')}
                    className="text-indigo-600 hover:text-indigo-800"
                  >
                    切换支付方式
                  </button>
                </div>
                <div className="relative min-h-[520px] overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
                  <TransakWidget
                    apiKey={process.env.NEXT_PUBLIC_TRANSAK_API_KEY || ''}
                    environment={(process.env.NEXT_PUBLIC_TRANSAK_ENVIRONMENT as 'STAGING' | 'PRODUCTION') || 'STAGING'}
                    amount={activeOption.price}
                    fiatCurrency={activeOption.currency || order.currency || 'USD'}
                    cryptoCurrency="USDC"
                    network="bsc"
                    walletAddress={commissionContractAddress || activeOption.commissionContractAddress}
                    orderId={order.id}
                    userId={userProfile?.id}
                    email={userProfile?.email}
                    directPayment={activeDirectPayment}
                    onSuccess={handleTransakSuccess}
                    onError={handleWidgetError}
                    onClose={() => {
                      setStage('selection');
                      setErrorMessage(null);
                      onClose();
                    }}
                  />
                </div>
                {isRecording && (
                  <div className="flex items-center gap-2 rounded-xl bg-indigo-50 px-4 py-3 text-xs text-indigo-700">
                    <CheckCircle2 size={14} />
                    <span>支付成功，正在同步订单状态…</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-dashed border-slate-200 p-4 text-xs text-slate-500">
                选择上方通道后即可在此处打开支付窗口。
              </div>
            )}

            {errorMessage && (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-xs text-red-600">
                <AlertCircle size={14} />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
