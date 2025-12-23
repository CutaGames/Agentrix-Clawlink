import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { DashboardLayout } from '../../../components/layout/DashboardLayout';
import { useLocalization } from '../../../contexts/LocalizationContext';
import { AgentDashboard } from '../../../components/agent/AgentDashboard';
import { WalletManagement } from '../../../components/agent/WalletManagement';
import { PolicyEngine } from '../../../components/agent/PolicyEngine';
import { AirdropDiscovery } from '../../../components/agent/AirdropDiscovery';
import { AutoEarnPanel } from '../../../components/agent/AutoEarnPanel';
import { AgentChatV3 } from '../../../components/agent/AgentChatV3';

export default function PersonalAgentPage() {
  const { t } = useLocalization();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [hasWallet, setHasWallet] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkWallet();
  }, []);

  const checkWallet = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/mpc-wallet/my-wallet`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHasWallet(!!data);
      }
    } catch (error) {
      console.error('Failed to check wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'dashboard', label: t({ zh: '仪表盘', en: 'Dashboard' }), icon: '📊' },
    { id: 'wallet', label: t({ zh: 'MPC钱包', en: 'MPC Wallet' }), icon: '🔐' },
    { id: 'policies', label: t({ zh: '策略引擎', en: 'Policies' }), icon: '🛡️' },
    { id: 'airdrops', label: t({ zh: '空投发现', en: 'Airdrops' }), icon: '🎁' },
    { id: 'autoearn', label: t({ zh: '自动理财', en: 'Auto Earn' }), icon: '💰' },
    { id: 'chat', label: t({ zh: 'AI 助手', en: 'AI Assistant' }), icon: '🤖' },
  ];

  return (
    <DashboardLayout userType="user">
      <Head>
        <title>{t({ zh: '个人智能代理', en: 'Personal AI Agent' })} - Agentrix</title>
      </Head>

      <div className="min-h-screen bg-[#0f1115] text-white">
        {/* Sub-navigation */}
        <div className="sticky top-0 z-10 bg-[#0f1115]/80 backdrop-blur-md border-b border-neutral-800">
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex space-x-8 overflow-x-auto no-scrollbar">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-2 flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span className="font-medium">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="py-8">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && <AgentDashboard />}
              {activeTab === 'wallet' && <WalletManagement />}
              {activeTab === 'policies' && <PolicyEngine />}
              {activeTab === 'airdrops' && <AirdropDiscovery />}
              {activeTab === 'autoearn' && <AutoEarnPanel />}
              {activeTab === 'chat' && (
                <div className="max-w-4xl mx-auto h-[70vh] bg-neutral-900/50 rounded-3xl border border-neutral-800 overflow-hidden">
                  <AgentChatV3 />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
