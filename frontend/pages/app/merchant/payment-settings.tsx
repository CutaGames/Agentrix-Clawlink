import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { 
  CreditCard, 
  Wallet, 
  Globe, 
  Settings, 
  AlertCircle,
  CheckCircle2,
  Info,
  DollarSign,
  ArrowRight,
  Save,
  RefreshCw
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { merchantApi } from '@/lib/api/merchant.api';

type PaymentConfigType = 'fiat_only' | 'crypto_only' | 'both';

interface PaymentSettings {
  paymentConfig: PaymentConfigType;
  autoOffRampEnabled: boolean;
  preferredFiatCurrency: string;
  bankAccount?: string;
  minOffRampAmount: number;
}

export default function PaymentSettings() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<PaymentSettings>({
    paymentConfig: 'both',
    autoOffRampEnabled: false,
    preferredFiatCurrency: 'CNY',
    bankAccount: '',
    minOffRampAmount: 10,
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const config = await merchantApi.getPaymentSettings();
      setSettings(config);
    } catch (error: any) {
      console.error('加载支付配置失败:', error);
      // 如果API失败，使用默认配置
      setSettings({
        paymentConfig: 'both',
        autoOffRampEnabled: false,
        preferredFiatCurrency: 'CNY',
        bankAccount: '',
        minOffRampAmount: 10,
      });
      setError('加载配置失败，使用默认配置');
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      // 验证配置
      if (settings.autoOffRampEnabled && !settings.bankAccount) {
        setError('启用自动Off-ramp需要填写银行账户信息');
        setSaving(false);
        return;
      }

      // 保存到后端API
      await merchantApi.updatePaymentSettings(settings);
      
      setSuccess('配置已保存');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('保存配置失败:', error);
      setError(error.message || '保存配置失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout userType="merchant">
        <div className="flex items-center justify-center min-h-screen">
          <RefreshCw className="animate-spin text-indigo-600" size={32} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userType="merchant">
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">支付配置</h1>
          <p className="text-slate-600">配置商户收款方式和Off-ramp自动兑换</p>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="text-red-600" size={20} />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {/* 成功提示 */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
            <CheckCircle2 className="text-green-600" size={20} />
            <span className="text-green-700">{success}</span>
          </div>
        )}

        {/* 收款货币配置 */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <CreditCard className="text-indigo-600" size={24} />
            <h2 className="text-xl font-semibold text-slate-900">收款货币配置</h2>
          </div>
          <p className="text-sm text-slate-600 mb-6">
            选择您的商户接受的支付货币类型。如果选择&ldquo;两者都接受&rdquo;，用户可以选择法币或数字货币支付。
          </p>

          <div className="space-y-4">
            <label className="flex items-start gap-3 p-4 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
              <input
                type="radio"
                name="paymentConfig"
                value="fiat_only"
                checked={settings.paymentConfig === 'fiat_only'}
                onChange={(e) => setSettings({ ...settings, paymentConfig: e.target.value as PaymentConfigType })}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="font-medium text-slate-900 mb-1">只接受法币</div>
                <div className="text-sm text-slate-600">
                  用户只能使用法币支付（CNY、USD等）。如果用户选择数字货币支付，系统会自动通过Provider转换为法币。
                </div>
              </div>
            </label>

            <label className="flex items-start gap-3 p-4 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
              <input
                type="radio"
                name="paymentConfig"
                value="crypto_only"
                checked={settings.paymentConfig === 'crypto_only'}
                onChange={(e) => setSettings({ ...settings, paymentConfig: e.target.value as PaymentConfigType })}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="font-medium text-slate-900 mb-1">只接受数字货币</div>
                <div className="text-sm text-slate-600">
                  用户只能使用数字货币支付（USDT、USDC等）。如果用户选择法币支付，系统会自动通过Provider转换为数字货币。
                </div>
              </div>
            </label>

            <label className="flex items-start gap-3 p-4 border border-indigo-200 bg-indigo-50 rounded-lg cursor-pointer hover:bg-indigo-100 transition-colors">
              <input
                type="radio"
                name="paymentConfig"
                value="both"
                checked={settings.paymentConfig === 'both'}
                onChange={(e) => setSettings({ ...settings, paymentConfig: e.target.value as PaymentConfigType })}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="font-medium text-slate-900 mb-1">两者都接受（推荐）</div>
                <div className="text-sm text-slate-600">
                  用户可以选择法币或数字货币支付。系统会根据用户选择自动处理货币转换。
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Off-ramp自动兑换配置 */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <ArrowRight className="text-indigo-600" size={24} />
            <h2 className="text-xl font-semibold text-slate-900">Off-ramp自动兑换</h2>
          </div>
          <p className="text-sm text-slate-600 mb-6">
            启用后，当您收到数字货币时，系统会自动将其兑换为法币并转入您的银行账户。
          </p>

          <div className="space-y-6">
            {/* 启用开关 */}
            <label className="flex items-center justify-between p-4 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
              <div>
                <div className="font-medium text-slate-900 mb-1">启用自动Off-ramp</div>
                <div className="text-sm text-slate-600">
                  自动将收到的数字货币兑换为法币并转入银行账户
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.autoOffRampEnabled}
                onChange={(e) => setSettings({ ...settings, autoOffRampEnabled: e.target.checked })}
                className="w-5 h-5 text-indigo-600 rounded"
              />
            </label>

            {settings.autoOffRampEnabled && (
              <>
                {/* 目标法币货币 */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    目标法币货币
                  </label>
                  <select
                    value={settings.preferredFiatCurrency}
                    onChange={(e) => setSettings({ ...settings, preferredFiatCurrency: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="CNY">人民币 (CNY)</option>
                    <option value="USD">美元 (USD)</option>
                    <option value="EUR">欧元 (EUR)</option>
                    <option value="GBP">英镑 (GBP)</option>
                    <option value="JPY">日元 (JPY)</option>
                  </select>
                </div>

                {/* 银行账户 */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    银行账户信息 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={settings.bankAccount || ''}
                    onChange={(e) => setSettings({ ...settings, bankAccount: e.target.value })}
                    placeholder="请输入银行账户号码"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required={settings.autoOffRampEnabled}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    用于接收Off-ramp兑换的法币资金
                  </p>
                </div>

                {/* 最小兑换金额 */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    最小兑换金额 (USDT)
                  </label>
                  <input
                    type="number"
                    value={settings.minOffRampAmount}
                    onChange={(e) => setSettings({ ...settings, minOffRampAmount: parseFloat(e.target.value) || 10 })}
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    当账户余额达到此金额时，自动触发Off-ramp兑换
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* 费率说明 */}
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-6 mb-6">
          <div className="flex items-start gap-3">
            <Info className="text-blue-600 mt-0.5" size={20} />
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900 mb-2">费率说明</h3>
              <div className="space-y-2 text-sm text-slate-700">
                <div>
                  <strong>Provider费用：</strong> 1%-2%（数字货币转法币）
                </div>
                <div>
                  <strong>Agentrix Off-ramp分佣：</strong> 可配置，默认0.1%，可设为0
                </div>
                <div className="text-xs text-slate-600 mt-3">
                  ⚠️ 注意：Off-ramp兑换时，您需要承担汇率波动风险。系统会在兑换时使用实时汇率。
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 保存按钮 */}
        <div className="flex justify-end gap-4">
          <button
            onClick={() => router.back()}
            className="px-6 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <RefreshCw className="animate-spin" size={18} />
                保存中...
              </>
            ) : (
              <>
                <Save size={18} />
                保存配置
              </>
            )}
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
