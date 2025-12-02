import { ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useUser } from '../../contexts/UserContext'
import { UserMenu } from '../auth/UserMenu'
import { NotificationCenter } from '../notification/NotificationCenter'

interface DashboardLayoutProps {
  children: ReactNode
  userType: 'user' | 'agent' | 'merchant'
}

export function DashboardLayout({ children, userType }: DashboardLayoutProps) {
  const router = useRouter()
  const { user, isAuthenticated } = useUser()

  const userMenu = [
    { name: '概览', href: '/app/user', icon: '📊' },
    { name: 'KYC认证', href: '/app/user/kyc', icon: '✅' },
    { name: '支付历史与统计', href: '/app/user/transactions', icon: '💳' },
    { name: '钱包与支付方式', href: '/app/user/wallets', icon: '👛' },
    { name: '自动支付授权', href: '/app/user/grants', icon: '🔐' },
    { name: '订阅管理', href: '/app/user/subscriptions', icon: '🔄' },
    { name: '授权管理', href: '/app/user/authorizations', icon: '🔓' },
    { name: 'Agent授权管理', href: '/app/user/agent-authorizations', icon: '🤖' },
    { name: '执行历史', href: '/app/user/execution-history', icon: '📋' },
    { name: '安全设置', href: '/app/user/security', icon: '⚙️' },
    { name: '通知设置', href: '/app/user/notifications', icon: '🔔' },
  ]

  const agentMenu = [
    { name: '概览', href: '/app/agent', icon: '📊' },
    { name: 'KYC认证', href: '/app/agent/kyc', icon: '✅' },
    { name: '收益与佣金统计', href: '/app/agent/earnings', icon: '💰' },
    { name: '商品推荐与统计', href: '/app/agent/products', icon: '🛒' },
    { name: '支付配置', href: '/app/agent/grants', icon: '⚙️' },
    { name: '数据分析', href: '/app/agent/analytics', icon: '📈' },
    { name: 'API统计', href: '/app/agent/api-stats', icon: '📡' },
    { name: '错误日志', href: '/app/agent/error-logs', icon: '🐛' },
    { name: '测试环境', href: '/app/agent/sandbox', icon: '🧪' },
    { name: '集成文档', href: '/app/agent/docs', icon: '📚' },
  ]

  const merchantMenu = [
    { name: '概览', href: '/app/merchant', icon: '📊' },
    { name: 'KYC认证', href: '/app/merchant/kyc', icon: '✅' },
    { name: '商品管理', href: '/app/merchant/products', icon: '🛒' },
    { name: '订单管理', href: '/app/merchant/orders', icon: '📦' },
    { name: '分润设置', href: '/app/merchant/commissions', icon: '💰' },
    { name: '结算中心', href: '/app/merchant/settlements', icon: '💵' },
    { name: 'MPC钱包', href: '/app/merchant/mpc-wallet', icon: '🔐' },
    { name: '支付统计', href: '/app/merchant/analytics', icon: '📈' },
    { name: '收入报表', href: '/app/merchant/reports', icon: '📊' },
    { name: '客户管理', href: '/app/merchant/customers', icon: '👥' },
    { name: '退款管理', href: '/app/merchant/refunds', icon: '🔄' },
    { name: '支付配置', href: '/app/merchant/payment-settings', icon: '⚙️' },
    { name: 'Webhook', href: '/app/merchant/webhooks', icon: '🔔' },
    { name: 'API密钥', href: '/app/merchant/api-keys', icon: '🔐' },
    { name: '商品分析', href: '/app/merchant/product-analytics', icon: '📊' },
  ]

  const menu = userType === 'user' ? userMenu : 
               userType === 'agent' ? agentMenu : 
               merchantMenu

  const getRoleName = () => {
    switch (userType) {
      case 'user': return '用户中心'
      case 'agent': return 'Agent控制台'
      case 'merchant': return '商户后台'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-xl font-bold text-gray-900">
                PayMind
              </Link>
              <span className="text-gray-400">/</span>
              <span className="text-gray-700">{getRoleName()}</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <NotificationCenter />
              {isAuthenticated && user ? (
                <UserMenu />
              ) : (
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
                  <span className="text-gray-500">未登录</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white shadow-sm min-h-screen py-6">
          <nav className="space-y-2 px-4">
            {menu.map((item) => {
              const isActive = router.pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.name}</span>
                </Link>
              )
            })}
            
            {/* Role Switch */}
            <div className="pt-8 border-t border-gray-200">
              <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                切换角色
              </div>
              <Link
                href="/app/dashboard"
                className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
              >
                <span>🔄</span>
                <span>角色选择</span>
              </Link>
            </div>
          </nav>
        </aside>
        {/* Main Content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
