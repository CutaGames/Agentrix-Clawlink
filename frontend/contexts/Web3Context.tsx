'use client'
import { createContext, useContext, ReactNode, useState, useEffect } from 'react'
import { walletService, WalletInfo, WalletType } from '../lib/wallet/WalletService'

interface Web3ContextType {
  isConnected: boolean
  address?: string
  connectedWallets: WalletInfo[]
  defaultWallet: WalletInfo | null
  connect: (walletType: WalletType) => Promise<WalletInfo>
  disconnect: (walletId?: string) => Promise<void>
  setDefault: (walletId: string) => void
  signMessage?: (message: string) => Promise<string>
  connectors: Array<{
    id: WalletType
    name: string
    icon: string
    description: string
    isInstalled: boolean
  }>
}

const Web3Context = createContext<Web3ContextType | null>(null)

export function Web3Provider({ children }: { children: ReactNode }) {
  const [connectedWallets, setConnectedWallets] = useState<WalletInfo[]>([])
  const [defaultWallet, setDefaultWallet] = useState<WalletInfo | null>(null)

  // 恢复已连接的钱包（仅在客户端）
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    // 如果是管理后台页面，不恢复钱包连接
    if (window.location.pathname.startsWith('/admin')) {
      return
    }
    
    const restoreWallets = async () => {
      try {
        // 检查是否有用户登录，如果没有用户，不恢复钱包连接
        const savedUser = localStorage.getItem('agentrix_user')
        if (!savedUser) {
          // 没有用户登录，清除所有钱包连接
          setConnectedWallets([])
          setDefaultWallet(null)
          return
        }
        
        // 静默恢复钱包连接，捕获所有错误（包括 MetaMask 未安装的情况）
        try {
          const restored = await walletService.restoreConnections()
          setConnectedWallets(restored)
          setDefaultWallet(walletService.getDefaultWallet())
        } catch (restoreError: any) {
          // 如果是 MetaMask 相关的错误，静默处理
          const errorMessage = restoreError?.message || restoreError?.toString() || ''
          const isMetaMaskError = 
            errorMessage.includes('Failed to connect to MetaMask') ||
            errorMessage.includes('MetaMask extension not found') ||
            errorMessage.includes('MetaMask')
          
          if (isMetaMaskError) {
            // MetaMask 错误是正常的（用户可能没有安装），静默处理
            console.warn('MetaMask 连接失败（这是正常的，如果用户没有安装 MetaMask）:', restoreError)
            // 清除 MetaMask 的存储，避免下次再尝试
            const stored = JSON.parse(localStorage.getItem('agentrix_wallets') || '[]')
            const filtered = stored.filter((w: any) => w.type !== 'metamask')
            localStorage.setItem('agentrix_wallets', JSON.stringify(filtered))
          } else {
            // 其他错误才记录
            if (!window.location.pathname.startsWith('/admin')) {
              console.error('恢复钱包连接失败:', restoreError)
            }
          }
        }
      } catch (error) {
        // 静默处理错误，避免在管理后台显示错误
        if (!window.location.pathname.startsWith('/admin')) {
          console.error('恢复钱包连接失败:', error)
        }
      }
    }

    restoreWallets()
  }, [])

  // 获取可用的连接器
  const connectors = walletService.getAvailableConnectors().map(connector => ({
    id: connector.id,
    name: connector.name,
    icon: connector.icon,
    description: connector.description,
    isInstalled: connector.isInstalled()
  }))

  const connect = async (walletType: WalletType): Promise<WalletInfo> => {
    try {
      console.log('开始连接钱包:', walletType)
      const walletInfo = await walletService.connectWallet(walletType)
      console.log('钱包连接成功:', walletInfo)
      
      setConnectedWallets(prev => {
        const updated = [...prev.filter(w => w.id !== walletInfo.id), walletInfo]
        return updated
      })
      
      // 如果是第一个连接的钱包，设为默认
      if (connectedWallets.length === 0) {
        walletService.setDefaultWallet(walletInfo.id)
        setDefaultWallet(walletInfo)
      } else if (!defaultWallet) {
        setDefaultWallet(walletInfo)
      }
      
      // 触发地址更新
      if (walletInfo.address) {
        // 通过更新状态来触发address更新
        setDefaultWallet(walletInfo)
      }
      return walletInfo
    } catch (error: any) {
      console.error('钱包连接失败:', error)
      throw error
    }
  }

  const disconnect = async (walletId?: string) => {
    try {
      if (walletId) {
        await walletService.disconnectWallet(walletId)
        setConnectedWallets(prev => prev.filter(w => w.id !== walletId))
        
        // 如果断开的是默认钱包，重新选择默认钱包
        if (defaultWallet?.id === walletId) {
          const remaining = connectedWallets.filter(w => w.id !== walletId)
          if (remaining.length > 0) {
            const newDefault = remaining[0]
            walletService.setDefaultWallet(newDefault.id)
            setDefaultWallet(newDefault)
          } else {
            setDefaultWallet(null)
          }
        }
      } else {
        // 断开所有钱包
        for (const wallet of connectedWallets) {
          try {
            await walletService.disconnectWallet(wallet.id)
          } catch (error) {
            console.error(`断开钱包 ${wallet.id} 失败:`, error)
          }
        }
        setConnectedWallets([])
        setDefaultWallet(null)
        
        // 清除localStorage中的钱包数据
        if (typeof window !== 'undefined') {
          localStorage.removeItem('agentrix_wallets')
          localStorage.removeItem('agentrix_default_wallet')
        }
      }
    } catch (error) {
      console.error('断开钱包连接失败:', error)
      throw error
    }
  }

  const setDefault = (walletId: string) => {
    walletService.setDefaultWallet(walletId)
    const wallet = connectedWallets.find(w => w.id === walletId)
    if (wallet) {
      setDefaultWallet(wallet)
    }
  }

  const signMessage = async (message: string): Promise<string> => {
    if (!defaultWallet) {
      throw new Error('No wallet connected')
    }
    try {
      return await walletService.signMessage(defaultWallet, message)
    } catch (error: any) {
      console.error('签名失败:', error)
      throw error
    }
  }

  const isConnected = connectedWallets.length > 0
  const address = defaultWallet?.address

  return (
    <Web3Context.Provider
      value={{
        isConnected,
        address,
        connectedWallets,
        defaultWallet,
        connect,
        disconnect,
        setDefault,
        signMessage,
        connectors,
      }}
    >
      {children}
    </Web3Context.Provider>
  )
}

export function useWeb3() {
  const context = useContext(Web3Context)
  if (!context) {
    throw new Error('useWeb3 must be used within a Web3Provider')
  }
  return context
}
