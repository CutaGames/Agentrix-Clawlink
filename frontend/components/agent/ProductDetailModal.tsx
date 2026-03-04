import { useState } from 'react';
import { X, ShoppingCart, Plus, Minus, Zap } from 'lucide-react';
import { ProductInfo } from '../../lib/api/product.api';

interface ProductDetailModalProps {
  product: ProductInfo;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (productId: string, quantity: number) => Promise<void>;
  sessionId?: string;
}

export function ProductDetailModal({
  product,
  isOpen,
  onClose,
  onAddToCart,
  sessionId,
}: ProductDetailModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);

  if (!isOpen) return null;

  const handleAddToCart = async () => {
    setIsAdding(true);
    try {
      await onAddToCart(product.id, quantity);
      // 成功后可以显示提示或关闭弹窗
      onClose();
    } catch (error) {
      console.error('加入购物车失败:', error);
      alert('加入购物车失败，请稍后重试');
    } finally {
      setIsAdding(false);
    }
  };

  const currency = (product as any)?.currency || product.metadata?.currency || 'CNY';
  const priceDisplay = currency === 'CNY' ? '¥' : currency === 'USD' ? '$' : '';
  const image = product.metadata?.image || '';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-slate-700">
        {/* 头部 */}
        <div className="sticky top-0 bg-slate-900 border-b border-slate-700 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-white">商品详情</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
            aria-label="关闭"
          >
            <X size={24} />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* 商品图片 */}
            <div className="bg-slate-800 rounded-lg overflow-hidden">
              {image ? (
                <img
                  src={image}
                  alt={product.name}
                  className="w-full h-full object-cover min-h-[300px]"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/images/product-placeholder.png';
                  }}
                />
              ) : (
                <div className="w-full h-[300px] flex items-center justify-center text-slate-500">
                  <div className="text-6xl">📦</div>
                </div>
              )}
            </div>

            {/* 商品信息 */}
            <div className="space-y-4">
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">{product.name}</h3>
                {product.description && (
                  <p className="text-slate-300 text-sm leading-relaxed">{product.description}</p>
                )}
              </div>

              <div className="flex items-center gap-4">
                <div className="text-3xl font-bold text-green-400">
                  {priceDisplay}
                  {product.price?.toFixed(2) || '0.00'}
                </div>
                <span className="text-slate-400 text-sm">{currency}</span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-sm">库存：</span>
                  <span className={product.stock > 0 ? 'text-green-400' : 'text-red-400'}>
                    {product.stock > 0 ? `✅ 有货 (${product.stock}件)` : '⚠️ 缺货'}
                  </span>
                </div>
                {product.category && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-sm">分类：</span>
                    <span className="text-slate-300 text-sm">{product.category}</span>
                  </div>
                )}
              </div>

              {/* 数量选择 */}
              <div className="pt-4 border-t border-slate-700">
                <div className="flex items-center gap-4">
                  <span className="text-slate-300 text-sm">数量：</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                      className="w-10 h-10 rounded border-2 border-slate-600 hover:border-blue-500 flex items-center justify-center text-lg font-bold text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Minus size={16} />
                    </button>
                    <div className="w-16 h-10 bg-slate-800 border-2 border-slate-600 rounded flex items-center justify-center">
                      <span className="text-lg font-bold text-white">{quantity}</span>
                    </div>
                    <button
                      onClick={() => setQuantity(Math.min(product.stock || 999, quantity + 1))}
                      disabled={quantity >= (product.stock || 999)}
                      className="w-10 h-10 rounded border-2 border-slate-600 hover:border-blue-500 flex items-center justify-center text-lg font-bold text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex flex-col gap-3">
                {/* 立即购买按钮 */}
                <button
                  onClick={() => {
                    const symbols: Record<string, string> = {
                      USD: '$',
                      USDT: '$',
                      USDC: '$',
                      CNY: '¥',
                      EUR: '€',
                    };
                    const currency = (product as any).currency || product.metadata?.currency || 'USDC';
                    const symbol = symbols[currency] || '¥';
                    
                    const { usePayment } = require('../../contexts/PaymentContext');
                    // 注意：这里可能需要从父组件传进来或者使用 window 对象回退
                    if (typeof window !== 'undefined' && (window as any).startPayment) {
                      (window as any).startPayment({
                        id: `pay_${Date.now()}`,
                        amount: `${symbol}${product.price * quantity}`,
                        currency: currency,
                        description: `购买 ${product.name} (x${quantity})`,
                        agent: 'Personal Agent',
                        metadata: {
                          productId: product.id,
                          merchantId: product.merchantId,
                        },
                        createdAt: new Date().toISOString(),
                      });
                    }
                  }}
                  disabled={isAdding || product.stock <= 0}
                  className={`w-full py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
                    isAdding || product.stock <= 0
                      ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  <Zap size={20} />
                  一键快速购买
                </button>

                {/* 加入购物车按钮 */}
                <button
                  onClick={handleAddToCart}
                  disabled={isAdding || product.stock <= 0}
                  className={`w-full py-2 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
                    isAdding || product.stock <= 0
                      ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                      : 'bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30'
                  }`}
                >
                  <ShoppingCart size={20} />
                  {isAdding ? '添加中...' : product.stock <= 0 ? '缺货' : '加入购物车'}
                </button>
              </div>

              {!sessionId && (
                <p className="text-xs text-yellow-400 text-center">
                  💡 提示：登录后购物车会永久保存
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

