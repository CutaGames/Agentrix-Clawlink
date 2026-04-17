import { useEffect, useState, useRef } from 'react'
import { useToast } from '../../contexts/ToastContext'

export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'

interface PaymentStatusTrackerProps {
  paymentId: string
  initialStatus?: PaymentStatus
  onStatusChange?: (status: PaymentStatus) => void
  pollInterval?: number
}

export function PaymentStatusTracker({
  paymentId,
  initialStatus = 'pending',
  onStatusChange,
  pollInterval = 3000,
}: PaymentStatusTrackerProps) {
  const [status, setStatus] = useState<PaymentStatus>(initialStatus)
  const [isPolling, setIsPolling] = useState(false)
  const toast = useToast()

  const retryCountRef = useRef(0)
  const maxRetries = 3

  useEffect(() => {
    if (status === 'pending' || status === 'processing') {
      setIsPolling(true)
      retryCountRef.current = 0
      
      const interval = setInterval(async () => {
        try {
          // 调用真实的API检查支付状态
          const { paymentApi } = await import('../../lib/api/payment.api')
          const payment = await paymentApi.getPayment(paymentId)
          
          const newStatus = mapPaymentStatus(payment.status)
          
          if (newStatus !== status) {
            setStatus(newStatus)
            onStatusChange?.(newStatus)
            retryCountRef.current = 0 // 重置重试计数
            
            // 显示状态变化通知
            if (newStatus === 'completed') {
              toast.success('支付成功！')
            } else if (newStatus === 'failed') {
              toast.error('支付失败，请重试')
            } else if (newStatus === 'cancelled') {
              toast.warning('支付已取消')
            }
            
            if (newStatus === 'completed' || newStatus === 'failed' || newStatus === 'cancelled') {
              setIsPolling(false)
              clearInterval(interval)
            }
          }
        } catch (error: any) {
          console.error('检查支付状态失败:', error)
          retryCountRef.current += 1
          
          // 如果重试次数超过限制，停止轮询
          if (retryCountRef.current >= maxRetries) {
            setIsPolling(false)
            clearInterval(interval)
            toast.error('无法获取支付状态，请刷新页面查看')
          }
        }
      }, pollInterval)

      return () => {
        clearInterval(interval)
        setIsPolling(false)
      }
    }
  }, [paymentId, status, pollInterval, onStatusChange, toast])

  // 映射后端状态到前端状态
  const mapPaymentStatus = (backendStatus: string): PaymentStatus => {
    const statusMap: Record<string, PaymentStatus> = {
      'pending': 'pending',
      'processing': 'processing',
      'completed': 'completed',
      'failed': 'failed',
      'cancelled': 'cancelled',
    }
    return statusMap[backendStatus] || 'pending'
  }

  const statusConfig = {
    pending: {
      label: '等待支付',
      color: 'text-yellow-600 bg-yellow-50',
      icon: '⏳',
    },
    processing: {
      label: '处理中',
      color: 'text-blue-600 bg-blue-50',
      icon: '🔄',
    },
    completed: {
      label: '支付成功',
      color: 'text-green-600 bg-green-50',
      icon: '✅',
    },
    failed: {
      label: '支付失败',
      color: 'text-red-600 bg-red-50',
      icon: '❌',
    },
    cancelled: {
      label: '已取消',
      color: 'text-gray-600 bg-gray-50',
      icon: '🚫',
    },
  }

  const config = statusConfig[status]

  return (
    <div className="flex items-center space-x-3">
      <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-2 ${config.color}`}>
        <span>{config.icon}</span>
        <span>{config.label}</span>
        {isPolling && (
          <span className="ml-2">
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </span>
        )}
      </div>
    </div>
  )
}


