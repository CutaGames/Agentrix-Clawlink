import { PaymentRequest, PaymentMethod } from '../../types/payment'
import { PaymentRoutingInfo, PaymentChannel } from '../../types/payment-types'
import { ProductPrice } from '../../lib/api/pricing.api'
import { TaxCalculation } from '../../lib/api/tax.api'

interface PaymentConfirmModalProps {
  payment: PaymentRequest
  selectedMethod: PaymentMethod
  routingInfo?: PaymentRoutingInfo
  productPrice?: ProductPrice | null
  taxCalculation?: TaxCalculation | null
  channelFee?: number
  commissionRate?: number
  onConfirm: () => void
  onCancel: () => void
}

export function PaymentConfirmModal({
  payment,
  selectedMethod,
  routingInfo,
  productPrice,
  taxCalculation,
  channelFee,
  commissionRate,
  onConfirm,
  onCancel,
}: PaymentConfirmModalProps) {
  const amount = parseFloat(
    typeof payment.amount === 'string' 
      ? payment.amount.replace('¥', '').replace(',', '').replace('$', '')
      : String(payment.amount)
  )
  
  // 计算费用明细
  const channelInfo = routingInfo?.channels?.find((c: PaymentChannel) => c.method === selectedMethod.type)
  const fee = channelFee || (channelInfo ? amount * channelInfo.cost : 0)
  
  // 使用产品价格或默认金额
  const baseAmount = productPrice?.amount || amount
  const taxAmount = taxCalculation?.amount || 0
  const total = baseAmount + taxAmount

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">确认支付</h2>
        
        <div className="space-y-4 mb-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">支付信息</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">商品/服务</span>
                <span className="text-gray-900 font-medium">{payment.description}</span>
              </div>
              {payment.merchant && (
                <div className="flex justify-between">
                  <span className="text-gray-600">商户</span>
                  <span className="text-gray-900">{payment.merchant}</span>
                </div>
              )}
              {payment.agent && (
                <div className="flex justify-between">
                  <span className="text-gray-600">推荐Agent</span>
                  <span className="text-gray-900">{payment.agent}</span>
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">费用明细</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              {productPrice ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600">商品价格</span>
                    <span className="text-gray-900 font-medium">
                      {baseAmount.toFixed(2)} {productPrice.currency}
                    </span>
                  </div>
                  {taxAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">
                        税费（{taxCalculation?.taxType} {taxCalculation ? (taxCalculation.rate * 100).toFixed(2) : 0}%）
                      </span>
                      <span className="text-gray-900">
                        {taxAmount.toFixed(2)} {productPrice.currency}
                      </span>
                    </div>
                  )}
                  {channelFee && channelFee > 0 && (
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>通道费用（商户承担）</span>
                      <span>-{channelFee.toFixed(2)} {productPrice.currency}</span>
                    </div>
                  )}
                  {commissionRate && commissionRate > 0 && (
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>佣金（{commissionRate * 100}%）</span>
                      <span>-{(baseAmount * commissionRate).toFixed(2)} {productPrice.currency}</span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600">支付金额</span>
                    <span className="text-gray-900 font-medium">{payment.amount}</span>
                  </div>
                  {fee > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">手续费</span>
                      <span className="text-gray-900">¥{fee.toFixed(2)}</span>
                    </div>
                  )}
                </>
              )}
              <div className="border-t border-gray-200 pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="text-lg font-semibold text-gray-900">总计</span>
                  <span className="text-xl font-bold text-gray-900">
                    {productPrice 
                      ? `${total.toFixed(2)} ${productPrice.currency}`
                      : fee > 0 ? `¥${total.toFixed(2)}` : payment.amount}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">支付方式</h3>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{selectedMethod.icon}</span>
                <div>
                  <div className="font-semibold text-blue-900">{selectedMethod.name}</div>
                  <div className="text-sm text-blue-700">{selectedMethod.description}</div>
                </div>
              </div>
              {routingInfo?.reason && (
                <div className="mt-2 text-xs text-blue-600">
                  💡 {routingInfo.reason}
                </div>
              )}
            </div>
          </div>

          {payment.metadata?.isCrossBorder && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <span className="text-purple-600">🌍</span>
                <div className="text-sm text-purple-700">
                  <div className="font-semibold">跨境支付</div>
                  <div className="mt-1">
                    用户: {payment.metadata.userCountry} → 商户: {payment.metadata.merchantCountry}
                  </div>
                </div>
              </div>
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
            onClick={onConfirm}
            className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            确认支付
          </button>
        </div>
      </div>
    </div>
  )
}

