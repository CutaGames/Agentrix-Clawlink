/**
 * 购物车页面
 * 
 * 功能:
 * - 显示购物车商品列表
 * - 支持修改数量、删除商品
 * - 显示总价
 * - 支持批量结算
 */

import Head from 'next/head'
import { useRouter } from 'next/router'
import { useState } from 'react'
import { Navigation } from '../../components/ui/Navigation'
import { Footer } from '../../components/layout/Footer'
import { useCart, CartItem } from '../../contexts/CartContext'
import { orderApi } from '../../lib/api/order.api'

export default function CartPage() {
  const router = useRouter()
  const { 
    items, 
    loading, 
    itemCount, 
    total, 
    currency, 
    updateQuantity, 
    removeItem, 
    clearCart 
  } = useCart()
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())

  const handleLoginClick = () => {
    router.push('/auth/login')
  }

  const handleQuantityChange = async (productId: string, newQuantity: number) => {
    if (newQuantity < 1) return
    await updateQuantity(productId, newQuantity)
  }

  const handleRemoveItem = async (productId: string) => {
    await removeItem(productId)
    setSelectedItems(prev => {
      const next = new Set(prev)
      next.delete(productId)
      return next
    })
  }

  const handleClearCart = async () => {
    if (confirm('确定要清空购物车吗？')) {
      await clearCart()
      setSelectedItems(new Set())
    }
  }

  const toggleSelectItem = (productId: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev)
      if (next.has(productId)) {
        next.delete(productId)
      } else {
        next.add(productId)
      }
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(items.map(item => item.productId)))
    }
  }

  // 计算选中商品的总价
  const selectedTotal = items
    .filter(item => selectedItems.has(item.productId))
    .reduce((sum, item) => sum + (item.product?.price || 0) * item.quantity, 0)

  const selectedCount = items
    .filter(item => selectedItems.has(item.productId))
    .reduce((sum, item) => sum + item.quantity, 0)

  const handleCheckout = async () => {
    if (selectedItems.size === 0) {
      alert('请选择要结算的商品')
      return
    }

    const selectedCartItems = items.filter(item => selectedItems.has(item.productId))
    
    // 如果只选择了一个商品，跳转到单品结算
    if (selectedCartItems.length === 1) {
      const item = selectedCartItems[0]
      router.push(`/pay/checkout?productId=${item.productId}&quantity=${item.quantity}`)
      return
    }

    // 多商品结算 - 跳转到购物车结算页面
    setCheckoutLoading(true)
    try {
      // 将选中的商品ID和数量编码到URL
      const checkoutItems = selectedCartItems.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
      }))
      const itemsParam = encodeURIComponent(JSON.stringify(checkoutItems))
      router.push(`/pay/cart-checkout?items=${itemsParam}`)
    } catch (error: any) {
      console.error('结算失败:', error)
      alert(error.message || '结算失败，请重试')
    } finally {
      setCheckoutLoading(false)
    }
  }

  const getCurrencySymbol = (curr: string) => {
    switch (curr) {
      case 'USD':
      case 'USDT':
      case 'USDC':
        return '$'
      case 'CNY':
        return '¥'
      case 'EUR':
        return '€'
      default:
        return ''
    }
  }

  return (
    <>
      <Head>
        <title>购物车 | Agentrix</title>
        <meta name="description" content="查看和管理您的购物车" />
      </Head>

      <Navigation onLoginClick={handleLoginClick} />

      <main className="min-h-screen bg-slate-950 text-white">
        <div className="container mx-auto px-6 py-12">
          <div className="max-w-4xl mx-auto">
            {/* 标题 */}
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <span className="text-3xl">🛒</span>
                购物车
                {itemCount > 0 && (
                  <span className="text-lg text-slate-400">
                    ({itemCount} 件商品)
                  </span>
                )}
              </h1>
              {items.length > 0 && (
                <button
                  onClick={handleClearCart}
                  className="text-sm text-slate-400 hover:text-red-400 transition-colors"
                >
                  清空购物车
                </button>
              )}
            </div>

            {/* 空购物车 */}
            {items.length === 0 && !loading && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
                <div className="text-6xl mb-4">🛒</div>
                <h2 className="text-xl font-semibold mb-2">购物车是空的</h2>
                <p className="text-slate-400 mb-6">快去商城逛逛吧~</p>
                <button
                  onClick={() => router.push('/marketplace')}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors"
                >
                  去购物
                </button>
              </div>
            )}

            {/* 加载中 */}
            {loading && items.length === 0 && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
                <div className="text-4xl mb-4 animate-spin">⏳</div>
                <p className="text-slate-400">加载中...</p>
              </div>
            )}

            {/* 购物车商品列表 */}
            {items.length > 0 && (
              <div className="space-y-6">
                {/* 全选 */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedItems.size === items.length}
                      onChange={toggleSelectAll}
                      className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-slate-300">全选</span>
                  </label>
                  <span className="text-sm text-slate-400">
                    已选 {selectedItems.size} 件商品
                  </span>
                </div>

                {/* 商品列表 */}
                <div className="space-y-4">
                  {items.map((item) => (
                    <CartItemCard
                      key={item.productId}
                      item={item}
                      selected={selectedItems.has(item.productId)}
                      onSelect={() => toggleSelectItem(item.productId)}
                      onQuantityChange={(qty) => handleQuantityChange(item.productId, qty)}
                      onRemove={() => handleRemoveItem(item.productId)}
                      currencySymbol={getCurrencySymbol(item.product?.currency || currency)}
                    />
                  ))}
                </div>

                {/* 结算栏 */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 sticky bottom-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div className="text-slate-400">
                        已选择 <span className="text-white font-semibold">{selectedCount}</span> 件商品
                      </div>
                      <div className="text-slate-400">
                        合计: 
                        <span className="text-2xl font-bold text-green-400 ml-2">
                          {getCurrencySymbol(currency)}{selectedTotal.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={handleCheckout}
                      disabled={selectedItems.size === 0 || checkoutLoading}
                      className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-lg transition-all shadow-lg"
                    >
                      {checkoutLoading ? (
                        <span className="flex items-center gap-2">
                          <span className="animate-spin">⏳</span>
                          处理中...
                        </span>
                      ) : (
                        `结算 (${selectedItems.size})`
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </>
  )
}

// 购物车商品卡片组件
interface CartItemCardProps {
  item: CartItem
  selected: boolean
  onSelect: () => void
  onQuantityChange: (quantity: number) => void
  onRemove: () => void
  currencySymbol: string
}

function CartItemCard({
  item,
  selected,
  onSelect,
  onQuantityChange,
  onRemove,
  currencySymbol,
}: CartItemCardProps) {
  const product = item.product

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-4">
      {/* 选择框 */}
      <input
        type="checkbox"
        checked={selected}
        onChange={onSelect}
        className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500 flex-shrink-0"
      />

      {/* 商品图片 */}
      <div className="w-20 h-20 rounded-lg overflow-hidden bg-slate-800 flex-shrink-0">
        {product?.image ? (
          <img
            src={product.image}
            alt={product.name || '商品图片'}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl">
            🛍️
          </div>
        )}
      </div>

      {/* 商品信息 */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-white truncate">
          {product?.name || '未知商品'}
        </h3>
        {product?.description && (
          <p className="text-sm text-slate-400 truncate mt-1">
            {product.description}
          </p>
        )}
        <div className="mt-2 flex items-center gap-3">
          <span className="text-lg font-bold text-green-400">
            {currencySymbol}{product?.price?.toFixed(2) || '0.00'}
          </span>
          {product?.currency && (
            <span className="text-xs text-slate-500">{product.currency}</span>
          )}
        </div>
      </div>

      {/* 数量控制 */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onQuantityChange(item.quantity - 1)}
          disabled={item.quantity <= 1}
          className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          -
        </button>
        <span className="w-12 text-center font-semibold">{item.quantity}</span>
        <button
          onClick={() => onQuantityChange(item.quantity + 1)}
          className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center"
        >
          +
        </button>
      </div>

      {/* 小计 */}
      <div className="w-24 text-right">
        <div className="text-lg font-bold text-white">
          {currencySymbol}{((product?.price || 0) * item.quantity).toFixed(2)}
        </div>
      </div>

      {/* 删除按钮 */}
      <button
        onClick={onRemove}
        className="p-2 text-slate-400 hover:text-red-400 transition-colors flex-shrink-0"
        title="删除"
      >
        🗑️
      </button>
    </div>
  )
}
