import { useLocalization } from '../../../contexts/LocalizationContext';
import { UniversalAgentLayout, AgentFeature } from './UniversalAgentLayout';
import { WalletManagement } from '../WalletManagement';
import { PolicyEngine } from '../PolicyEngine';

interface PersonalAgentAppProps {
  agentId?: string;
  apiKey?: string;
  config?: {
    title?: string;
    theme?: 'light' | 'dark';
    showSidebar?: boolean;
  };
}

/**
 * 个人Agent独立应用（包装器）
 * 使用 UniversalAgentLayout 统一布局
 */
export function PersonalAgentApp({
  agentId,
  apiKey,
  config = {},
}: PersonalAgentAppProps) {
  const { t } = useLocalization();

  const features: AgentFeature[] = [
    { id: 'wallet_management', icon: '👛', label: t({ zh: '钱包管理', en: 'Wallet Management' }), component: <WalletManagement /> },
    { id: 'policy_engine', icon: '🛡️', label: t({ zh: '授权中心', en: 'Policy Engine' }), component: <PolicyEngine /> },
    { id: 'bill_assistant', icon: '📊', label: t({ zh: '账单助手', en: 'Bill Assistant' }) },
    { id: 'payment_assistant', icon: '💳', label: t({ zh: '支付助手', en: 'Payment Assistant' }) },
    { id: 'auto_purchase', icon: '🤖', label: t({ zh: '自动购买', en: 'Auto Purchase' }) },
    { id: 'auto_earn', icon: '💰', label: t({ zh: 'Auto-Earn', en: 'Auto-Earn' }) },
  ];

  const quickActions = [
    { id: 'balance', label: t({ zh: '💰 查看余额', en: '💰 View Balance' }), icon: '💰' },
    { id: 'bill_analysis', label: t({ zh: '📊 账单分析', en: '📊 Bill Analysis' }), icon: '📊' },
    { id: 'settings', label: t({ zh: '⚙️ 设置', en: '⚙️ Settings' }), icon: '⚙️' },
  ];

  return (
    <UniversalAgentLayout
      role="user"
      agentId={agentId}
      apiKey={apiKey}
      config={config}
      features={features}
      quickActions={quickActions}
    />
  );
}

