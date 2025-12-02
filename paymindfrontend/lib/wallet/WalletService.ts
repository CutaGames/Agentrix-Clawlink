/**
 * 多钱包连接服务
 * 支持 MetaMask, WalletConnect v2, Phantom (Solana), OKX Wallet
 */

export type WalletType = 'metamask' | 'walletconnect' | 'phantom' | 'okx'
export type ChainType = 'evm' | 'solana'

export interface WalletInfo {
  id: string
  type: WalletType
  name: string
  address: string
  chain: ChainType
  chainId?: string | number
  isConnected: boolean
  balance?: string
  icon?: string
}

export interface WalletConnector {
  id: WalletType
  name: string
  icon: string
  description: string
  chain: ChainType
  isInstalled: () => boolean
  connect: () => Promise<WalletInfo>
  disconnect: () => Promise<void>
  getAccounts: () => Promise<string[]>
  signMessage?: (message: string, wallet?: WalletInfo) => Promise<string>
}

const getEthereumProvider = (predicate: (provider: any) => boolean) => {
  if (typeof window === 'undefined') return undefined
  const { ethereum } = window as any
  if (!ethereum) return undefined

  if (ethereum.providers?.length) {
    const found = ethereum.providers.find((provider: any) => predicate(provider))
    if (found) {
      return found
    }
  }

  return predicate(ethereum) ? ethereum : undefined
}

const getMetaMaskProvider = () => {
  if (typeof window === 'undefined') return undefined
  
  const { ethereum } = window as any
  if (!ethereum) return undefined

  // 优先检查 window.okxwallet，如果存在则排除它
  const okxwallet = (window as any).okxwallet
  if (okxwallet) {
    // 如果ethereum是okxwallet注入的，需要排除
    if (ethereum === okxwallet || ethereum === okxwallet.ethereum) {
      // 如果有多个providers，尝试找到MetaMask
      if (ethereum.providers?.length) {
        const metamaskProvider = ethereum.providers.find((p: any) => {
          // 严格检查：必须是MetaMask且不是OKX
          return p.isMetaMask === true && 
                 !p.isOkxWallet && 
                 !p.isOKExWallet && 
                 !p.isOkxwallet &&
                 p !== okxwallet &&
                 p !== okxwallet.ethereum &&
                 !p.constructor?.name?.includes('Okx') &&
                 !p.constructor?.name?.includes('OKX')
        })
        return metamaskProvider
      }
      return undefined // 如果ethereum就是okxwallet，且没有providers，返回undefined
    }
  }

  // 如果有多个providers，需要找到MetaMask
  if (ethereum.providers?.length) {
    const metamaskProvider = ethereum.providers.find((p: any) => {
      // 严格检查：必须是MetaMask且不是OKX
      return p.isMetaMask === true && 
             !p.isOkxWallet && 
             !p.isOKExWallet && 
             !p.isOkxwallet &&
             p !== okxwallet &&
             p !== okxwallet?.ethereum &&
             !p.constructor?.name?.includes('Okx') &&
             !p.constructor?.name?.includes('OKX')
    })
    return metamaskProvider
  }

  // 单个provider的情况，需要严格检查
  if (ethereum.isMetaMask === true) {
    // 再次确认不是OKX钱包
    if (ethereum.isOkxWallet || ethereum.isOKExWallet || ethereum.isOkxwallet) {
      return undefined
    }
    if (ethereum === okxwallet || ethereum === okxwallet?.ethereum) {
      return undefined
    }
    if (ethereum.constructor?.name?.includes('Okx') || ethereum.constructor?.name?.includes('OKX')) {
      return undefined
    }
    return ethereum
  }

  return undefined
}

const getOKXProvider = () => {
  if (typeof window === 'undefined') return undefined
  
  // 优先检查 okxwallet 对象
  const okxwallet = (window as any).okxwallet
  if (okxwallet?.ethereum) {
    return okxwallet.ethereum
  }
  
  // 检查 window.okxwallet 是否存在（即使没有ethereum属性）
  if (okxwallet) {
    return okxwallet
  }
  
  // 最后检查 ethereum.providers 中的 OKX 钱包
  return getEthereumProvider(
    (provider) =>
      !!provider?.isOkxWallet || 
      !!provider?.isOKExWallet || 
      !!provider?.isOkxwallet ||
      (provider?.isMetaMask === false && provider?.constructor?.name?.includes('Okx')) ||
      (provider?.constructor?.name?.includes('OKX'))
  )
}

// MetaMask 连接器
export class MetaMaskConnector implements WalletConnector {
  id: WalletType = 'metamask'
  name = 'MetaMask'
  icon = '🦊'
  description = '以太坊生态系统钱包'
  chain: ChainType = 'evm'

  isInstalled(): boolean {
    if (typeof window === 'undefined') return false
    
    const provider = getMetaMaskProvider()
    return !!provider && (provider.isMetaMask === true)
  }

  async connect(): Promise<WalletInfo> {
    if (typeof window === 'undefined') {
      throw new Error('请在浏览器环境中使用')
    }

    const okxwallet = (window as any).okxwallet
    const provider = getMetaMaskProvider()
    if (!provider) {
      if (okxwallet) {
        throw new Error('检测到 OKX Wallet 接管了浏览器注入。如需继续，请在登录弹窗选择“OKX Wallet”或使用 WalletConnect。')
      }
      throw new Error('请先安装 MetaMask 扩展。如果已安装，请刷新页面后重试。')
    }

    try {
      const accounts = await provider.request({ method: 'eth_requestAccounts' })
      if (!accounts || accounts.length === 0) {
        throw new Error('未获取到账户')
      }

      const chainId = await provider.request({ method: 'eth_chainId' })

      return {
        id: `metamask-${accounts[0]}`,
        type: 'metamask',
        name: 'MetaMask',
        address: accounts[0],
        chain: 'evm',
        chainId: parseInt(chainId, 16),
        isConnected: true,
        icon: '🦊'
      }
    } catch (error: any) {
      if (error.code === 4001) {
        throw new Error('用户拒绝了连接请求')
      }
      throw new Error(error.message || 'MetaMask 连接失败，请确认已在浏览器中启用扩展或尝试 WalletConnect。')
    }
  }

  async disconnect(): Promise<void> {
    // MetaMask 不支持程序化断开，需要用户手动断开
    console.log('MetaMask断开连接')
  }

  async getAccounts(): Promise<string[]> {
    const ethereum = getMetaMaskProvider()
    if (!ethereum) return []
    try {
      return await ethereum.request({ method: 'eth_accounts' })
    } catch {
      return []
    }
  }

  async signMessage(message: string, wallet?: WalletInfo): Promise<string> {
    if (!this.isInstalled()) {
      throw new Error('MetaMask 不可用')
    }
    const ethereum = getMetaMaskProvider()
    if (!ethereum) {
      throw new Error('未检测到MetaMask Provider')
    }
    const accounts =
      wallet?.address && wallet.address.length > 0
        ? [wallet.address]
        : await ethereum.request({ method: 'eth_requestAccounts' })
    if (!accounts || accounts.length === 0) {
      throw new Error('未获取到钱包地址')
    }
    return ethereum.request({
      method: 'personal_sign',
      params: [message, accounts[0]],
    })
  }
}

// WalletConnect v2 连接器
export class WalletConnectConnector implements WalletConnector {
  id: WalletType = 'walletconnect'
  name = 'WalletConnect'
  icon = '🔗'
  description = '多链钱包连接协议'
  chain: ChainType = 'evm'
  private provider: any = null

  isInstalled(): boolean {
    return true // WalletConnect 不需要安装扩展
  }

  async connect(): Promise<WalletInfo> {
    try {
      const { EthereumProvider } = await import('@walletconnect/ethereum-provider')
      
      const provider = await EthereumProvider.init({
        projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo-project-id',
        chains: [1, 137, 56], // Ethereum, Polygon, BSC
        showQrModal: true,
        metadata: {
          name: 'PayMind',
          description: 'AI经济时代的支付协议层',
          url: typeof window !== 'undefined' ? window.location.origin : '',
          icons: []
        }
      })

      await provider.enable()
      this.provider = provider

      const accounts = provider.accounts
      if (!accounts || accounts.length === 0) {
        throw new Error('未获取到账户')
      }

      return {
        id: `walletconnect-${accounts[0]}`,
        type: 'walletconnect',
        name: 'WalletConnect',
        address: accounts[0],
        chain: 'evm',
        chainId: provider.chainId,
        isConnected: true,
        icon: '🔗'
      }
    } catch (error: any) {
      if (error.message?.includes('User rejected')) {
        throw new Error('用户拒绝了连接请求')
      }
      throw new Error(error.message || 'WalletConnect连接失败')
    }
  }

  async disconnect(): Promise<void> {
    if (this.provider) {
      await this.provider.disconnect()
      this.provider = null
    }
  }

  async getAccounts(): Promise<string[]> {
    if (!this.provider) return []
    return this.provider.accounts || []
  }

  async signMessage(message: string, wallet?: WalletInfo): Promise<string> {
    if (!this.provider) {
      throw new Error('WalletConnect 会话未建立，请重新连接钱包')
    }
    const account =
      wallet?.address ||
      (this.provider.accounts && this.provider.accounts.length > 0
        ? this.provider.accounts[0]
        : null)
    if (!account) {
      throw new Error('未获取到钱包地址')
    }
    return this.provider.request({
      method: 'personal_sign',
      params: [message, account],
    })
  }
}

// Phantom (Solana) 连接器
export class PhantomConnector implements WalletConnector {
  id: WalletType = 'phantom'
  name = 'Phantom'
  icon = '👻'
  description = 'Solana生态系统钱包'
  chain: ChainType = 'solana'
  private provider: any = null

  isInstalled(): boolean {
    if (typeof window === 'undefined') return false
    return !!(window as any).solana?.isPhantom
  }

  async connect(): Promise<WalletInfo> {
    if (!this.isInstalled()) {
      throw new Error('请先安装Phantom扩展')
    }

    const solana = (window as any).solana
    try {
      const response = await solana.connect()
      this.provider = solana

      return {
        id: `phantom-${response.publicKey.toString()}`,
        type: 'phantom',
        name: 'Phantom',
        address: response.publicKey.toString(),
        chain: 'solana',
        isConnected: true,
        icon: '👻'
      }
    } catch (error: any) {
      if (error.code === 4001) {
        throw new Error('用户拒绝了连接请求')
      }
      throw new Error(error.message || 'Phantom连接失败')
    }
  }

  async disconnect(): Promise<void> {
    if (this.provider) {
      try {
        await this.provider.disconnect()
      } catch (error) {
        console.error('Phantom断开连接失败:', error)
      }
      this.provider = null
    }
  }

  async getAccounts(): Promise<string[]> {
    if (!this.provider) return []
    try {
      const response = await this.provider.connect({ onlyIfTrusted: true })
      return [response.publicKey.toString()]
    } catch {
      return []
    }
  }

  async signMessage(message: string): Promise<string> {
    if (!this.isInstalled()) {
      throw new Error('Phantom 不可用')
    }
    const provider = this.provider || (window as any).solana
    if (!provider) {
      throw new Error('Phantom 提供者不可用')
    }
    const encodedMessage = new TextEncoder().encode(message)
    const response = await provider.signMessage(encodedMessage, 'utf8')
    const signatureBytes: Uint8Array = response.signature || response
    return Array.from(signatureBytes)
      .map((byte: number) => byte.toString(16).padStart(2, '0'))
      .join('')
  }
}

// OKX Wallet 连接器
export class OKXConnector implements WalletConnector {
  id: WalletType = 'okx'
  name = 'OKX Wallet'
  icon = '🔶'
  description = '多链支持钱包'
  chain: ChainType = 'evm'

  isInstalled(): boolean {
    if (typeof window === 'undefined') return false
    
    // 检查 window.okxwallet 是否存在
    const okxwallet = (window as any).okxwallet
    if (okxwallet) {
      return true
    }
    
    // 检查 ethereum.providers 中是否有 OKX 钱包
    const provider = getOKXProvider()
    return !!provider
  }

  async connect(): Promise<WalletInfo> {
    if (!this.isInstalled()) {
      throw new Error('请先安装OKX Wallet扩展。如果已安装，请刷新页面后重试。')
    }

    const okxwallet = getOKXProvider()
    if (!okxwallet) {
      throw new Error('未检测到OKX Wallet Provider，请确认插件已启用')
    }
    try {
      const accounts = await okxwallet.request({ method: 'eth_requestAccounts' })
      if (!accounts || accounts.length === 0) {
        throw new Error('未获取到账户')
      }

      const chainId = await okxwallet.request({ method: 'eth_chainId' })

      return {
        id: `okx-${accounts[0]}`,
        type: 'okx',
        name: 'OKX Wallet',
        address: accounts[0],
        chain: 'evm',
        chainId: parseInt(chainId, 16),
        isConnected: true,
        icon: '🔶'
      }
    } catch (error: any) {
      if (error.code === 4001) {
        throw new Error('用户拒绝了连接请求')
      }
      throw new Error(error.message || 'OKX Wallet连接失败')
    }
  }

  async disconnect(): Promise<void> {
    console.log('OKX Wallet断开连接')
  }

  async getAccounts(): Promise<string[]> {
    const okxwallet = getOKXProvider()
    if (!okxwallet) return []
    try {
      return await okxwallet.request({ method: 'eth_accounts' })
    } catch {
      return []
    }
  }

  async signMessage(message: string, wallet?: WalletInfo): Promise<string> {
    if (!this.isInstalled()) {
      throw new Error('OKX Wallet 不可用')
    }
    const okxwallet = getOKXProvider()
    if (!okxwallet) {
      throw new Error('未检测到OKX Wallet Provider')
    }
    const accounts =
      wallet?.address && wallet.address.length > 0
        ? [wallet.address]
        : await okxwallet.request({ method: 'eth_requestAccounts' })
    if (!accounts || accounts.length === 0) {
      throw new Error('未获取到钱包地址')
    }
    return okxwallet.request({
      method: 'personal_sign',
      params: [message, accounts[0]],
    })
  }
}

// 钱包服务管理器
export class WalletService {
  private connectors: Map<WalletType, WalletConnector> = new Map()
  private connectedWallets: Map<string, WalletInfo> = new Map()

  constructor() {
    this.connectors.set('metamask', new MetaMaskConnector())
    this.connectors.set('walletconnect', new WalletConnectConnector())
    this.connectors.set('phantom', new PhantomConnector())
    this.connectors.set('okx', new OKXConnector())
  }

  getAvailableConnectors(): WalletConnector[] {
    return Array.from(this.connectors.values())
  }

  getConnector(type: WalletType): WalletConnector | undefined {
    return this.connectors.get(type)
  }

  async connectWallet(type: WalletType): Promise<WalletInfo> {
    const connector = this.connectors.get(type)
    if (!connector) {
      throw new Error(`不支持的钱包类型: ${type}`)
    }

    const walletInfo = await connector.connect()
    this.connectedWallets.set(walletInfo.id, walletInfo)
    
    // 保存到本地存储
    if (typeof window !== 'undefined') {
      const stored: WalletInfo[] = JSON.parse(localStorage.getItem('paymind_wallets') || '[]')
      const filtered = stored.filter((w) => w.id !== walletInfo.id && w.address !== walletInfo.address)
      filtered.push(walletInfo)
      localStorage.setItem('paymind_wallets', JSON.stringify(filtered))
    }

    return walletInfo
  }

  async disconnectWallet(walletId: string): Promise<void> {
    const wallet = this.connectedWallets.get(walletId)
    if (wallet) {
      const connector = this.connectors.get(wallet.type)
      if (connector) {
        await connector.disconnect()
      }
      this.connectedWallets.delete(walletId)
      
      // 更新本地存储
      if (typeof window !== 'undefined') {
        const stored = JSON.parse(localStorage.getItem('paymind_wallets') || '[]')
        const filtered = stored.filter((w: WalletInfo) => w.id !== walletId)
        localStorage.setItem('paymind_wallets', JSON.stringify(filtered))
      }
    }
  }

  getConnectedWallets(): WalletInfo[] {
    return Array.from(this.connectedWallets.values())
  }

  async restoreConnections(): Promise<WalletInfo[]> {
    if (typeof window === 'undefined') return []

    try {
      const stored = JSON.parse(localStorage.getItem('paymind_wallets') || '[]')
      const restored: WalletInfo[] = []

      for (const wallet of stored) {
        const connector = this.connectors.get(wallet.type)
        if (connector) {
          try {
            const accounts = await connector.getAccounts()
            if (accounts.length > 0) {
              wallet.address = accounts[0]
              wallet.isConnected = true
              this.connectedWallets.set(wallet.id, wallet)
              restored.push(wallet)
            }
          } catch {
            // 连接失败，跳过
          }
        }
      }

      return restored
    } catch (error) {
      console.error('恢复钱包连接失败:', error)
      return []
    }
  }

  setDefaultWallet(walletId: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('paymind_default_wallet', walletId)
    }
  }

  getDefaultWallet(): WalletInfo | null {
    const wallets = this.getConnectedWallets()
    if (wallets.length === 0) return null

    if (typeof window !== 'undefined') {
      const defaultId = localStorage.getItem('paymind_default_wallet')
      if (defaultId) {
        const wallet = wallets.find(w => w.id === defaultId)
        if (wallet) return wallet
      }
    }

    return wallets[0] // 返回第一个连接的钱包
  }

  async signMessage(wallet: WalletInfo, message: string): Promise<string> {
    const connector = this.connectors.get(wallet.type)
    if (!connector || !connector.signMessage) {
      throw new Error('当前钱包暂不支持签名，请使用支持签名的钱包')
    }
    return connector.signMessage(message, wallet)
  }
}

// 单例实例
export const walletService = new WalletService()

