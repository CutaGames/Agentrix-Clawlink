import React, { useState, useEffect } from 'react';
import { useLocalization } from '../../contexts/LocalizationContext';
import { useToast } from '../../contexts/ToastContext';

interface MPCWalletInfo {
  walletAddress: string;
  chain: string;
  currency: string;
  isActive: boolean;
}

export function WalletManagement() {
  const { t } = useLocalization();
  const { success, error: showError } = useToast();
  const [wallet, setWallet] = useState<MPCWalletInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [password, setPassword] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [backupShards, setBackupShards] = useState<{ shardA: string; shardC: string } | null>(null);

  useEffect(() => {
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    try {
      // 支持多种 token 存储 key
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      if (!token) {
        console.warn('No auth token found');
        setLoading(false);
        return;
      }
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/mpc-wallet/my-wallet`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setWallet(data);
      }
    } catch (error) {
      console.error('Failed to fetch wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateWallet = async () => {
    if (!password) {
      showError(t({ zh: '请输入密码以加密分片', en: 'Please enter a password to encrypt shards' }));
      return;
    }

    setIsGenerating(true);
    try {
      // 支持多种 token 存储 key
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      if (!token) {
        showError(t({ zh: '请先登录', en: 'Please login first' }));
        setIsGenerating(false);
        return;
      }
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/mpc-wallet/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to generate wallet');
      }

      const data = await response.json();
      setWallet({
        walletAddress: data.walletAddress,
        chain: 'BSC',
        currency: 'USDC',
        isActive: true,
      });
      setBackupShards({
        shardA: data.encryptedShardA,
        shardC: data.encryptedShardC,
      });
      setShowPasswordModal(false);
      success(t({ zh: 'MPC 钱包生成成功！', en: 'MPC Wallet generated successfully!' }));
    } catch (error: any) {
      showError(error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-neutral-400">{t({ zh: '加载中...', en: 'Loading...' })}</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">{t({ zh: '钱包管理', en: 'Wallet Management' })}</h2>

      {!wallet ? (
        <div className="bg-neutral-800 rounded-xl p-8 border border-neutral-700 text-center">
          <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">👛</span>
          </div>
          <h3 className="text-xl font-semibold mb-2">{t({ zh: '创建您的 MPC 钱包', en: 'Create Your MPC Wallet' })}</h3>
          <p className="text-neutral-400 mb-6 max-w-md mx-auto">
            {t({
              zh: 'MPC 钱包通过私钥分片技术提供更高的安全性。您无需管理助记词，只需设置一个支付密码。',
              en: 'MPC wallets provide higher security through private key sharding. No need to manage mnemonics, just set a payment password.',
            })}
          </p>
          <button
            onClick={() => setShowPasswordModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
          >
            {t({ zh: '立即生成', en: 'Generate Now' })}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 钱包信息卡片 */}
          <div className="bg-neutral-800 rounded-xl p-6 border border-neutral-700">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-sm text-neutral-400 mb-1">{t({ zh: '钱包地址', en: 'Wallet Address' })}</p>
                <p className="text-lg font-mono break-all">{wallet.walletAddress}</p>
              </div>
              <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs font-medium">
                {wallet.isActive ? t({ zh: '已激活', en: 'Active' }) : t({ zh: '未激活', en: 'Inactive' })}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="bg-neutral-900/50 p-4 rounded-lg">
                <p className="text-xs text-neutral-500 mb-1">{t({ zh: '网络', en: 'Network' })}</p>
                <p className="font-medium">{wallet.chain}</p>
              </div>
              <div className="bg-neutral-900/50 p-4 rounded-lg">
                <p className="text-xs text-neutral-500 mb-1">{t({ zh: '默认币种', en: 'Default Currency' })}</p>
                <p className="font-medium">{wallet.currency}</p>
              </div>
            </div>
          </div>

          {/* 备份提醒 */}
          {backupShards && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-6">
              <div className="flex gap-4">
                <span className="text-2xl">⚠️</span>
                <div>
                  <h4 className="text-yellow-500 font-semibold mb-2">
                    {t({ zh: '请备份您的私钥分片', en: 'Please backup your private key shards' })}
                  </h4>
                  <p className="text-sm text-neutral-400 mb-4">
                    {t({
                      zh: '这是您的本地分片和备份分片。请妥善保存，如果丢失且忘记密码，资产将无法找回。',
                      en: 'These are your local and backup shards. Please save them securely. If lost and password forgotten, assets cannot be recovered.',
                    })}
                  </p>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-neutral-500 mb-1">Shard A (Local)</p>
                      <code className="block bg-black/30 p-2 rounded text-xs break-all">{backupShards.shardA}</code>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-500 mb-1">Shard C (Backup)</p>
                      <code className="block bg-black/30 p-2 rounded text-xs break-all">{backupShards.shardC}</code>
                    </div>
                  </div>
                  <button
                    onClick={() => setBackupShards(null)}
                    className="mt-4 text-sm text-yellow-500 hover:underline"
                  >
                    {t({ zh: '我已妥善保存', en: 'I have saved them securely' })}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 资产概览（模拟） */}
          <div className="bg-neutral-800 rounded-xl p-6 border border-neutral-700">
            <h3 className="text-lg font-semibold mb-4">{t({ zh: '资产概览', en: 'Asset Overview' })}</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-neutral-900/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-xs">USDC</div>
                  <span>USD Coin</span>
                </div>
                <div className="text-right">
                  <p className="font-semibold">0.00 USDC</p>
                  <p className="text-xs text-neutral-500">$0.00</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 密码设置弹窗 */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold mb-4">{t({ zh: '设置支付密码', en: 'Set Payment Password' })}</h3>
            <p className="text-neutral-400 text-sm mb-6">
              {t({
                zh: '该密码将用于加密您的私钥分片。请务必牢记，Agentrix 不会存储此密码。',
                en: 'This password will be used to encrypt your private key shards. Please remember it, Agentrix will not store this password.',
              })}
            </p>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t({ zh: '输入密码', en: 'Enter password' })}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 mb-6 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowPasswordModal(false)}
                className="flex-1 px-4 py-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 transition-colors"
              >
                {t({ zh: '取消', en: 'Cancel' })}
              </button>
              <button
                onClick={handleGenerateWallet}
                disabled={isGenerating || !password}
                className="flex-1 px-4 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
              >
                {isGenerating ? t({ zh: '生成中...', en: 'Generating...' }) : t({ zh: '确认生成', en: 'Confirm' })}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
