import Head from 'next/head'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { SmartCheckout } from '../../components/payment/SmartCheckout'
import { productApi, ProductInfo } from '../../lib/api/product.api'
import { orderApi } from '../../lib/api/order.api'
import { Navigation } from '../../components/ui/Navigation'
import { Footer } from '../../components/layout/Footer'
import { useUser } from '../../contexts/UserContext'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

// 从 Skill 数据转换为 Product 格式
interface SkillData {
  id: string;
  name: string;
  displayName?: string;
  description: string;
  productId?: string; // 关联的 Product ID（用于订单创建）
  pricing?: {
    type: string;
    pricePerCall?: number;
    oneTimePrice?: number;
    subscriptionPrice?: number;
    currency?: string;
  };
  authorId?: string; // UUID of the author (User)
  authorInfo?: {
    id: string;
    name: string;
  };
  imageUrl?: string;
  metadata?: Record<string, any>;
}

// 系统默认商户ID - 用于没有作者的 Skill
// 注意：这应该是数据库中存在的系统用户UUID
const SYSTEM_MERCHANT_ID = process.env.NEXT_PUBLIC_SYSTEM_MERCHANT_ID || null;

// 后端 AssetType 枚举有效值
const VALID_ASSET_TYPES = ['physical', 'service', 'virtual', 'nft_rwa', 'dev_tool', 'subscription', 'other', 'aggregated_web2', 'aggregated_web3'];

// 映射 assetType 到后端有效值
function mapAssetType(type?: string): string {
  if (!type) return 'virtual';
  const lowerType = type.toLowerCase();
  // 如果是有效值，直接返回
  if (VALID_ASSET_TYPES.includes(lowerType)) return lowerType;
  // 映射常见的别名
  if (lowerType === 'digital') return 'virtual';
  if (lowerType === 'software' || lowerType === 'app') return 'virtual';
  if (lowerType === 'api' || lowerType === 'tool') return 'dev_tool';
  // 默认返回 virtual
  return 'virtual';
}

function skillToProduct(skill: SkillData): ProductInfo {
  const pricing = skill.pricing;
  let price = 0;
  let currency = 'USD';
  
  if (pricing) {
    currency = pricing.currency || 'USD';
    if (pricing.oneTimePrice) {
      price = pricing.oneTimePrice;
    } else if (pricing.pricePerCall) {
      price = pricing.pricePerCall;
    } else if (pricing.subscriptionPrice) {
      price = pricing.subscriptionPrice;
    }
  }
  
  // 优先使用 authorId (UUID)，其次检查 authorInfo.id 是否是有效 UUID
  // 如果都没有，使用系统商户ID 或 skill 自身的 ID（作为 fallback）
  const isValidUUID = (str?: string) => {
    if (!str) return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };
  
  let merchantId = skill.authorId; // 优先使用 authorId (正确的 UUID 字段)
  if (!isValidUUID(merchantId)) {
    merchantId = skill.authorInfo?.id;
  }
  if (!isValidUUID(merchantId)) {
    merchantId = SYSTEM_MERCHANT_ID || skill.id; // Fallback to skill's own ID
  }
  
  // 使用 productId（如果存在），否则使用 skill.id
  // 订单创建需要 productId 存在于 products 表中
  const productId = skill.productId || skill.id;
  
  return {
    id: productId,
    name: skill.displayName || skill.name,
    description: skill.description,
    price: price,
    stock: 999, // Skills have unlimited stock
    category: 'skill',
    merchantId: merchantId!,
    commissionRate: 0, // Default commission rate for skills
    status: 'active', // Skills are active by default
    metadata: {
      currency: currency,
      image: skill.imageUrl,
      assetType: 'virtual', // 使用后端 AssetType 枚举中的有效值
      productType: 'skill',
      ...skill.metadata,
    },
  };
}

export default function CheckoutPage() {
  const router = useRouter()
  const { productId, skillId } = router.query
  const { isAuthenticated } = useUser()
  const [product, setProduct] = useState<ProductInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCheckout, setShowCheckout] = useState(false)
  const [order, setOrder] = useState<any>(null)
  const [orderError, setOrderError] = useState<string | null>(null)

  useEffect(() => {
    // 确保 router 已准备好再读取 query 参数
    if (!router.isReady) return;
    
    if (productId && typeof productId === 'string') {
      loadProduct(productId)
    } else if (skillId && typeof skillId === 'string') {
      loadSkill(skillId)
    } else {
      setLoading(false)
    }
  }, [router.isReady, productId, skillId])

  const loadProduct = async (id: string) => {
    try {
      setLoading(true)
      const data = await productApi.getProduct(id)
      setProduct(data)
      setLoading(false)
    } catch (error) {
      console.error('加载商品失败:', error)
      setLoading(false)
    }
  }

  const loadSkill = async (id: string) => {
    try {
      setLoading(true)
      const res = await fetch(`${API_BASE}/api/unified-marketplace/skills/${id}`)
      if (!res.ok) throw new Error('Skill not found')
      const skillData: SkillData = await res.json()
      setProduct(skillToProduct(skillData))
      setLoading(false)
    } catch (error) {
      console.error('加载 Skill 失败:', error)
      setLoading(false)
    }
  }

  const handleStartPayment = async () => {
    if (!product) return;
    
    // 检查用户是否已登录
    if (!isAuthenticated) {
      router.push(`/auth/login?redirect=${encodeURIComponent(router.asPath)}`);
      return;
    }
    
    // 如果订单已创建，直接显示支付界面
    if (order) {
      setShowCheckout(true);
      return;
    }

    // 否则创建订单
    try {
      setOrderError(null);
      await createOrder(product);
    } catch (error: any) {
      // 检查是否是未授权错误
      if (error.message?.includes('401') || error.message?.includes('请先登录') || error.message?.includes('Unauthorized')) {
        router.push(`/auth/login?redirect=${encodeURIComponent(router.asPath)}`);
        setOrderError('请先登录后再进行支付');
      } else {
        setOrderError(error.message || '创建订单失败');
      }
    }
  }

  const createOrder = async (productData: ProductInfo) => {
    try {
      // 确保 amount 是数字类型，并处理可能的字符串或 decimal 类型
      let amount: number;
      if (typeof productData.price === 'string') {
        amount = parseFloat(productData.price);
      } else if (typeof productData.price === 'number') {
        amount = productData.price;
      } else {
        amount = Number(productData.price);
      }
      
      if (isNaN(amount) || amount <= 0) {
        throw new Error(`商品价格无效: ${productData.price}`);
      }

      console.log('创建订单参数:', {
        productId: productData.id,
        merchantId: productData.merchantId,
        amount: amount,
        amountType: typeof amount,
        currency: productData.metadata?.currency || 'CNY',
      });

      // 创建订单
      const orderData = await orderApi.createOrder({
        productId: productData.id,
        merchantId: productData.merchantId,
        amount: amount, // 确保是数字类型
        currency: productData.metadata?.currency || 'CNY',
        metadata: {
          assetType: mapAssetType(productData.metadata?.assetType),
          productType: productData.metadata?.productType,
          paymentMethod: productData.metadata?.paymentMethod,
        },
      })

      setOrder(orderData)
      setShowCheckout(true)
    } catch (error: any) {
      console.error('创建订单失败:', error)
      setOrderError(error.message || '创建订单失败，请重试')
      throw error; // 重新抛出错误，让调用者处理
    }
  }

  const handlePaymentSuccess = async (result: any) => {
    console.log('Payment successful:', result)
    setShowCheckout(false)
    const params = new URLSearchParams()
    if (result?.id) {
      params.set('paymentId', result.id)
    }
    if (order?.id) {
      params.set('orderId', order.id)
    }
    router.push(`/pay/success${params.toString() ? `?${params.toString()}` : ''}`)
  }

  const handlePaymentCancel = () => {
    setShowCheckout(false)
    router.back()
  }

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
          <div className="text-center">
            <div className="text-4xl mb-4 animate-spin">⏳</div>
            <p>加载中...</p>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  if (!product) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
          <div className="text-center">
            <div className="text-4xl mb-4">❌</div>
            <p className="text-xl mb-2">商品不存在</p>
            <button
              onClick={() => router.push('/marketplace')}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              返回 Marketplace
            </button>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Head>
        <title>支付 - {product.name} | Agentrix</title>
        <meta name="description" content={`支付 ${product.name}`} />
      </Head>

      <Navigation />

      <main className="min-h-screen bg-slate-950 text-white">
        {/* 商品信息卡片 */}
        <div className="container mx-auto px-6 py-12">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 mb-6">
              <div className="flex items-start gap-6">
                {product.metadata?.image && (
                  <div className="w-32 h-32 rounded-lg overflow-hidden flex-shrink-0">
                    <img
                      src={product.metadata.image}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <h1 className="text-2xl font-bold mb-2">{product.name}</h1>
                  {product.description && (
                    <p className="text-slate-300 mb-4">{product.description}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-3xl font-bold text-green-400 mb-1">
                        {product.metadata?.currency === 'USDT' ? '$' : '¥'}
                        {product.price}
                      </div>
                      {product.metadata?.currency && (
                        <div className="text-sm text-slate-400">
                          {product.metadata.currency}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-slate-400 mb-1">库存</div>
                      <div className="text-lg font-semibold">{product.stock}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 错误提示 */}
            {orderError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
                <p className="text-sm text-red-300">
                  ❌ {orderError}
                </p>
              </div>
            )}

            {/* 支付提示和按钮 */}
            {!showCheckout && (
              <>
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-6">
                  <p className="text-sm text-blue-300 mb-4">
                    💡 点击下方按钮开始支付，系统将自动选择最优支付方式
                  </p>
                  <button
                    onClick={handleStartPayment}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-4 rounded-xl font-semibold text-lg shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <span className="animate-spin">⏳</span>
                        <span>加载中...</span>
                      </>
                    ) : (
                      <>
                        <span>💳</span>
                        <span>
                          立即支付 {product.metadata?.currency === 'USDT' ? '$' : '¥'}
                          {product.price} {product.metadata?.currency || 'CNY'}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* V7.0 Smart Checkout */}
        {showCheckout && order && (
          <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto">
            <div className="min-h-full flex items-center justify-center p-4">
              <div className="relative w-full max-w-2xl">
                <SmartCheckout
                  order={{
                    id: order.id,
                    amount: order.amount,
                    currency: order.currency,
                    description: product.name,
                    merchantId: product.merchantId,
                    to: order.metadata?.paymentAddress || order.metadata?.to,
                    metadata: {
                      productId: product.id,
                      orderId: order.id,
                      assetType: product.metadata?.assetType || order.metadata?.assetType,
                      paymentMethod: product.metadata?.paymentMethod,
                    },
                  }}
                  onSuccess={handlePaymentSuccess}
                  onCancel={handlePaymentCancel}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </>
  )
}
