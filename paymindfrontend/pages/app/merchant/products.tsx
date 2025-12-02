import Head from 'next/head'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'
import { useState } from 'react'
import { ProductPricingManager } from '../../../components/merchant/ProductPricingManager'
import { productApi } from '../../../lib/api/product.api'
import { convertToUnifiedProduct } from '../../../lib/utils/product-converter'

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
  const [products, setProducts] = useState<ProductDisplay[]>([
    {
      id: '1',
      name: '联想 Yoga 笔记本电脑',
      price: '¥7,999',
      stock: 45,
      status: 'active',
      category: '电子产品',
      productType: 'physical',
      commissionRate: '5%',
      aiSales: 15,
      totalSales: 28,
      createdAt: '2024-01-01'
    },
    {
      id: '2',
      name: '无线蓝牙耳机',
      price: '¥299',
      stock: 120,
      status: 'active',
      category: '音频设备',
      productType: 'physical',
      commissionRate: '8%',
      aiSales: 23,
      totalSales: 45,
      createdAt: '2024-01-05'
    },
    {
      id: '3',
      name: '机械键盘',
      price: '¥599',
      stock: 0,
      status: 'out_of_stock',
      category: '外设',
      productType: 'physical',
      commissionRate: '7%',
      aiSales: 7,
      totalSales: 12,
      createdAt: '2024-01-10'
    }
  ])

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

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      // 转换为统一数据标准格式
      const unifiedProduct = convertToUnifiedProduct({
      name: newProduct.name,
        description: newProduct.description,
        price: parseFloat(newProduct.price) || 0,
        stock: parseInt(newProduct.stock) || 0,
      category: newProduct.category,
      productType: newProduct.productType,
        currency: newProduct.currency,
        commissionRate: newProduct.allowCommissionAdjustment ? newProduct.commissionRate : newProduct.fixedCommissionRate,
        image: newProduct.image,
        tags: newProduct.tags,
      })

      // 调用API创建商品
      const createdProduct = await productApi.createProduct(unifiedProduct)
      
      // 更新本地列表（转换为显示格式）
      // 使用类型断言访问可能存在的统一格式属性
      const productAny = createdProduct as any;
      
      let productPrice = 0;
      const priceValue = createdProduct.price;
      if (priceValue !== null && priceValue !== undefined) {
        // 检查是否为对象类型（统一格式）
        if (typeof priceValue === 'object') {
          // 使用类型守卫：检查是否为非 null 对象且包含 amount 属性
          const priceObj = priceValue as { amount?: number } | null;
          if (priceObj !== null && 'amount' in priceObj && typeof priceObj.amount === 'number') {
            productPrice = priceObj.amount;
          }
        } 
        // 检查是否为数字类型（旧格式）
        else if (typeof priceValue === 'number') {
          productPrice = priceValue;
        }
      }
      
      let productStock = 0;
      // ProductInfo 接口中只有 stock，没有 inventory
      // 但实际返回可能包含 inventory（统一格式），使用类型断言处理
      const inventoryValue = productAny.inventory;
      if (inventoryValue !== null && inventoryValue !== undefined) {
        // 检查是否为对象类型（统一格式）
        if (typeof inventoryValue === 'object' && inventoryValue !== null) {
          if ('quantity' in inventoryValue) {
            productStock = (inventoryValue as { quantity?: number }).quantity || 0;
          }
        }
      }
      // 如果 inventory 不存在，使用 stock（向后兼容）
      if (productStock === 0) {
        const stockValue = createdProduct.stock;
        if (stockValue !== null && stockValue !== undefined) {
          productStock = stockValue;
        }
      }
      
      setProducts([...products, {
        id: createdProduct.id,
        name: createdProduct.name,
        price: `¥${productPrice}`,
        stock: productStock,
        status: createdProduct.status || 'active',
        category: createdProduct.category,
        productType: productAny.productType || 'physical',
        commissionRate: `${createdProduct.metadata?.extensions?.commissionRate || createdProduct.commissionRate || 0}%`,
      aiSales: 0,
      totalSales: 0,
      createdAt: new Date().toISOString().split('T')[0]
      }])
      
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
    setShowAddProduct(false)
    } catch (error: any) {
      console.error('创建商品失败:', error)
      alert(error.message || '创建商品失败，请稍后再试')
    }
  }

  const toggleProductStatus = (productId: string) => {
    setProducts(products.map(product => 
      product.id === productId 
        ? { ...product, status: product.status === 'active' ? 'inactive' : 'active' }
        : product
    ))
  }

  return (
    <>
      <Head>
        <title>商品管理 - PayMind</title>
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
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 text-sm font-medium text-gray-600">商品名称</th>
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
                          <p className="text-sm text-gray-500">{product.category}</p>
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
                          <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
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
                <h2 className="text-2xl font-bold text-gray-900">添加新商品</h2>
                <button
                  onClick={() => setShowAddProduct(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl leading-none w-8 h-8 flex items-center justify-center"
                  type="button"
                >
                  ×
                </button>
              </div>
              <div className="overflow-y-auto flex-1 p-6">
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
                    onChange={(e) => setNewProduct({...newProduct, price: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                    step="0.01"
                    required
                  />
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
                    添加商品
                  </button>
                </div>
              </form>
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

