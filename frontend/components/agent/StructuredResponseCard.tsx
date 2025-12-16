import { ChatMessage } from './UnifiedAgentChat';
import { SelectableCart, CartItem } from './SelectableCart';
import { ProductDetailModal } from './ProductDetailModal';
import { MultiAssetProductCard, MultiAssetProductList, MultiAssetProduct } from './MultiAssetProductCard';
import { useState } from 'react';
import { ShoppingCart, Eye } from 'lucide-react';
import { cartApi } from '../../lib/api/cart.api';
import { orderApi } from '../../lib/api/order.api';
import { ProductInfo } from '../../lib/api/product.api';
import { useUser } from '../../contexts/UserContext';

interface StructuredResponseCardProps {
  message: ChatMessage;
  onCartUpdate?: (items: CartItem[]) => void;
  onSendMessage?: (message: string) => void;
  sessionId?: string;
  onCartChanged?: (cartItems?: CartItem[]) => void; // 购物车更新后的回调，如果购物车消息不存在则创建
}

/**
 * 结构化响应展示卡片
 * 根据不同的响应类型展示相应的结构化数据
 */
export function StructuredResponseCard({ 
  message, 
  onCartUpdate, 
  onSendMessage,
  sessionId,
  onCartChanged,
}: StructuredResponseCardProps) {
  const { user } = useUser();
  const { type, data } = message.metadata || {};
  const [selectedProduct, setSelectedProduct] = useState<ProductInfo | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState<string | null>(null);
  const [cancellingOrders, setCancellingOrders] = useState<Set<string>>(new Set());
  const [cartUpdateStatus, setCartUpdateStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });

  // 处理加入购物车
  const handleAddToCart = async (productId: string, quantity: number = 1) => {
    // 如果用户已登录，不传递sessionId，让后端使用userId（从JWT token获取）
    // 如果用户未登录，传递sessionId
    // 在函数开始就声明变量，避免作用域问题
    const cartSessionId: string | undefined = user ? undefined : sessionId;
    console.log('🛒 开始加入购物车:', { productId, quantity, sessionId, userId: user?.id, cartSessionId });
    
    if (!user && !sessionId) {
      console.warn('⚠️ 用户未登录且没有sessionId，购物车操作可能无法正确同步。建议先发送一条消息给Agent以获取sessionId。');
    }
    setIsAddingToCart(productId);
    try {
      const result = await cartApi.addItem(productId, quantity, cartSessionId);
      console.log('🛒 加入购物车成功:', result);
      
      // 显示成功提示
      setCartUpdateStatus({ type: 'success', message: '✅ 商品已成功加入购物车！' });
      setTimeout(() => {
        setCartUpdateStatus({ type: null, message: '' });
      }, 3000);
      
      // 直接获取最新购物车数据并更新显示
      // 如果用户已登录，不传递sessionId；如果未登录，传递sessionId
      if (user || sessionId) {
        try {
          const updatedCart = await cartApi.getCartWithProducts(cartSessionId);
          // 转换数据格式为 CartItem[] 格式
          const cartItems: CartItem[] = (updatedCart.items || []).map((item: any) => ({
            product: {
              id: item.product?.id || item.productId || '',
              name: item.product?.name || '未知商品',
              description: item.product?.description || '',
              price: item.product?.price || 0,
              currency: item.product?.currency || item.product?.metadata?.currency || 'CNY',
              stock: item.product?.stock || 0,
              category: item.product?.category || '',
              metadata: {
                image: item.product?.metadata?.image || item.product?.image || '',
                description: item.product?.description || '',
                currency: item.product?.currency || item.product?.metadata?.currency || 'CNY',
              },
              merchantId: item.product?.merchantId || '',
              commissionRate: item.product?.commissionRate || 0,
              status: item.product?.status || 'active',
            },
            quantity: item.quantity || 1,
          }));
          
          // 通知父组件购物车已更新，如果购物车消息不存在则创建
          if (onCartChanged) {
            onCartChanged(cartItems);
          } else if (onCartUpdate) {
            // 如果onCartChanged不存在，尝试更新现有购物车
            onCartUpdate(cartItems);
          }
          
          // 如果onCartChanged和onCartUpdate都不存在，发送"查看购物车"消息来显示购物车
          if (!onCartChanged && !onCartUpdate && onSendMessage) {
            setTimeout(() => {
              onSendMessage('查看购物车');
            }, 100);
          }
        } catch (fetchError) {
          console.warn('获取更新后的购物车失败:', fetchError);
          // 如果直接获取失败，发送消息来显示购物车
      if (onSendMessage) {
        setTimeout(() => {
          onSendMessage('查看购物车');
        }, 100);
          }
        }
      }
    } catch (error: any) {
      console.error('❌ 加入购物车失败:', error);
      setCartUpdateStatus({ 
        type: 'error', 
        message: `❌ 加入购物车失败：${error.message || '请稍后重试'}` 
      });
      setTimeout(() => {
        setCartUpdateStatus({ type: null, message: '' });
      }, 3000);
    } finally {
      setIsAddingToCart(null);
    }
  };

  // 打开商品详情
  const handleViewProduct = (product: any) => {
    const productInfo: ProductInfo = {
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      stock: product.stock || (product.inStock ? 999 : 0),
      category: product.category || '',
      commissionRate: product.commissionRate || 0,
      status: 'active',
      merchantId: product.merchantId || '',
      metadata: {
        image: product.image || product.metadata?.image,
        currency: product.currency || product.metadata?.currency,
        ...product.metadata,
      },
    };
    setSelectedProduct(productInfo);
    setIsProductModalOpen(true);
  };

  // 调试：打印所有消息的metadata
  console.log('📋 StructuredResponseCard 收到消息:', {
    type,
    hasData: !!data,
    dataKeys: data ? Object.keys(data) : [],
    fullMetadata: message.metadata,
  });

  if (!data || type === 'error') {
    return null;
  }

  // 购物车展示（支持商品点选和选择性支付）
  // 检查多种可能的购物车标识
  const isCartType = type === 'view_cart' || type === 'cart';
  const hasCartItems = data.cartItems && Array.isArray(data.cartItems) && data.cartItems.length > 0;
  const hasItems = data.items && Array.isArray(data.items) && data.items.length > 0;
  
  // 调试日志
  console.log('🛒 购物车数据检测:', {
    type,
    isCartType,
    hasCartItems,
    hasItems,
    cartItems: data.cartItems,
    items: data.items,
    dataKeys: Object.keys(data),
    fullData: data,
  });
  
  if (isCartType || hasCartItems || (data.items && Array.isArray(data.items))) {
    // 优先使用cartItems，如果没有则尝试从items转换
    let cartItems: CartItem[] = [];
    
    if (data.cartItems && Array.isArray(data.cartItems)) {
      cartItems = data.cartItems;
    } else if (data.items && Array.isArray(data.items)) {
      // 转换items格式为cartItems格式
      cartItems = data.items.map((item: any) => ({
        product: {
          id: item.product?.id || item.productId || '',
          name: item.product?.name || '未知商品',
          description: item.product?.description || '',
          price: item.product?.price || 0,
          currency: item.product?.currency || 'CNY',
          stock: item.product?.stock || 0,
          category: item.product?.category || '',
          metadata: {
            image: item.product?.metadata?.image || item.product?.image || '',
            description: item.product?.description || '',
          },
          merchantId: item.product?.merchantId || '',
        },
        quantity: item.quantity || 1,
      }));
    }
    
    console.log('🛒 准备渲染购物车，商品数量:', cartItems.length, '商品数据:', cartItems);
    
    if (cartItems.length === 0) {
      return (
        <div className="mt-3 pt-3 border-t border-neutral-700/50">
          <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-lg p-4 text-center">
            <div className="text-4xl mb-2">🛒</div>
            <div className="text-neutral-300">购物车是空的</div>
          </div>
        </div>
      );
    }

    // 验证cartItems格式
    const validCartItems = cartItems.filter(item => {
      const isValid = item && item.product && item.product.id && item.quantity > 0;
      if (!isValid) {
        console.warn('🛒 无效的购物车商品:', item);
      }
      return isValid;
    });

    if (validCartItems.length === 0) {
      console.error('🛒 没有有效的购物车商品，原始数据:', cartItems);
      return (
        <div className="mt-3 pt-3 border-t border-neutral-700/50">
          <div className="bg-gradient-to-r from-red-900/30 to-orange-900/30 rounded-lg p-4 text-center">
            <div className="text-red-400">⚠️ 购物车数据格式错误</div>
            <div className="text-xs text-neutral-400 mt-2">请刷新页面重试</div>
            <details className="mt-2 text-left">
              <summary className="text-xs text-neutral-500 cursor-pointer">查看调试信息</summary>
              <pre className="text-xs mt-2 p-2 bg-black/50 rounded overflow-auto max-h-40">
                {JSON.stringify({ type, data, cartItems }, null, 2)}
              </pre>
            </details>
          </div>
        </div>
      );
    }

    console.log('🛒 渲染SelectableCart组件，有效商品数量:', validCartItems.length);

    return (
      <div className="mt-3 pt-3 border-t border-neutral-700/50">
        <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-lg p-4">
          {/* 购物车操作状态提示 */}
          {cartUpdateStatus.type && (
            <div className={`mb-3 p-2 rounded text-xs ${
              cartUpdateStatus.type === 'success' 
                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                : 'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}>
              {cartUpdateStatus.message}
            </div>
          )}
          <div className="text-xs font-semibold text-blue-400 mb-3 flex items-center gap-2">
            <span>🛒</span>
            <span>购物车 ({validCartItems.length} 件商品)</span>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-4 max-h-[600px] overflow-y-auto">
            <SelectableCart
              items={validCartItems}
              onUpdateQuantity={async (productId, quantity) => {
                // 如果用户已登录，不传递sessionId；如果未登录，传递sessionId
                const cartSessionId = user ? undefined : sessionId;
                console.log('🛒 更新购物车数量:', { productId, quantity, sessionId, userId: user?.id, cartSessionId });
                try {
                  // 验证：未登录用户需要 sessionId
                  if (!user && !sessionId) {
                    console.warn('⚠️ 用户未登录且缺少 sessionId，无法更新购物车');
                    alert('无法更新购物车：缺少会话信息，请刷新页面重试');
                    return;
                  }
                  
                  const result = await cartApi.updateItemQuantity(productId, quantity, cartSessionId);
                  console.log('🛒 更新数量成功:', result);
                  
                  // 直接获取最新购物车数据并更新显示，不发送消息给 Agent
                  try {
                    const updatedCart = await cartApi.getCartWithProducts(cartSessionId);
                    // 转换数据格式为 CartItem[] 格式
                    const cartItems: CartItem[] = (updatedCart.items || []).map((item: any) => ({
                      product: {
                        id: item.product?.id || item.productId || '',
                        name: item.product?.name || '未知商品',
                        description: item.product?.description || '',
                        price: item.product?.price || 0,
                        currency: item.product?.currency || item.product?.metadata?.currency || 'CNY',
                        stock: item.product?.stock || 0,
                        category: item.product?.category || '',
                        metadata: {
                          image: item.product?.metadata?.image || item.product?.image || '',
                          description: item.product?.description || '',
                          currency: item.product?.currency || item.product?.metadata?.currency || 'CNY',
                        },
                        merchantId: item.product?.merchantId || '',
                        commissionRate: item.product?.commissionRate || 0,
                        status: item.product?.status || 'active',
                      },
                      quantity: item.quantity || 1,
                    }));
                    if (onCartUpdate) {
                      onCartUpdate(cartItems);
                    }
                    setCartUpdateStatus({ type: 'success', message: '✅ 数量已更新' });
                    setTimeout(() => {
                      setCartUpdateStatus({ type: null, message: '' });
                    }, 2000);
                  } catch (fetchError) {
                    console.warn('获取更新后的购物车失败，使用回调刷新:', fetchError);
                    // 如果直接获取失败，使用回调（但不发送消息）
                  if (onCartChanged) {
                    onCartChanged();
                  }
                  }
                } catch (error: any) {
                  console.error('❌ 更新购物车数量失败:', error);
                  setCartUpdateStatus({ 
                    type: 'error', 
                    message: `❌ 更新数量失败：${error.message || '请稍后重试'}` 
                  });
                  setTimeout(() => {
                    setCartUpdateStatus({ type: null, message: '' });
                  }, 3000);
                }
              }}
              onRemoveItem={async (productId) => {
                // 如果用户已登录，不传递sessionId；如果未登录，传递sessionId
                const cartSessionId = user ? undefined : sessionId;
                console.log('🛒 移除购物车商品:', { productId, sessionId, userId: user?.id, cartSessionId });
                
                // 验证：未登录用户需要 sessionId
                if (!user && !sessionId) {
                  console.warn('⚠️ 用户未登录且缺少 sessionId，无法移除商品');
                  alert('无法移除商品：缺少会话信息，请刷新页面重试');
                  return;
                }
                
                if (!confirm('确定要从购物车中移除这个商品吗？')) {
                  return;
                }
                
                try {
                  const result = await cartApi.removeItem(productId, cartSessionId);
                  console.log('🛒 移除商品成功:', result);
                  
                  // 直接获取最新购物车数据并更新显示，不发送消息给 Agent
                  try {
                    const updatedCart = await cartApi.getCartWithProducts(cartSessionId);
                    // 转换数据格式为 CartItem[] 格式
                    const cartItems: CartItem[] = (updatedCart.items || []).map((item: any) => ({
                      product: {
                        id: item.product?.id || item.productId || '',
                        name: item.product?.name || '未知商品',
                        description: item.product?.description || '',
                        price: item.product?.price || 0,
                        currency: item.product?.currency || item.product?.metadata?.currency || 'CNY',
                        stock: item.product?.stock || 0,
                        category: item.product?.category || '',
                        metadata: {
                          image: item.product?.metadata?.image || item.product?.image || '',
                          description: item.product?.description || '',
                          currency: item.product?.currency || item.product?.metadata?.currency || 'CNY',
                        },
                        merchantId: item.product?.merchantId || '',
                        commissionRate: item.product?.commissionRate || 0,
                        status: item.product?.status || 'active',
                      },
                      quantity: item.quantity || 1,
                    }));
                    if (onCartUpdate) {
                      onCartUpdate(cartItems);
                    }
                    setCartUpdateStatus({ type: 'success', message: '✅ 商品已移除' });
                    setTimeout(() => {
                      setCartUpdateStatus({ type: null, message: '' });
                    }, 2000);
                  } catch (fetchError) {
                    console.warn('获取更新后的购物车失败，使用回调刷新:', fetchError);
                    // 如果直接获取失败，使用回调（但不发送消息）
                  if (onCartChanged) {
                    onCartChanged();
                  }
                  }
                } catch (error: any) {
                  console.error('❌ 移除商品失败:', error);
                  setCartUpdateStatus({ 
                    type: 'error', 
                    message: `❌ 移除商品失败：${error.message || '请稍后重试'}` 
                  });
                  setTimeout(() => {
                    setCartUpdateStatus({ type: null, message: '' });
                  }, 3000);
                }
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  // 费用估算展示
  if (type === 'fee_estimation' && data) {
    return (
      <div className="mt-3 pt-3 border-t border-neutral-700/50">
        <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-lg p-4 space-y-3">
          <div className="text-xs font-semibold text-blue-400 mb-2 flex items-center gap-2">
            <span>💰</span>
            <span>费用估算结果</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-neutral-400 text-xs mb-1">基础金额</div>
              <div className="text-white font-semibold">
                {data.estimatedFee ? `${(data.totalCost - data.estimatedFee).toFixed(2)}` : '-'} {data.currency || 'USD'}
              </div>
            </div>
            <div>
              <div className="text-neutral-400 text-xs mb-1">手续费</div>
              <div className="text-orange-400 font-semibold">
                {data.estimatedFee ? `${data.estimatedFee.toFixed(2)}` : '-'} {data.currency || 'USD'}
              </div>
            </div>
            <div>
              <div className="text-neutral-400 text-xs mb-1">总成本</div>
              <div className="text-green-400 font-semibold">
                {data.totalCost ? `${data.totalCost.toFixed(2)}` : '-'} {data.currency || 'USD'}
              </div>
            </div>
            <div>
              <div className="text-neutral-400 text-xs mb-1">手续费率</div>
              <div className="text-white font-semibold">
                {data.feeRate ? `${data.feeRate.toFixed(2)}%` : '-'}
              </div>
            </div>
          </div>
          {data.estimatedTime && (
            <div className="text-xs text-neutral-400 mt-2">
              预计到账时间: {data.estimatedTime}秒
            </div>
          )}
        </div>
      </div>
    );
  }

  // 风险评估展示
  if (type === 'risk_assessment' && data) {
    const riskLevel = (data.riskLevel || 'medium') as 'low' | 'medium' | 'high';
    const riskColorMap: Record<'low' | 'medium' | 'high', string> = {
      low: 'text-green-400',
      medium: 'text-yellow-400',
      high: 'text-red-400',
    };
    const riskColor = riskColorMap[riskLevel] || 'text-yellow-400';

    return (
      <div className="mt-3 pt-3 border-t border-neutral-700/50">
        <div className="bg-gradient-to-r from-red-900/30 to-orange-900/30 rounded-lg p-4 space-y-3">
          <div className="text-xs font-semibold text-red-400 mb-2 flex items-center gap-2">
            <span>🛡️</span>
            <span>风险评估结果</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-neutral-400">风险等级</span>
              <span className={`font-semibold ${riskColor}`}>
                {riskLevel === 'low' ? '低风险' : riskLevel === 'high' ? '高风险' : '中风险'}
              </span>
            </div>
            {data.riskScore !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">风险评分</span>
                <span className="text-white font-semibold">{data.riskScore}/100</span>
              </div>
            )}
            {data.recommendations && data.recommendations.length > 0 && (
              <div className="mt-3">
                <div className="text-xs text-neutral-400 mb-2">建议:</div>
                <ul className="space-y-1 text-xs text-neutral-300">
                  {data.recommendations.map((rec: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span>•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // KYC状态展示
  if (type === 'kyc_status' && data) {
    const status = (data.status || 'unverified') as 'verified' | 'pending' | 'unverified';
    const statusTextMap: Record<'verified' | 'pending' | 'unverified', string> = {
      verified: '已认证',
      pending: '审核中',
      unverified: '未认证',
    };
    const statusText = statusTextMap[status] || '未知';

    return (
      <div className="mt-3 pt-3 border-t border-neutral-700/50">
        <div className="bg-gradient-to-r from-green-900/30 to-blue-900/30 rounded-lg p-4">
          <div className="text-xs font-semibold text-green-400 mb-2 flex items-center gap-2">
            <span>✅</span>
            <span>KYC状态</span>
          </div>
          <div className="text-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-neutral-400">认证状态</span>
              <span className={`font-semibold ${
                status === 'verified' ? 'text-green-400' : 
                status === 'pending' ? 'text-yellow-400' : 
                'text-red-400'
              }`}>
                {statusText}
              </span>
            </div>
            {data.level && (
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">认证等级</span>
                <span className="text-white font-semibold">{data.level}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 预算管理展示
  if (type === 'budget' && data) {
    return (
      <div className="mt-3 pt-3 border-t border-neutral-700/50">
        <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-lg p-4 space-y-3">
          <div className="text-xs font-semibold text-purple-400 mb-2 flex items-center gap-2">
            <span>📊</span>
            <span>预算信息</span>
          </div>
          <div className="space-y-2 text-sm">
            {data.budgets && data.budgets.map((budget: any, idx: number) => (
              <div key={idx} className="bg-neutral-900/50 rounded p-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-neutral-300">{budget.category || '总预算'}</span>
                  <span className="text-white font-semibold">
                    {budget.used || 0} / {budget.limit || 0} {budget.currency || 'USD'}
                  </span>
                </div>
                {budget.limit && (
                  <div className="w-full bg-neutral-800 rounded-full h-1.5 mt-1">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-pink-500 h-1.5 rounded-full transition-all"
                      style={{
                        width: `${Math.min(((budget.used || 0) / budget.limit) * 100, 100)}%`,
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 订阅管理展示
  if (type === 'subscriptions' && data) {
    return (
      <div className="mt-3 pt-3 border-t border-neutral-700/50">
        <div className="bg-gradient-to-r from-yellow-900/30 to-orange-900/30 rounded-lg p-4 space-y-3">
          <div className="text-xs font-semibold text-yellow-400 mb-2 flex items-center gap-2">
            <span>🔄</span>
            <span>订阅列表</span>
          </div>
          <div className="space-y-2 text-sm">
            {data.subscriptions && data.subscriptions.length > 0 ? (
              data.subscriptions.map((sub: any, idx: number) => (
                <div key={idx} className="bg-neutral-900/50 rounded p-2">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-300">{sub.name || sub.serviceName}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      sub.status === 'active' ? 'bg-green-500/20 text-green-400' : 
                      sub.status === 'cancelled' ? 'bg-red-500/20 text-red-400' : 
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {sub.status === 'active' ? '活跃' : sub.status === 'cancelled' ? '已取消' : '暂停'}
                    </span>
                  </div>
                  {sub.amount && (
                    <div className="text-xs text-neutral-400 mt-1">
                      {sub.amount} {sub.currency || 'USD'} / {sub.interval || '月'}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-xs text-neutral-400">暂无订阅</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 商户功能展示
  if (type === 'merchant' && data) {
    if (data.type === 'multi_chain_balance') {
      return (
        <div className="mt-3 pt-3 border-t border-neutral-700/50">
          <div className="bg-gradient-to-r from-blue-900/30 to-cyan-900/30 rounded-lg p-4 space-y-3">
            <div className="text-xs font-semibold text-blue-400 mb-2 flex items-center gap-2">
              <span>💼</span>
              <span>多链账户余额</span>
            </div>
            <div className="space-y-2 text-sm">
              {data.balances && Object.entries(data.balances).map(([chain, balance]: [string, any]) => (
                <div key={chain} className="bg-neutral-900/50 rounded p-2">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-300 capitalize">{chain}</span>
                    <span className="text-white font-semibold">
                      {balance.total || 0} {balance.currency || 'USD'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }
  }

  // 代码展示
  if (type === 'code' && data) {
    return (
      <div className="mt-3 pt-3 border-t border-neutral-700/50">
        <div className="bg-neutral-900/70 rounded-lg p-3 overflow-x-auto">
          <div className="text-xs font-semibold text-green-400 mb-2">💻 代码示例</div>
          <pre className="text-xs text-green-400 font-mono">
            {typeof data === 'string' ? data : JSON.stringify(data, null, 2)}
          </pre>
        </div>
      </div>
    );
  }

  // 商品展示
  // 商品搜索结果展示（无论type是什么，只要data.products存在就展示）
  if (data.products && Array.isArray(data.products) && data.products.length > 0) {
    // 转换商品数据为MultiAssetProduct格式
    const multiAssetProducts: MultiAssetProduct[] = data.products.map((product: any) => ({
      id: product.id || '',
      name: product.name || '',
      description: product.description,
      image: product.image,
      price: product.price || 0,
      currency: product.currency || 'CNY',
      priceDisplay: product.priceDisplay,
      // 资产类型检测：优先使用productType或metadata中的assetType
      assetType: product.productType || product.metadata?.assetType || product.assetType || 'physical',
      stock: product.stock,
      inStock: product.inStock,
      category: product.category,
      merchantId: product.merchantId,
      merchantName: product.merchantName,
      // 区块链相关字段
      tokenAddress: product.tokenAddress || product.metadata?.tokenAddress,
      chainId: product.chainId || product.metadata?.chainId,
      tokenId: product.tokenId || product.metadata?.tokenId,
      // 服务类字段
      duration: product.duration || product.metadata?.duration,
      serviceType: product.serviceType || product.metadata?.serviceType,
      // 评分和销量
      rating: product.rating,
      salesCount: product.salesCount || product.sold,
      // 原始metadata
      metadata: product.metadata,
    }));

    return (
      <div className="mt-3 pt-3 border-t border-neutral-700/50">
        <MultiAssetProductList
          products={multiAssetProducts}
          onAddToCart={(productId, quantity) => handleAddToCart(productId, quantity || 1)}
          onViewProduct={(product) => handleViewProduct({
            id: product.id,
            name: product.name,
            description: product.description,
            image: product.image,
            price: product.price,
            currency: product.currency,
            stock: product.stock,
            category: product.category,
            merchantId: product.merchantId,
            metadata: product.metadata,
          })}
          isAddingToCart={isAddingToCart}
          maxDisplay={5}
          layout="list"
          showTotal={true}
          totalCount={data.total || data.products.length}
        />
        {/* 商品详情弹窗 */}
        {selectedProduct && (
          <ProductDetailModal
            product={selectedProduct}
            isOpen={isProductModalOpen}
            onClose={() => {
              setIsProductModalOpen(false);
              setSelectedProduct(null);
            }}
            onAddToCart={handleAddToCart}
            sessionId={sessionId}
          />
        )}
      </div>
    );
  }

  // 比价结果展示
  if (type === 'price_comparison' && data.comparison) {
    const { cheapest, mostExpensive, averagePrice, bestValue, priceRange } = data.comparison;
    const products = data.products || [];
    
    return (
      <div className="mt-3 pt-3 border-t border-neutral-700/50">
        <div className="bg-gradient-to-r from-green-900/30 to-blue-900/30 rounded-lg p-4 space-y-4">
          <div className="text-xs font-semibold text-green-400 mb-3 flex items-center gap-2">
            <span>💰</span>
            <span>比价结果（{data.total || products.length || 0}件商品）</span>
          </div>
          
          {/* 比价统计卡片 */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-neutral-900/50 rounded-lg p-3">
              <div className="text-neutral-400 text-xs mb-1">最低价</div>
              <div className="text-green-400 font-semibold text-lg">
                ¥{cheapest?.price?.toFixed(2)} {cheapest?.currency || 'CNY'}
              </div>
              <div className="text-neutral-300 text-xs mt-1 truncate">{cheapest?.name}</div>
            </div>
            
            <div className="bg-neutral-900/50 rounded-lg p-3">
              <div className="text-neutral-400 text-xs mb-1">最高价</div>
              <div className="text-red-400 font-semibold text-lg">
                ¥{mostExpensive?.price?.toFixed(2)} {mostExpensive?.currency || 'CNY'}
              </div>
              <div className="text-neutral-300 text-xs mt-1 truncate">{mostExpensive?.name}</div>
            </div>
            
            <div className="bg-neutral-900/50 rounded-lg p-3">
              <div className="text-neutral-400 text-xs mb-1">平均价格</div>
              <div className="text-blue-400 font-semibold text-lg">
                ¥{averagePrice?.toFixed(2)} {cheapest?.currency || 'CNY'}
              </div>
            </div>
            
            <div className="bg-neutral-900/50 rounded-lg p-3">
              <div className="text-neutral-400 text-xs mb-1">最佳性价比</div>
              <div className="text-yellow-400 font-semibold text-lg">
                ¥{bestValue?.price?.toFixed(2)} {bestValue?.currency || 'CNY'}
              </div>
              <div className="text-neutral-300 text-xs mt-1 truncate">{bestValue?.name}</div>
            </div>
          </div>
          
          {priceRange && (
            <div className="bg-neutral-900/50 rounded-lg p-3 text-sm">
              <div className="text-neutral-400 text-xs mb-1">价格差异</div>
              <div className="text-white font-semibold">
                ¥{priceRange.difference?.toFixed(2)} {cheapest?.currency || 'CNY'}
              </div>
              <div className="text-neutral-400 text-xs mt-1">
                价格范围: ¥{priceRange.min?.toFixed(2)} - ¥{priceRange.max?.toFixed(2)}
              </div>
            </div>
          )}

          {/* 商品列表展示 */}
          {products && products.length > 0 && (
            <div className="mt-4 pt-4 border-t border-neutral-700/50">
              <div className="text-xs font-semibold text-blue-400 mb-3 flex items-center gap-2">
                <span>📋</span>
                <span>参与比价的商品列表</span>
              </div>
              <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto">
                {products.slice(0, 10).map((product: any, idx: number) => (
                  <div key={product.id || idx} className="bg-neutral-900/50 rounded-lg p-3 text-sm border border-neutral-800 hover:border-blue-500/50 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      {/* 商品图片 */}
                      {product.image && (
                        <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-neutral-800">
                          <img 
                            src={product.image} 
                            alt={product.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // 图片加载失败时隐藏
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-white mb-1 truncate">{product.name}</div>
                        {product.description && (
                          <div className="text-neutral-400 text-xs mb-2 line-clamp-2">
                            {product.description}
                          </div>
                        )}
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-green-400 font-semibold">
                            ¥{product.price?.toFixed(2)} {product.currency || 'CNY'}
                          </span>
                          {product.stock !== undefined && (
                            <span className={product.stock > 0 ? 'text-green-400' : 'text-red-400'}>
                              {product.stock > 0 ? '✅ 有货' : '⚠️ 缺货'}
                            </span>
                          )}
                          {product.category && (
                            <span className="text-neutral-500 bg-neutral-800 px-2 py-0.5 rounded">
                              {product.category}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {products.length > 10 && (
                <div className="text-xs text-neutral-400 text-center mt-2">
                  还有 {products.length - 10} 件商品...
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 订单列表展示
  if (type === 'view_orders' && data.orders && Array.isArray(data.orders) && data.orders.length > 0) {
    const getStatusColor = (status: string) => {
      const colors: Record<string, string> = {
        pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
        paid: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        completed: 'bg-green-500/20 text-green-400 border-green-500/30',
        cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
        shipped: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      };
      return colors[status] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    };

    const getStatusText = (status: string) => {
      const texts: Record<string, string> = {
        pending: '待支付',
        paid: '已支付',
        shipped: '已发货',
        completed: '已完成',
        cancelled: '已取消',
      };
      return texts[status] || status;
    };

    const handleCancelOrder = async (orderId: string) => {
      if (!confirm('确定要取消这个订单吗？')) {
        return;
      }
      
      setCancellingOrders(prev => new Set(prev).add(orderId));
      try {
        await orderApi.cancelOrder(orderId);
        // 刷新订单列表
        if (onSendMessage) {
          setTimeout(() => {
            onSendMessage('查看订单');
          }, 300);
        }
      } catch (error: any) {
        console.error('取消订单失败:', error);
        alert(`取消订单失败：${error.message || '请稍后重试'}`);
      } finally {
        setCancellingOrders(prev => {
          const next = new Set(prev);
          next.delete(orderId);
          return next;
        });
      }
    };

    return (
      <div className="mt-3 pt-3 border-t border-neutral-700/50">
        <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-lg p-4">
          <div className="text-xs font-semibold text-blue-400 mb-3 flex items-center gap-2">
            <span>📦</span>
            <span>订单列表（共 {data.total || data.orders.length} 笔）</span>
          </div>
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {data.orders
              .filter((order: any) => order.status !== 'cancelled') // 过滤掉已取消的订单
              .map((order: any, idx: number) => (
              <div
                key={order.id || idx}
                className="bg-neutral-900/50 rounded-lg p-4 border border-neutral-800 hover:border-blue-500/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-semibold text-white">订单 #{order.id?.slice(0, 8) || idx + 1}</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(order.status)}`}>
                        {getStatusText(order.status)}
                      </span>
                    </div>
                    <div className="text-xs text-neutral-400 mb-2">
                      {new Date(order.createdAt).toLocaleString('zh-CN')}
                    </div>
                    {(order.items && Array.isArray(order.items) && order.items.length > 0) ? (
                      <div className="space-y-2 mt-3">
                        {order.items.map((item: any, itemIdx: number) => (
                          <div key={itemIdx} className="bg-neutral-800/50 rounded p-2 flex items-center justify-between">
                            <div className="flex-1">
                              <div className="text-sm text-white font-medium">{item.productName || item.name || '商品'}</div>
                              {item.productId && (
                                <div className="text-xs text-neutral-400">ID: {item.productId.slice(0, 8)}</div>
                              )}
                            </div>
                            <div className="text-right ml-4">
                              <div className="text-sm font-bold text-white mb-1">
                                <span className="bg-blue-500/20 text-blue-400 px-3 py-1.5 rounded border-2 border-blue-500/30 text-base">
                                  数量: {item.quantity || 1}
                                </span>
                              </div>
                              <div className="text-xs text-neutral-400 mt-1">
                                {order.currency || 'CNY'} {(item.price || 0) * (item.quantity || 1)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-neutral-800/50 rounded p-2 mt-3 flex items-center justify-between">
                        <div className="flex-1">
                          <div className="text-sm text-white font-medium">商品</div>
                          {order.productId && (
                            <div className="text-xs text-neutral-400">ID: {order.productId.slice(0, 8)}</div>
                          )}
                        </div>
                        <div className="text-right ml-4">
                          <div className="text-sm font-bold text-white mb-1">
                            <span className="bg-blue-500/20 text-blue-400 px-3 py-1.5 rounded border-2 border-blue-500/30 text-base">
                              数量: 1
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-neutral-700/50">
                  <div className="text-sm">
                    <span className="text-neutral-400">总金额: </span>
                    <span className="text-lg font-bold text-green-400">
                      {order.currency === 'CNY' ? '¥' : order.currency === 'USD' ? '$' : ''}
                      {Number(order.amount || 0).toFixed(2)} {order.currency || 'CNY'}
                    </span>
                  </div>
                  {order.status === 'pending' && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('📦 点击取消订单:', { orderId: order.id });
                        if (order.id) {
                          handleCancelOrder(order.id);
                        }
                      }}
                      disabled={cancellingOrders.has(order.id)}
                      className="px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-sm font-medium hover:bg-red-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer relative z-10"
                      type="button"
                    >
                      {cancellingOrders.has(order.id) ? '取消中...' : '取消订单'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 默认：显示JSON数据（可折叠）
  return (
    <div className="mt-3 pt-3 border-t border-neutral-700/50">
      <details className="text-xs">
        <summary className="cursor-pointer text-blue-400 hover:text-blue-300 mb-2">
          查看详细数据
        </summary>
        <pre className="mt-2 overflow-auto max-h-40 text-neutral-400 bg-neutral-900/50 rounded p-2">
          {JSON.stringify(data, null, 2)}
        </pre>
      </details>
    </div>
  );
}

