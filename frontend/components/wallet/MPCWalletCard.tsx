import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLocalization } from '../../contexts/LocalizationContext';
import { API_BASE_URL } from '../../lib/api/client';

interface MPCWalletInfo {
  walletAddress: string;
  chain: string;
  currency: string;
  isActive: boolean;
}

interface MPCWalletCardProps {
  compact?: boolean;
  onCreateClick?: () => void;
}

export function MPCWalletCard({ compact = false, onCreateClick }: MPCWalletCardProps) {
  const { t } = useLocalization();
  const [wallet, setWallet] = useState<MPCWalletInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState<string>('--');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setLoading(false);
        return;
      }
      
      const response = await fetch(`${API_BASE_URL}/mpc-wallet/my-wallet`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setWallet(data);
        // TODO: Fetch actual balance from blockchain
        setBalance('0.00 USDC');
      }
    } catch (error) {
      console.error('Failed to fetch wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const shortenAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const copyAddress = async () => {
    if (wallet?.walletAddress) {
      await navigator.clipboard.writeText(wallet.walletAddress);
    }
  };

  const handleCreateWallet = async () => {
    if (!password || password.length < 6) {
      alert(t({ zh: '密码至少需要6位字符', en: 'Password must be at least 6 characters' }));
      return;
    }
    if (password !== confirmPassword) {
      alert(t({ zh: '两次密码输入不一致', en: 'Passwords do not match' }));
      return;
    }

    setIsCreating(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/mpc-wallet/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create wallet');
      }

      const data = await response.json();
      setWallet({
        walletAddress: data.walletAddress,
        chain: 'BSC',
        currency: 'USDC',
        isActive: true,
      });
      setShowCreateModal(false);
      setPassword('');
      setConfirmPassword('');
      
      // Refresh wallet info
      await fetchWallet();
    } catch (error: any) {
      alert(error.message || t({ zh: '创建失败', en: 'Failed to create wallet' }));
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateClick = () => {
    if (onCreateClick) {
      onCreateClick();
    } else {
      setShowCreateModal(true);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-8 bg-gray-200 rounded w-2/3 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  if (!wallet) {
    // No wallet - show creation prompt
    return (
      <div className="bg-gradient-to-br from-purple-50 to-indigo-100 rounded-lg shadow-sm border border-purple-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {t({ zh: 'MPC 钱包', en: 'MPC Wallet' })}
            </h3>
            <p className="text-sm text-gray-600">
              {t({ zh: '创建安全的 MPC 钱包来管理您的资产', en: 'Create a secure MPC wallet to manage your assets' })}
            </p>
          </div>
          <span className="text-3xl">👛</span>
        </div>
        
        <div className="bg-white/60 rounded-lg p-4 mb-4">
          <ul className="text-sm text-gray-700 space-y-2">
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              {t({ zh: '无需助记词', en: 'No mnemonic required' })}
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              {t({ zh: '私钥分片安全存储', en: 'Secure private key sharding' })}
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              {t({ zh: '支持 AI Agent 自动支付', en: 'Support AI Agent auto-payment' })}
            </li>
          </ul>
        </div>
        
        <button
          onClick={handleCreateClick}
          className="block w-full text-center bg-purple-600 text-white py-2.5 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
        >
          {t({ zh: '创建 MPC 钱包', en: 'Create MPC Wallet' })}
        </button>
      </div>
    );
  }

  // Has wallet - show wallet info
  return (
    <React.Fragment>
      {/* Create Wallet Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">
              {t({ zh: '创建 MPC 钱包', en: 'Create MPC Wallet' })}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t({ zh: '设置支付密码', en: 'Set Payment Password' })}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder={t({ zh: '至少6位字符', en: 'At least 6 characters' })}
                  disabled={isCreating}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t({ zh: '确认密码', en: 'Confirm Password' })}
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder={t({ zh: '再次输入密码', en: 'Enter password again' })}
                  disabled={isCreating}
                />
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-xs text-yellow-800">
                  {t({ 
                    zh: '⚠️ 请牢记此密码，它将用于 AI Agent 自动支付授权', 
                    en: '⚠️ Remember this password, it will be used for AI Agent auto-payment authorization' 
                  })}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setPassword('');
                    setConfirmPassword('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  disabled={isCreating}
                >
                  {t({ zh: '取消', en: 'Cancel' })}
                </button>
                <button
                  onClick={handleCreateWallet}
                  disabled={isCreating}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  {isCreating ? t({ zh: '创建中...', en: 'Creating...' }) : t({ zh: '创建', en: 'Create' })}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Wallet Info */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-500 to-indigo-600">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">
            {t({ zh: 'MPC 钱包', en: 'MPC Wallet' })}
          </h3>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            wallet.isActive 
              ? 'bg-green-400/20 text-green-100' 
              : 'bg-gray-400/20 text-gray-200'
          }`}>
            {wallet.isActive ? t({ zh: '已激活', en: 'Active' }) : t({ zh: '未激活', en: 'Inactive' })}
          </span>
        </div>
      </div>
      
      <div className="p-6">
        {/* Address */}
        <div className="mb-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
            {t({ zh: '钱包地址', en: 'Wallet Address' })}
          </p>
          <div className="flex items-center gap-2">
            <code className="text-sm font-mono text-gray-800 bg-gray-100 px-3 py-1.5 rounded flex-1">
              {shortenAddress(wallet.walletAddress)}
            </code>
            <button 
              onClick={copyAddress}
              className="text-gray-500 hover:text-gray-700 p-1.5"
              title={t({ zh: '复制地址', en: 'Copy address' })}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Balance & Network */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">{t({ zh: '余额', en: 'Balance' })}</p>
            <p className="text-lg font-semibold text-gray-900">{balance}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">{t({ zh: '网络', en: 'Network' })}</p>
            <p className="text-lg font-semibold text-gray-900">{wallet.chain || 'BSC'}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => copyAddress()}
            className="flex-1 text-center bg-gray-100 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors text-sm"
          >
            {t({ zh: '复制地址', en: 'Copy' })}
          </button>
          <button
            onClick={() => window.open(`https://bscscan.com/address/${wallet?.walletAddress}`, '_blank')}
            className="flex-1 text-center bg-purple-600 text-white py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors text-sm"
          >
            {t({ zh: '查看详情', en: 'View' })}
          </button>
        </div>
      </div>
      </div>
    </React.Fragment>
  );
}
