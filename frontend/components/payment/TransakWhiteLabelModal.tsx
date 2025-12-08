'use client';

import { useMemo, useState, useEffect } from 'react';
import { ShieldCheck, Sparkles, CreditCard, TimerReset, X as XIcon, CheckCircle2, AlertCircle } from 'lucide-react';
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
}

interface TransakWhiteLabelModalProps {
  open: boolean;
  order: OrderSummary;
  providerOption?: ProviderQuoteOption | null;
  userProfile?: any;
  onClose: () => void;
  onSuccess?: (result: PaymentInfo) => void;
  onError?: (message: string) => void;
}

const fiatSymbol = (currency: string) => {
  const code = (currency || 'USD').toUpperCase();
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

export function TransakWhiteLabelModal({
  open,
  order,
  providerOption,
  userProfile,
  onClose,
  onSuccess,
  onError,
}: TransakWhiteLabelModalProps) {
  const [view, setView] = useState<'intro' | 'widget'>('intro');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [commissionContractAddress, setCommissionContractAddress] = useState<string | undefined>(
    providerOption?.commissionContractAddress,
  );

  const needsKYC = !userProfile || !userProfile.kycLevel || userProfile.kycLevel === 'none' || userProfile.kycLevel === 'NONE';
  const amountDisplay = `${fiatSymbol(order.currency)}${order.amount.toFixed(order.currency === 'JPY' ? 0 : 2)} ${order.currency}`;

  // 如果 providerOption 中没有 commissionContractAddress，从后端获取
  useEffect(() => {
    if (!commissionContractAddress && view === 'widget') {
      paymentApi
        .getContractAddress()
        .then((contractInfo) => {
          if (contractInfo.commissionContractAddress) {
            setCommissionContractAddress(contractInfo.commissionContractAddress);
          }
        })
        .catch((error) => {
          console.warn('获取合约地址失败:', error);
          // 不阻止流程，但记录警告
        });
    }
  }, [commissionContractAddress, view]);

  // 当 providerOption 变化时，更新 commissionContractAddress
  useEffect(() => {
    if (providerOption?.commissionContractAddress) {
      setCommissionContractAddress(providerOption.commissionContractAddress);
    }
  }, [providerOption?.commissionContractAddress]);

  const providerDisplay = useMemo(() => {
    if (!providerOption) {
      return {
        label: '银行卡/电子钱包',
        eta: '约 2-5 分钟',
        feeText: '实时计算',
      };
    }

    const feePieces: string[] = [];
    if (providerOption.fee) {
      feePieces.push(`总费 ${providerOption.fee.toFixed(2)} ${providerOption.currency}`);
    }
    if (providerOption.providerFee) {
      feePieces.push(`Provider ${providerOption.providerFee.toFixed(2)}`);
    }
    if (providerOption.agentrixFee) {
      feePieces.push(`Agentrix ${providerOption.agentrixFee.toFixed(2)}`);
    }

    return {
      label: providerOption.name,
      eta: providerOption.estimatedTime || '即时确认',
      feeText: feePieces.join(' / ') || '实时计算',
    };
  }, [providerOption]);

  if (!open) {
    return null;
  }

  const handleStart = () => {
    setErrorMessage(null);
    setView('widget');
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
          quote: providerOption,
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
      // iframe fallback 已经处理，不阻止流程
      return;
    }
    const message = error?.message || '支付未完成，请重试';
    setErrorMessage(message);
    if (onError) {
      onError(message);
    }
  };

  const highlights = [
    {
      icon: <ShieldCheck size={18} className="text-emerald-600" />,
      label: '合规',
      description: '通过 Transak 完成全球合规的 KYC / AML 流程',
    },
    {
      icon: <Sparkles size={18} className="text-indigo-500" />,
      label: '白标体验',
      description: '全程保持 Agentrix 品牌界面，用户无须离站',
    },
    {
      icon: <CreditCard size={18} className="text-sky-500" />,
      label: '多种支付方式',
      description: '支持银行卡、Apple Pay、Google Pay 等主流渠道',
    },
    {
      icon: <TimerReset size={18} className="text-amber-500" />,
      label: '实时到账',
      description: providerDisplay.eta,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-4xl rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-8 py-6">
          <AgentrixLogo size="sm" />
          <div className="flex items-center gap-3">
            <div className="text-xs uppercase tracking-[0.3em] text-slate-400">Agentrix Pay</div>
            <button
              type="button"
              onClick={() => {
                setView('intro');
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
              <div className="mt-3 text-3xl font-bold text-slate-900">{amountDisplay}</div>
              <p className="mt-2 text-sm text-slate-500">{order.description}</p>

              <div className="mt-6 flex flex-col gap-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">支付渠道</span>
                  <span className="font-medium text-slate-800">{providerDisplay.label}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">预计到账</span>
                  <span className="font-medium text-slate-800">{providerDisplay.eta}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">手续费</span>
                  <span className="font-medium text-slate-800">{providerDisplay.feeText}</span>
                </div>
              </div>

              <div className="mt-6 rounded-xl border border-dashed border-slate-200 bg-white/70 p-4">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>合规支持</span>
                  <span className="font-semibold text-slate-700">Powered by Transak</span>
                </div>
                {needsKYC ? (
                  <p className="mt-2 text-xs text-amber-600">为了保障合规，本次支付会自动进入 KYC 验证，请准备好证件与摄像头。</p>
                ) : (
                  <p className="mt-2 text-xs text-emerald-600">您的 KYC 记录已验证，通过 Agentrix Pay 可直接完成购买。</p>
                )}
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
            {view === 'intro' ? (
              <div className="flex h-full flex-col">
                <div className="flex flex-col gap-3 text-sm text-slate-600">
                  <p>Agentrix Pay 将为您打开一条加密货币通道，由 Transak 负责资金合规、KYC 与出入金，以确保商家即时收款。</p>
                  <ul className="list-disc pl-5">
                    <li>确认订单金额与币种</li>
                    <li>完成 Transak 身份校验（如需要）</li>
                    <li>使用银行卡/Apple Pay/Google Pay 付款</li>
                  </ul>
                </div>

                <div className="mt-auto space-y-3">
                  {errorMessage && (
                    <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                      <AlertCircle size={16} />
                      <span>{errorMessage}</span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleStart}
                    className="w-full rounded-2xl bg-slate-900 py-4 text-sm font-semibold text-white transition-all hover:bg-slate-800"
                  >
                    开始 Agentrix Pay 流程
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full rounded-2xl border border-slate-200 py-4 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-50"
                  >
                    返回其他支付方式
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex h-full flex-col gap-4">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.4em] text-slate-400">
                  <span>Agentrix Secure Channel</span>
                  <span>{needsKYC ? 'KYC + Pay' : 'Instant Pay'}</span>
                </div>
                <div className="relative min-h-[520px] overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
                  <TransakWidget
                    apiKey={process.env.NEXT_PUBLIC_TRANSAK_API_KEY || ''}
                    environment={(process.env.NEXT_PUBLIC_TRANSAK_ENVIRONMENT as 'STAGING' | 'PRODUCTION') || 'STAGING'}
                    amount={providerOption?.price || order.amount}
                    fiatCurrency={providerOption?.currency || order.currency || 'USD'}
                    cryptoCurrency="USDC"
                    network="bsc"
                    walletAddress={commissionContractAddress || providerOption?.commissionContractAddress}
                    orderId={order.id}
                    userId={userProfile?.id}
                    email={userProfile?.email}
                    directPayment={!needsKYC}
                    onSuccess={handleTransakSuccess}
                    onError={handleWidgetError}
                    onClose={() => {
                      setView('intro');
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
                {errorMessage && (
                  <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-xs text-red-600">
                    <AlertCircle size={14} />
                    <span>{errorMessage}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
