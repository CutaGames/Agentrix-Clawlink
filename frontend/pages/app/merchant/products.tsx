import Head from 'next/head'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'
import { useState, useEffect } from 'react'
import { ProductPricingManager } from '../../../components/merchant/ProductPricingManager'
import { ProductPreview } from '../../../components/merchant/ProductPreview'
import { productApi } from '../../../lib/api/product.api'
import { convertToUnifiedProduct } from '../../../lib/utils/product-converter'
import { useUser } from '../../../contexts/UserContext'

interface ProductDisplay {
  id: string;
  name: string;
  price: string;
  stock: number;
  status: string;
  category: string;
  productType?: string;
  commissionRate: string;
  aiSales: number;
  totalSales: number;
  createdAt: string;
}

export default function MerchantProducts() {
  const { user } = useUser()
  const [products, setProducts] = useState<ProductDisplay[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showAddProduct, setShowAddProduct] = useState(false)

  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    category: '',
    productType: 'physical' as 'physical' | 'service' | 'nft' | 'ft' | 'plugin' | 'subscription' | 'game_asset' | 'rwa',
    currency: 'CNY',
    commissionRate: 5,
    fixedCommissionRate: 3, // 固定佣金率（根据产品类型）
    allowCommissionAdjustment: false,
    image: '',
    tags: [] as string[],
  })
  
  const [editingProduct, setEditingProduct] = useState<any>(null)
  const [showPricingManager, setShowPricingManager] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  // 加载商品列表
  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    try {
      setLoading(true)
      setError(null)
      // 使用新的API方法，后端会自动过滤当前商户的商品
      // 如果用户是商户，后端会自动使用user.id作为merchantId
      const merchantProducts = await productApi.getMyProducts()
      
      // 转换为显示格式
      const displayProducts: ProductDisplay[] = merchantProducts.map((product: any) => {
        // 价格提取：数据库存储的是数字，但可能为null或0
        let priceValue = 0;
        if (typeof product.price === 'number' && product.price > 0) {
          priceValue = product.price;
        } else if (product.price && typeof product.price === 'object' && 'amount' in product.price) {
          priceValue = product.price.amount || 0;
        }
        
        // 调试日志：检查价格提取
        if (priceValue === 0 && product.price !== undefined && product.price !== null) {
          console.warn('⚠️ 商品价格提取为0:', {
            productId: product.id,
            productName: product.name,
            rawPrice: product.price,
            priceType: typeof product.price,
            metadata: product.metadata,
          });
        }
        
        // 货币提取：优先从metadata获取
        const currency = product.metadata?.currency || 
                        (product.price && typeof product.price === 'object' ? product.price.currency : undefined) || 
                        'CNY';
        const stockValue = product.inventory?.quantity ?? product.stock ?? 0
        
        return {
          id: product.id,
          name: product.name,
          price: currency === 'CNY' ? `¥${priceValue.toLocaleString()}` : 
                 currency === 'USD' ? `$${priceValue.toLocaleString()}` :
                 `${priceValue.toLocaleString()} ${currency}`,
          stock: stockValue,
          status: product.status || (stockValue > 0 ? 'active' : 'out_of_stock'),
          category: product.category || '',
          productType: product.productType || 'physical',
          commissionRate: `${product.metadata?.extensions?.commissionRate || product.commissionRate || 0}%`,
          aiSales: product.metadata?.extensions?.aiSales || 0,
          totalSales: product.metadata?.extensions?.totalSales || 0,
          createdAt: product.createdAt ? new Date(product.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
        }
      })
      
      setProducts(displayProducts)
    } catch (err: any) {
      console.error('加载商品失败:', err)
      setError(err.message || '加载商品失败，请稍后重试')
      // 如果API失败，显示空列表而不是mock数据
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      // 验证价格
      const priceValue = parseFloat(newProduct.price);
      if (isNaN(priceValue) || priceValue < 0) {
        alert('请输入有效的价格（必须大于等于0）');
        return;
      }

      // 如果是编辑模式，调用更新API
      if (editingProduct) {
        // 更新时使用 UpdateProductDto 格式（简单字段，不是统一格式）
        const { convertToUpdateProductDto } = await import('../../../lib/utils/product-converter');
        const updateDto = convertToUpdateProductDto({
          name: newProduct.name,
          description: newProduct.description,
          price: priceValue,
          stock: newProduct.productType === 'service' || newProduct.productType === 'plugin' || newProduct.productType === 'subscription' 
            ? undefined // 服务类商品不需要库存字段
            : parseInt(newProduct.stock) || 0,
          productType: newProduct.productType,
          currency: newProduct.currency,
          commissionRate: newProduct.allowCommissionAdjustment ? newProduct.commissionRate : newProduct.fixedCommissionRate,
          image: newProduct.image,
          tags: newProduct.tags,
        });
        await productApi.updateProduct(editingProduct.id, updateDto);
        setEditingProduct(null);
      } else {
        // 创建时使用统一数据标准格式
        const unifiedProduct = convertToUnifiedProduct({
          name: newProduct.name,
          description: newProduct.description,
          price: priceValue,
          stock: newProduct.productType === 'service' || newProduct.productType === 'plugin' || newProduct.productType === 'subscription' 
            ? undefined // 服务类商品会自动设置为无限库存
            : parseInt(newProduct.stock) || 0,
          category: newProduct.category,
          productType: newProduct.productType,
          currency: newProduct.currency,
          commissionRate: newProduct.allowCommissionAdjustment ? newProduct.commissionRate : newProduct.fixedCommissionRate,
          image: newProduct.image,
          tags: newProduct.tags,
        });

        // 调用API创建商品
        await productApi.createProduct(unifiedProduct);
      }
      
      // 重新加载商品列表
      await loadProducts()
      
      // 重置表单
      setNewProduct({ 
        name: '', 
        description: '',
        price: '', 
        stock: '', 
        category: '', 
        productType: 'physical',
        currency: 'CNY',
        commissionRate: 5,
        fixedCommissionRate: 3,
        allowCommissionAdjustment: false,
        image: '',
        tags: [],
      })
      setEditingProduct(null)
      setShowAddProduct(false)
    } catch (error: any) {
      console.error('创建商品失败:', error)
      alert(error.message || '创建商品失败，请稍后再试')
    }
  }

  const toggleProductStatus = async (productId: string) => {
    try {
      const product = products.find(p => p.id === productId)
      if (!product) return
      
      const newStatus = product.status === 'active' ? 'inactive' : 'active'
      // 调用API更新商品状态
      await productApi.updateProduct(productId, { status: newStatus })
      // 重新加载商品列表
      await loadProducts()
    } catch (err: any) {
      console.error('更新商品状态失败:', err)
      alert(err.message || '更新商品状态失败，请稍后重试')
    }
  }

  return (
    <>
      <Head>
        <title>商品管理 - Agentrix</title>
      </Head>
      <DashboardLayout userType="merchant">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">商品管理</h1>
              <p className="text-gray-600">管理您的商品库存、价格和分润设置</p>
            </div>
            <button
              onClick={() => setShowAddProduct(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              添加商品
            </button>
          </div>
        </div>
        {/* Products Grid */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">商品列表</h2>
          </div>
          <div className="p-6">
            {loading && (
              <div className="text-center py-8 text-gray-500">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2">加载中...</p>
              </div>
            )}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-red-800">{error}</p>
                <button
                  onClick={loadProducts}
                  className="mt-2 text-red-600 hover:text-red-700 text-sm font-medium"
                >
                  重试
                </button>
              </div>
            )}
            {!loading && !error && products.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">📦</div>
                <p>暂无商品</p>
                <button
                  onClick={() => setShowAddProduct(true)}
                  className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  添加第一个商品
                </button>
              </div>
            )}
            {!loading && !error && products.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 text-sm font-medium text-gray-600">商品名称</th>
                    <th className="text-left py-3 text-sm font-medium text-gray-600">类目</th>
                    <th className="text-left py-3 text-sm font-medium text-gray-600">价格</th>
                    <th className="text-left py-3 text-sm font-medium text-gray-600">库存</th>
                    <th className="text-left py-3 text-sm font-medium text-gray-600">分润率</th>
                    <th className="text-left py-3 text-sm font-medium text-gray-600">AI销量</th>
                    <th className="text-left py-3 text-sm font-medium text-gray-600">状态</th>
                    <th className="text-left py-3 text-sm font-medium text-gray-600">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id} className="border-b border-gray-100 last:border-0">
                      <td className="py-4">
                        <div>
                          <p className="font-medium text-gray-900">{product.name}</p>
                        </div>
                      </td>
                      <td className="py-4">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                          {(product as any).productType === 'physical' ? '实体商品' :
                           (product as any).productType === 'service' ? '服务类' :
                           (product as any).productType === 'nft' ? 'NFT' :
                           (product as any).productType === 'ft' ? 'FT' :
                           (product as any).productType === 'game_asset' ? '游戏资产' :
                           (product as any).productType === 'rwa' ? 'RWA' : '实体商品'}
                        </span>
                        <p className="text-sm text-gray-500 mt-1">{product.category || '未分类'}</p>
                      </td>
                      <td className="py-4 text-gray-900">{product.price}</td>
                      <td className="py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          product.stock > 20 ? 'bg-green-100 text-green-800' :
                          product.stock > 0 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {product.stock} 件
                        </span>
                      </td>
                      <td className="py-4">
                        <div>
                          <span className="text-blue-600 font-medium">{product.commissionRate}</span>
                          <p className="text-xs text-gray-500 mt-1">
                            {(product as any).productType === 'physical' ? '固定3%' :
                             (product as any).productType === 'service' ? '固定5%' :
                             (product as any).productType === 'nft' || (product as any).productType === 'ft' ? '固定2.5%' :
                             '固定3%'}
                          </p>
                        </div>
                      </td>
                      <td className="py-4">
                        <div>
                          <p className="text-gray-900">{product.aiSales} 件</p>
                          <p className="text-sm text-gray-500">
                            {product.totalSales > 0 ? 
                              `${Math.round((product.aiSales / product.totalSales) * 100)}% 总销量` : 
                              '暂无总销量'
                            }
                          </p>
                        </div>
                      </td>
                      <td className="py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          product.status === 'active' ? 'bg-green-100 text-green-800' :
                          product.status === 'out_of_stock' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {product.status === 'active' ? '上架中' :
                           product.status === 'out_of_stock' ? '缺货' : '已下架'}
                        </span>
                      </td>
                      <td className="py-4">
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => {
                              setEditingProduct(product)
                              setShowPricingManager(true)
                            }}
                            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                          >
                            定价
                          </button>
                          <button 
                            onClick={async () => {
                              try {
                                // 从API获取完整商品信息
                                const fullProduct = await productApi.getProduct(product.id)
                                if (fullProduct) {
                                  // 提取价格（支持统一格式和旧格式）
                                  let priceValue = 0
                                  const productPrice = (fullProduct as any).price
                                  if (typeof productPrice === 'number') {
                                    priceValue = productPrice
                                  } else if (productPrice && typeof productPrice === 'object' && 'amount' in productPrice) {
                                    priceValue = (productPrice as any).amount
                                  }
                                  
                                  // 提取货币
                                  const currency = (productPrice && typeof productPrice === 'object' && 'currency' in productPrice) 
                                    ? (productPrice as any).currency 
                                    : (fullProduct as any).metadata?.currency || 'CNY'
                                  
                                  // 提取库存
                                  const stockValue = (fullProduct as any).inventory?.quantity ?? fullProduct.stock ?? 0
                                  
                                  setEditingProduct(fullProduct)
                                  setNewProduct({
                                    name: fullProduct.name,
                                    description: fullProduct.description || '',
                                    price: priceValue.toFixed(4), // 支持小数点后4位
                                    stock: String(stockValue),
                                    category: fullProduct.category || '',
                                    productType: (fullProduct as any).productType || 'physical',
                                    currency: currency,
                                    commissionRate: parseFloat((fullProduct.commissionRate?.toString() || '0').replace('%', '')) || 5,
                                    fixedCommissionRate: 3,
                                    allowCommissionAdjustment: false,
                                    image: (fullProduct as any).metadata?.image || (fullProduct as any).image || '',
                                    tags: (fullProduct as any).metadata?.tags || (fullProduct as any).tags || [],
                                  })
                                  setShowAddProduct(true)
                                }
                              } catch (err: any) {
                                console.error('加载商品详情失败:', err)
                                alert(err.message || '加载商品详情失败，请稍后重试')
                              }
                            }}
                            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                          >
                            编辑
                          </button>
                          <button 
                            onClick={() => toggleProductStatus(product.id)}
                            className="text-gray-600 hover:text-gray-700 text-sm font-medium"
                          >
                            {product.status === 'active' ? '下架' : '上架'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}
          </div>
        </div>
        {/* Add Product Modal */}
        {showAddProduct && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={(e) => {
              // 点击背景关闭模态框
              if (e.target === e.currentTarget) {
                setShowAddProduct(false)
              }
            }}
          >
            <div 
              className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col mx-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center p-6 border-b border-gray-200 flex-shrink-0">
                <h2 className="text-2xl font-bold text-gray-900">{editingProduct ? '编辑商品' : '添加新商品'}</h2>
                <button
                  onClick={() => {
                    setShowAddProduct(false)
                    setEditingProduct(null)
                    setNewProduct({ 
                      name: '', 
                      description: '',
                      price: '', 
                      stock: '', 
                      category: '', 
                      productType: 'physical',
                      currency: 'CNY',
                      commissionRate: 5,
                      fixedCommissionRate: 3,
                      allowCommissionAdjustment: false,
                      image: '',
                      tags: [],
                    })
                  }}
                  className="text-gray-400 hover:text-gray-600 text-2xl leading-none w-8 h-8 flex items-center justify-center"
                  type="button"
                >
                  ×
                </button>
              </div>
              <div className="border-b border-gray-200 px-6 flex space-x-4">
                <button
                  type="button"
                  onClick={() => setShowPreview(false)}
                  className={`py-3 px-4 border-b-2 font-medium text-sm ${
                    !showPreview
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  填写信息
                </button>
                <button
                  type="button"
                  onClick={() => setShowPreview(true)}
                  className={`py-3 px-4 border-b-2 font-medium text-sm ${
                    showPreview
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  预览效果
                </button>
              </div>
              <div className="overflow-y-auto flex-1 p-6">
              {!showPreview ? (
              <form onSubmit={handleAddProduct} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    商品名称 *
                  </label>
                  <input
                    type="text"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    商品描述
                  </label>
                  <textarea
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="请输入商品描述..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    价格 ({newProduct.currency}) *
                  </label>
                  <input
                    type="number"
                    value={newProduct.price}
                    onChange={(e) => {
                      const value = e.target.value;
                      // 允许空值（用于编辑时清空）
                      if (value === '' || (!isNaN(parseFloat(value)) && parseFloat(value) >= 0)) {
                        setNewProduct({...newProduct, price: value});
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                    step="0.0001"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">支持小数点后4位，必须大于等于0</p>
                  {newProduct.price && parseFloat(newProduct.price) < 0 && (
                    <p className="text-xs text-red-500 mt-1">价格不能为负数</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    货币
                  </label>
                  <select
                    value={newProduct.currency}
                    onChange={(e) => setNewProduct({...newProduct, currency: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="CNY">CNY (人民币)</option>
                    <option value="USD">USD (美元)</option>
                    <option value="USDT">USDT (稳定币)</option>
                    <option value="ETH">ETH (以太坊)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    库存数量 {newProduct.productType === 'service' || newProduct.productType === 'plugin' || newProduct.productType === 'subscription' ? '(服务类商品通常为无限库存)' : '*'}
                  </label>
                  <input
                    type="number"
                    value={newProduct.stock}
                    onChange={(e) => setNewProduct({...newProduct, stock: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                    disabled={newProduct.productType === 'service' || newProduct.productType === 'plugin' || newProduct.productType === 'subscription'}
                    required={newProduct.productType !== 'service' && newProduct.productType !== 'plugin' && newProduct.productType !== 'subscription'}
                  />
                  {(newProduct.productType === 'service' || newProduct.productType === 'plugin' || newProduct.productType === 'subscription') && (
                    <p className="text-xs text-gray-500 mt-1">服务类商品库存为无限</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    商品图片 URL
                  </label>
                  <input
                    type="url"
                    value={newProduct.image}
                    onChange={(e) => setNewProduct({...newProduct, image: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    商品分类
                  </label>
                  <input
                    type="text"
                    value={newProduct.category}
                    onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    产品类型
                  </label>
                  <select
                    value={newProduct.productType}
                    onChange={(e) => {
                      const productType = e.target.value as any
                      // 根据产品类型设置固定佣金率
                      const fixedRate = productType === 'physical' ? 3 : 
                                       productType === 'service' || productType === 'plugin' || productType === 'subscription' ? 5 : 2.5
                      setNewProduct({
                        ...newProduct,
                        productType,
                        fixedCommissionRate: fixedRate,
                        commissionRate: fixedRate,
                      })
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="physical">实体商品（佣金3%）</option>
                    <option value="service">服务类（佣金5%）</option>
                    <option value="nft">NFT（佣金2.5%）</option>
                    <option value="ft">FT代币（佣金2.5%）</option>
                    <option value="game_asset">游戏资产（佣金2.5%）</option>
                    <option value="rwa">RWA（佣金2.5%）</option>
                    <option value="plugin">插件（佣金5%）</option>
                    <option value="subscription">订阅服务（佣金5%）</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    固定佣金率：{newProduct.fixedCommissionRate}%（根据产品类型自动设置，符合统一数据标准）
                  </p>
                </div>
                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={newProduct.allowCommissionAdjustment}
                      onChange={(e) =>
                        setNewProduct({
                          ...newProduct,
                          allowCommissionAdjustment: e.target.checked,
                        })
                      }
                    />
                    <span className="text-sm text-gray-700">允许调整佣金率</span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    如果启用，可以为特定Agent或产品设置不同的佣金率
                  </p>
                </div>
                {newProduct.allowCommissionAdjustment && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      自定义佣金率 (%)
                    </label>
                    <input
                      type="number"
                      value={newProduct.commissionRate}
                      onChange={(e) => setNewProduct({...newProduct, commissionRate: parseFloat(e.target.value) || 0})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                      max="100"
                      step="0.1"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      默认：{newProduct.fixedCommissionRate}%（产品类型固定佣金率）
                    </p>
                  </div>
                )}
                <div className="flex space-x-3 pt-4 border-t border-gray-200 mt-4 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowAddProduct(false)}
                    className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                  >
                    {editingProduct ? '确认修改' : '添加商品'}
                  </button>
                </div>
              </form>
              ) : (
                <div className="space-y-4">
                  <ProductPreview
                    product={{
                      name: newProduct.name || '商品名称',
                      description: newProduct.description || '商品描述',
                      price: newProduct.price ? {
                        amount: parseFloat(newProduct.price) || 0,
                        currency: newProduct.currency,
                      } : 0,
                      productType: newProduct.productType,
                      category: newProduct.category || '未分类',
                      metadata: {
                        currency: newProduct.currency,
                        core: {
                          media: {
                            images: newProduct.image ? [{
                              url: newProduct.image,
                              type: 'thumbnail' as const,
                            }] : [],
                          },
                        },
                        tags: newProduct.tags,
                      },
                    }}
                  />
                  <div className="flex space-x-3 pt-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => setShowPreview(false)}
                      className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
                    >
                      返回编辑
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        const form = e.currentTarget.closest('div')?.previousElementSibling?.querySelector('form')
                        if (form) {
                          form.requestSubmit()
                        }
                      }}
                      className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                    >
                      {editingProduct ? '确认修改' : '确认添加'}
                    </button>
                  </div>
                </div>
              )}
              </div>
            </div>
          </div>
        )}

        {/* 定价管理Modal */}
        {showPricingManager && editingProduct && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">商品定价管理</h2>
                  <p className="text-sm text-gray-600 mt-1">{editingProduct.name}</p>
                </div>
                <button
                  onClick={() => {
                    setShowPricingManager(false)
                    setEditingProduct(null)
                  }}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
              <ProductPricingManager
                productId={editingProduct.id}
                basePrice={parseFloat((editingProduct.price || '0').toString().replace('¥', '').replace(',', '')) || 0}
                baseCurrency="CNY"
                onSave={(pricing) => {
                  console.log('保存定价设置:', pricing)
                  // TODO: 调用API保存定价设置
                  setShowPricingManager(false)
                  setEditingProduct(null)
                }}
              />
            </div>
          </div>
        )}
      </DashboardLayout>
    </>
  )
}

