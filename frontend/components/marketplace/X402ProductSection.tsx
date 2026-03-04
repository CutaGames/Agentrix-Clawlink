'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { productApi, ProductInfo } from '@/lib/api/product.api';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useWeb3 } from '@/contexts/Web3Context';
import { Zap, Shield, Clock, ExternalLink, Loader2, Package, RefreshCw, Wallet } from 'lucide-react';

// 获取后端 API Base URL
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.')) {
      return 'http://localhost:3001/api';
    }
    if (hostname.includes('agentrix.top') || hostname.includes('agentrix.io')) {
      return 'https://api.agentrix.top/api';
    }
  }
  return 'http://localhost:3001/api';
};

interface X402Product extends ProductInfo {
  x402Enabled?: boolean;
  x402Params?: {
    scheme: string;
    network: string;
    token?: string;
  };
}

export function X402ProductSection() {
  const router = useRouter();
  const { t } = useLocalization();
  const { isConnected, address } = useWeb3();
  const [products, setProducts] = useState<X402Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoFetching, setAutoFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadX402Products = async () => {
    try {
      setLoading(true);
      setError(null);
      // 获取 X402 专区商品
      const data = await productApi.getProducts({ type: 'x402' });
      setProducts(data || []);
    } catch (err: any) {
      console.error('加载 X402 商品失败:', err);
      setError(err.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const autoFetchX402Products = async () => {
    try {
      setAutoFetching(true);
      setError('');
      
      // 获取认证token（注意：实际存储的 key 是 'access_token'）
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      
      // 同时支持传统登录和钱包登录
      if (!token && !isConnected) {
        throw new Error('请先登录或连接钱包后再获取X402商品');
      }
      
      // 构建请求头
      const headers: Record<string, string> = { 
        'Content-Type': 'application/json',
      };
      
      // 如果有 token 使用 token 认证
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      // 如果连接了钱包，添加钱包地址到请求头（后端可用于钱包认证）
      if (isConnected && address) {
        headers['X-Wallet-Address'] = address;
      }
      
      // 调用后端自动获取 X402 V2 商品（使用完整后端 URL）
      const apiBaseUrl = getApiBaseUrl();
      console.log('🔄 调用 X402 自动获取 API:', `${apiBaseUrl}/products/x402/auto-fetch`);
      
      const response = await fetch(`${apiBaseUrl}/products/x402/auto-fetch`, {
        method: 'POST',
        headers,
      });
      
      console.log('📡 X402 API 响应状态:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ X402 自动获取结果:', result);
        // 重新加载商品列表
        await loadX402Products();
      } else if (response.status === 401) {
        throw new Error('登录已过期，请重新登录或连接钱包');
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ X402 API 错误:', errorData);
        throw new Error(errorData.message || `自动获取失败 (${response.status})`);
      }
    } catch (err: any) {
      console.error('❌ 自动获取 X402 商品失败:', err);
      // 区分网络错误和其他错误
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        setError('网络连接失败，请检查后端服务是否运行');
      } else {
        setError(err.message || '自动获取失败');
      }
    } finally {
      setAutoFetching(false);
    }
  };

  useEffect(() => {
    loadX402Products();
  }, []);

  const handleProductClick = (product: X402Product) => {
    router.push(`/marketplace/product/${product.id}?x402=true`);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="animate-spin text-purple-600 mb-4" size={48} />
        <p className="text-slate-500">{t({ zh: '加载 X402 专区...', en: 'Loading X402 Zone...' })}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* X402 专区介绍 */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-8 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-white/20 rounded-lg">
            <Zap size={24} />
          </div>
          <h2 className="text-2xl font-bold">{t({ zh: 'X402 专区', en: 'X402 Zone' })}</h2>
          <span className="px-2 py-1 bg-white/20 text-xs font-bold rounded">V2</span>
        </div>
        <p className="text-white/90 mb-6 max-w-2xl">
          {t({ 
            zh: 'X402 协议支持自动发现和获取商品，通过去中心化的方式实现商品信息同步。支持 0.3% 超低通道费（从平台费中扣除），商户实收不变。', 
            en: 'X402 protocol supports automatic product discovery and fetching. Enables 0.3% ultra-low channel fee (deducted from platform fee), merchant net remains unchanged.' 
          })}
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white/10 rounded-xl p-4">
            <Shield className="mb-2" size={20} />
            <h3 className="font-semibold mb-1">{t({ zh: '安全可信', en: 'Secure & Trusted' })}</h3>
            <p className="text-sm text-white/70">{t({ zh: '链上验证，不可篡改', en: 'On-chain verification, tamper-proof' })}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4">
            <Clock className="mb-2" size={20} />
            <h3 className="font-semibold mb-1">{t({ zh: '即时结算', en: 'Instant Settlement' })}</h3>
            <p className="text-sm text-white/70">{t({ zh: '无需等待，秒级到账', en: 'No waiting, settlement in seconds' })}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4">
            <Zap className="mb-2" size={20} />
            <h3 className="font-semibold mb-1">{t({ zh: '超低费率', en: 'Ultra-low Fees' })}</h3>
            <p className="text-sm text-white/70">{t({ zh: '0.3% 通道费，商户零损失', en: '0.3% channel fee, zero merchant loss' })}</p>
          </div>
        </div>

        <button
          onClick={autoFetchX402Products}
          disabled={autoFetching}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white text-purple-600 rounded-lg font-medium hover:bg-white/90 transition-colors disabled:opacity-50"
        >
          {autoFetching ? (
            <>
              <Loader2 className="animate-spin" size={16} />
              {t({ zh: '自动获取中...', en: 'Auto-fetching...' })}
            </>
          ) : (
            <>
              <RefreshCw size={16} />
              {t({ zh: '自动获取 X402 商品', en: 'Auto-fetch X402 Products' })}
            </>
          )}
        </button>
        
        {/* 钱包连接状态显示 */}
        {isConnected && address && (
          <div className="mt-3 flex items-center gap-2 text-white/80 text-sm">
            <Wallet size={14} />
            <span>{t({ zh: '钱包已连接', en: 'Wallet Connected' })}: {address.slice(0, 6)}...{address.slice(-4)}</span>
          </div>
        )}
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
          {error}
        </div>
      )}

      {/* 商品列表 */}
      {products.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => {
            const productImage = product.metadata?.image || product.metadata?.images?.[0];
            return (
            <div
              key={product.id}
              onClick={() => handleProductClick(product)}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all cursor-pointer group"
            >
              {/* 商品图片 */}
              <div className="aspect-square bg-slate-100 relative overflow-hidden">
                {productImage ? (
                  <img
                    src={productImage}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="text-slate-300" size={48} />
                  </div>
                )}
                {/* X402 标签 */}
                <div className="absolute top-3 left-3 px-2 py-1 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs font-bold rounded">
                  X402
                </div>
                {product.x402Params?.network && (
                  <div className="absolute top-3 right-3 px-2 py-1 bg-black/50 text-white text-xs rounded">
                    {product.x402Params.network}
                  </div>
                )}
              </div>
              
              {/* 商品信息 */}
              <div className="p-4">
                <h3 className="font-semibold text-slate-900 mb-1 line-clamp-1">{product.name}</h3>
                <p className="text-sm text-slate-500 mb-3 line-clamp-2">{product.description}</p>
                
                <div className="flex items-center justify-between">
                  <div className="text-lg font-bold text-purple-600">
                    {/* 优先从 x402Params 获取价格，支持多种计价方式 */}
                    {(() => {
                      const params = product.metadata?.x402Params;
                      const currency = params?.currency || product.metadata?.currency || 'USDT';
                      
                      if (params?.pricePerRequest) {
                        return `${params.pricePerRequest} ${currency}/次`;
                      }
                      if (params?.pricePerQuery) {
                        return `${params.pricePerQuery} ${currency}/次`;
                      }
                      if (params?.pricePerSecond) {
                        return `${params.pricePerSecond} ${currency}/秒`;
                      }
                      if (params?.pricePerMB) {
                        return `${params.pricePerMB} ${currency}/MB`;
                      }
                      // 默认显示 product.price
                      const price = parseFloat(String(product.price || 0));
                      return price > 0 ? `${price} ${currency}` : `按用量计费`;
                    })()}
                  </div>
                  <button className="text-purple-600 hover:text-purple-700 flex items-center gap-1 text-sm">
                    {t({ zh: '查看', en: 'View' })}
                    <ExternalLink size={14} />
                  </button>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-xl border border-slate-200">
          <Package className="mx-auto text-slate-300 mb-4" size={48} />
          <h3 className="text-xl font-semibold text-slate-900 mb-2">
            {t({ zh: '暂无 X402 商品', en: 'No X402 Products Yet' })}
          </h3>
          <p className="text-slate-500 mb-6">
            {t({ zh: '点击"自动获取"按钮发现更多 X402 协议支持的商品', en: 'Click "Auto-fetch" button to discover X402 protocol supported products' })}
          </p>
          <button
            onClick={autoFetchX402Products}
            disabled={autoFetching}
            className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            {autoFetching ? (
              <>
                <Loader2 className="animate-spin" size={16} />
                {t({ zh: '自动获取中...', en: 'Auto-fetching...' })}
              </>
            ) : (
              <>
                <RefreshCw size={16} />
                {t({ zh: '自动获取 X402 商品', en: 'Auto-fetch X402 Products' })}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
