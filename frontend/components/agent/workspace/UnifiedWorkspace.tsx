import { useState, useCallback } from 'react'
import { useUser } from '../../../contexts/UserContext'
import { useAgentMode } from '../../../contexts/AgentModeContext'
import { UserModule } from './UserModule'
import { MerchantModule } from './MerchantModule'
import { DeveloperModule } from './DeveloperModule'
import { CommandHandler } from './CommandHandler'
import { RoleSwitcher } from './RoleSwitcher'
import { AgentChatEnhanced } from '../AgentChatEnhanced'
import { useLocalization } from '../../../contexts/LocalizationContext'

export type WorkspaceView = 'chat' | 'user' | 'merchant' | 'developer' | 'marketplace' | 'autoEarn' | 'cart' | 'code' | 'sandbox' | 'orders' | 'referral'

interface UnifiedWorkspaceProps {
  onAction?: (action: string, data?: any) => void
}

/**
 * 统一工作台组件
 * 集成用户、商户、开发者所有后台功能
 * 支持对话式操作和角色切换
 */
export function UnifiedWorkspace({ onAction }: UnifiedWorkspaceProps) {
  const { user, isAuthenticated } = useUser()
  const { mode, setMode } = useAgentMode()
  const { t } = useLocalization()
  const [currentView, setCurrentView] = useState<WorkspaceView>('chat')
  const [commandHistory, setCommandHistory] = useState<Array<{ command: string; result: any }>>([])

  // 检测用户角色
  const userRoles = {
    isUser: !!(isAuthenticated && user),
    isMerchant: !!(isAuthenticated && user?.roles?.includes('merchant' as any)),
    isDeveloper: !!(isAuthenticated && user?.roles?.includes('developer' as any)),
  }

  // 处理对话命令
  const handleCommand = useCallback((command: string, data?: any) => {
    const handler = new CommandHandler(userRoles, mode)
    const result = handler.processCommand(command, data)
    
    setCommandHistory(prev => [...prev, { command, result }])
    
    // 根据命令结果切换视图
    if (result.view) {
      setCurrentView(result.view as WorkspaceView)
    }
    
    // 执行操作
    if (result.action && onAction) {
      onAction(result.action, result.data)
    }
    
    return result
  }, [userRoles, mode, onAction])

  // 处理角色切换
  const handleRoleSwitch = useCallback((newMode: 'personal' | 'merchant' | 'developer') => {
    setMode(newMode)
    // 根据角色切换到相应视图
    if (newMode === 'merchant' && userRoles.isMerchant) {
      setCurrentView('merchant')
    } else if (newMode === 'developer' && userRoles.isDeveloper) {
      setCurrentView('developer')
    } else {
      setCurrentView('chat')
    }
  }, [setMode, userRoles])

  return (
    <div className="flex h-full bg-slate-950 text-white">
      {/* 左侧：角色切换和快捷功能 */}
      <div className="w-64 border-r border-white/10 bg-slate-900/50">
        <RoleSwitcher
          currentMode={mode}
          userRoles={userRoles}
          onRoleSwitch={handleRoleSwitch}
          onViewChange={setCurrentView}
        />
      </div>

      {/* 中间：主工作区 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 顶部导航 */}
        <div className="border-b border-white/10 bg-slate-900/50 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-lg font-semibold">
                {currentView === 'chat' && t({ zh: '对话工作台', en: 'Conversation Workspace' })}
                {currentView === 'user' && t({ zh: '用户中心', en: 'User Center' })}
                {currentView === 'merchant' && t({ zh: '商户后台', en: 'Merchant Backend' })}
                {currentView === 'developer' && t({ zh: '开发者工具', en: 'Developer Tools' })}
                {currentView === 'marketplace' && t({ zh: '商品市场', en: 'Marketplace' })}
                {currentView === 'autoEarn' && t({ zh: 'Auto-Earn', en: 'Auto-Earn' })}
                {currentView === 'orders' && t({ zh: '订单中心', en: 'Order Center' })}
              </h2>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentView('chat')}
                className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                  currentView === 'chat'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                {t({ zh: '对话', en: 'Chat' })}
              </button>
            </div>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto">
          {currentView === 'chat' && (
            <AgentChatEnhanced
              onProductSelect={() => setCurrentView('marketplace')}
              onOrderQuery={() => setCurrentView('orders')}
              onCodeGenerate={() => setCurrentView('code')}
              onAction={(action, data) => {
                handleCommand(action, data)
                if (onAction) onAction(action, data)
              }}
            />
          )}

          {currentView === 'user' && userRoles.isUser && (
            <UserModule onCommand={handleCommand} />
          )}

          {currentView === 'merchant' && (
            <MerchantModule onCommand={handleCommand} />
          )}

          {currentView === 'developer' && (
            <DeveloperModule onCommand={handleCommand} />
          )}

          {/* 其他视图保持原有逻辑 */}
          {currentView !== 'chat' && currentView !== 'user' && currentView !== 'merchant' && currentView !== 'developer' && (
            <div className="p-6">
              <p className="text-slate-400">{t({ zh: '视图切换中...', en: 'Switching view...' })}</p>
            </div>
          )}
        </div>
      </div>

      {/* 右侧：数据面板 */}
      <div className="w-80 border-l border-white/10 bg-slate-900/50">
        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-slate-400 mb-3">
              {t({ zh: '实时数据', en: 'Real-time Data' })}
            </h3>
            <div className="space-y-3">
              {mode === 'personal' && (
                <>
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-xs text-slate-400 mb-1">{t({ zh: '今日支付', en: 'Today Payments' })}</p>
                    <p className="text-lg font-semibold">¥0</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-xs text-slate-400 mb-1">{t({ zh: '钱包余额', en: 'Wallet Balance' })}</p>
                    <p className="text-lg font-semibold">¥0</p>
                  </div>
                </>
              )}
              {mode === 'merchant' && (
                <>
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-xs text-slate-400 mb-1">{t({ zh: '今日GMV', en: 'Today GMV' })}</p>
                    <p className="text-lg font-semibold">¥0</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-xs text-slate-400 mb-1">{t({ zh: '待结算', en: 'Pending Settlement' })}</p>
                    <p className="text-lg font-semibold">¥0</p>
                  </div>
                </>
              )}
              {mode === 'developer' && (
                <>
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-xs text-slate-400 mb-1">{t({ zh: 'API调用/24h', en: 'API Calls/24h' })}</p>
                    <p className="text-lg font-semibold">0</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-xs text-slate-400 mb-1">{t({ zh: '今日收益', en: 'Today Revenue' })}</p>
                    <p className="text-lg font-semibold">¥0</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 命令历史 */}
          {commandHistory.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-400 mb-3">
                {t({ zh: '最近操作', en: 'Recent Actions' })}
              </h3>
              <div className="space-y-2">
                {commandHistory.slice(-5).map((item, idx) => (
                  <div key={idx} className="bg-white/5 rounded-lg p-2 text-xs">
                    <p className="text-slate-300">{item.command}</p>
                    {item.result.message && (
                      <p className="text-slate-400 mt-1">{item.result.message}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

