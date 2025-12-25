import { useLocalization } from '../../../contexts/LocalizationContext'
import { WorkspaceView } from './UnifiedWorkspace'
import { User, Store, Code, ChevronRight, Zap, Shield, BarChart3, Layout, FileText, Link2 } from 'lucide-react'


interface RoleSwitcherProps {
  currentMode: 'personal' | 'merchant' | 'developer'
  userRoles: {
    isUser: boolean
    isMerchant: boolean
    isDeveloper: boolean
  }
  onRoleSwitch: (mode: 'personal' | 'merchant' | 'developer') => void
  onViewChange: (view: WorkspaceView) => void
}

/**
 * 角色切换组件
 * 允许用户在不同角色间切换，并显示相应的功能入口
 */
export function RoleSwitcher({ currentMode, userRoles, onRoleSwitch, onViewChange }: RoleSwitcherProps) {
  const { t } = useLocalization()

  const roles = [
    {
      key: 'personal' as const,
      label: { zh: '个人用户', en: 'Personal User' },
      icon: <User size={18} />,
      color: 'cyan',
      available: userRoles.isUser,
      features: [
        { zh: '支付历史', en: 'Payment History' },
        { zh: '钱包管理', en: 'Wallet Management' },
        { zh: '订单跟踪', en: 'Order Tracking' },
        { zh: 'KYC认证', en: 'KYC Verification' },
      ],
    },
    {
      key: 'merchant' as const,
      label: { zh: '商户', en: 'Merchant' },
      icon: <Store size={18} />,
      color: 'emerald',
      available: userRoles.isMerchant,
      features: [
        { zh: '商品管理', en: 'Product Management' },
        { zh: '订单管理', en: 'Order Management' },
        { zh: '结算管理', en: 'Settlement Management' },
        { zh: '数据分析', en: 'Data Analytics' },
      ],
    },
    {
      key: 'developer' as const,
      label: { zh: '开发者', en: 'Developer' },
      icon: <Code size={18} />,
      color: 'purple',
      available: userRoles.isDeveloper,
      features: [
        { zh: 'API统计', en: 'API Statistics' },
        { zh: '代码生成', en: 'Code Generation' },
        { zh: '收益查看', en: 'Revenue View' },
        { zh: 'Agent管理', en: 'Agent Management' },
      ],
    },
  ]

  const quickActions = {
    personal: [
      { label: { zh: '审计与收据', en: 'Audit & Receipts' }, view: 'receipts' as WorkspaceView, action: 'view_receipts', icon: <FileText size={14} /> },
      { label: { zh: '管理钱包', en: 'Manage Wallets' }, view: 'user' as WorkspaceView, action: 'manage_wallets', icon: <Shield size={14} /> },
      { label: { zh: '查看订单', en: 'View Orders' }, view: 'orders' as WorkspaceView, action: 'view_orders', icon: <Layout size={14} /> },
    ],
    merchant: [
      { label: { zh: '商品管理', en: 'Manage Products' }, view: 'merchant' as WorkspaceView, action: 'manage_products', icon: <Zap size={14} /> },
      { label: { zh: '订单管理', en: 'Manage Orders' }, view: 'merchant' as WorkspaceView, action: 'manage_orders', icon: <Layout size={14} /> },
      { label: { zh: '合规审计', en: 'Compliance Audit' }, view: 'receipts' as WorkspaceView, action: 'view_receipts', icon: <FileText size={14} /> },
    ],
    developer: [
      { label: { zh: '连接器中心', en: 'Connectors Hub' }, view: 'connectors' as WorkspaceView, action: 'view_connectors', icon: <Link2 size={14} /> },
      { label: { zh: '代码生成', en: 'Generate Code' }, view: 'code' as WorkspaceView, action: 'generate_code', icon: <Code size={14} /> },
      { label: { zh: '查看收益', en: 'View Revenue' }, view: 'developer' as WorkspaceView, action: 'view_revenue', icon: <Zap size={14} /> },
    ],
  }


  return (
    <div className="h-full flex flex-col bg-slate-900/50 backdrop-blur-xl">
      {/* 角色切换 */}
      <div className="p-6 border-b border-white/5">
        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">
          {t({ zh: '切换角色', en: 'Switch Role' })}
        </h3>
        <div className="space-y-2">
          {roles.map((role) => (
            <button
              key={role.key}
              onClick={() => {
                onRoleSwitch(role.key)
                if (role.key === 'merchant') {
                  onViewChange('merchant')
                } else if (role.key === 'developer') {
                  onViewChange('developer')
                } else {
                  onViewChange('user')
                }
              }}
              className={`w-full flex items-center justify-between p-3 rounded-xl transition-all group ${
                currentMode === role.key 
                  ? 'bg-white/10 border border-white/10 shadow-lg' 
                  : 'hover:bg-white/5 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                  currentMode === role.key 
                    ? role.key === 'personal' ? 'bg-cyan-500/20 text-cyan-400' :
                      role.key === 'merchant' ? 'bg-emerald-500/20 text-emerald-400' :
                      'bg-purple-500/20 text-purple-400'
                    : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700'
                }`}>
                  {role.icon}
                </div>
                <span className={`text-sm font-bold ${currentMode === role.key ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>
                  {t(role.label)}
                </span>
              </div>
              {currentMode === role.key && (
                <div className={`w-1.5 h-1.5 rounded-full ${
                  role.key === 'personal' ? 'bg-cyan-400' :
                  role.key === 'merchant' ? 'bg-emerald-400' :
                  'bg-purple-400'
                }`} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 快捷功能 */}
      <div className="flex-1 overflow-y-auto p-6">
        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">
          {t({ zh: '快捷功能', en: 'Quick Actions' })}
        </h3>
        <div className="space-y-1">
          {quickActions[currentMode].map((action, i) => (
            <button
              key={i}
              onClick={() => onViewChange(action.view)}
              className="w-full flex items-center gap-3 p-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all group"
            >
              <div className="text-slate-500 group-hover:text-cyan-400 transition-colors">
                {action.icon}
              </div>
              <span className="text-sm font-medium">{t(action.label)}</span>
              <ChevronRight size={14} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </div>

        {/* 状态指示器 */}
        <div className="mt-8 p-4 rounded-2xl bg-white/5 border border-white/5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t({ zh: '系统状态', en: 'System Status' })}</span>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Live</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-[10px]">
              <span className="text-slate-500">X402 Protocol</span>
              <span className="text-slate-300 font-mono">v2.4.0</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="text-slate-500">Network</span>
              <span className="text-slate-300 font-mono">Mainnet</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


