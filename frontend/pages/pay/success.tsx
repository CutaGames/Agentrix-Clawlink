import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { Navigation } from '../../components/ui/Navigation';
import { paymentApi, type PaymentInfo } from '../../lib/api/payment.api';
import { useLocalization } from '../../contexts/LocalizationContext';

export default function PaymentSuccessPage() {
  const router = useRouter();
  const { paymentId, orderId } = router.query;
  const paymentIdParam = Array.isArray(paymentId) ? paymentId[0] : paymentId;
  const orderIdParam = Array.isArray(orderId) ? orderId[0] : orderId;
  const [payment, setPayment] = useState<PaymentInfo | null>(null);
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useLocalization();

  useEffect(() => {
    const fetchPayment = async () => {
      if (!paymentIdParam) {
        return;
      }
      try {
        setLoadingPayment(true);
        const info = await paymentApi.getPayment(paymentIdParam);
        setPayment(info);
        setError(null);
      } catch (err: any) {
        console.error('Failed to load payment details:', err);
        setError(err.message || t({ zh: '无法加载支付详情', en: 'Unable to load payment details' }));
      } finally {
        setLoadingPayment(false);
      }
    };

    fetchPayment();
  }, [paymentIdParam]);

  const handleLoginClick = () => {
    router.push('/auth/login');
  };

  const renderConversionInfo = () => {
    const originalAmount = payment?.metadata?.originalAmount;
    const originalCurrency = payment?.metadata?.originalCurrency;
    const cryptoAmount = payment?.metadata?.cryptoAmount || payment?.amount;
    const convertedCurrency = payment?.metadata?.convertedCurrency || payment?.currency;
    const rawRate =
      payment?.metadata?.conversionRate ||
      payment?.metadata?.exchangeRate ||
      payment?.metadata?.exchangeRateLock?.rate;
    const rate =
      typeof rawRate === 'number'
        ? rawRate
        : rawRate
        ? Number(rawRate)
        : undefined;

    if (!originalAmount || !originalCurrency || !cryptoAmount || !convertedCurrency) {
      return null;
    }

    return (
      <div className="p-4 bg-emerald-50 rounded-lg text-left space-y-1">
        <div className="text-xs text-emerald-700">{t({ zh: '汇率信息', en: 'Exchange Rate Info' })}</div>
        <div className="text-sm text-emerald-900">
          {originalAmount} {originalCurrency} ≈ {cryptoAmount} {convertedCurrency}
        </div>
        {rate && !Number.isNaN(rate) && (
          <div className="text-xs text-emerald-700">
            {t({ zh: '锁定汇率', en: 'Locked Rate' })}: 1 {originalCurrency} = {rate.toFixed(6)} {convertedCurrency}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <Navigation onLoginClick={handleLoginClick} />
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="mb-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              {t({ zh: '支付成功！', en: 'Payment Successful!' })}
            </h1>
            <p className="text-slate-600">
              {t({ zh: '您的订单已成功处理', en: 'Your order has been processed successfully' })}
            </p>
          </div>

          {paymentIdParam && (
            <div className="mb-4 p-4 bg-slate-50 rounded-lg text-left">
              <div className="text-xs text-slate-500 mb-1">{t({ zh: '支付编号', en: 'Payment ID' })}</div>
              <div className="text-sm font-mono text-slate-900 break-all">{paymentIdParam}</div>
            </div>
          )}

          {orderIdParam && (
            <div className="mb-4 p-4 bg-slate-50 rounded-lg text-left">
              <div className="text-xs text-slate-500 mb-1">{t({ zh: '订单号', en: 'Order ID' })}</div>
              <div className="text-sm font-mono text-slate-900 break-all">{orderIdParam}</div>
            </div>
          )}

          {loadingPayment && (
            <div className="mb-4 text-sm text-slate-500">{t({ zh: '正在加载支付详情...', en: 'Loading payment details...' })}</div>
          )}

          {error && (
            <div className="mb-4 text-sm text-red-500">{error}</div>
          )}

          {payment && (
            <div className="mb-6 space-y-3 text-left">
              <div className="p-4 bg-indigo-50 rounded-lg">
                <div className="text-xs text-indigo-700">{t({ zh: '支付金额', en: 'Payment Amount' })}</div>
                <div className="text-lg font-semibold text-indigo-900">
                  {payment.amount} {payment.currency}
                </div>
                <div className="text-xs text-indigo-600">{t({ zh: '方式', en: 'Method' })}: {payment.paymentMethod}</div>
              </div>

              {renderConversionInfo()}

              {payment.metadata?.exchangeRateLock?.expiresAt && (
                <div className="text-xs text-slate-500">
                  {t({ zh: '汇率锁到期时间', en: 'Exchange rate lock expires' })}: {new Date(payment.metadata.exchangeRateLock.expiresAt).toLocaleString()}
                </div>
              )}
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={() => router.push('/marketplace')}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
            >
              {t({ zh: '返回市场', en: 'Back to Marketplace' })}
              <ArrowRight size={18} />
            </button>
            <button
              onClick={() => router.push('/app/user/transactions')}
              className="w-full bg-slate-100 text-slate-700 py-3 rounded-lg font-medium hover:bg-slate-200 transition-colors"
            >
              {t({ zh: '查看订单', en: 'View Orders' })}
            </button>
          </div>

        </div>
      </div>
    </>
  );
}

