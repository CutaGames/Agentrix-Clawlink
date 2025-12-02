import { useState } from 'react';
import { useUser } from '../../contexts/UserContext';
import { useAgentMode } from '../../contexts/AgentModeContext';
import { Bot, UserCircle, Store, Code2, Settings, Sparkles, LayoutDashboard, Wallet, ShieldCheck, Zap, Search, Package, TrendingUp, CreditCard, BarChart3, AlertTriangle, Receipt, Megaphone, CheckCircle, ShoppingBag, Wrench, Link2, FlaskConical, Cog, FileText, Terminal } from 'lucide-react';

interface AgentSidebarProps {
  onCapabilityClick?: (capability: string) => void;
}

export function AgentSidebar({ onCapabilityClick }: AgentSidebarProps) {
  const { user } = useUser();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const { mode, setMode } = useAgentMode();

  const modeStats = {
    personal: {
      label: 'Auto-Earn 收益（7天）',
      value: '+420 USDC',
    },
    merchant: {
      label: '今日 GMV',
      value: '¥128,560',
    },
    developer: {
      label: 'API 调用/24h',
      value: '18,342',
    },
  };

  // 个人Agent能力模块
  const personalCapabilities = [
    {
      id: 'bill_assistant',
      icon: '📊',
      title: '账单助手',
      description: '自动整理账单、解释费用、预测支出',
      status: 'available',
    },
    {
      id: 'payment_assistant',
      icon: '💳',
      title: '支付助手',
      description: '快速支付、验证真实商户、比价、自动退单',
      status: 'available',
    },
    {
      id: 'wallet_management',
      icon: '👛',
      title: '钱包管理',
      description: '多链钱包、法币钱包统一管理',
      status: 'available',
    },
    {
      id: 'risk_alert',
      icon: '🛡️',
      title: '风控提醒',
      description: '异常交易提醒、诈骗识别',
      status: 'available',
    },
    {
      id: 'auto_purchase',
      icon: '🤖',
      title: '自动购买',
      description: '自动续费、自动订阅优化',
      status: 'available',
    },
    {
      id: 'search',
      icon: '🔍',
      title: '智能搜索与比价',
      description: '商品、服务、链上资产智能搜索和自动比价',
      status: 'available',
    },
    {
      id: 'autoEarn',
      icon: '⚡',
      title: 'Auto-Earn 自动赚钱',
      description: '加密资产套利、DCA策略、NFT自动挂单',
      status: 'available',
    },
    {
      id: 'order',
      icon: '📦',
      title: '订单跟踪',
      description: '实时订单状态、物流跟踪、售后处理',
      status: 'available',
    },
    {
      id: 'marketplace',
      icon: '🛒',
      title: 'Marketplace',
      description: '访问 11,200+ 商品，支持 Token/NFT/RWA/Launchpad',
      status: 'available',
    },
    {
      id: 'plugins',
      icon: '🔌',
      title: '插件市场',
      description: '浏览和安装插件，扩展Agent功能',
      status: 'available',
    },
  ];

  // 商家Agent能力模块
  const merchantCapabilities = [
    {
      id: 'payment_collection',
      icon: '💰',
      title: '收款管理',
      description: '自动生成支付链接、二维码、API Keys',
      status: 'available',
    },
    {
      id: 'order_analysis',
      icon: '📊',
      title: '订单分析',
      description: '销售可视化、渠道分析、用户洞察',
      status: 'available',
    },
    {
      id: 'risk_center',
      icon: '🛡️',
      title: '风控中心',
      description: '自动识别高风险付款、退款优化',
      status: 'available',
    },
    {
      id: 'settlement',
      icon: '💵',
      title: '清结算',
      description: '自动对账、生成税务报表、发票自动化',
      status: 'available',
    },
    {
      id: 'marketing_assistant',
      icon: '📢',
      title: '营销助手',
      description: 'A/B测试、行为触达、自动发优惠券',
      status: 'available',
    },
    {
      id: 'compliance',
      icon: '✅',
      title: '商户合规',
      description: 'KYC/KYB、国际支付合规建议',
      status: 'available',
    },
    {
      id: 'products',
      icon: '🛍️',
      title: '商品管理',
      description: '创建商品、管理库存、价格调优',
      status: 'available',
    },
  ];

  // 开发者Agent能力模块
  const developerCapabilities = [
    {
      id: 'sdk_generator',
      icon: '🔧',
      title: 'SDK 生成器',
      description: '自动生成多语言 SDK：JS、Python、Swift、Flutter',
      status: 'available',
    },
    {
      id: 'api_assistant',
      icon: '🔗',
      title: 'API 助手',
      description: '自动阅读文档、生成调用代码、Mock Server',
      status: 'available',
    },
    {
      id: 'sandbox',
      icon: '🧪',
      title: '沙盒调试',
      description: '自动构建、测试、模拟订单',
      status: 'available',
    },
    {
      id: 'devops',
      icon: '⚙️',
      title: 'DevOps 自动化',
      description: '部署 Webhook、签名验证、CI/CD 集成',
      status: 'available',
    },
    {
      id: 'contract_helper',
      icon: '📜',
      title: '合约助手（Web3）',
      description: '合约模板生成、交易模拟、费用估算',
      status: 'available',
    },
    {
      id: 'logs',
      icon: '📋',
      title: '工单与日志',
      description: '自动分析错误日志、调试支付失败',
      status: 'available',
    },
    {
      id: 'code',
      icon: '💻',
      title: '代码生成',
      description: 'API调用示例、SDK集成代码、Webhook处理',
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
    bill_assistant: LayoutDashboard,
    payment_assistant: Wallet,
    wallet_management: Wallet,
    risk_alert: ShieldCheck,
    auto_purchase: Zap,
    search: Search,
    autoEarn: Zap,
    order: Package,
    payment_collection: CreditCard,
    order_analysis: BarChart3,
    risk_center: ShieldCheck,
    settlement: Receipt,
    marketing_assistant: Megaphone,
    compliance: CheckCircle,
    products: ShoppingBag,
    sdk_generator: Wrench,
    api_assistant: Link2,
    sandbox: FlaskConical,
    devops: Cog,
    contract_helper: FileText,
    logs: Terminal,
    code: Code2,
    marketplace: ShoppingBag,
    plugins: Wrench,
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
            <h1 className="font-bold text-slate-100 tracking-tight text-sm">PayMind Agent</h1>
            <span className="text-[10px] text-indigo-400 font-mono bg-indigo-500/10 px-1.5 py-0.5 rounded">WORKBENCH</span>
          </div>
        </div>
        
        {/* 角色切换器 - 胶囊式 */}
        <div className="grid grid-cols-3 bg-slate-900/80 p-1 rounded-lg border border-slate-800">
          <button 
            onClick={() => setMode('personal')}
            className={`flex flex-col items-center justify-center py-2 rounded-md text-[10px] font-medium transition-all ${
              mode === 'personal' 
                ? 'bg-slate-700 text-white shadow-sm' 
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <UserCircle size={16} className="mb-1" />
            个人
          </button>
          <button 
            onClick={() => setMode('merchant')}
            className={`flex flex-col items-center justify-center py-2 rounded-md text-[10px] font-medium transition-all ${
              mode === 'merchant' 
                ? 'bg-slate-700 text-white shadow-sm' 
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Store size={16} className="mb-1" />
            商家
          </button>
          <button 
            onClick={() => setMode('developer')}
            className={`flex flex-col items-center justify-center py-2 rounded-md text-[10px] font-medium transition-all ${
              mode === 'developer' 
                ? 'bg-slate-700 text-white shadow-sm' 
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Code2 size={16} className="mb-1" />
            开发者
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
            <span className="text-[10px] text-emerald-400">运行中</span>
          </div>
        </div>
      </div>

      {/* Agent Pod (能力列表) */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 scrollbar-hide">
        <h3 className="px-3 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 mt-2">Agent Capabilities</h3>
        {capabilities.map((capability) => {
          const IconComponent = iconMap[capability.id] || Bot;
          return (
            <button 
              key={capability.id}
              onClick={() => {
                if (capability.status === 'available' && onCapabilityClick) {
                  onCapabilityClick(capability.id);
                }
                setExpandedSection(expandedSection === capability.id ? null : capability.id);
              }}
              disabled={capability.status === 'coming_soon'}
              className={`w-full text-left px-3 py-3 rounded-xl border transition-all group flex items-start gap-3 ${
                expandedSection === capability.id
                  ? 'bg-indigo-500/10 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.15)]' 
                  : 'bg-transparent border-transparent hover:bg-slate-800/50 hover:border-slate-700'
              } ${capability.status === 'coming_soon' ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className={`p-2 rounded-lg shrink-0 ${
                expandedSection === capability.id 
                  ? 'bg-indigo-500 text-white' 
                  : 'bg-slate-800 text-slate-400 group-hover:text-slate-200'
              }`}>
                <IconComponent size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium ${
                  expandedSection === capability.id ? 'text-indigo-100' : 'text-slate-300'
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
          <span className="text-sm">全局设置</span>
        </button>
      </div>
    </div>
  );
}

