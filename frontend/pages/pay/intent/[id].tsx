import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  ShieldCheck, 
  ArrowRight,
  Lock,
} from 'lucide-react';
import { payIntentApi, PayIntent } from '../../../lib/api/pay-intent.api';
import { SmartCheckout } from '../../../components/payment/SmartCheckout';

const PayIntentPage = () => {
  const router = useRouter();
  const { id } = router.query;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payIntent, setPayIntent] = useState<PayIntent | null>(null);
  const [success, setSuccess] = useState(false);

  const fetchPayIntent = useCallback(async () => {
    if (!id) return;
    
    if ((id as string).startsWith('local-')) {
      setError('此支付链接是本地临时生成的，无法在其他设备上使用。请重新生成支付二维码。');
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const data = await payIntentApi.get(id as string);
      setPayIntent(data);
      if (data.status === 'completed' || data.status === 'succeeded') {
        setSuccess(true);
      }
    } catch (err: any) {
      console.error('Failed to fetch pay intent:', err);
      if (err.message?.includes('不存在') || err.message?.includes('not found')) {
        setError('支付意图不存在或已过期。请返回商品页面重新发起支付。');
      } else {
        setError(err.message || '无法加载支付信息');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPayIntent();
  }, [fetchPayIntent]);

  const handleSuccess = async (result: any) => {
    if (payIntent) {
      try {
        await payIntentApi.authorize(payIntent.id, 'user');
        await payIntentApi.execute(payIntent.id, { txHash: result?.txHash || result?.paymentIntentId || '' });
      } catch (err) {
        console.error('Execute pay intent failed:', err);
      }
    }
    setSuccess(true);
    if (payIntent?.metadata?.returnUrl) {
      setTimeout(() => {
        window.location.href = payIntent.metadata.returnUrl;
      }, 3000);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
        <p className="text-gray-600 font-medium">正在加载支付信息...</p>
      </div>
    );
  }

  if (error && !payIntent) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">支付加载失败</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button 
            onClick={() => router.back()}
            className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
          >
            返回
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">支付成功</h1>
          <p className="text-gray-600 mb-8">支付已完成</p>
          
          {payIntent?.metadata?.returnUrl ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">正在为您跳转回商户...</p>
              <a 
                href={payIntent.metadata.returnUrl}
                className="inline-flex items-center text-blue-600 font-medium hover:underline"
              >
                点击此处立即跳转 <ArrowRight className="w-4 h-4 ml-1" />
              </a>
            </div>
          ) : (
            <button 
              onClick={() => router.push('/pay/history')}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
            >
              查看支付记录
            </button>
          )}
        </div>
      </div>
    );
  }

  const intentAsOrder = payIntent ? {
    id: payIntent.id,
    amount: Number(payIntent.amount),  // DB returns decimal as string, must cast to number
    currency: payIntent.currency || 'USD',
    description: payIntent.description || '订单支付',
    merchantId: payIntent.merchantId || '',
    to: payIntent.metadata?.to,
    metadata: payIntent.metadata,
  } : null;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <Head>
        <title>Agentrix Checkout - 安全支付</title>
      </Head>

      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Agentrix Pay</span>
          </div>
          <div className="flex items-center text-gray-500 text-sm">
            <Lock className="w-3 h-3 mr-1" />
            安全加密连接
          </div>
        </div>

        {intentAsOrder && (
          <SmartCheckout
            order={intentAsOrder}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        )}

        <div className="mt-6 text-center">
          <p className="text-gray-400 text-sm">
            &copy; {new Date().getFullYear()} Agentrix Network. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PayIntentPage;
