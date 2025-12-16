import { useLocalization } from '../../../contexts/LocalizationContext'
import { WorkspaceView } from './UnifiedWorkspace'

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
      icon: '👤',
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
      icon: '🏪',
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
      icon: '💻',
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
      { label: { zh: '查看支付历史', en: 'View Payment History' }, view: 'user' as WorkspaceView, action: 'view_payment_history' },
      { label: { zh: '管理钱包', en: 'Manage Wallets' }, view: 'user' as WorkspaceView, action: 'manage_wallets' },
      { label: { zh: '查看订单', en: 'View Orders' }, view: 'orders' as WorkspaceView, action: 'view_orders' },
    ],
    merchant: [
      { label: { zh: '商品管理', en: 'Manage Products' }, view: 'merchant' as WorkspaceView, action: 'manage_products' },
      { label: { zh: '订单管理', en: 'Manage Orders' }, view: 'merchant' as WorkspaceView, action: 'manage_orders' },
      { label: { zh: '查看结算', en: 'View Settlement' }, view: 'merchant' as WorkspaceView, action: 'view_settlement' },
    ],
    developer: [
      { label: { zh: 'API统计', en: 'API Statistics' }, view: 'developer' as WorkspaceView, action: 'view_api_stats' },
      { label: { zh: '代码生成', en: 'Generate Code' }, view: 'code' as WorkspaceView, action: 'generate_code' },
      { label: { zh: '查看收益', en: 'View Revenue' }, view: 'developer' as WorkspaceView, action: 'view_revenue' },
    ],
  }

  return (
    <div className="h-full flex flex-col">
      {/* 角色切换 */}
      <div className="p-4 border-b border-white/10">
        <h3 className="text-sm font-semibold text-slate-400 mb-3">
          {t({ zh: '切换角色', en: 'Switch Role' })}
        </h3>
        <div className="space-y-2">
          {roles.map((role) => (
            <button
              key={role.key}
              onClick={() => {
                // 允许切换角色，即使未开通也可以查看演示
                onRoleSwitch(role.key)
                // 根据角色切换到相应视图
                if (role.key === 'merchant') {
                  onViewChange('merchant')
                } else if (role.key === 'developer') {
                  onViewChange('developer')
                } else {
                  onViewChange('user')
                }
              }}
              className={`w-full text-left p-3 rounded-lg transition-all ${
                currentMode === role.key
                  ? 'bg-blue-600/20 border border-blue-500/50'
                  : role.available
                  ? 'bg-white/5 hover:bg-white/10 border border-white/10'
                  : 'bg-white/5 opacity-50 cursor-not-allowed border border-white/10'
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{role.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">{t(role.label)}</span>
                    {!role.available && (
                      <span className="text-xs text-slate-500">{t({ zh: '未开通', en: 'Not Available' })}</span>
                    )}
                  </div>
                  {currentMode === role.key && (
                    <div className="mt-2 space-y-1">
                      {role.features.map((feature, idx) => (
                        <div key={idx} className="text-xs text-slate-300 flex items-center">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mr-2"></span>
                          {t(feature)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 快捷操作 */}
      <div className="flex-1 overflow-y-auto p-4">
        <h3 className="text-sm font-semibold text-slate-400 mb-3">
          {t({ zh: '快捷操作', en: 'Quick Actions' })}
        </h3>
        <div className="space-y-2">
          {quickActions[currentMode].map((action, idx) => (
            <button
              key={idx}
              onClick={() => onViewChange(action.view)}
              className="w-full text-left p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
            >
              <span className="text-sm text-slate-300">{t(action.label)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 底部信息 */}
      <div className="p-4 border-t border-white/10">
        <div className="text-xs text-slate-400 space-y-1">
          <div>{t({ zh: '当前角色', en: 'Current Role' })}: {t(roles.find(r => r.key === currentMode)?.label || { zh: '个人', en: 'Personal' })}</div>
          <div>{t({ zh: '版本', en: 'Version' })}: V3.0</div>
        </div>
      </div>
    </div>
  )
}

