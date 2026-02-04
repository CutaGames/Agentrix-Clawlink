import { ChatMessage } from './UnifiedAgentChat';
import { SelectableCart, CartItem } from './SelectableCart';
import { ProductDetailModal } from './ProductDetailModal';
import { MultiAssetProductCard, MultiAssetProductList, MultiAssetProduct } from './MultiAssetProductCard';
import { useState, useEffect, useCallback } from 'react';
import { ShoppingCart, Eye, Loader2, CheckCircle, XCircle, ExternalLink, Copy, Clock } from 'lucide-react';
import { cartApi } from '../../lib/api/cart.api';
import { orderApi } from '../../lib/api/order.api';
import { ProductInfo } from '../../lib/api/product.api';
import { commerceApi } from '../../lib/api/commerce.api';
import { payIntentApi } from '../../lib/api/pay-intent.api';
import { useUser } from '../../contexts/UserContext';

// Commerce 上下文类型
export interface CommerceContextType {
  lastPoolId?: string;
  lastSplitPlanId?: string;
  lastMilestoneId?: string;
  lastOrderId?: string;
  lastPublishId?: string;
  recentRecipients?: string[];
  defaultCurrency?: string;
}

interface StructuredResponseCardProps {
  message: ChatMessage;
  onCartUpdate?: (items: CartItem[]) => void;
  onSendMessage?: (message: string) => void;
  onBuyNow?: (product: ProductInfo) => void;
  sessionId?: string;
  payingProductId?: string | null;
  onCartChanged?: (cartItems?: CartItem[]) => void; // 购物车更新后的回调，如果购物车消息不存在则创建
  commerceContext?: CommerceContextType; // Commerce 上下文延续
  onCommerceContextUpdate?: (key: keyof CommerceContextType, value: any) => void;
}

/**
 * 结构化响应展示卡片
 * 根据不同的响应类型展示相应的结构化数据
 */
export function StructuredResponseCard({ 
  message, 
  onCartUpdate, 
  onSendMessage,
  onBuyNow,
  sessionId,
  payingProductId,
  onCartChanged,
  commerceContext,
  onCommerceContextUpdate,
}: StructuredResponseCardProps) {
  const { user } = useUser();
  const { type, data } = message.metadata || {};
  const [selectedProduct, setSelectedProduct] = useState<ProductInfo | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState<string | null>(null);
  const [cancellingOrders, setCancellingOrders] = useState<Set<string>>(new Set());
  const [cartUpdateStatus, setCartUpdateStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  const [openCommerceForm, setOpenCommerceForm] = useState<string | null>(null);
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  // 执行状态
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<{
    success: boolean;
    type: string;
    data?: any;
    error?: string;
    message?: string;
    link?: string;
    id?: string;
    canRevoke?: boolean;
    revokeDeadline?: number;
  } | null>(null);
  const [revokeCountdown, setRevokeCountdown] = useState<number | null>(null);
  const [commerceForm, setCommerceForm] = useState({
    amount: '',
    currency: 'USDC',
    counterparty: '',
    exchangeType: 'onramp',
    fiatAmount: '',
    fiatCurrency: 'USD',
    cryptoCurrency: 'USDC',
    offrampsTo: '',
    platformShare: '5',
    merchantShare: '85',
    agentShare: '10',
    planName: 'Demo Split Plan',
    budgetAmount: '',
    budgetDeadline: '',
    qualityScore: '80',
    poolId: '',
    milestoneTitle: '',
    milestonePercent: '30',
    collaborationNote: '',
    paymentType: 'ONRAMP',
    publishType: 'task',
    publishTitle: '',
    publishBudget: '',
    publishPrice: '',
    // 可选字段
    orderDescription: '',
    callbackUrl: '',
    targetAddress: '',
  });

  useEffect(() => {
    if (type === 'commerce_categories' && data?.openCategory) {
      setOpenCommerceForm(data.openCategory);
    }
  }, [type, data]);

  // 从上下文自动填充表单字段
  useEffect(() => {
    if (commerceContext) {
      if (commerceContext.lastPoolId && !commerceForm.poolId) {
        setCommerceForm(prev => ({ ...prev, poolId: commerceContext.lastPoolId || '' }));
      }
      if (commerceContext.defaultCurrency && commerceForm.currency === 'USDC') {
        setCommerceForm(prev => ({ ...prev, currency: commerceContext.defaultCurrency || 'USDC' }));
      }
    }
  }, [commerceContext]);

  // 表单实时校验
  const validateField = (key: string, value: string): string => {
    switch (key) {
      case 'amount':
      case 'fiatAmount':
      case 'budgetAmount':
      case 'publishBudget':
      case 'publishPrice':
        if (value && isNaN(Number(value))) return '请输入有效数字';
        if (value && Number(value) <= 0) return '金额必须大于0';
        break;
      case 'platformShare':
      case 'merchantShare':
      case 'agentShare':
      case 'milestonePercent':
        if (value && (isNaN(Number(value)) || Number(value) < 0 || Number(value) > 100)) {
          return '请输入0-100的数字';
        }
        break;
      case 'budgetDeadline':
        if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) return '格式：YYYY-MM-DD';
        break;
    }
    return '';
  };

  const updateCommerceForm = (key: keyof typeof commerceForm, value: string) => {
    setCommerceForm(prev => ({ ...prev, [key]: value }));
    // 实时校验
    const error = validateField(key, value);
    setFormErrors(prev => ({ ...prev, [key]: error }));
  };

  // 校验分账比例总和
  const validateSplitRatios = (): boolean => {
    const total = Number(commerceForm.platformShare || 0) + 
                  Number(commerceForm.merchantShare || 0) + 
                  Number(commerceForm.agentShare || 0);
    if (Math.abs(total - 100) > 0.01) {
      setFormErrors(prev => ({ ...prev, splitTotal: `分账比例总和应为100%，当前：${total}%` }));
      return false;
    }
    setFormErrors(prev => ({ ...prev, splitTotal: '' }));
    return true;
  };

  // 30秒撤回倒计时
  useEffect(() => {
    if (revokeCountdown !== null && revokeCountdown > 0) {
      const timer = setTimeout(() => setRevokeCountdown(revokeCountdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (revokeCountdown === 0) {
      setRevokeCountdown(null);
      // 倒计时结束，执行确认
      if (executionResult?.canRevoke) {
        setExecutionResult(prev => prev ? { ...prev, canRevoke: false, message: '已确认执行，无法撤回' } : null);
      }
    }
  }, [revokeCountdown, executionResult]);

  // 撤回操作
  const handleRevoke = useCallback(async () => {
    if (!executionResult?.id) return;
    try {
      setIsExecuting(true);
      // 根据类型调用不同的取消API
      if (executionResult.type === 'payment') {
        await payIntentApi.cancel(executionResult.id);
      } else if (executionResult.type === 'budget') {
        await commerceApi.cancelBudgetPool(executionResult.id);
      }
      setExecutionResult({
        success: true,
        type: 'revoked',
        message: '✅ 已成功撤回操作',
      });
      setRevokeCountdown(null);
    } catch (error: any) {
      setExecutionResult(prev => prev ? { 
        ...prev, 
        error: `撤回失败: ${error.message}`,
        canRevoke: false 
      } : null);
    } finally {
      setIsExecuting(false);
    }
  }, [executionResult]);

  // 复制到剪贴板
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // 可以添加toast提示
  };

  // 真实执行Commerce操作
  const handleCommerceSubmit = async (categoryId: string) => {
    // 表单校验
    if (categoryId === 'split' && !validateSplitRatios()) {
      return;
    }

    setIsExecuting(true);
    setExecutionResult(null);

    try {
      let result: any;
      let resultType = categoryId;

      switch (categoryId) {
        case 'payment': {
          // 创建支付意图
          const amount = Number(commerceForm.amount) || 100;
          const payIntent = await payIntentApi.create({
            type: 'service_payment',
            amount,
            currency: commerceForm.currency,
            description: commerceForm.orderDescription || `支付给 ${commerceForm.counterparty || '商家'}`,
            metadata: {
              counterparty: commerceForm.counterparty,
              returnUrl: commerceForm.callbackUrl || window.location.href,
            },
          });
          
          result = payIntent;
          setExecutionResult({
            success: true,
            type: 'payment',
            id: payIntent.id,
            data: payIntent,
            message: `✅ 已创建支付意图 ${amount} ${commerceForm.currency}`,
            link: payIntent.metadata?.payUrl || `/pay/intent/${payIntent.id}`,
            canRevoke: true,
            revokeDeadline: 30,
          });
          setRevokeCountdown(30);
          
          // 更新上下文
          onCommerceContextUpdate?.('lastOrderId', payIntent.id);
          break;
        }

        case 'exchange': {
          // 调用commerce execute进行兑换预览
          const exchangeParams = commerceForm.exchangeType === 'offramp' 
            ? {
                action: 'previewAllocation',
                amount: Number(commerceForm.fiatAmount) || 100,
                currency: commerceForm.cryptoCurrency,
                usesOfframp: true,
              }
            : {
                action: 'previewAllocation',
                amount: Number(commerceForm.fiatAmount) || 100,
                currency: commerceForm.fiatCurrency,
                usesOnramp: true,
              };
          
          result = await commerceApi.previewAllocation({
            amount: exchangeParams.amount,
            currency: exchangeParams.currency,
            usesOnramp: exchangeParams.usesOnramp,
            usesOfframp: exchangeParams.usesOfframp,
          });
          
          setExecutionResult({
            success: true,
            type: 'exchange',
            data: result,
            message: commerceForm.exchangeType === 'offramp' 
              ? `💱 ${commerceForm.fiatAmount} ${commerceForm.cryptoCurrency} 提现预览`
              : `💱 ${commerceForm.fiatAmount} ${commerceForm.fiatCurrency} → ${commerceForm.cryptoCurrency} 兑换预览`,
          });
          break;
        }

        case 'split': {
          // 创建分账方案
          const splitPlan = await commerceApi.createSplitPlan({
            name: commerceForm.planName || '分账方案',
            productType: 'service',
            rules: [
              { recipient: 'platform', shareBps: Number(commerceForm.platformShare) * 100, role: 'executor', source: 'platform', active: true },
              { recipient: 'merchant', shareBps: Number(commerceForm.merchantShare) * 100, role: 'executor', source: 'merchant', active: true },
              { recipient: 'agent', shareBps: Number(commerceForm.agentShare) * 100, role: 'executor', source: 'pool', active: true },
            ],
          });
          
          result = splitPlan;
          setExecutionResult({
            success: true,
            type: 'split',
            id: splitPlan.id,
            data: splitPlan,
            message: `✅ 分账方案「${splitPlan.name}」创建成功`,
          });
          
          onCommerceContextUpdate?.('lastSplitPlanId', splitPlan.id);
          break;
        }

        case 'budget': {
          // 创建预算池
          const budgetPool = await commerceApi.createBudgetPool({
            name: `预算池-${Date.now()}`,
            totalBudget: Number(commerceForm.budgetAmount) || 5000,
            currency: 'USDC',
            expiresAt: commerceForm.budgetDeadline || undefined,
            metadata: {
              qualityScore: Number(commerceForm.qualityScore),
            },
          });
          
          result = budgetPool;
          setExecutionResult({
            success: true,
            type: 'budget',
            id: budgetPool.id,
            data: budgetPool,
            message: `✅ 预算池创建成功，ID: ${budgetPool.id}`,
            canRevoke: true,
            revokeDeadline: 30,
          });
          setRevokeCountdown(30);
          
          onCommerceContextUpdate?.('lastPoolId', budgetPool.id);
          break;
        }

        case 'milestone': {
          // 创建里程碑
          if (!commerceForm.poolId) {
            throw new Error('请先填写预算池ID');
          }
          
          const milestone = await commerceApi.createMilestone({
            name: commerceForm.milestoneTitle || '阶段交付',
            budgetPoolId: commerceForm.poolId,
            reservedAmount: Number(commerceForm.milestonePercent) * 50, // 假设基于预算池的百分比
            approvalType: 'manual',
          });
          
          result = milestone;
          setExecutionResult({
            success: true,
            type: 'milestone',
            id: milestone.id,
            data: milestone,
            message: `✅ 里程碑「${milestone.name}」创建成功`,
          });
          
          onCommerceContextUpdate?.('lastMilestoneId', milestone.id);
          break;
        }

        case 'collaboration': {
          // 发放协作酬劳 - 释放里程碑
          if (!commerceForm.poolId) {
            throw new Error('请先填写预算池ID');
          }
          
          // 获取预算池的里程碑列表
          const milestones = await commerceApi.getMilestones(commerceForm.poolId);
          const pendingMilestone = milestones.find(m => m.status === 'pending_review' || m.status === 'approved');
          
          if (pendingMilestone) {
            result = await commerceApi.releaseMilestone(pendingMilestone.id);
            setExecutionResult({
              success: true,
              type: 'collaboration',
              id: result.id,
              data: result,
              message: `✅ 里程碑「${result.name}」酬劳已发放`,
            });
          } else {
            setExecutionResult({
              success: false,
              type: 'collaboration',
              error: '没有可发放的里程碑，请先审批通过里程碑',
            });
          }
          break;
        }

        case 'fees': {
          // 费用预览
          result = await commerceApi.previewAllocation({
            amount: Number(commerceForm.amount) || 1000,
            currency: 'USDC',
            usesOnramp: commerceForm.paymentType === 'ONRAMP',
            usesOfframp: commerceForm.paymentType === 'OFFRAMP',
            usesSplit: true,
          });
          
          setExecutionResult({
            success: true,
            type: 'fees',
            data: result,
            message: `📊 费用预览：总费用 ${result.fees?.totalFees || 0} ${result.currency}`,
          });
          break;
        }

        case 'rates': {
          // 获取费率结构
          result = await commerceApi.getDefaultTemplate('service');
          setExecutionResult({
            success: true,
            type: 'rates',
            data: result,
            message: '📋 已获取平台费率结构',
          });
          break;
        }

        case 'publish':
        case 'publish_task':
        case 'publish_product':
        case 'publish_skill': {
          // 发布到marketplace - 创建预算池作为任务载体
          const publishType = commerceForm.publishType;
          let publishResult: any;
          
          if (publishType === 'task' || categoryId === 'publish_task') {
            // 发布协作任务 = 创建预算池
            publishResult = await commerceApi.createBudgetPool({
              name: commerceForm.publishTitle || '协作任务',
              description: `协作任务: ${commerceForm.publishTitle}`,
              totalBudget: Number(commerceForm.publishBudget) || 5000,
              currency: 'USDC',
              metadata: {
                type: 'task',
                status: 'published',
              },
            });
            
            setExecutionResult({
              success: true,
              type: 'publish',
              id: publishResult.id,
              data: publishResult,
              message: `🚀 协作任务「${commerceForm.publishTitle}」已发布`,
              link: `/marketplace?type=task&id=${publishResult.id}`,
            });
            
            onCommerceContextUpdate?.('lastPublishId', publishResult.id);
            onCommerceContextUpdate?.('lastPoolId', publishResult.id);
          } else {
            // 商品/Skill发布 - 通过消息通知Agent处理
            const prompt = publishType === 'product' 
              ? `发布商品「${commerceForm.publishTitle || '新商品'}」，价格 ${commerceForm.publishPrice || '99'} USDC`
              : `发布 Skill「${commerceForm.publishTitle || '新技能'}」，价格 ${commerceForm.publishPrice || '0.01'} USDC/次`;
            
            if (onSendMessage) {
              onSendMessage(prompt);
            }
            
            setExecutionResult({
              success: true,
              type: 'publish',
              message: `🚀 正在处理${publishType === 'product' ? '商品' : 'Skill'}发布请求...`,
            });
          }
          break;
        }

        default:
          throw new Error(`未知的操作类型: ${categoryId}`);
      }

      // 成功后关闭表单
      setTimeout(() => {
        if (!executionResult?.canRevoke) {
          setOpenCommerceForm(null);
        }
      }, 2000);

    } catch (error: any) {
      console.error('Commerce执行失败:', error);
      setExecutionResult({
        success: false,
        type: categoryId,
        error: error.message || '操作失败，请稍后重试',
      });
    } finally {
      setIsExecuting(false);
    }
  };

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

  if (type === 'skills_list') {
    const skills = Array.isArray(data.skills) ? data.skills : [];
    const searchLabel = data.search ? `（搜索：${data.search}）` : '';
    const visibleSkills = skills.slice(0, 12);

    return (
      <div className="mt-3 pt-3 border-t border-neutral-700/50">
        <div className="bg-slate-900/70 border border-slate-800/60 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-sm font-semibold text-slate-200">可用技能列表{searchLabel}</div>
              <div className="text-xs text-slate-500">共 {data.total ?? skills.length} 个技能</div>
            </div>
            {skills.length > visibleSkills.length && (
              <div className="text-xs text-slate-500">仅展示前 {visibleSkills.length} 个</div>
            )}
          </div>

          <div className="grid gap-3">
            {visibleSkills.map((skill: any) => (
              <div key={skill.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-800/60 bg-slate-900/50 p-3">
                <div>
                  <div className="text-sm font-medium text-slate-100">{skill.displayName || skill.name}</div>
                  <div className="text-xs text-slate-500 mt-1 line-clamp-2">{skill.description}</div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">{skill.category}</span>
                    {skill.ucpEnabled && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">UCP</span>
                    )}
                    {skill.x402Enabled && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">X402</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => onSendMessage?.(`@${skill.name}`)}
                    className="px-3 py-1.5 text-xs rounded-lg bg-indigo-600/80 text-white hover:bg-indigo-500"
                  >
                    使用
                  </button>
                  <button
                    onClick={() => onSendMessage?.(`查看技能 ${skill.name}`)}
                    className="px-3 py-1.5 text-xs rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
                  >
                    详情
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (type === 'commerce_categories') {
    const categories = Array.isArray(data.categories) ? data.categories : [];
    const isThreeTier = data.layout === 'three-tier';
    const openSubCategory = data.openSubCategory;
    
    // 三层结构渲染
    if (isThreeTier) {
      return (
        <div className="mt-3 pt-3 border-t border-neutral-700/50">
          <div className="bg-gradient-to-br from-indigo-900/40 to-slate-900/60 border border-slate-800/60 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold text-slate-200">Commerce 能力中心</div>
              <div className="flex gap-2">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">UCP</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">X402</span>
              </div>
            </div>
            
            {/* 第一层：4 个场景入口 */}
            <div className="grid gap-3 sm:grid-cols-2">
              {categories.map((category: any) => (
                <div key={category.id} className={`rounded-lg border ${openCommerceForm === category.id ? 'border-indigo-500/50 bg-indigo-900/20' : 'border-slate-800/60 bg-slate-900/60'} p-3 flex flex-col gap-2 transition-all`}>
                  {/* 场景标题 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{category.icon}</span>
                      <div>
                        <div className="text-sm font-medium text-slate-100">{category.title}</div>
                        <div className="text-xs text-slate-500">{category.description}</div>
                      </div>
                    </div>
                    {category.protocol && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${category.protocol === 'X402' ? 'bg-purple-500/20 text-purple-300' : 'bg-blue-500/20 text-blue-300'}`}>
                        {category.protocol}
                      </span>
                    )}
                  </div>
                  
                  {/* 展开/收起按钮 */}
                  <button
                    onClick={() => setOpenCommerceForm(prev => (prev === category.id ? null : category.id))}
                    className="w-fit px-3 py-1.5 text-xs rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
                  >
                    {openCommerceForm === category.id ? '收起' : '展开子功能'}
                  </button>
                  
                  {/* 第二层：子功能列表 */}
                  {openCommerceForm === category.id && category.subCategories && (
                    <div className="mt-2 space-y-2 border-t border-slate-800/50 pt-2">
                      {category.subCategories.map((sub: any) => (
                        <div key={sub.id} className={`rounded-md p-2 ${openSubCategory === sub.id ? 'bg-indigo-600/20 border border-indigo-500/30' : 'bg-slate-800/50 hover:bg-slate-800'}`}>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-200">{sub.title}</span>
                            <button
                              onClick={() => onSendMessage?.(sub.example)}
                              className="px-2 py-1 text-[10px] rounded bg-indigo-600/80 text-white hover:bg-indigo-500"
                            >
                              快捷触发
                            </button>
                          </div>
                        </div>
                      ))}
                      
                      {/* 第三层：表单输入区（根据父分类ID显示对应表单） */}
                      <div className="mt-3 pt-3 border-t border-slate-700/50 space-y-2 text-xs">
                        {/* 执行状态反馈区 */}
                        {isExecuting && (
                          <div className="flex items-center gap-2 p-2 rounded-lg bg-indigo-600/20 border border-indigo-500/30">
                            <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                            <span className="text-indigo-300">正在执行操作...</span>
                          </div>
                        )}
                        
                        {executionResult && !isExecuting && (
                          <div className={`p-3 rounded-lg border ${executionResult.success ? 'bg-green-900/20 border-green-500/30' : 'bg-red-900/20 border-red-500/30'}`}>
                            <div className="flex items-start gap-2">
                              {executionResult.success ? (
                                <CheckCircle className="w-4 h-4 text-green-400 mt-0.5" />
                              ) : (
                                <XCircle className="w-4 h-4 text-red-400 mt-0.5" />
                              )}
                              <div className="flex-1">
                                <div className={`text-sm font-medium ${executionResult.success ? 'text-green-300' : 'text-red-300'}`}>
                                  {executionResult.message || executionResult.error}
                                </div>
                                
                                {/* 结果详情 */}
                                {executionResult.data && (
                                  <div className="mt-2 text-xs text-slate-400 space-y-1">
                                    {executionResult.id && (
                                      <div className="flex items-center gap-1">
                                        <span>ID:</span>
                                        <code className="bg-slate-800 px-1 rounded">{executionResult.id}</code>
                                        <button onClick={() => copyToClipboard(executionResult.id!)} className="text-indigo-400 hover:text-indigo-300">
                                          <Copy className="w-3 h-3" />
                                        </button>
                                      </div>
                                    )}
                                    
                                    {/* 费用预览详情 */}
                                    {executionResult.type === 'fees' && executionResult.data.fees && (
                                      <div className="mt-2 p-2 bg-slate-800/50 rounded">
                                        <div>总费用: {executionResult.data.fees.totalFees} {executionResult.data.currency}</div>
                                        <div>On-ramp 费: {executionResult.data.fees.onrampFee}</div>
                                        <div>Off-ramp 费: {executionResult.data.fees.offrampFee}</div>
                                        <div>分账费: {executionResult.data.fees.splitFee}</div>
                                      </div>
                                    )}
                                    
                                    {/* 分配预览 */}
                                    {executionResult.type === 'exchange' && executionResult.data.allocations && (
                                      <div className="mt-2 p-2 bg-slate-800/50 rounded">
                                        <div className="font-medium mb-1">分配预览:</div>
                                        {executionResult.data.allocations.map((alloc: any, idx: number) => (
                                          <div key={idx}>{alloc.role}: {alloc.amount} ({alloc.percentage}%)</div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                                
                                {/* 操作链接 */}
                                {executionResult.link && (
                                  <a href={executionResult.link} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300">
                                    <ExternalLink className="w-3 h-3" />
                                    <span>查看详情</span>
                                  </a>
                                )}
                                
                                {/* 30秒撤回 */}
                                {executionResult.canRevoke && revokeCountdown !== null && (
                                  <div className="mt-3 p-2 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2 text-yellow-300">
                                        <Clock className="w-4 h-4" />
                                        <span>{revokeCountdown}s 内可撤回</span>
                                      </div>
                                      <button
                                        onClick={handleRevoke}
                                        disabled={isExecuting}
                                        className="px-2 py-1 text-xs rounded bg-yellow-600 hover:bg-yellow-500 text-white"
                                      >
                                        撤回操作
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {category.id === 'pay' && (
                          <>
                            <div className="text-slate-400 font-medium mb-2">💰 收付款表单</div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <input value={commerceForm.amount} onChange={(e) => updateCommerceForm('amount', e.target.value)} placeholder="金额 *" className={`bg-slate-950/70 border ${formErrors.amount ? 'border-red-500' : 'border-slate-800'} rounded-md px-2 py-1 text-slate-200 placeholder-slate-500 w-full`} />
                                {formErrors.amount && <span className="text-[10px] text-red-400">{formErrors.amount}</span>}
                              </div>
                              <input value={commerceForm.currency} onChange={(e) => updateCommerceForm('currency', e.target.value)} placeholder="币种" className="bg-slate-950/70 border border-slate-800 rounded-md px-2 py-1 text-slate-200 placeholder-slate-500" />
                            </div>
                            <input value={commerceForm.counterparty} onChange={(e) => updateCommerceForm('counterparty', e.target.value)} placeholder="收款方" className="bg-slate-950/70 border border-slate-800 rounded-md px-2 py-1 w-full text-slate-200 placeholder-slate-500" />
                            
                            {/* 可选字段折叠 */}
                            <button type="button" onClick={() => setShowOptionalFields(prev => !prev)} className="text-[10px] text-indigo-400 hover:text-indigo-300">
                              {showOptionalFields ? '▼ 收起可选字段' : '▶ 展开可选字段'}
                            </button>
                            {showOptionalFields && (
                              <div className="space-y-2 pl-2 border-l-2 border-slate-700">
                                <input value={commerceForm.orderDescription} onChange={(e) => updateCommerceForm('orderDescription', e.target.value)} placeholder="订单描述（可选）" className="bg-slate-950/70 border border-slate-800 rounded-md px-2 py-1 w-full text-slate-200 placeholder-slate-500" />
                                <input value={commerceForm.callbackUrl} onChange={(e) => updateCommerceForm('callbackUrl', e.target.value)} placeholder="回调URL（可选）" className="bg-slate-950/70 border border-slate-800 rounded-md px-2 py-1 w-full text-slate-200 placeholder-slate-500" />
                              </div>
                            )}
                            
                            <button onClick={() => handleCommerceSubmit('payment')} disabled={!!formErrors.amount || isExecuting} className={`mt-2 w-fit px-3 py-1.5 text-xs rounded-lg flex items-center gap-1 ${formErrors.amount || isExecuting ? 'bg-slate-600 cursor-not-allowed' : 'bg-indigo-600/80 hover:bg-indigo-500'} text-white`}>
                              {isExecuting ? <><Loader2 className="w-3 h-3 animate-spin" /> 执行中...</> : '创建支付意图'}
                            </button>
                          </>
                        )}
                        
                        {category.id === 'exchange' && (
                          <>
                            <div className="text-slate-400 font-medium mb-2">💱 资金兑换表单</div>
                            <select value={commerceForm.exchangeType} onChange={(e) => updateCommerceForm('exchangeType', e.target.value)} className="bg-slate-950/70 border border-slate-800 rounded-md px-2 py-1 w-full text-slate-200">
                              <option value="onramp">法币入金（On-ramp）</option>
                              <option value="offramp">加密资产出金（Off-ramp）</option>
                            </select>
                            <div className="grid grid-cols-2 gap-2">
                              <input value={commerceForm.fiatAmount} onChange={(e) => updateCommerceForm('fiatAmount', e.target.value)} placeholder="金额" className="bg-slate-950/70 border border-slate-800 rounded-md px-2 py-1 text-slate-200 placeholder-slate-500" />
                              <input value={commerceForm.fiatCurrency} onChange={(e) => updateCommerceForm('fiatCurrency', e.target.value)} placeholder="法币/币种" className="bg-slate-950/70 border border-slate-800 rounded-md px-2 py-1 text-slate-200 placeholder-slate-500" />
                            </div>
                            <button onClick={() => handleCommerceSubmit('exchange')} disabled={isExecuting} className={`mt-2 w-fit px-3 py-1.5 text-xs rounded-lg flex items-center gap-1 ${isExecuting ? 'bg-slate-600 cursor-not-allowed' : 'bg-indigo-600/80 hover:bg-indigo-500'} text-white`}>
                              {isExecuting ? <><Loader2 className="w-3 h-3 animate-spin" /> 执行中...</> : '查看兑换预览'}
                            </button>
                          </>
                        )}
                        
                        {category.id === 'collab' && (
                          <>
                            <div className="text-slate-400 font-medium mb-2">👥 协作分账表单</div>
                            <select value={commerceForm.publishType} onChange={(e) => updateCommerceForm('publishType', e.target.value as any)} className="bg-slate-950/70 border border-slate-800 rounded-md px-2 py-1 w-full text-slate-200">
                              <option value="split">创建分账方案</option>
                              <option value="budget">管理预算池</option>
                              <option value="milestone">里程碑</option>
                              <option value="fees">费用计算</option>
                            </select>
                            {commerceForm.publishType === 'split' && (
                              <>
                                <input value={commerceForm.planName} onChange={(e) => updateCommerceForm('planName', e.target.value)} placeholder="方案名称 *" className="bg-slate-950/70 border border-slate-800 rounded-md px-2 py-1 w-full text-slate-200 placeholder-slate-500" />
                                <div className="grid grid-cols-3 gap-2">
                                  <div>
                                    <input value={commerceForm.platformShare} onChange={(e) => { updateCommerceForm('platformShare', e.target.value); validateSplitRatios(); }} placeholder="平台%" className={`bg-slate-950/70 border ${formErrors.platformShare ? 'border-red-500' : 'border-slate-800'} rounded-md px-2 py-1 text-slate-200 placeholder-slate-500 w-full`} />
                                    {formErrors.platformShare && <span className="text-[10px] text-red-400">{formErrors.platformShare}</span>}
                                  </div>
                                  <div>
                                    <input value={commerceForm.merchantShare} onChange={(e) => { updateCommerceForm('merchantShare', e.target.value); validateSplitRatios(); }} placeholder="商家%" className={`bg-slate-950/70 border ${formErrors.merchantShare ? 'border-red-500' : 'border-slate-800'} rounded-md px-2 py-1 text-slate-200 placeholder-slate-500 w-full`} />
                                    {formErrors.merchantShare && <span className="text-[10px] text-red-400">{formErrors.merchantShare}</span>}
                                  </div>
                                  <div>
                                    <input value={commerceForm.agentShare} onChange={(e) => { updateCommerceForm('agentShare', e.target.value); validateSplitRatios(); }} placeholder="代理%" className={`bg-slate-950/70 border ${formErrors.agentShare ? 'border-red-500' : 'border-slate-800'} rounded-md px-2 py-1 text-slate-200 placeholder-slate-500 w-full`} />
                                    {formErrors.agentShare && <span className="text-[10px] text-red-400">{formErrors.agentShare}</span>}
                                  </div>
                                </div>
                                {formErrors.splitTotal && <span className="text-[10px] text-red-400">{formErrors.splitTotal}</span>}
                                <div className="text-[10px] text-slate-500">当前总和：{Number(commerceForm.platformShare || 0) + Number(commerceForm.merchantShare || 0) + Number(commerceForm.agentShare || 0)}%</div>
                                <button onClick={() => { if (validateSplitRatios()) handleCommerceSubmit('split'); }} disabled={isExecuting} className={`mt-2 w-fit px-3 py-1.5 text-xs rounded-lg flex items-center gap-1 ${isExecuting ? 'bg-slate-600 cursor-not-allowed' : 'bg-indigo-600/80 hover:bg-indigo-500'} text-white`}>
                                  {isExecuting ? <><Loader2 className="w-3 h-3 animate-spin" /> 执行中...</> : '创建分账方案'}
                                </button>
                              </>
                            )}
                            {commerceForm.publishType === 'budget' && (
                              <>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <input value={commerceForm.budgetAmount} onChange={(e) => updateCommerceForm('budgetAmount', e.target.value)} placeholder="预算(USDC) *" className={`bg-slate-950/70 border ${formErrors.budgetAmount ? 'border-red-500' : 'border-slate-800'} rounded-md px-2 py-1 text-slate-200 placeholder-slate-500 w-full`} />
                                    {formErrors.budgetAmount && <span className="text-[10px] text-red-400">{formErrors.budgetAmount}</span>}
                                  </div>
                                  <input value={commerceForm.qualityScore} onChange={(e) => updateCommerceForm('qualityScore', e.target.value)} placeholder="质量门槛" className="bg-slate-950/70 border border-slate-800 rounded-md px-2 py-1 text-slate-200 placeholder-slate-500" />
                                </div>
                                <div>
                                  <input value={commerceForm.budgetDeadline} onChange={(e) => updateCommerceForm('budgetDeadline', e.target.value)} placeholder="截止日期(YYYY-MM-DD)" className={`bg-slate-950/70 border ${formErrors.budgetDeadline ? 'border-red-500' : 'border-slate-800'} rounded-md px-2 py-1 w-full text-slate-200 placeholder-slate-500`} />
                                  {formErrors.budgetDeadline && <span className="text-[10px] text-red-400">{formErrors.budgetDeadline}</span>}
                                </div>
                                <button onClick={() => handleCommerceSubmit('budget')} disabled={isExecuting} className={`mt-2 w-fit px-3 py-1.5 text-xs rounded-lg flex items-center gap-1 ${isExecuting ? 'bg-slate-600 cursor-not-allowed' : 'bg-indigo-600/80 hover:bg-indigo-500'} text-white`}>
                                  {isExecuting ? <><Loader2 className="w-3 h-3 animate-spin" /> 执行中...</> : '创建预算池'}
                                </button>
                              </>
                            )}
                            {commerceForm.publishType === 'milestone' && (
                              <>
                                <input value={commerceForm.poolId} onChange={(e) => updateCommerceForm('poolId', e.target.value)} placeholder="预算池ID *" className="bg-slate-950/70 border border-slate-800 rounded-md px-2 py-1 w-full text-slate-200 placeholder-slate-500" />
                                <div className="grid grid-cols-2 gap-2">
                                  <input value={commerceForm.milestoneTitle} onChange={(e) => updateCommerceForm('milestoneTitle', e.target.value)} placeholder="里程碑标题 *" className="bg-slate-950/70 border border-slate-800 rounded-md px-2 py-1 text-slate-200 placeholder-slate-500" />
                                  <div>
                                    <input value={commerceForm.milestonePercent} onChange={(e) => updateCommerceForm('milestonePercent', e.target.value)} placeholder="占比% *" className={`bg-slate-950/70 border ${formErrors.milestonePercent ? 'border-red-500' : 'border-slate-800'} rounded-md px-2 py-1 text-slate-200 placeholder-slate-500 w-full`} />
                                    {formErrors.milestonePercent && <span className="text-[10px] text-red-400">{formErrors.milestonePercent}</span>}
                                  </div>
                                </div>
                                <button onClick={() => handleCommerceSubmit('milestone')} disabled={isExecuting} className={`mt-2 w-fit px-3 py-1.5 text-xs rounded-lg flex items-center gap-1 ${isExecuting ? 'bg-slate-600 cursor-not-allowed' : 'bg-indigo-600/80 hover:bg-indigo-500'} text-white`}>
                                  {isExecuting ? <><Loader2 className="w-3 h-3 animate-spin" /> 执行中...</> : '创建里程碑'}
                                </button>
                              </>
                            )}
                            {commerceForm.publishType === 'fees' && (
                              <>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <input value={commerceForm.amount} onChange={(e) => updateCommerceForm('amount', e.target.value)} placeholder="金额 *" className={`bg-slate-950/70 border ${formErrors.amount ? 'border-red-500' : 'border-slate-800'} rounded-md px-2 py-1 text-slate-200 placeholder-slate-500 w-full`} />
                                    {formErrors.amount && <span className="text-[10px] text-red-400">{formErrors.amount}</span>}
                                  </div>
                                  <input value={commerceForm.paymentType} onChange={(e) => updateCommerceForm('paymentType', e.target.value)} placeholder="支付方式" className="bg-slate-950/70 border border-slate-800 rounded-md px-2 py-1 text-slate-200 placeholder-slate-500" />
                                </div>
                                <button onClick={() => handleCommerceSubmit('fees')} disabled={isExecuting} className={`mt-2 w-fit px-3 py-1.5 text-xs rounded-lg flex items-center gap-1 ${isExecuting ? 'bg-slate-600 cursor-not-allowed' : 'bg-indigo-600/80 hover:bg-indigo-500'} text-white`}>
                                  {isExecuting ? <><Loader2 className="w-3 h-3 animate-spin" /> 执行中...</> : '计算费用'}
                                </button>
                              </>
                            )}
                          </>
                        )}
                        
                        {category.id === 'publish' && (
                          <>
                            <div className="text-slate-400 font-medium mb-2">🚀 发布表单</div>
                            <select value={commerceForm.publishType} onChange={(e) => updateCommerceForm('publishType', e.target.value)} className="bg-slate-950/70 border border-slate-800 rounded-md px-2 py-1 w-full text-slate-200">
                              <option value="task">发布协作任务</option>
                              <option value="product">发布商品</option>
                              <option value="skill">发布 Skill</option>
                            </select>
                            <input value={commerceForm.publishTitle} onChange={(e) => updateCommerceForm('publishTitle', e.target.value)} placeholder="标题" className="bg-slate-950/70 border border-slate-800 rounded-md px-2 py-1 w-full text-slate-200 placeholder-slate-500" />
                            {commerceForm.publishType === 'task' ? (
                              <input value={commerceForm.publishBudget} onChange={(e) => updateCommerceForm('publishBudget', e.target.value)} placeholder="预算(USDC)" className="bg-slate-950/70 border border-slate-800 rounded-md px-2 py-1 w-full text-slate-200 placeholder-slate-500" />
                            ) : (
                              <input value={commerceForm.publishPrice} onChange={(e) => updateCommerceForm('publishPrice', e.target.value)} placeholder="价格(USDC)" className="bg-slate-950/70 border border-slate-800 rounded-md px-2 py-1 w-full text-slate-200 placeholder-slate-500" />
                            )}
                            <button onClick={() => handleCommerceSubmit('publish')} disabled={isExecuting} className={`mt-2 w-fit px-3 py-1.5 text-xs rounded-lg flex items-center gap-1 ${isExecuting ? 'bg-slate-600 cursor-not-allowed' : 'bg-indigo-600/80 hover:bg-indigo-500'} text-white`}>
                              {isExecuting ? <><Loader2 className="w-3 h-3 animate-spin" /> 执行中...</> : '🚀 发布'}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }
    
    // 旧版扁平结构兼容渲染
    return (
      <div className="mt-3 pt-3 border-t border-neutral-700/50">
        <div className="bg-gradient-to-br from-indigo-900/40 to-slate-900/60 border border-slate-800/60 rounded-xl p-4">
          <div className="text-sm font-semibold text-slate-200 mb-3">commerce 能力分类</div>
          <div className="grid gap-3 sm:grid-cols-2">
            {categories.map((category: any) => (
              <div key={category.id} className="rounded-lg border border-slate-800/60 bg-slate-900/60 p-3 flex flex-col gap-2">
                <div className="text-sm font-medium text-slate-100">{category.title}</div>
                <div className="text-xs text-slate-500">{category.description}</div>
                {category.example && (
                  <button
                    onClick={() => onSendMessage?.(category.example)}
                    className="mt-1 w-fit px-3 py-1.5 text-xs rounded-lg bg-indigo-600/80 text-white hover:bg-indigo-500"
                  >
                    示例触发
                  </button>
                )}
                <button
                  onClick={() => setOpenCommerceForm(prev => (prev === category.id ? null : category.id))}
                  className="w-fit px-3 py-1.5 text-xs rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  {openCommerceForm === category.id ? '收起表单' : '打开表单'}
                </button>
                {openCommerceForm === category.id && (
                  <div className="mt-2 space-y-2 text-xs text-slate-300">
                    {category.id === 'payment' && (
                      <>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            value={commerceForm.amount}
                            onChange={(e) => updateCommerceForm('amount', e.target.value)}
                            placeholder="金额"
                            className="bg-slate-950/70 border border-slate-800 rounded-md px-2 py-1 text-slate-200 placeholder-slate-500"
                          />
                          <input
                            value={commerceForm.currency}
                            onChange={(e) => updateCommerceForm('currency', e.target.value)}
                            placeholder="币种"
                            className="bg-slate-950/70 border border-slate-800 rounded-md px-2 py-1 text-slate-200 placeholder-slate-500"
                          />
                        </div>
                        <input
                          value={commerceForm.counterparty}
                          onChange={(e) => updateCommerceForm('counterparty', e.target.value)}
                          placeholder="收款方"
                          className="bg-slate-950/70 border border-slate-800 rounded-md px-2 py-1 w-full text-slate-200 placeholder-slate-500"
                        />
                      </>
                    )}

                    {category.id === 'exchange' && (
                      <>
                        <select
                          value={commerceForm.exchangeType}
                          onChange={(e) => updateCommerceForm('exchangeType', e.target.value)}
                          className="bg-slate-950/70 border border-slate-800 rounded-md px-2 py-1 w-full text-slate-200"
                        >
                          <option value="onramp">法币入金（On-ramp）</option>
                          <option value="offramp">加密资产出金（Off-ramp）</option>
                        </select>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            value={commerceForm.fiatAmount}
                            onChange={(e) => updateCommerceForm('fiatAmount', e.target.value)}
                            placeholder="金额"
                            className="bg-slate-950/70 border border-slate-800 rounded-md px-2 py-1 text-slate-200 placeholder-slate-500"
                          />
                          {commerceForm.exchangeType === 'offramp' ? (
                            <input
                              value={commerceForm.cryptoCurrency}
                              onChange={(e) => updateCommerceForm('cryptoCurrency', e.target.value)}
                              placeholder="币种"
                              className="bg-slate-950/70 border border-slate-800 rounded-md px-2 py-1 text-slate-200 placeholder-slate-500"
                            />
                          ) : (
                            <input
                              value={commerceForm.fiatCurrency}
                              onChange={(e) => updateCommerceForm('fiatCurrency', e.target.value)}
                              placeholder="法币"
                              className="bg-slate-950/70 border border-slate-800 rounded-md px-2 py-1 text-slate-200 placeholder-slate-500"
                            />
                          )}
                        </div>
                        {commerceForm.exchangeType === 'offramp' ? (
                          <input
                            value={commerceForm.offrampsTo}
                            onChange={(e) => updateCommerceForm('offrampsTo', e.target.value)}
                            placeholder="到账方式/地址"
                            className="bg-slate-950/70 border border-slate-800 rounded-md px-2 py-1 w-full text-slate-200 placeholder-slate-500"
                          />
                        ) : (
                          <input
                            value={commerceForm.cryptoCurrency}
                            onChange={(e) => updateCommerceForm('cryptoCurrency', e.target.value)}
                            placeholder="目标加密币种"
                            className="bg-slate-950/70 border border-slate-800 rounded-md px-2 py-1 w-full text-slate-200 placeholder-slate-500"
                          />
                        )}
                      </>
                    )}

                    {category.id === 'split' && (
                      <>
                        <input
                          value={commerceForm.planName}
                          onChange={(e) => updateCommerceForm('planName', e.target.value)}
                          placeholder="方案名称"
                          className="bg-slate-950/70 border border-slate-800 rounded-md px-2 py-1 w-full text-slate-200 placeholder-slate-500"
                        />
                        <div className="grid grid-cols-3 gap-2">
                          <input
                            value={commerceForm.platformShare}
                            onChange={(e) => updateCommerceForm('platformShare', e.target.value)}
                            placeholder="平台%"
                            className="bg-slate-950/70 border border-slate-800 rounded-md px-2 py-1 text-slate-200 placeholder-slate-500"
                          />
                          <input
                            value={commerceForm.merchantShare}
                            onChange={(e) => updateCommerceForm('merchantShare', e.target.value)}
                            placeholder="商家%"
                            className="bg-slate-950/70 border border-slate-800 rounded-md px-2 py-1 text-slate-200 placeholder-slate-500"
                          />
                          <input
                            value={commerceForm.agentShare}
                            onChange={(e) => updateCommerceForm('agentShare', e.target.value)}
                            placeholder="代理%"
                            className="bg-slate-950/70 border border-slate-800 rounded-md px-2 py-1 text-slate-200 placeholder-slate-500"
                          />
                        </div>
                      </>
                    )}

                    {category.id === 'budget' && (
                      <>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            value={commerceForm.budgetAmount}
                            onChange={(e) => updateCommerceForm('budgetAmount', e.target.value)}
                            placeholder="预算(USDC)"
                            className="bg-slate-950/70 border border-slate-800 rounded-md px-2 py-1 text-slate-200 placeholder-slate-500"
                          />
                          <input
                            value={commerceForm.qualityScore}
                            onChange={(e) => updateCommerceForm('qualityScore', e.target.value)}
                            placeholder="质量门槛"
                            className="bg-slate-950/70 border border-slate-800 rounded-md px-2 py-1 text-slate-200 placeholder-slate-500"
                          />
                        </div>
                        <input
                          value={commerceForm.budgetDeadline}
                          onChange={(e) => updateCommerceForm('budgetDeadline', e.target.value)}
                          placeholder="截止日期(YYYY-MM-DD)"
                          className="bg-slate-950/70 border border-slate-800 rounded-md px-2 py-1 w-full text-slate-200 placeholder-slate-500"
                        />
                      </>
                    )}

                    {category.id === 'milestone' && (
                      <>
                        <input
                          value={commerceForm.poolId}
                          onChange={(e) => updateCommerceForm('poolId', e.target.value)}
                          placeholder="预算池ID"
                          className="bg-slate-950/70 border border-slate-800 rounded-md px-2 py-1 w-full text-slate-200 placeholder-slate-500"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            value={commerceForm.milestoneTitle}
                            onChange={(e) => updateCommerceForm('milestoneTitle', e.target.value)}
                            placeholder="里程碑标题"
                            className="bg-slate-950/70 border border-slate-800 rounded-md px-2 py-1 text-slate-200 placeholder-slate-500"
                          />
                          <input
                            value={commerceForm.milestonePercent}
                            onChange={(e) => updateCommerceForm('milestonePercent', e.target.value)}
                            placeholder="占比%"
                            className="bg-slate-950/70 border border-slate-800 rounded-md px-2 py-1 text-slate-200 placeholder-slate-500"
                          />
                        </div>
                      </>
                    )}

                    {category.id === 'collaboration' && (
                      <>
                        <input
                          value={commerceForm.poolId}
                          onChange={(e) => updateCommerceForm('poolId', e.target.value)}
                          placeholder="预算池ID"
                          className="bg-slate-950/70 border border-slate-800 rounded-md px-2 py-1 w-full text-slate-200 placeholder-slate-500"
                        />
                        <input
                          value={commerceForm.collaborationNote}
                          onChange={(e) => updateCommerceForm('collaborationNote', e.target.value)}
                          placeholder="发放说明"
                          className="bg-slate-950/70 border border-slate-800 rounded-md px-2 py-1 w-full text-slate-200 placeholder-slate-500"
                        />
                      </>
                    )}

                    {category.id === 'fees' && (
                      <>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            value={commerceForm.amount}
                            onChange={(e) => updateCommerceForm('amount', e.target.value)}
                            placeholder="金额"
                            className="bg-slate-950/70 border border-slate-800 rounded-md px-2 py-1 text-slate-200 placeholder-slate-500"
                          />
                          <input
                            value={commerceForm.paymentType}
                            onChange={(e) => updateCommerceForm('paymentType', e.target.value)}
                            placeholder="支付方式"
                            className="bg-slate-950/70 border border-slate-800 rounded-md px-2 py-1 text-slate-200 placeholder-slate-500"
                          />
                        </div>
                      </>
                    )}

                    {category.id === 'publish' && (
                      <>
                        <select
                          value={commerceForm.publishType}
                          onChange={(e) => updateCommerceForm('publishType', e.target.value)}
                          className="bg-slate-950/70 border border-slate-800 rounded-md px-2 py-1 w-full text-slate-200"
                        >
                          <option value="task">发布任务</option>
                          <option value="product">发布商品</option>
                          <option value="skill">发布Skill</option>
                        </select>
                        <input
                          value={commerceForm.publishTitle}
                          onChange={(e) => updateCommerceForm('publishTitle', e.target.value)}
                          placeholder="标题"
                          className="bg-slate-950/70 border border-slate-800 rounded-md px-2 py-1 w-full text-slate-200 placeholder-slate-500"
                        />
                        {commerceForm.publishType === 'task' ? (
                          <input
                            value={commerceForm.publishBudget}
                            onChange={(e) => updateCommerceForm('publishBudget', e.target.value)}
                            placeholder="预算(USDC)"
                            className="bg-slate-950/70 border border-slate-800 rounded-md px-2 py-1 w-full text-slate-200 placeholder-slate-500"
                          />
                        ) : (
                          <input
                            value={commerceForm.publishPrice}
                            onChange={(e) => updateCommerceForm('publishPrice', e.target.value)}
                            placeholder="价格(USDC)"
                            className="bg-slate-950/70 border border-slate-800 rounded-md px-2 py-1 w-full text-slate-200 placeholder-slate-500"
                          />
                        )}
                      </>
                    )}

                    <button
                      onClick={() => handleCommerceSubmit(category.id)}
                      className="mt-2 w-fit px-3 py-1.5 text-xs rounded-lg bg-indigo-600/80 text-white hover:bg-indigo-500"
                    >
                      生成并发送
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
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
          onBuyNow={(product) => {
            if (onBuyNow) {
              onBuyNow(product as unknown as ProductInfo);
            } else if (onSendMessage) {
              // 回退方案：通过对话触发
              onSendMessage(`结算商品 ${product.name}`);
            }
          }}
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
          payingProductId={payingProductId}
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

