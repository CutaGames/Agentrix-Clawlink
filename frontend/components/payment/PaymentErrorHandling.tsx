import { useState } from 'react'

interface PaymentErrorProps {
  errorType: 'insufficient_balance' | 'network_error' | 'user_rejected' | 'timeout' | 'unknown'
  onRetry: () => void
  onCancel: () => void
}

export function PaymentErrorHandling({ errorType, onRetry, onCancel }: PaymentErrorProps) {
  const [showDetails, setShowDetails] = useState(false)

  const errorConfig = {
    insufficient_balance: {
      icon: '💰',
      title: '余额不足',
      description: '您的钱包余额不足以完成此次支付',
      action: '请充值或选择其他支付方式',
      details: '当前余额: ¥1,234.56 | 需要: ¥7,999.00'
    },
    network_error: {
      icon: '🌐',
      title: '网络错误',
      description: '网络连接不稳定，请检查您的网络设置',
      action: '请稍后重试或切换网络',
      details: '错误代码: NETWORK_ERR_001'
    },
    user_rejected: {
      icon: '🙅',
      title: '交易已取消',
      description: '您取消了此次支付交易',
      action: '您可以重新发起支付',
      details: '用户主动取消了交易签名'
    },
    timeout: {
      icon: '⏰',
      title: '交易超时',
      description: '支付处理时间过长，请重试',
      action: '网络拥堵可能导致延迟，请重试',
      details: '交易等待超过30秒未确认'
    },
    unknown: {
      icon: '❓',
      title: '未知错误',
      description: '支付过程中发生了未知错误',
      action: '请联系客服或稍后重试',
      details: '错误ID: ' + Math.random().toString(36).substr(2, 9)
    }
  }

  const config = errorConfig[errorType]

  return (
    <div className="bg-white rounded-2xl p-6 max-w-md mx-auto">
      <div className="text-center">
        <div className="text-6xl mb-4">{config.icon}</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">{config.title}</h3>
        <p className="text-gray-600 mb-4">{config.description}</p>
        <p className="text-sm text-gray-500 mb-6">{config.action}</p>

        <div className="mb-6">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            {showDetails ? '隐藏' : '显示'}错误详情
          </button>
          {showDetails && (
            <div className="mt-2 bg-gray-100 rounded-lg p-3">
              <p className="text-xs text-gray-700 font-mono">{config.details}</p>
            </div>
          )}
        </div>

        <div className="flex space-x-3">
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
          >
            取消
          </button>
          <button
            onClick={onRetry}
            className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            重试支付
          </button>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex justify-center space-x-4 text-sm">
            <button className="text-blue-600 hover:text-blue-700">联系客服</button>
            <button className="text-blue-600 hover:text-blue-700">查看帮助文档</button>
          </div>
        </div>
      </div>
    </div>
  )
}
