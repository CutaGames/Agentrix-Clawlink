import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useUser } from '../../contexts/UserContext'
import { useWeb3 } from '../../contexts/Web3Context'
import { useToast } from '../../contexts/ToastContext'
import Link from 'next/link'

export function UserMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const { user, logout, isAuthenticated } = useUser()
  const { disconnect, isConnected } = useWeb3()
  const router = useRouter()
  const toast = useToast()

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleLogout = async () => {
    try {
      setIsOpen(false)
      
      // 先断开所有Web3连接
      if (isConnected) {
        try {
          await disconnect() // 断开所有钱包
        } catch (error) {
          console.error('断开钱包连接失败:', error)
          // 即使断开失败，也继续执行logout
        }
      }
      
      // 执行登出（会清除所有用户数据和钱包数据）
      await logout()
      
      toast.success('已退出登录')
      
      // 等待状态更新
      await new Promise(resolve => setTimeout(resolve, 200))
      
      // 强制刷新页面以确保所有状态清除（包括Web3Context的恢复逻辑）
      window.location.href = '/'
    } catch (error) {
      console.error('Logout failed:', error)
      toast.error('退出登录失败，请重试')
    }
  }

  if (!isAuthenticated || !user) {
    return null
  }

  // 显示的用户标识
  const displayIdentifier = user.agentrixId || user.walletAddress || user.email || 'User'
  const displayType = user.agentrixId ? 'AX ID' : 
                     user.walletAddress ? 'Wallet' : 
                     user.email ? 'Email' : 'User'

  // 格式化显示
  const formatDisplay = (value: string, type: string) => {
    if (type === 'Wallet' && value.length > 10) {
      return `${value.slice(0, 6)}...${value.slice(-4)}`
    }
    if (type === 'AX ID') {
      return value
    }
    return value
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors"
      >
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
          {user.agentrixId?.slice(0, 2) || user.email?.slice(0, 2).toUpperCase() || 'U'}
        </div>
        <div className="text-left hidden md:block">
          <div className="text-sm font-medium text-white">
            {formatDisplay(displayIdentifier, displayType)}
          </div>
          <div className="text-xs text-slate-400">{displayType}</div>
        </div>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-slate-900 rounded-lg shadow-xl border border-white/10 py-2 z-50">
          {/* 用户信息 */}
          <div className="px-4 py-3 border-b border-white/10">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                {user.agentrixId?.slice(0, 2) || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-white truncate">
                  {user.agentrixId && (
                    <div>
                      <div className="text-xs text-blue-400 font-semibold mb-1">AX ID</div>
                      <div className="font-mono text-xs text-cyan-300 bg-slate-800/50 px-2 py-1 rounded">{user.agentrixId}</div>
                    </div>
                  )}
                </div>
                {user.walletAddress && (
                  <div className="text-xs text-slate-300 mt-1 font-mono">
                    {user.walletAddress.slice(0, 6)}...{user.walletAddress.slice(-4)}
                  </div>
                )}
                {user.email && (
                  <div className="text-xs text-slate-300 mt-1">{user.email}</div>
                )}
              </div>
            </div>
          </div>

          {/* 菜单项 */}
          <div className="py-1">
            <Link
              href="/workbench"
              onClick={() => setIsOpen(false)}
              className="block px-4 py-2 text-sm text-slate-300 hover:bg-white/5"
            >
              <div className="flex items-center space-x-2">
                <span>🧭</span>
                <span>工作台</span>
              </div>
            </Link>
            <div className="border-t border-white/10 my-1"></div>
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-400/10"
            >
              <div className="flex items-center space-x-2">
                <span>🚪</span>
                <span>退出登录</span>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

