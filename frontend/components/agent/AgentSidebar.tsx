import { useState } from 'react';
import { useUser } from '../../contexts/UserContext';
import { useAgentMode } from '../../contexts/AgentModeContext';
import { useLocalization } from '../../contexts/LocalizationContext';
import { useWorkbench } from '../../contexts/WorkbenchContext';
import { 
  Bot, 
  UserCircle, 
  Store, 
  Code2, 
  Settings, 
  Sparkles, 
  LayoutDashboard, 
  Wallet, 
  ShieldCheck, 
  Zap, 
  Search, 
  Package, 
  TrendingUp, 
  CreditCard, 
  BarChart3, 
  AlertTriangle, 
  Receipt, 
  Megaphone, 
  CheckCircle, 
  ShoppingBag, 
  Wrench, 
  Link2, 
  FlaskConical, 
  Cog, 
  FileText, 
  Terminal, 
  Gift, 
  Lock,
  Cpu
} from 'lucide-react';

interface AgentSidebarProps {
  onCapabilityClick?: (capability: string) => void;
  activeMode?: string;
}

export function AgentSidebar({ onCapabilityClick, activeMode }: AgentSidebarProps) {
  const { user } = useUser();
  const { t } = useLocalization();
  const { mode, setMode } = useAgentMode();
  const { setViewMode } = useWorkbench();

  const modeStats = {
    personal: {
      label: t({ zh: 'Auto-Earn 收益（7天）', en: 'Auto-Earn Earnings (7d)' }),
      value: '+420 USDC',
    },
    merchant: {
      label: t({ zh: '今日 GMV', en: "Today's GMV" }),
      value: '¥128,560',
    },
    developer: {
      label: t({ zh: 'API 调用/24h', en: 'API Calls/24h' }),
      value: '18,342',
    },
  };

  // 个人Agent能力模块 - 完整版
  const personalCapabilities = [
    {
      id: 'user_module',
      icon: '🧭',
      title: t({ zh: '授权向导', en: 'Auth Guide' }),
      description: t({ zh: '配置 Agent 自动支付授权与策略', en: 'Configure auto-pay and policies' }),
      status: 'available',
    },
    {
      id: 'payment_assistant',
      icon: '💳',
      title: t({ zh: '支付与账单', en: 'Payments & Bills' }),
      description: t({ zh: '快速支付、账单分析、自动退单', en: 'Quick pay, bill analysis, auto-refunds' }),
      status: 'available',
    },
    {
      id: 'wallet_management',
      icon: '👛',
      title: t({ zh: '资产管理', en: 'Asset Management' }),
      description: t({ zh: '多链钱包、法币资产、收益追踪', en: 'Multi-chain, fiat, and yield tracking' }),
      status: 'available',
    },
    {
      id: 'autoEarn',
      icon: '⚡',
      title: t({ zh: 'Auto-Earn 自动赚钱', en: 'Auto-Earn' }),
      description: t({ zh: '套利、DCA、空投自动领取', en: 'Arbitrage, DCA, and auto-airdrops' }),
      status: 'available',
    },
    {
      id: 'marketplace',
      icon: '🛒',
      title: t({ zh: '智能购物', en: 'Smart Shopping' }),
      description: t({ zh: '商品搜索、自动比价、一键下单', en: 'Search, compare, and one-click buy' }),
      status: 'available',
    },
    {
      id: 'order',
      icon: '📦',
      title: t({ zh: '订单跟踪', en: 'Order Tracking' }),
      description: t({ zh: '实时物流、售后处理、收据管理', en: 'Real-time tracking and receipts' }),
      status: 'available',
    },
    {
      id: 'policies',
      icon: '🛡️',
      title: t({ zh: '策略与授权', en: 'Policies & Auth' }),
      description: t({ zh: '管理自动支付策略与 Agent 权限', en: 'Manage auto-pay and agent permissions' }),
      status: 'available',
    },
    {
      id: 'airdrops',
      icon: '🎁',
      title: t({ zh: '空投发现', en: 'Airdrop Discovery' }),
      description: t({ zh: '发现潜在空投、自动交互、领取收益', en: 'Find airdrops and auto-claim' }),
      status: 'available',
    },
    {
      id: 'security',
      icon: '🔒',
      title: t({ zh: '安全中心', en: 'Security Center' }),
      description: t({ zh: '风险预警、私钥保护、安全审计', en: 'Risk alerts and security audits' }),
      status: 'available',
    },
    {
      id: 'promotion',
      icon: '📣',
      title: t({ zh: '推广中心', en: 'Promotion' }),
      description: t({ zh: '邀请好友、赚取佣金、查看统计', en: 'Invite friends and earn commission' }),
      status: 'available',
    },
    {
      id: 'profile',
      icon: '👤',
      title: t({ zh: '个人资料', en: 'Profile' }),
      description: t({ zh: '管理个人信息、KYC 状态、偏好设置', en: 'Manage info, KYC and preferences' }),
      status: 'available',
    },
  ];

  // 商家Agent能力模块 - 完整版
  const merchantCapabilities = [
    {
      id: 'merchant_module',
      icon: '📋',
      title: t({ zh: '上线清单', en: 'Go-live Checklist' }),
      description: t({ zh: '商户入驻、商品导入与支付集成进度', en: 'Onboarding and integration progress' }),
      status: 'available',
    },
    {
      id: 'merchant_products',
      icon: '🛍️',
      title: t({ zh: '商品管理', en: 'Product Management' }),
      description: t({ zh: '上架商品、库存同步、AI定价', en: 'List products, sync inventory, AI pricing' }),
      status: 'available',
    },
    {
      id: 'merchant_ecommerce',
      icon: '🌐',
      title: t({ zh: '电商同步', en: 'Ecommerce Sync' }),
      description: t({ zh: '同步 Shopify, WooCommerce 商品', en: 'Sync Shopify, WooCommerce' }),
      status: 'available',
    },
    {
      id: 'merchant_batch',
      icon: '📤',
      title: t({ zh: '批量导入', en: 'Batch Import' }),
      description: t({ zh: '通过 CSV/Excel 批量上传商品', en: 'Bulk upload via CSV/Excel' }),
      status: 'available',
    },
    {
      id: 'merchant_mpc',
      icon: '🛡️',
      title: t({ zh: 'MPC 钱包', en: 'MPC Wallet' }),
      description: t({ zh: '安全托管钱包，无需管理私钥', en: 'Secure custodial wallet' }),
      status: 'available',
    },
    {
      id: 'merchant_orders',
      icon: '📦',
      title: t({ zh: '订单管理', en: 'Order Management' }),
      description: t({ zh: '实时订单流、发货、退款处理', en: 'Real-time orders, fulfillment, refunds' }),
      status: 'available',
    },
    {
      id: 'merchant_finance',
      icon: '💰',
      title: t({ zh: '财务结算', en: 'Financial Settlement' }),
      description: t({ zh: '多币种结算、提现、分账明细', en: 'Multi-currency settlement, payouts' }),
      status: 'available',
    },
    {
      id: 'merchant_off_ramp',
      icon: '🏦',
      title: t({ zh: 'Off-ramp 出金', en: 'Off-ramp' }),
      description: t({ zh: '将加密货币收入结算至银行账户', en: 'Settle crypto revenue to bank account' }),
      status: 'available',
    },
    {
      id: 'merchant_integration',
      icon: '🔌',
      title: t({ zh: '支付集成', en: 'Integration' }),
      description: t({ zh: '快速集成 Agentrix 支付到您的网站', en: 'Integrate Agentrix Pay to your site' }),
      status: 'available',
    },
    {
      id: 'merchant_analytics',
      icon: '📊',
      title: t({ zh: '经营分析', en: 'Business Analytics' }),
      description: t({ zh: '销售趋势、AI转化率、客户画像', en: 'Sales trends, AI conversion, customer insights' }),
      status: 'available',
    },
    {
      id: 'merchant_api',
      icon: '🔑',
      title: t({ zh: 'API 密钥', en: 'API Keys' }),
      description: t({ zh: '管理 API 访问密钥与权限', en: 'Manage API access keys and permissions' }),
      status: 'available',
    },
    {
      id: 'merchant_webhooks',
      icon: '🔗',
      title: t({ zh: 'Webhooks', en: 'Webhooks' }),
      description: t({ zh: '配置事件通知回调地址', en: 'Configure event notification URLs' }),
      status: 'available',
    },
    {
      id: 'merchant_audit',
      icon: '📜',
      title: t({ zh: '审计链', en: 'Audit Chain' }),
      description: t({ zh: '查看链上交易审计与合规记录', en: 'View on-chain audit and compliance' }),
      status: 'available',
    },
    {
      id: 'merchant_settings',
      icon: '⚙️',
      title: t({ zh: '商户设置', en: 'Merchant Settings' }),
      description: t({ zh: '店铺信息、支付偏好、团队管理', en: 'Store info, payment preferences' }),
      status: 'available',
    },
  ];

  // 开发者Agent能力模块 - 完整版
  const developerCapabilities = [
    {
      id: 'developer_module',
      icon: '🚀',
      title: t({ zh: '开发进度', en: 'Skill Lifecycle' }),
      description: t({ zh: '技能构建、测试、打包与发布进度', en: 'Build, test, and publish skills' }),
      status: 'available',
    },
    {
      id: 'dev_api',
      icon: '🔗',
      title: t({ zh: 'API 统计', en: 'API Stats' }),
      description: t({ zh: '查看 API 调用量、成功率与延迟', en: 'Monitor API calls, success rate' }),
      status: 'available',
    },
    {
      id: 'dev_revenue',
      icon: '💵',
      title: t({ zh: '收益查看', en: 'Revenue View' }),
      description: t({ zh: '追踪收益、佣金与待结算金额', en: 'Track earnings and commissions' }),
      status: 'available',
    },
    {
      id: 'dev_agents',
      icon: '🤖',
      title: t({ zh: 'Agent 管理', en: 'Agent Management' }),
      description: t({ zh: '创建与管理 AI 商业智能体', en: 'Create and manage AI agents' }),
      status: 'available',
    },
    {
      id: 'dev_code',
      icon: '💻',
      title: t({ zh: '代码生成', en: 'Code Generation' }),
      description: t({ zh: '自动生成 SDK 与集成代码片段', en: 'Generate SDKs and code snippets' }),
      status: 'available',
    },
    {
      id: 'dev_webhooks',
      icon: '⚓',
      title: t({ zh: 'Webhook 配置', en: 'Webhook Config' }),
      description: t({ zh: '配置开发者事件通知回调', en: 'Configure developer webhooks' }),
      status: 'available',
    },
    {
      id: 'dev_logs',
      icon: '📝',
      title: t({ zh: '运行日志', en: 'Runtime Logs' }),
      description: t({ zh: '查看系统运行与调试日志', en: 'View system and debug logs' }),
      status: 'available',
    },
    {
      id: 'dev_simulator',
      icon: '🧪',
      title: t({ zh: '接口模拟器', en: 'API Simulator' }),
      description: t({ zh: '模拟 API 请求与沙盒测试', en: 'Simulate API requests and sandbox' }),
      status: 'available',
    },
    {
      id: 'dev_settings',
      icon: '🛠️',
      title: t({ zh: '开发者设置', en: 'Dev Settings' }),
      description: t({ zh: '开发者模式、密钥管理、安全设置', en: 'Dev mode and security settings' }),
      status: 'available',
    },
  ];

  // 根据模式选择能力列表
  const capabilities = mode === 'personal' 
    ? personalCapabilities 
    : mode === 'merchant' 
    ? merchantCapabilities 
    : developerCapabilities;

  // 图标映射
  const iconMap: Record<string, any> = {
    user_module: CheckCircle,
    merchant_module: CheckCircle,
    developer_module: CheckCircle,
    payment_assistant: Wallet,
    payments: Wallet,
    wallet_management: Wallet,
    wallets: Wallet,
    autoEarn: Zap,
    auto_earn: Zap,
    marketplace: ShoppingBag,
    order: Package,
    orders: Package,
    policies: ShieldCheck,
    airdrops: Gift,
    security: ShieldCheck,
    profile: UserCircle,
    merchant_orders: Package,
    merchant_products: ShoppingBag,
    merchant_finance: CreditCard,
    merchant_api: Link2,
    merchant_webhooks: Link2,
    merchant_audit: FileText,
    merchant_settings: Cog,
    merchant_analytics: BarChart3,
    dev_api: Link2,
    dev_revenue: CreditCard,
    dev_agents: Bot,
    dev_code: Wrench,
    dev_webhooks: Link2,
    dev_logs: Terminal,
    dev_simulator: FlaskConical,
    dev_settings: Cog,
    sdk_generator: Wrench,
    api_assistant: Link2,
    sandbox: FlaskConical,
    devops: Cog,
    logs: Terminal,
  };

  return (
    <div className="w-72 flex flex-col border-r border-slate-800/60 bg-[#161b22] h-full text-slate-300 font-sans overflow-hidden">
      {/* 品牌与角色切换 */}
      <div className="p-5 border-b border-slate-800/60">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Bot size={20} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-slate-100 tracking-tight text-sm">Agentrix Agent</h1>
            <span className="text-[10px] text-indigo-400 font-mono bg-indigo-500/10 px-1.5 py-0.5 rounded">WORKBENCH</span>
          </div>
        </div>
        
        {/* 角色切换器 - 胶囊式 */}
        <div className="grid grid-cols-3 bg-slate-900/80 p-1 rounded-lg border border-slate-800">
          <button 
            onClick={() => {
              setMode('personal');
              setViewMode('user_module');
            }}
            className={`flex flex-col items-center justify-center py-2 rounded-md text-[10px] font-medium transition-all ${
              mode === 'personal' 
                ? 'bg-slate-700 text-white shadow-sm' 
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <UserCircle size={16} className="mb-1" />
            {t({ zh: '个人', en: 'Personal' })}
          </button>
          <button 
            onClick={() => {
              setMode('merchant');
              setViewMode('merchant_module');
            }}
            className={`flex flex-col items-center justify-center py-2 rounded-md text-[10px] font-medium transition-all relative ${
              mode === 'merchant' 
                ? 'bg-slate-700 text-white shadow-sm' 
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Store size={16} className="mb-1" />
            <div className="flex items-center gap-1">
              {t({ zh: '商家', en: 'Merchant' })}
            </div>
          </button>
          <button 
            onClick={() => {
              setMode('developer');
              setViewMode('developer_module');
            }}
            className={`flex flex-col items-center justify-center py-2 rounded-md text-[10px] font-medium transition-all relative ${
              mode === 'developer' 
                ? 'bg-slate-700 text-white shadow-sm' 
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Code2 size={16} className="mb-1" />
            <div className="flex items-center gap-1">
              {t({ zh: '开发者', en: 'Developer' })}
            </div>
          </button>
        </div>
      </div>

      {/* 用户状态卡片 */}
      <div className="px-5 py-4">
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-4 border border-slate-700/50 relative overflow-hidden group cursor-pointer">
          <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
            <Sparkles size={40} />
          </div>
          <p className="text-xs text-slate-400 mb-1">{modeStats[mode].label}</p>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-white">{modeStats[mode].value}</span>
            {mode === 'personal' && <span className="text-xs font-bold text-indigo-400">USDC</span>}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></span>
            <span className="text-[10px] text-emerald-400">{t({ zh: '运行中', en: 'Running' })}</span>
          </div>
        </div>
      </div>

      {/* Agent Pod (能力列表) */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 scrollbar-hide">
        <h3 className="px-3 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 mt-2">{t({ zh: 'Agent 能力', en: 'Agent Capabilities' })}</h3>
        {capabilities.map((capability) => {
          const IconComponent = iconMap[capability.id] || Bot;
          const isActive = activeMode === capability.id;
          
          return (
            <button 
              key={capability.id}
              onClick={() => {
                if (capability.status === 'available') {
                  setViewMode(capability.id as any);
                  if (onCapabilityClick) {
                    onCapabilityClick(capability.id);
                  }
                }
              }}
              disabled={capability.status === 'coming_soon'}
              className={`w-full text-left px-3 py-3 rounded-xl border transition-all group flex items-start gap-3 ${
                isActive
                  ? 'bg-indigo-500/10 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.15)]' 
                  : 'bg-transparent border-transparent hover:bg-slate-800/50 hover:border-slate-700'
              } ${capability.status === 'coming_soon' ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className={`p-2 rounded-lg shrink-0 ${
                isActive 
                  ? 'bg-indigo-500 text-white' 
                  : 'bg-slate-800 text-slate-400 group-hover:text-slate-200'
              }`}>
                <IconComponent size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium ${
                  isActive ? 'text-indigo-100' : 'text-slate-300'
                }`}>
                  {capability.title}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">
                  {capability.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* 底部设置 */}
      <div className="p-4 border-t border-slate-800/60">
        <button className="flex items-center gap-3 w-full px-2 py-2 text-slate-400 hover:text-white transition-colors">
          <Settings size={18} />
          <span className="text-sm">{t({ zh: '全局设置', en: 'Global Settings' })}</span>
        </button>
      </div>
    </div>
  );
}

