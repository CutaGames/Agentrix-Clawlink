import Head from 'next/head'
import Link from 'next/link'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'
import { useState, useEffect } from 'react'
import { ProductPricingManager } from '../../../components/merchant/ProductPricingManager'
import { ProductPreview } from '../../../components/merchant/ProductPreview'
import { productApi } from '../../../lib/api/product.api'
import { convertToUnifiedProduct } from '../../../lib/utils/product-converter'
import { useUser } from '../../../contexts/UserContext'
import { useLocalization } from '../../../contexts/LocalizationContext'
import { useToast } from '../../../contexts/ToastContext'

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
  const { t } = useLocalization()
  const { success, error: showError } = useToast()
  const [products, setProducts] = useState<ProductDisplay[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showAddProduct, setShowAddProduct] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 限制文件大小为 5MB
    if (file.size > 5 * 1024 * 1024) {
      showError(t({ zh: '图片大小不能超过 5MB', en: 'Image size cannot exceed 5MB' }))
      return
    }

    setIsUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/upload/image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      const data = await response.json()
      setNewProduct({ ...newProduct, image: data.url })
      success(t('common.success'))
    } catch (error) {
      console.error('Upload error:', error)
      showError(t('common.error'))
    } finally {
      setIsUploading(false)
    }
  }
  
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
        if (product.price && typeof product.price === 'object' && 'amount' in product.price) {
          priceValue = Number(product.price.amount) || 0;
        } else if (product.price !== undefined && product.price !== null) {
          priceValue = Number(product.price) || 0;
        }
        
        // 调试日志：检查价格提取
        if (priceValue === 0 && product.price !== undefined && product.price !== null && Number(product.price) !== 0) {
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
        <title>{t('merchantProducts.pageTitle')} - Agentrix</title>
      </Head>
      <DashboardLayout userType="merchant">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('merchantProducts.pageTitle')}</h1>
              <p className="text-gray-600">{t('merchantProducts.pageDescription')}</p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/app/merchant/ecommerce-sync"
                className="border border-purple-600 text-purple-600 px-4 py-2 rounded-lg font-semibold hover:bg-purple-50 transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {t('merchantProducts.ecommerceSync')}
              </Link>
              <Link
                href="/app/merchant/batch-import"
                className="border border-blue-600 text-blue-600 px-4 py-2 rounded-lg font-semibold hover:bg-blue-50 transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                {t('merchantProducts.batchImport')}
              </Link>
              <button
                onClick={() => setShowAddProduct(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                {t('merchantProducts.addProduct')}
              </button>
            </div>
          </div>
        </div>
        {/* Products Grid */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">{t('merchantProducts.productList')}</h2>
          </div>
          <div className="p-6">
            {loading && (
              <div className="text-center py-8 text-gray-500">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2">{t('common.loading')}</p>
              </div>
            )}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-red-800">{error}</p>
                <button
                  onClick={loadProducts}
                  className="mt-2 text-red-600 hover:text-red-700 text-sm font-medium"
                >
                  {t('common.retry')}
                </button>
              </div>
            )}
            {!loading && !error && products.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">📦</div>
                <p>{t('merchantProducts.noProducts')}</p>
                <button
                  onClick={() => setShowAddProduct(true)}
                  className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  {t('merchantProducts.addFirstProduct')}
                </button>
              </div>
            )}
            {!loading && !error && products.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 text-sm font-medium text-gray-600">{t('merchantProducts.table.productName')}</th>
                    <th className="text-left py-3 text-sm font-medium text-gray-600">{t('merchantProducts.table.category')}</th>
                    <th className="text-left py-3 text-sm font-medium text-gray-600">{t('merchantProducts.table.price')}</th>
                    <th className="text-left py-3 text-sm font-medium text-gray-600">{t('merchantProducts.table.stock')}</th>
                    <th className="text-left py-3 text-sm font-medium text-gray-600">{t('merchantProducts.table.commissionRate')}</th>
                    <th className="text-left py-3 text-sm font-medium text-gray-600">{t('merchantProducts.table.aiSales')}</th>
                    <th className="text-left py-3 text-sm font-medium text-gray-600">{t('merchantProducts.table.status')}</th>
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
                          {(product as any).productType === 'physical' ? t('merchantProducts.productTypes.physical') :
                           (product as any).productType === 'service' ? t('merchantProducts.productTypes.service') :
                           (product as any).productType === 'nft' ? t('merchantProducts.productTypes.nft') :
                           (product as any).productType === 'ft' ? t('merchantProducts.productTypes.ft') :
                           (product as any).productType === 'game_asset' ? t('merchantProducts.productTypes.gameAsset') :
                           (product as any).productType === 'rwa' ? t('merchantProducts.productTypes.rwa') : t('merchantProducts.productTypes.physical')}
                        </span>
                        <p className="text-sm text-gray-500 mt-1">{product.category || t('merchantProducts.uncategorized')}</p>
                      </td>
                      <td className="py-4 text-gray-900">{product.price}</td>
                      <td className="py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          product.stock > 20 ? 'bg-green-100 text-green-800' :
                          product.stock > 0 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {product.stock} {t('merchantProducts.units')}
                        </span>
                      </td>
                      <td className="py-4">
                        <div>
                          <span className="text-blue-600 font-medium">{product.commissionRate}</span>
                          <p className="text-xs text-gray-500 mt-1">
                            {(product as any).productType === 'physical' ? t('merchantProducts.commissionRates.physical') :
                             (product as any).productType === 'service' ? t('merchantProducts.commissionRates.service') :
                             (product as any).productType === 'nft' || (product as any).productType === 'ft' ? t('merchantProducts.commissionRates.digital') :
                             t('merchantProducts.commissionRates.default')}
                          </p>
                        </div>
                      </td>
                      <td className="py-4">
                        <div>
                          <p className="text-gray-900">{product.aiSales} {t('merchantProducts.units')}</p>
                          <p className="text-sm text-gray-500">
                            {product.totalSales > 0 ? 
                              `${Math.round((product.aiSales / product.totalSales) * 100)}% ${t('merchantProducts.totalSales')}` : 
                              t('merchantProducts.noTotalSales')}
                          </p>
                        </div>
                      </td>
                      <td className="py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          product.status === 'active' ? 'bg-green-100 text-green-800' :
                          product.status === 'out_of_stock' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {product.status === 'active' ? t('merchantProducts.status.active') :
                           product.status === 'out_of_stock' ? t('merchantProducts.status.outOfStock') : t('merchantProducts.status.inactive')}
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
                            {t('merchantProducts.actions.pricing')}
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
                            {t('merchantProducts.actions.edit')}
                          </button>
                          <button 
                            onClick={() => toggleProductStatus(product.id)}
                            className="text-gray-600 hover:text-gray-700 text-sm font-medium"
                          >
                            {product.status === 'active' ? t('merchantProducts.actions.deactivate') : t('merchantProducts.actions.activate')}
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
                <h2 className="text-2xl font-bold text-gray-900">{editingProduct ? t('merchantProducts.modal.editProduct') : t('merchantProducts.modal.addProduct')}</h2>
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
                  {t('merchantProducts.modal.fillInfo')}
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
                  {t('merchantProducts.modal.preview')}
                </button>
              </div>
              <div className="overflow-y-auto flex-1 p-6">
              {!showPreview ? (
              <form onSubmit={handleAddProduct} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('merchantProducts.form.productName')} *
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
                    {t('merchantProducts.form.description')}
                  </label>
                  <textarea
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder={t('merchantProducts.form.descriptionPlaceholder')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('merchantProducts.form.price')} ({newProduct.currency}) *
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
                  <p className="text-xs text-gray-500 mt-1">{t('merchantProducts.form.priceHint')}</p>
                  {newProduct.price && parseFloat(newProduct.price) < 0 && (
                    <p className="text-xs text-red-500 mt-1">{t('merchantProducts.form.priceNegative')}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('merchantProducts.form.currency')} *
                  </label>
                  <select
                    value={newProduct.currency}
                    onChange={(e) => setNewProduct({...newProduct, currency: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="CNY">{t('merchantProducts.form.currencyOptions.cny')}</option>
                    <option value="USD">{t('merchantProducts.form.currencyOptions.usd')}</option>
                    <option value="USDT">{t('merchantProducts.form.currencyOptions.usdt')}</option>
                    <option value="EUR">{t('merchantProducts.form.currencyOptions.eur')}</option>
                    <option value="GBP">{t('merchantProducts.form.currencyOptions.gbp')}</option>
                    <option value="HKD">{t('merchantProducts.form.currencyOptions.hkd')}</option>
                    <option value="JPY">{t('merchantProducts.form.currencyOptions.jpy')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('merchantProducts.form.stock')} {newProduct.productType === 'service' || newProduct.productType === 'plugin' || newProduct.productType === 'subscription' ? t('merchantProducts.form.stockHintService') : '*'}
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
                    <p className="text-xs text-gray-500 mt-1">{t('merchantProducts.form.stockHintUnlimited')}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('merchantProducts.form.imageUrl')}
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="url"
                      value={newProduct.image}
                      onChange={(e) => setNewProduct({...newProduct, image: e.target.value})}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="https://example.com/image.jpg"
                    />
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="product-image-upload"
                        disabled={isUploading}
                      />
                      <label
                        htmlFor="product-image-upload"
                        className={`px-4 py-2 bg-gray-100 text-gray-700 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors flex items-center ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {isUploading ? (
                          <svg className="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                        )}
                      </label>
                    </div>
                  </div>
                  {newProduct.image && (
                    <div className="mt-2 relative w-20 h-20 border border-gray-200 rounded-lg overflow-hidden">
                      <img src={newProduct.image} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setNewProduct({...newProduct, image: ''})}
                        className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-bl-lg hover:bg-red-600"
                      >
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('merchantProducts.form.category')} *
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
                    {t('merchantProducts.form.productType')} *
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
                    <option value="physical">{t('merchantProducts.form.productTypeOptions.physical')}</option>
                    <option value="service">{t('merchantProducts.form.productTypeOptions.service')}</option>
                    <option value="nft">{t('merchantProducts.form.productTypeOptions.nft')}</option>
                    <option value="ft">{t('merchantProducts.form.productTypeOptions.ft')}</option>
                    <option value="game_asset">{t('merchantProducts.form.productTypeOptions.gameAsset')}</option>
                    <option value="rwa">{t('merchantProducts.form.productTypeOptions.rwa')}</option>
                    <option value="plugin">{t('merchantProducts.form.productTypeOptions.plugin')}</option>
                    <option value="subscription">{t('merchantProducts.form.productTypeOptions.subscription')}</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {t('merchantProducts.form.fixedCommissionRate', { rate: newProduct.fixedCommissionRate })}
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
                    <span className="text-sm text-gray-700">{t('merchantProducts.form.allowCommissionAdjustment')}</span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    {t('merchantProducts.form.allowCommissionAdjustmentHint')}
                  </p>
                </div>
                {newProduct.allowCommissionAdjustment && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('merchantProducts.form.customCommissionRate')}
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
                      {t('merchantProducts.form.defaultCommissionRate', { rate: newProduct.fixedCommissionRate })}
                    </p>
                  </div>
                )}
                <div className="flex space-x-3 pt-4 border-t border-gray-200 mt-4 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowAddProduct(false)}
                    className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                  >
                    {editingProduct ? t('merchantProducts.form.confirmEdit') : t('merchantProducts.form.addProduct')}
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
                      {t('merchantProducts.modal.backToEdit')}
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
                      {editingProduct ? t('merchantProducts.modal.confirmEdit') : t('merchantProducts.modal.confirmAdd')}
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
                  <h2 className="text-2xl font-bold text-gray-900">{t('merchantProducts.pricingManager.title')}</h2>
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

