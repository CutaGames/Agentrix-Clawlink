import Head from 'next/head';
import { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import { AgentSidebar } from '../components/agent/AgentSidebar';
import { AgentTopNav } from '../components/agent/AgentTopNav';
import { AgentChatEnhanced } from '../components/agent/AgentChatEnhanced';
import { UnifiedAgentChat, AgentMode } from '../components/agent/UnifiedAgentChat';
import { MarketplaceView } from '../components/agent/MarketplaceView';
import { CodeGenerator } from '../components/agent/CodeGenerator';
import { ShoppingCart, CartItem } from '../components/agent/ShoppingCart';
import { OrderList } from '../components/agent/OrderList';
import { Sandbox } from '../components/agent/Sandbox';
import { AutoEarnPanel } from '../components/agent/AutoEarnPanel';
import { AgentInsightsPanel } from '../components/agent/AgentInsightsPanel';
import { ProductInfo } from '../lib/api/product.api';
import { usePayment } from '../contexts/PaymentContext';
import { useUser } from '../contexts/UserContext';
import { useAgentMode } from '../contexts/AgentModeContext';
import { ViewMode } from '../types/agent';
import { SmartCheckout } from '../components/payment/SmartCheckout';
import { PaymentSuccessModal } from '../components/agent/PaymentSuccessModal';
import { useRouter } from 'next/router';
import { useLocalization } from '../contexts/LocalizationContext';

/**
 * Agentrix Agent V3.0 增强版页面
 * 优化UI/UX，体现AI商业智能体的完整能力
 */
export default function AgentEnhancedPage() {
  const router = useRouter();
  const { startPayment, currentPayment, cancelPayment } = usePayment();
  const { user } = useUser();
  const { mode: agentModeContext, setMode: setAgentModeContext } = useAgentMode();
  const { t } = useLocalization();
  const [viewMode, setViewMode] = useState<ViewMode>('chat');
  const [selectedProduct, setSelectedProduct] = useState<ProductInfo | null>(null);
  const [codePrompt, setCodePrompt] = useState<string>('');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedCodeExample, setSelectedCodeExample] = useState<any>(null);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [paymentSuccessData, setPaymentSuccessData] = useState<{
    orderId?: string;
    amount?: number;
    currency?: string;
  } | null>(null);
  
  // 将AgentModeContext的mode映射到UnifiedAgentChat的AgentMode
  const mapModeToAgentMode = (mode: 'personal' | 'merchant' | 'developer'): AgentMode => {
    return mode === 'personal' ? 'user' : mode;
  };
  
  const agentMode = mapModeToAgentMode(agentModeContext);
  const [useUnifiedChat, setUseUnifiedChat] = useState(true); // 默认使用统一Agent对话
  
  // 同步agentMode到UnifiedAgentChat
  const setAgentMode = (mode: AgentMode) => {
    const contextMode = mode === 'user' ? 'personal' : mode;
    setAgentModeContext(contextMode);
  };

  const handleProductSelect = (productId: string) => {
    if (productId === 'search') {
      setViewMode('marketplace');
    }
  };

  const handleProductClick = (product: ProductInfo) => {
    setSelectedProduct(product);
    const existingItem = cartItems.find((item) => item.product.id === product.id);
    if (existingItem) {
      setCartItems(
        cartItems.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        ),
      );
    } else {
      setCartItems([...cartItems, { product, quantity: 1 }]);
    }
    setViewMode('cart');
  };

  const handleUpdateCartQuantity = (productId: string, quantity: number) => {
    setCartItems(
      cartItems.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item,
      ),
    );
  };

  const handleRemoveCartItem = (productId: string) => {
    setCartItems(cartItems.filter((item) => item.product.id !== productId));
  };

  const handleCartCheckout = () => {
    setCartItems([]);
    setViewMode('chat');
  };

  const handleCodeGenerate = (prompt: string) => {
    setCodePrompt(prompt);
    setViewMode('code');
  };

  const handleCodeExampleSelect = (example: any) => {
    setSelectedCodeExample(example);
    setViewMode('sandbox');
  };

  const handleOrderQuery = (orderId: string) => {
    setViewMode('orders');
  };

  const handleCapabilityClick = (capability: string) => {
    switch (capability) {
      // 个人Agent能力
      case 'bill_assistant':
      case 'payment_assistant':
      case 'wallet_management':
      case 'risk_alert':
      case 'auto_purchase':
        // 这些功能在对话中处理，切换到对话模式
        setViewMode('chat');
        setUseUnifiedChat(true);
        setAgentModeContext('personal');
        break;
      case 'search':
      case 'shopping':
        setViewMode('marketplace');
        break;
      case 'autoEarn':
        setViewMode('autoEarn');
        break;
      case 'order':
        setViewMode('orders');
        break;
      case 'marketplace':
        setViewMode('marketplace');
        break;
      case 'plugins':
        // 跳转到插件市场页面
        window.location.href = '/plugins';
        break;
      
      // 商家Agent能力
      case 'payment_collection':
      case 'order_analysis':
      case 'risk_center':
      case 'settlement':
      case 'marketing_assistant':
      case 'compliance':
      case 'products':
        // 切换到对话模式，使用商户Agent
        setViewMode('chat');
        setUseUnifiedChat(true);
        setAgentModeContext('merchant');
        break;
      case 'create_product':
        // 切换到对话模式，让Agent帮助创建商品
        setViewMode('chat');
        setUseUnifiedChat(true);
        setAgentModeContext('merchant');
        break;
      case 'generate_payment_link':
        // 切换到对话模式，让Agent帮助生成支付链接
        setViewMode('chat');
        setUseUnifiedChat(true);
        setAgentModeContext('merchant');
        break;
      case 'withdraw':
        // 切换到对话模式，让Agent帮助提现
        setViewMode('chat');
        setUseUnifiedChat(true);
        setAgentModeContext('merchant');
        break;
      
      // 开发者Agent能力
      case 'sdk_generator':
      case 'api_assistant':
      case 'devops':
      case 'contract_helper':
      case 'logs':
      case 'code':
        setViewMode('code');
        setUseUnifiedChat(true);
        setAgentModeContext('developer');
        break;
      case 'sandbox':
        setViewMode('sandbox');
        setUseUnifiedChat(true);
        setAgentModeContext('developer');
        break;
      
      default:
        // 默认切换到对话模式
        setViewMode('chat');
        break;
    }
  };

  const handleAction = (action: string, data?: any) => {
    switch (action) {
      case 'add_to_cart':
        if (data) {
          handleProductClick(data);
        }
        break;
      case 'buy_now':
        if (data) {
          startPayment({
            id: `payment_${Date.now()}`,
            amount: data.price.toString(),
            currency: data.currency,
            description: data.name,
            merchant: data.merchantId,
            metadata: {
              productId: data.id,
              orderType: data.category === 'nft' ? 'nft' : 'product',
            },
            createdAt: new Date().toISOString(),
          });
        }
        break;
      case 'view_order':
        handleOrderQuery(data.orderId);
        break;
      default:
        break;
    }
  };

  return (
    <>
      <Head>
        <title>{t({ zh: 'AX Agent - AI商业智能体工作台', en: 'AX Agent - AI Business Intelligence Workspace' })}</title>
        <meta
          name="description"
          content={t({ zh: 'AX Agent - AI驱动的智能商业与支付助手，支持搜索、比价、下单、支付全链路自动化', en: 'AX Agent - AI-powered intelligent business and payment assistant, supporting search, price comparison, ordering, and full payment automation' })}
        />
      </Head>

      <div className="min-h-screen bg-[#0f1117] flex flex-col overflow-hidden">
        {/* 顶部导航 - 简化版，只保留Logo和Agent Builder */}
        <AgentTopNav />

        {/* 主内容区 - 三栏布局 */}
        <div className="flex-1 flex overflow-hidden">
          {/* 左侧功能面板 */}
          <AgentSidebar onCapabilityClick={handleCapabilityClick} />

          {/* 中间主内容 */}
          <div className="flex-1 overflow-hidden bg-[#0f1117] relative">
            {viewMode === 'chat' && (
              <div className="h-full flex flex-col">
                {/* 顶部栏 */}
                <div className="h-16 border-b border-slate-800/60 flex items-center justify-between px-6 bg-[#0f1117]/80 backdrop-blur-md sticky top-0 z-10">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 text-sm">工作台 /</span>
                    <span className="text-slate-200 text-sm font-medium flex items-center gap-1">
                      {agentModeContext === 'personal' ? '个人' : agentModeContext === 'merchant' ? '商家' : '开发者'} Agent 
                      <span className="bg-indigo-500/20 text-indigo-300 text-[10px] px-1.5 py-0.5 rounded ml-2">v2.0</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button className="p-2 hover:bg-slate-800 rounded-full text-slate-400"><Search size={18}/></button>
                    <button className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg transition-colors shadow-lg shadow-indigo-600/20">
                      + 新建任务
                    </button>
                  </div>
                </div>
                
                {/* 对话区域 */}
                <div className="flex-1 overflow-hidden">
                  <UnifiedAgentChat
                    mode={agentMode}
                    onModeChange={setAgentMode}
                    standalone={false}
                  />
                </div>
              </div>
            )}

            {viewMode === 'autoEarn' && (
              <div className="h-full overflow-y-auto bg-[#0f1117] p-6">
                <AutoEarnPanel />
              </div>
            )}

            {viewMode === 'marketplace' && (
              <div className="h-full overflow-y-auto bg-[#0f1117] p-6">
                <MarketplaceView onProductClick={handleProductClick} />
              </div>
            )}

            {viewMode === 'code' && (
              <div className="h-full overflow-y-auto bg-[#0f1117] p-6">
                <CodeGenerator prompt={codePrompt} />
              </div>
            )}

            {viewMode === 'cart' && (
              <div className="h-full overflow-y-auto bg-[#0f1117] p-6">
                <ShoppingCart
                  items={cartItems}
                  onUpdateQuantity={handleUpdateCartQuantity}
                  onRemoveItem={handleRemoveCartItem}
                  onCheckout={handleCartCheckout}
                />
              </div>
            )}

            {viewMode === 'orders' && (
              <div className="h-full overflow-y-auto bg-[#0f1117] p-6">
                <OrderList
                  onOrderClick={(order) => {
                    window.location.href = `/app/user/transactions?orderId=${order.id}`;
                  }}
                />
              </div>
            )}

            {viewMode === 'sandbox' && (
              <div className="h-full overflow-y-auto bg-[#0f1117] p-6">
                <Sandbox codeExample={selectedCodeExample} />
              </div>
            )}

            {viewMode === 'settings' && (
              <div className="h-full overflow-y-auto bg-[#0f1117] p-6">
                <div className="max-w-4xl mx-auto">
                  <h2 className="text-2xl font-bold text-white mb-6">设置</h2>
                  <div className="space-y-6">
                    <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-800">
                      <h3 className="font-semibold text-white mb-2">Agent模式</h3>
                      <p className="text-sm text-slate-400">
                        当前模式: {user?.roles?.includes('merchant') ? '商户模式' : '用户模式'}
                      </p>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-800">
                      <h3 className="font-semibold text-white mb-2">KYC状态</h3>
                      <p className="text-sm text-slate-400">
                        {user?.kycLevel === 'verified' ? '✅ 已认证' : '⚠️ 未认证'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <AgentInsightsPanel />
        </div>
      </div>

      {/* 支付弹窗 */}
      {currentPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <SmartCheckout
              order={{
                id: currentPayment.metadata?.orderId || currentPayment.id,
                amount: parseFloat(
                  typeof currentPayment.amount === 'string'
                    ? currentPayment.amount.replace('¥', '').replace(',', '').replace('$', '')
                    : String(currentPayment.amount)
                ),
                currency: currentPayment.currency || 'CNY',
                description: currentPayment.description || '订单支付',
                merchantId: currentPayment.metadata?.merchantId || currentPayment.merchant || '',
                to: currentPayment.metadata?.to,
                metadata: currentPayment.metadata,
              }}
              onSuccess={(result) => {
                console.log('✅ 支付成功:', result);
                cancelPayment();
                // 显示成功弹窗
                setPaymentSuccessData({
                  orderId: result?.id || currentPayment.metadata?.orderId || currentPayment.id,
                  amount: parseFloat(
                    typeof currentPayment.amount === 'string'
                      ? currentPayment.amount.replace('¥', '').replace(',', '').replace('$', '')
                      : String(currentPayment.amount)
                  ),
                  currency: currentPayment.currency || 'CNY',
                });
                setShowPaymentSuccess(true);
              }}
              onCancel={() => {
                cancelPayment();
              }}
            />
          </div>
        </div>
      )}
      
      {/* 支付成功弹窗 */}
      <PaymentSuccessModal
        isOpen={showPaymentSuccess}
        onClose={() => setShowPaymentSuccess(false)}
        onViewOrders={() => {
          setShowPaymentSuccess(false);
          // 延迟一下，让弹窗先关闭
          setTimeout(() => {
            // 触发查看订单 - 通过事件或直接调用
            const event = new CustomEvent('trigger-agent-message', { 
              detail: { message: '查看订单' } 
            });
            window.dispatchEvent(event);
          }, 300);
        }}
        onContinueShopping={() => {
          setShowPaymentSuccess(false);
          // 延迟一下，让弹窗先关闭
          setTimeout(() => {
            // 触发继续购物 - 通过事件或直接调用
            const event = new CustomEvent('trigger-agent-message', { 
              detail: { message: '搜索商品' } 
            });
            window.dispatchEvent(event);
          }, 300);
        }}
        orderId={paymentSuccessData?.orderId}
        amount={paymentSuccessData?.amount}
        currency={paymentSuccessData?.currency}
      />
    </>
  );
}

