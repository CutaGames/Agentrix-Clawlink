export function WalletConnect() {
  const wallets = [
    { name: 'MetaMask', icon: '🦊', description: '以太坊生态系统' },
    { name: 'WalletConnect', icon: '🔗', description: '多链钱包连接' },
    { name: 'Phantom', icon: '👻', description: 'Solana生态系统' },
    { name: 'OKX Wallet', icon: '🔶', description: '多链支持' }
  ]

  return (
    <div className="space-y-3">
      {wallets.map((wallet, index) => (
        <button
          key={index}
          className="w-full flex items-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-left"
        >
          <span className="text-2xl mr-4">{wallet.icon}</span>
          <div>
            <div className="font-semibold text-gray-900">{wallet.name}</div>
            <div className="text-sm text-gray-500">{wallet.description}</div>
          </div>
        </button>
      ))}
      
      <div className="text-xs text-gray-500 text-center mt-4">
        连接钱包即代表您已阅读并同意我们的服务条款
      </div>
    </div>
  )
}
