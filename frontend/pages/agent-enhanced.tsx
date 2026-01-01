import Head from 'next/head';
import { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Bot, 
  LayoutDashboard, 
  ExternalLink, 
  UserCircle, 
  ShieldCheck, 
  Lock, 
  CreditCard,
  BarChart3,
  Package,
  ShoppingBag,
  Link2,
  Sparkles,
  ArrowRight,
  Code2,
  Store
} from 'lucide-react';
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
import { WalletManagement } from '../components/agent/WalletManagement';
import { PolicyEngine } from '../components/agent/PolicyEngine';
import { AirdropDiscovery } from '../components/agent/AirdropDiscovery';
import { UserModule } from '../components/agent/workspace/UserModule';
import { MerchantModule } from '../components/agent/workspace/MerchantModule';
import { DeveloperModule } from '../components/agent/workspace/DeveloperModule';
import { UnifiedWorkspace } from '../components/agent/workspace/UnifiedWorkspace';
import { CommandHandler } from '../components/agent/workspace/CommandHandler';

import { TaskPanel } from '../components/workspace/TaskPanel';

import { ProductInfo } from '../lib/api/product.api';
import { usePayment } from '../contexts/PaymentContext';
import { useUser } from '../contexts/UserContext';
import { useAgentMode } from '../contexts/AgentModeContext';
import { useLocalization } from '../contexts/LocalizationContext';
import { ViewMode } from '../types/agent';
import { SmartCheckout } from '../components/payment/SmartCheckout';
import { PaymentSuccessModal } from '../components/agent/PaymentSuccessModal';
import { useRouter } from 'next/router';

import { WorkbenchProvider, useWorkbench } from '../contexts/WorkbenchContext';

/**
 * Agentrix Agent V3.0 增强版页面
 * 优化UI/UX，体现AI商业智能体的完整能力
 */
export default function AgentEnhancedPage() {
  return (
    <WorkbenchProvider>
      <AgentEnhancedContent />
    </WorkbenchProvider>
  );
}

function AgentEnhancedContent() {
  const router = useRouter();
  const { startPayment, currentPayment, cancelPayment } = usePayment();
  const { user } = useUser();
  
  // 处理从 AgentBuilder 跳转过来的 agentId 参数
  const { agentId: urlAgentId } = router.query;
  const { t } = useLocalization();
  const { mode: agentModeContext, setMode: setAgentModeContext } = useAgentMode();
  const { viewMode, setViewMode, isChatExpanded, setIsChatExpanded } = useWorkbench();
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

  const [userTab, setUserTab] = useState<'checklist' | 'agents' | 'payments' | 'wallets' | 'kyc' | 'orders' | 'airdrops' | 'autoEarn' | 'profile'>('checklist');
  const [merchantTab, setMerchantTab] = useState<'checklist' | 'products' | 'orders' | 'settlement' | 'analytics' | 'api_keys' | 'webhooks' | 'audit' | 'settings' | 'ecommerce' | 'batch_import' | 'mpc_wallet' | 'integration_guide' | 'off_ramp'>('checklist');
  const [developerTab, setDeveloperTab] = useState<'checklist' | 'api' | 'revenue' | 'agents' | 'code' | 'webhooks' | 'logs' | 'simulator' | 'settings' | 'skills' | 'packs' | 'marketplace'>('checklist');
  
  // 将AgentModeContext的mode映射到UnifiedAgentChat的AgentMode
  const mapModeToAgentMode = (mode: 'personal' | 'merchant' | 'developer'): AgentMode => {
    return mode === 'personal' ? 'user' : mode;
  };
  
  const agentMode = mapModeToAgentMode(agentModeContext);
  const [useUnifiedChat, setUseUnifiedChat] = useState(true); // 默认使用统一Agent对话
  
  // 处理从 AgentBuilder 跳转过来时的 agentId 参数
  // 自动切换到 developer 模式和 agents tab 显示新创建的 Agent
  useEffect(() => {
    if (urlAgentId && typeof urlAgentId === 'string') {
      console.log('🔄 检测到 agentId 参数，切换到 Agent 管理界面:', urlAgentId);
      // 切换到 developer 模式
      setAgentModeContext('developer');
      // 切换到 developer_module 视图
      setViewMode('developer_module');
      // 切换到 agents tab
      setDeveloperTab('agents');
      // 清除 URL 中的 agentId 参数（可选）
      router.replace('/agent-enhanced', undefined, { shallow: true });
    }
  }, [urlAgentId, setAgentModeContext, setViewMode, router]);
  
  // 处理对话命令
  const handleCommand = (command: string, data?: any) => {
    // 处理直接的 switch_view 指令
    if (command === 'switch_view' && data?.view) {
      console.log('🔄 执行视图切换指令:', data.view);
      setViewMode(data.view as ViewMode);
      return { success: true, view: data.view };
    }

    // 处理 switch_tab 指令
    if (command === 'switch_tab' && data?.module) {
      console.log('🔄 执行标签切换指令:', data.module, data.tab);
      const moduleToView: Record<string, ViewMode> = {
        'user': 'user_module',
        'merchant': 'merchant_module',
        'developer': 'developer_module'
      };
      
      const targetView = moduleToView[data.module];
      if (targetView) {
        setViewMode(targetView);
        if (data.module === 'user') setUserTab(data.tab);
        if (data.module === 'merchant') setMerchantTab(data.tab);
        if (data.module === 'developer') setDeveloperTab(data.tab);
      }
      return { success: true };
    }

    const userRoles = {
      isUser: true,
      isMerchant: user?.roles?.includes('merchant' as any) || false,
      isDeveloper: user?.roles?.includes('developer' as any) || false,
    };
    
    const handler = new CommandHandler(userRoles, agentModeContext);
    const result = handler.processCommand(command, data);
    
    if (result.view) {
      // 映射 WorkspaceView 到 ViewMode
      const viewMap: Record<string, ViewMode> = {
        'user': 'user_module',
        'merchant': 'merchant_module',
        'developer': 'developer_module',
        'marketplace': 'marketplace',
        'orders': 'order',
        'chat': 'chat'
      };
      
      const targetView = viewMap[result.view] || (result.view as ViewMode);
      setViewMode(targetView);
      
      // 如果命令指定了 action，尝试映射到正确的 tab
      if (result.action === 'view_checklist' || result.action === 'view_lifecycle' || result.action === 'view_auth_guide') {
        if (result.view === 'user') setUserTab('checklist');
        if (result.view === 'merchant') setMerchantTab('checklist');
        if (result.view === 'developer') setDeveloperTab('checklist');
      }
    }
    
    return result;
  };

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
      case 'payments':
        handleCommand('switch_tab', { module: 'user', tab: 'payments' });
        break;
      case 'wallet_management':
      case 'wallets':
        handleCommand('switch_tab', { module: 'user', tab: 'wallets' });
        break;
      case 'order':
      case 'orders':
        handleCommand('switch_tab', { module: 'user', tab: 'orders' });
        break;
      case 'policies':
        handleCommand('switch_tab', { module: 'user', tab: 'agents' });
        break;
      case 'airdrops':
        handleCommand('switch_tab', { module: 'user', tab: 'airdrops' });
        break;
      case 'autoEarn':
      case 'auto_earn':
        handleCommand('switch_tab', { module: 'user', tab: 'autoEarn' });
        break;
      case 'security':
        handleCommand('switch_tab', { module: 'user', tab: 'agents' });
        break;
      case 'profile':
        handleCommand('switch_tab', { module: 'user', tab: 'profile' });
        break;
      case 'promotion':
        handleCommand('switch_tab', { 
          module: agentModeContext === 'personal' ? 'user' : agentModeContext, 
          tab: 'promotion' 
        });
        break;
      case 'risk_alert':
      case 'auto_purchase':
        // 这些功能在对话中处理，切换到对话模式
        setViewMode('chat');
        setUseUnifiedChat(true);
        setAgentModeContext('personal');
        break;
      case 'search':
      case 'shopping':
      case 'marketplace':
        setViewMode('marketplace');
        break;
      case 'plugins':
        // 跳转到插件市场页面
        window.location.href = '/plugins';
        break;
      
      // 商家Agent能力
      case 'merchant_products':
      case 'products':
      case 'create_product':
        handleCommand('switch_tab', { module: 'merchant', tab: 'products' });
        break;
      case 'merchant_ecommerce':
        handleCommand('switch_tab', { module: 'merchant', tab: 'ecommerce' });
        break;
      case 'merchant_batch':
        handleCommand('switch_tab', { module: 'merchant', tab: 'batch_import' });
        break;
      case 'merchant_mpc':
        handleCommand('switch_tab', { module: 'merchant', tab: 'mpc_wallet' });
        break;
      case 'merchant_orders':
        handleCommand('switch_tab', { module: 'merchant', tab: 'orders' });
        break;
      case 'merchant_finance':
      case 'settlement':
      case 'withdraw':
        handleCommand('switch_tab', { module: 'merchant', tab: 'settlement' });
        break;
      case 'merchant_off_ramp':
        handleCommand('switch_tab', { module: 'merchant', tab: 'off_ramp' });
        break;
      case 'merchant_integration':
        handleCommand('switch_tab', { module: 'merchant', tab: 'integration_guide' });
        break;
      case 'merchant_analytics':
      case 'order_analysis':
        handleCommand('switch_tab', { module: 'merchant', tab: 'analytics' });
        break;
      case 'merchant_api':
      case 'payment_collection':
      case 'generate_payment_link':
        handleCommand('switch_tab', { module: 'merchant', tab: 'api_keys' });
        break;
      case 'merchant_webhooks':
        handleCommand('switch_tab', { module: 'merchant', tab: 'webhooks' });
        break;
      case 'merchant_audit':
        handleCommand('switch_tab', { module: 'merchant', tab: 'audit' });
        break;
      case 'merchant_settings':
        handleCommand('switch_tab', { module: 'merchant', tab: 'settings' });
        break;
      case 'risk_center':
      case 'marketing_assistant':
      case 'compliance':
        setViewMode('chat');
        setAgentModeContext('merchant');
        break;
      
      // 开发者Agent能力
      case 'dev_api':
      case 'api_assistant':
        handleCommand('switch_tab', { module: 'developer', tab: 'api' });
        break;
      case 'dev_revenue':
        handleCommand('switch_tab', { module: 'developer', tab: 'revenue' });
        break;
      case 'dev_agents':
      case 'devops':
        handleCommand('switch_tab', { module: 'developer', tab: 'agents' });
        break;
      case 'dev_code':
      case 'code':
      case 'sdk_generator':
        handleCommand('switch_tab', { module: 'developer', tab: 'code' });
        break;
      case 'dev_webhooks':
        handleCommand('switch_tab', { module: 'developer', tab: 'webhooks' });
        break;
      case 'dev_logs':
      case 'logs':
        handleCommand('switch_tab', { module: 'developer', tab: 'logs' });
        break;
      case 'dev_simulator':
      case 'sandbox':
        handleCommand('switch_tab', { module: 'developer', tab: 'simulator' });
        break;
      case 'dev_settings':
        handleCommand('switch_tab', { module: 'developer', tab: 'settings' });
        break;
      case 'contract_helper':
        setViewMode('chat');
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

  const renderWorkspace = () => {
    switch (viewMode) {
      case 'chat':
        return (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-slate-950/40">
            <div className="max-w-4xl w-full">
              <div className="w-20 h-20 bg-indigo-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-indigo-500/20">
                <Sparkles size={40} className="text-indigo-400" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">Welcome to Agentrix Workbench</h2>
              <p className="text-slate-400 mb-12 max-w-2xl mx-auto text-lg">
                Agentrix empowers everyone to build, earn, and automate with AI Agents. Choose your path to get started.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div 
                  onClick={() => {
                    setAgentModeContext('personal');
                    setViewMode('user_module');
                  }}
                  className="bg-slate-900/50 border border-slate-800 hover:border-cyan-500/50 p-6 rounded-2xl cursor-pointer transition-all group"
                >
                  <div className="w-12 h-12 bg-cyan-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-cyan-500/20 transition-colors">
                    <UserCircle className="text-cyan-400" size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2 text-left">Path 1: Individual</h3>
                  <p className="text-slate-400 text-sm text-left mb-4">Authorize agents to handle your payments and manage your digital assets automatically.</p>
                  <div className="flex items-center text-cyan-400 text-xs font-bold gap-2">
                    START AUTHORIZATION <ArrowRight size={14} />
                  </div>
                </div>

                <div 
                  onClick={() => {
                    setAgentModeContext('merchant');
                    setViewMode('merchant_module');
                  }}
                  className="bg-slate-900/50 border border-slate-800 hover:border-blue-500/50 p-6 rounded-2xl cursor-pointer transition-all group"
                >
                  <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-500/20 transition-colors">
                    <Store className="text-blue-400" size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2 text-left">Path 2: Merchant</h3>
                  <p className="text-slate-400 text-sm text-left mb-4">List your products and integrate AX Pay to start receiving payments from the AI ecosystem.</p>
                  <div className="flex items-center text-blue-400 text-xs font-bold gap-2">
                    GO-LIVE CHECKLIST <ArrowRight size={14} />
                  </div>
                </div>

                <div 
                  onClick={() => {
                    setAgentModeContext('developer');
                    setViewMode('developer_module');
                  }}
                  className="bg-slate-900/50 border border-slate-800 hover:border-purple-500/50 p-6 rounded-2xl cursor-pointer transition-all group"
                >
                  <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-purple-500/20 transition-colors">
                    <Code2 className="text-purple-400" size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2 text-left">Path 3: Developer</h3>
                  <p className="text-slate-400 text-sm text-left mb-4">Build once, deploy everywhere. Create skills and distribute them across all major AI platforms.</p>
                  <div className="flex items-center text-purple-400 text-xs font-bold gap-2">
                    START BUILDING <ArrowRight size={14} />
                  </div>
                </div>
              </div>

              <div className="mt-12 p-6 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-indigo-500/20 rounded-full flex items-center justify-center">
                    <Bot size={20} className="text-indigo-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-white">Need help getting started?</p>
                    <p className="text-xs text-slate-500">Just ask the Agentrix Brain on the right side.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsChatExpanded(true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-all"
                >
                  TALK TO AGENT
                </button>
              </div>
            </div>
          </div>
        );
      case 'payment_assistant':
        return <div className="p-6"><UserModule onCommand={handleCommand} initialTab="payments" /></div>;
      case 'wallet':
      case 'wallet_management': 
        return <div className="p-6"><UserModule onCommand={handleCommand} initialTab="wallets" /></div>;
      case 'autoEarn': 
        return <div className="p-6"><UserModule onCommand={handleCommand} initialTab="autoEarn" /></div>;
      case 'marketplace': return <div className="p-6"><MarketplaceView onProductClick={handleProductClick} /></div>;
      case 'sdk_generator': return <div className="p-6"><DeveloperModule onCommand={handleCommand} initialTab="code" /></div>;
      case 'user_module':
        return <div className="p-6"><UserModule onCommand={handleCommand} initialTab={userTab} /></div>;
      case 'merchant_module':
        return <div className="p-6"><MerchantModule onCommand={handleCommand} initialTab={merchantTab} /></div>;
      case 'developer_module':
        return <div className="p-6"><DeveloperModule onCommand={handleCommand} initialTab={developerTab} /></div>;
      case 'unified_workbench':
        return <UnifiedWorkspace onAction={handleAction} />;
      case 'cart': return <div className="p-6"><ShoppingCart items={cartItems} onUpdateQuantity={handleUpdateCartQuantity} onRemoveItem={handleRemoveCartItem} onCheckout={handleCartCheckout} /></div>;

      case 'order': 
        return <div className="p-6"><UserModule onCommand={handleCommand} initialTab="orders" /></div>;
      case 'sandbox': return <div className="p-6"><Sandbox codeExample={selectedCodeExample} /></div>;
      case 'policies': 
      case 'security':
        // policies 和 security 已合并到 agents tab
        return <div className="p-6"><UserModule onCommand={handleCommand} initialTab="agents" /></div>;
      case 'airdrops': 
        return <div className="p-6"><UserModule onCommand={handleCommand} initialTab="airdrops" /></div>;
      case 'profile': return <div className="p-6"><UserModule onCommand={handleCommand} initialTab="profile" /></div>;
      case 'merchant_products':
        return <div className="p-6"><MerchantModule onCommand={handleCommand} initialTab="products" /></div>;
      case 'merchant_ecommerce':
        return <div className="p-6"><MerchantModule onCommand={handleCommand} initialTab="ecommerce" /></div>;
      case 'merchant_batch':
        return <div className="p-6"><MerchantModule onCommand={handleCommand} initialTab="batch_import" /></div>;
      case 'merchant_mpc':
        return <div className="p-6"><MerchantModule onCommand={handleCommand} initialTab="mpc_wallet" /></div>;
      case 'merchant_orders': 
        return <div className="p-6"><MerchantModule onCommand={handleCommand} initialTab="orders" /></div>;
      case 'merchant_finance':
        return <div className="p-6"><MerchantModule onCommand={handleCommand} initialTab="settlement" /></div>;
      case 'merchant_analytics': return <div className="p-6"><MerchantModule onCommand={handleCommand} initialTab="analytics" /></div>;
      case 'merchant_api':
        return <div className="p-6"><MerchantModule onCommand={handleCommand} initialTab="api_keys" /></div>;
      case 'merchant_webhooks':
        return <div className="p-6"><MerchantModule onCommand={handleCommand} initialTab="webhooks" /></div>;
      case 'merchant_audit':
        return <div className="p-6"><MerchantModule onCommand={handleCommand} initialTab="audit" /></div>;
      case 'merchant_settings':
        return <div className="p-6"><MerchantModule onCommand={handleCommand} initialTab="settings" /></div>;
      case 'api_assistant':
        return <div className="p-6"><DeveloperModule onCommand={handleCommand} initialTab="api" /></div>;
      case 'logs':
        return <div className="p-6"><DeveloperModule onCommand={handleCommand} initialTab="logs" /></div>;
      case 'devops':
        return <div className="p-6"><DeveloperModule onCommand={handleCommand} initialTab="agents" /></div>;
      default:
        return (
          <div className="p-6">
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-8 text-center">
              <Bot size={48} className="text-indigo-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">{viewMode.charAt(0).toUpperCase() + viewMode.slice(1)}</h3>
              <p className="text-slate-400">This workspace is being initialized by your Agent.</p>
            </div>
          </div>
        );
    }
  };

  return (
    <>
      <Head>
        <title>Agentrix Agent - AI商业智能体工作台</title>
        <meta
          name="description"
          content="Agentrix Agent - AI驱动的智能商业与支付助手，支持搜索、比价、下单、支付全链路自动化"
        />
      </Head>

      <div className="min-h-screen bg-[#0f1117] flex flex-col overflow-hidden">
        {/* 顶部导航 - 简化版，只保留Logo和Agent Builder */}
        <AgentTopNav />

        {/* 主内容区 - 三栏布局 */}
        <div className="flex-1 flex overflow-hidden">
          {/* 左侧功能面板 (Capabilities) */}
          <AgentSidebar onCapabilityClick={handleCapabilityClick} activeMode={viewMode} />

          {/* 中间主内容 (Structured Workspace) */}
          <div className="flex-1 overflow-hidden bg-[#0f1117] relative border-r border-slate-800/40">
            {/* 顶部面包屑/状态栏 */}
            <div className="h-12 border-b border-slate-800/60 flex items-center justify-between px-6 bg-[#0f1117]/80 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 text-[10px] uppercase tracking-wider font-bold">Workspace /</span>
                <span className="text-slate-200 text-xs font-medium">
                  {viewMode === 'chat' ? 'AI Dialogue' : 
                   viewMode === 'wallet' ? 'Wallet Management' :
                   viewMode === 'merchant_orders' ? 'Merchant Orders' :
                   viewMode === 'merchant_products' ? 'Product Management' :
                   viewMode === 'merchant_finance' ? 'Financial Settlement' :
                   viewMode.charAt(0).toUpperCase() + viewMode.slice(1)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
                <span className="text-[9px] text-slate-400 font-mono uppercase tracking-tighter">Live Sync</span>
              </div>
            </div>

            <div className="h-[calc(100%-3rem)] overflow-y-auto custom-scrollbar">
              {renderWorkspace()}
            </div>
          </div>

          {/* 右侧：大脑 (The Brain - Dialogue) */}
          <div className="w-[400px] flex flex-col bg-[#0f1117] border-l border-slate-800/40">
            <div className="h-12 border-b border-slate-800/60 flex items-center justify-between px-4 bg-[#0f1117]/80 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-bold text-slate-200 uppercase tracking-widest">Agentrix Brain</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700 font-mono">
                  {agentModeContext.toUpperCase()}
                </span>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <UnifiedAgentChat
                mode={agentMode}
                onModeChange={setAgentMode}
                onCommand={handleCommand}
                standalone={false}
              />
            </div>
          </div>
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

      {/* Floating Task Guidance Panel */}
      {agentModeContext === 'merchant' && viewMode.includes('merchant') && <TaskPanel type="merchant" />}
      {agentModeContext === 'developer' && (viewMode.includes('developer') || viewMode === 'sdk_generator') && <TaskPanel type="developer" />}
      {agentModeContext === 'personal' && (viewMode.includes('user') || viewMode === 'order' || viewMode === 'wallet') && <TaskPanel type="personal" />}
    </>
  );
}

