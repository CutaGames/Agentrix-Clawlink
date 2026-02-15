import { useState, useRef, useEffect } from 'react';
import { useUser } from '../../contexts/UserContext';
import { usePayment } from '../../contexts/PaymentContext';
import { useWorkbench } from '../../contexts/WorkbenchContext';
import { useSessionManager } from '../../hooks/useSessionManager';
import { executeDirectQuickPay } from '../../lib/direct-pay-service';
import { agentApi } from '../../lib/api/agent.api';
import { skillApi } from '../../lib/api/skill.api';
import { GlassCard } from '../ui/GlassCard';
import { AIButton } from '../ui/AIButton';
import { StructuredResponseCard } from './StructuredResponseCard';
import { QuickActionCards } from './QuickActionCards';
import { VoiceInput } from './voice/VoiceInput';
import { VoiceOutput } from './voice/VoiceOutput';
import { Plus, Send, Search, Eye } from 'lucide-react';

export type AgentMode = 'user' | 'merchant' | 'developer' | 'shopping' | 'expert' | 'data';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    type?: string;
    data?: any;
    error?: string;
  };
}

interface UnifiedAgentChatProps {
  mode?: AgentMode;
  onModeChange?: (mode: AgentMode) => void;
  onCommand?: (command: string, data?: any) => any;
  standalone?: boolean;
  compact?: boolean;
}

/**
 * 统一Agent对话界面
 * 支持用户、商户、开发者三种模式
 * 集成所有P0功能
 */
export function UnifiedAgentChat({
  mode: initialMode = 'user',
  onModeChange,
  onCommand,
  standalone = false,
  compact = false,
}: UnifiedAgentChatProps) {
  const { user } = useUser();
  const { startPayment } = usePayment();
  const { activeSession, loadActiveSession } = useSessionManager();
  const { viewMode, workspaceData, selection } = useWorkbench();
  const [mode, setMode] = useState<AgentMode>(initialMode);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [payingProductId, setPayingProductId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Commerce 上下文延续 - 记住当前会话创建的资源 ID
  const [commerceContext, setCommerceContext] = useState<{
    lastPoolId?: string;
    lastSplitPlanId?: string;
    lastMilestoneId?: string;
    lastOrderId?: string;
    lastPublishId?: string;
    recentRecipients?: string[];
    defaultCurrency?: string;
  }>({});

  // 更新 commerce 上下文
  const updateCommerceContext = (key: keyof typeof commerceContext, value: any) => {
    setCommerceContext(prev => ({ ...prev, [key]: value }));
  };

  // 初始化加载活跃 Session，用于闭环支付
  useEffect(() => {
    if (user) {
      loadActiveSession().catch(err => console.warn('Failed to pre-load active session:', err));
    }
  }, [user]);

  // 监听外部触发消息事件
  useEffect(() => {
    const handleTriggerMessage = (event: CustomEvent) => {
      const message = event.detail?.message;
      if (message) {
        handleSend(message);
      }
    };
    
    window.addEventListener('trigger-agent-message', handleTriggerMessage as EventListener);
    return () => {
      window.removeEventListener('trigger-agent-message', handleTriggerMessage as EventListener);
    };
  }, []);

  useEffect(() => {
    // 根据模式设置欢迎消息
    const welcomeMessages: Record<AgentMode, string> = {
      user: `👋 欢迎使用 **Agentrix 个人Agent**！

我是您的智能支付和财务管理助手。我可以帮您：

**💰 支付相关**
• 估算支付手续费
• 评估交易风险
• 查看支付记忆和偏好
• 管理订阅和定期支付

**📊 财务管理**
• 设置和管理预算
• 分类和分析交易
• 查看交易统计

**🔐 账户安全**
• 查询KYC状态
• 检查KYC复用
• 查看商户信任度

**💡 智能建议**
• 根据您的支付习惯提供建议
• 识别订阅和定期支付
• 预算超支提醒

请告诉我您需要什么帮助？`,
      merchant: `👋 欢迎使用 **Agentrix 商户Agent**！

我是您的智能商户管理助手。我可以帮您：

**📦 订单管理**
• 自动发货配置
• 订单履约跟踪
• 退款处理

**💰 财务管理**
• 多链账户余额查询
• 自动对账
• 结算规则配置

**🔗 集成管理**
• Webhook配置
• API密钥管理
• 自动化流程设置

**📊 数据分析**
• 交易统计
• 收入分析
• 客户分析

请告诉我您需要什么帮助？`,
      developer: `👋 欢迎使用 **Agentrix 开发者Agent**！

我是您的智能开发助手。我可以帮您：

**💻 代码生成**
• API调用示例
• SDK集成代码
• Webhook处理代码

**📚 文档查询**
• API文档
• SDK文档
• 最佳实践

**🧪 测试工具**
• 沙箱环境
• 测试用例生成
• 调试辅助

**🔧 集成支持**
• 支付集成
• 订单管理
• 商品管理

请告诉我您需要什么帮助？`,
      shopping: `👋 欢迎使用 **Agentrix 购物助手Agent**！

我是您的智能购物专家。我可以帮您：
• 搜索和比价
• 订单跟踪
• 优惠发现

请告诉我您需要什么帮助？`,
      expert: `👋 欢迎使用 **Agentrix 专家服务Agent**！

我是您的专业顾问助手。我可以帮您：
• 管理服务能力
• 追踪履约记录
• 结算专家收益

请告诉我您需要什么帮助？`,
      data: `👋 欢迎使用 **Agentrix 数据资产Agent**！

我是您的数据价值管理助手。我可以帮您：
• 监控数据资产
• 管理数据授权
• 分析收益构成

请告诉我您需要什么帮助？`,
    };

    setMessages([
      {
        id: '1',
        role: 'assistant',
        content: welcomeMessages[mode],
        timestamp: new Date(),
      },
    ]);
  }, [mode]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 健康检查
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api';
        const healthUrl = apiUrl.endsWith('/api') ? `${apiUrl}/agent/health` : `${apiUrl}/api/agent/health`;
        const response = await fetch(healthUrl);
        if (response.ok) {
          console.log('✅ Agent服务健康检查通过');
        } else {
          console.warn('⚠️ Agent服务健康检查失败:', response.status);
        }
      } catch (error) {
        console.warn('⚠️ Agent服务健康检查失败:', error);
      }
    };
    
    // 延迟检查，避免影响初始加载
    const timer = setTimeout(checkHealth, 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleModeChange = (newMode: AgentMode) => {
    setMode(newMode);
    onModeChange?.(newMode);
  };

  // Commerce模块分类定义（仪表盘、收付款与兑换、协作分账、分佣结算、发布）
  const getCommerceCategories = () => [
    {
      id: 'dashboard',
      icon: '📊',
      title: 'Commerce 仪表盘',
      description: '概览、待办事项、数据统计',
      protocol: 'Insight',
      subCategories: [
        { id: 'overview', title: '全景概览', example: '查看我的 Commerce 概览' },
        { id: 'pending', title: '待处理事项', example: '有哪些待处理的里程碑？' },
        { id: 'income', title: '收益分析', example: '查看最近收益' },
      ],
    },
    {
      id: 'pay_exchange',
      icon: '💰',
      title: '收付款与兑换',
      description: '支付、收款、汇率、法币出入金',
      protocol: 'X402',
      subCategories: [
        { id: 'payment', title: '发起支付', example: '我要付款 100 USDC' },
        { id: 'receive', title: '生成收款码', example: '生成收款链接 50 USDC' },
        { id: 'query', title: '查询订单/支付状态', example: '查询订单 order_xxx' },
        { id: 'onramp', title: '法币 → 加密货币', example: '用 100 USD 兑换 USDC' },
        { id: 'offramp', title: '加密货币 → 法币', example: '把 100 USDC 提现' },
        { id: 'rate', title: '汇率查询', example: '查询 USDC 汇率' },
      ],
    },
    {
      id: 'collab',
      icon: '👥',
      title: '协作分账',
      description: '分账方案、预算池、里程碑、协作酬劳',
      protocol: 'UCP',
      subCategories: [
        { id: 'split', title: '创建分账方案', example: '创建分账方案' },
        { id: 'budget', title: '管理预算池', example: '建一个任务预算池' },
        { id: 'milestone', title: '里程碑管理', example: '给预算池加里程碑' },
        { id: 'collaboration', title: '发放协作酬劳', example: '按里程碑放款' },
      ],
    },
    {
      id: 'commission',
      icon: '💸',
      title: '分佣结算',
      description: '分润记录、结算管理、费用计算',
      protocol: 'UCP',
      subCategories: [
        { id: 'commissions', title: '查看分润记录', example: '查看我的分润记录' },
        { id: 'settlements', title: '查看结算记录', example: '查看结算记录' },
        { id: 'settlement_execute', title: '执行结算', example: '执行结算' },
        { id: 'fees', title: '费用计算/预览', example: '算手续费' },
        { id: 'rates', title: '查看费率结构', example: '费率结构是什么' },
      ],
    },
    {
      id: 'publish',
      icon: '🚀',
      title: '发布',
      description: '任务/商品/Skill 发布到 Marketplace',
      protocol: 'UCP',
      subCategories: [
        { id: 'publish_task', title: '发布协作任务', example: '发布一个协作任务到 marketplace' },
        { id: 'publish_product', title: '发布商品', example: '发布商品到 marketplace' },
        { id: 'publish_skill', title: '发布 Skill', example: '发布 skill 到 marketplace' },
        { id: 'sync_external', title: '同步到外部平台', example: '同步到外部任务平台' },
      ],
    },
  ];

  const handleSend = async (messageOverride?: string) => {
    const messageToSend = messageOverride || input.trim();
    if (!messageToSend || isLoading) return;

    const messageText = messageToSend;
    
    // 如果使用快捷指令，更新 input 状态
    if (messageOverride) {
      setInput(messageOverride);
    }
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const normalized = messageText.trim();
    const skillsCommandMatch = normalized.match(/^\/skills?(?:\s+(.+))?$/i);
    const commerceCommandMatch = normalized.match(/^\/(commerce|skill\s+commerce)$/i);
    const commerceMentionMatch = normalized.match(/^@commerce\b/i) || normalized.match(/^@agentrix\s+commerce\b/i);

    if (skillsCommandMatch || commerceCommandMatch || commerceMentionMatch) {
      try {
        if (skillsCommandMatch) {
          const rawSearch = skillsCommandMatch[1]?.trim();
          const search = rawSearch && rawSearch.startsWith('/') ? rawSearch.slice(1) : rawSearch;
          const response = await skillApi.getMarketplaceSkills({ search, limit: 50 });
          const skills = response.items || [];
          const assistantMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: skills.length
              ? `已为你展示可用技能${search ? `（搜索：${search}）` : ''}。`
              : `暂未找到技能${search ? `（搜索：${search}）` : ''}。`,
            timestamp: new Date(),
            metadata: {
              type: 'skills_list',
              data: {
                skills,
                total: response.total,
                search,
              },
            },
          };
          setMessages((prev) => [...prev, assistantMessage]);
        } else {
          // 三层结构：4 个场景入口
          const commerceCategories = getCommerceCategories();
          const assistantMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: '请选择一个场景入口，或点击子功能快捷触发。支持 UCP 能力发现与 X402 自动支付。',
            timestamp: new Date(),
            metadata: {
              type: 'commerce_categories',
              data: {
                layout: 'three-tier',
                categories: commerceCategories,
              },
            },
          };
          setMessages((prev) => [...prev, assistantMessage]);
        }
      } catch (error: any) {
        const errorMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `❌ 获取技能列表失败：${error.message || '请稍后重试'}`,
          timestamp: new Date(),
          metadata: {
            type: 'error',
            error: error.message,
          },
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // 三层结构意图映射：子功能 ID → 父分类 ID
    const commerceIntentMap: Array<{ id: string; parentId: string; keywords: RegExp }> = [
      // 收付款与兑换场景
      { id: 'payment', parentId: 'pay_exchange', keywords: /(付款|支付)/i },
      { id: 'receive', parentId: 'pay_exchange', keywords: /(收款|收款链接|收款码)/i },
      { id: 'query', parentId: 'pay_exchange', keywords: /(查询订单|订单状态|支付状态)/i },
      { id: 'onramp', parentId: 'pay_exchange', keywords: /(兑换|换币|入金|on-?ramp)/i },
      { id: 'offramp', parentId: 'pay_exchange', keywords: /(提现|出金|off-?ramp)/i },
      { id: 'rate', parentId: 'pay_exchange', keywords: /(汇率)/i },
      // 协作分账场景
      { id: 'split', parentId: 'collab', keywords: /(分账|分成)/i },
      { id: 'budget', parentId: 'collab', keywords: /(预算池|预算)/i },
      { id: 'milestone', parentId: 'collab', keywords: /(里程碑|阶段交付)/i },
      { id: 'collaboration', parentId: 'collab', keywords: /(协作酬劳|协作报酬|酬劳|报酬)/i },
      // 分佣结算场景
      { id: 'commissions', parentId: 'commission', keywords: /(分润|分佣记录|佣金)/i },
      { id: 'settlements', parentId: 'commission', keywords: /(结算记录|结算历史)/i },
      { id: 'settlement_execute', parentId: 'commission', keywords: /(执行结算|发起结算)/i },
      { id: 'fees', parentId: 'commission', keywords: /(手续费|费用计算|费率计算|预览分账)/i },
      { id: 'rates', parentId: 'commission', keywords: /(费率结构|平台费率)/i },
      // 发布场景
      { id: 'publish_task', parentId: 'publish', keywords: /(发布任务|发布协作任务)/i },
      { id: 'publish_product', parentId: 'publish', keywords: /(发布商品)/i },
      { id: 'publish_skill', parentId: 'publish', keywords: /(发布skill|发布技能)/i },
      { id: 'sync_external', parentId: 'publish', keywords: /(同步到外部|marketplace)/i },
    ];

    const matchedCommerceIntent = commerceIntentMap.find(item => item.keywords.test(normalized));
    if (matchedCommerceIntent) {
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '已识别为 commerce 请求，请从分类卡片继续。支持 UCP/X402 协议。',
        timestamp: new Date(),
        metadata: {
          type: 'commerce_categories',
          data: {
            layout: 'three-tier',
            openCategory: matchedCommerceIntent.parentId,
            openSubCategory: matchedCommerceIntent.id,
            categories: getCommerceCategories(),
          },
        },
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
      return;
    }

    try {
      console.log('📤 发送消息:', {
        message: messageText,
        mode,
        sessionId: sessionId || 'new',
      });

      // 确保sessionId被正确传递（即使为undefined也要传递，让后端创建新session）
      const response = await agentApi.chat({
        message: messageText,
        context: { 
          mode, 
          userId: user?.id,
          workspace: {
            viewMode,
            selection,
            workspaceData: workspaceData ? (Object.keys(workspaceData).length > 10 ? { summary: 'Data too large' } : workspaceData) : null,
            hasData: !!workspaceData
          }
        },
        sessionId: sessionId, // 传递当前的sessionId，如果不存在则后端会创建新的
      });
      
      // 立即更新sessionId（如果响应中包含），确保后续操作使用正确的sessionId
      if ((response as any).sessionId && (response as any).sessionId !== sessionId) {
        const newSessionId = (response as any).sessionId;
        console.log('💾 更新Session ID:', { old: sessionId, new: newSessionId });
        setSessionId(newSessionId);
      }

      if (!response) {
        throw new Error('Agent响应为空');
      }

      console.log('📥 收到响应:', {
        responseLength: response.response?.length,
        type: response.type,
        hasData: !!response.data,
        sessionId: (response as any).sessionId,
      });

      // 检查响应中是否包含商品数据（无论type是什么）
      const hasProducts = response.data?.products && Array.isArray(response.data.products) && response.data.products.length > 0;
      
      // 检查是否是购物车响应
      const isCartResponse = response.type === 'view_cart' || response.data?.type === 'view_cart' || 
                            (response.data?.cartItems && Array.isArray(response.data.cartItems)) ||
                            (response.data?.items && Array.isArray(response.data.items));
      
      // 确定响应类型：优先使用response.type，如果没有则使用data.type
      const responseType = response.type || response.data?.type || 'unknown';
      
      // 调试日志
      console.log('📥 处理响应:', {
        responseType: response.type,
        dataType: response.data?.type,
        hasData: !!response.data,
        dataKeys: response.data ? Object.keys(response.data) : [],
        isCartResponse,
        hasProducts,
      });
      
      if (isCartResponse) {
        console.log('🛒 检测到购物车响应:', {
          type: response.type,
          dataType: response.data?.type,
          hasCartItems: !!response.data?.cartItems,
          hasItems: !!response.data?.items,
          cartItemsCount: response.data?.cartItems?.length || 0,
          itemsCount: response.data?.items?.length || 0,
          fullData: response.data,
        });
      }
      
      // 确定最终的响应类型
      let finalType = responseType;
      if (hasProducts) {
        finalType = 'product_search';
      } else if (isCartResponse) {
        finalType = 'view_cart';
      }
      
      // 构建数据对象
      const messageData: any = {
        ...response.data,
      };
      
      // 如果是购物车响应，确保cartItems存在
      if (isCartResponse) {
        messageData.type = 'view_cart';
        messageData.cartItems = response.data?.cartItems || response.data?.items || [];
        console.log('🛒 设置购物车数据:', {
          cartItems: messageData.cartItems,
          cartItemsLength: messageData.cartItems.length,
        });
      }
      
      // 如果是商品搜索，确保products存在
      if (hasProducts) {
        messageData.products = response.data.products || [];
        messageData.query = response.data.query || messageText;
        messageData.total = response.data.total || response.data.count || response.data.products?.length || 0;
      }

      // 触发外部命令处理（如果存在）
      if (onCommand && response.type) {
        onCommand(response.type, response.data);
      } else if (onCommand && response.data?.type) {
        onCommand(response.data.type, response.data);
      }

      // 解析文本中的指令 (Deep Grounding 指令解析)
      if (onCommand && response.response && response.response.includes('[COMMAND:')) {
        const commandMatch = response.response.match(/\[COMMAND:([^:\]]+):?([^\]]*)\]/);
        if (commandMatch) {
          const cmdType = commandMatch[1];
          const cmdValue = commandMatch[2];
          console.log('🤖 解析到文本指令:', { cmdType, cmdValue });
          
          if (cmdType === 'SWITCH_VIEW') {
            onCommand('switch_view', { view: cmdValue });
          } else {
            onCommand(cmdType.toLowerCase(), { value: cmdValue });
          }
        }
      }
      
      // 如果是购物车响应，检查是否已有购物车消息，如果有则更新而不是创建新消息
      let shouldUpdateExisting = false;
      let existingCartMessageIndex = -1;
      
      if (isCartResponse) {
        existingCartMessageIndex = messages.findLastIndex(
          msg => msg.metadata?.type === 'view_cart' || 
                 (msg.metadata?.data?.cartItems && Array.isArray(msg.metadata.data.cartItems)) ||
                 (msg.metadata?.data?.items && Array.isArray(msg.metadata.data.items))
        );
        shouldUpdateExisting = existingCartMessageIndex >= 0;
        
        if (shouldUpdateExisting) {
          console.log('🛒 更新现有购物车消息，索引:', existingCartMessageIndex);
        }
      }
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.response || '抱歉，没有收到有效响应。',
        timestamp: new Date(),
        metadata: {
          type: finalType,
          data: messageData,
        },
      };
      
      // 调试：打印最终的消息metadata
      console.log('📤 最终消息metadata:', {
        type: assistantMessage.metadata.type,
        hasData: !!assistantMessage.metadata.data,
        dataKeys: assistantMessage.metadata.data ? Object.keys(assistantMessage.metadata.data) : [],
        cartItemsCount: assistantMessage.metadata.data?.cartItems?.length || 0,
        fullMetadata: assistantMessage.metadata,
      });

      // 如果是购物车响应，更新现有购物车消息而不是移除（确保UI操作后的购物车状态能正确显示）
      setMessages((prev) => {
        if (isCartResponse) {
          // 查找现有的购物车消息
          const existingCartMessageIndex = prev.findLastIndex(
            msg => msg.metadata?.type === 'view_cart' || 
                   (msg.metadata?.data?.cartItems && Array.isArray(msg.metadata.data.cartItems)) ||
                   (msg.metadata?.data?.items && Array.isArray(msg.metadata.data.items))
          );
          
          // 如果存在购物车消息，更新它而不是移除
          if (existingCartMessageIndex >= 0) {
            console.log('🛒 更新现有购物车消息，索引:', existingCartMessageIndex);
            const newMessages = [...prev];
            newMessages[existingCartMessageIndex] = {
              ...assistantMessage,
              id: newMessages[existingCartMessageIndex].id, // 保持原有ID
            };
            return newMessages;
          }
          
          // 如果没有购物车消息，添加新的
          const filteredMessages = prev.filter(
            msg => !(msg.metadata?.type === 'view_cart' || 
                    (msg.metadata?.data?.cartItems && Array.isArray(msg.metadata.data.cartItems)) ||
                    (msg.metadata?.data?.items && Array.isArray(msg.metadata.data.items)))
          );
          console.log('🛒 在最新位置创建购物车消息');
          return [...filteredMessages, assistantMessage];
        }
        
        // 非购物车响应，正常添加新消息
        return [...prev, assistantMessage];
      });

      // 检查是否是支付响应，如果是则触发支付界面
      const isPaymentResponse = response.type === 'payment' || response.type === 'pay_order' || 
                                response.data?.payment || response.data?.type === 'payment';
      
      if (isPaymentResponse) {
        console.log('💳 检测到支付响应:', {
          type: response.type,
          dataType: response.data?.type,
          hasPayment: !!response.data?.payment,
          paymentData: response.data?.payment,
          fullData: response.data,
        });
        
        const paymentData = response.data?.payment || response.data;
        const orderData = response.data?.order || response.data;
        
        // 尝试多种方式获取支付信息
        const paymentId = paymentData?.id || paymentData?.paymentId || response.data?.paymentId;
        const amount = paymentData?.amount || orderData?.amount || response.data?.amount;
        const currency = paymentData?.currency || orderData?.currency || response.data?.currency || 'CNY';
        
        console.log('💳 支付信息提取:', { paymentId, amount, currency, paymentData, orderData });
        
        if (paymentId || amount) {
          // 触发支付界面
          console.log('💳 触发支付界面');
          startPayment({
            id: paymentId || `payment_${Date.now()}`,
            amount: amount?.toString() || '0',
            currency: currency,
            description: orderData?.description || paymentData?.description || response.data?.description || '订单支付',
            merchantId: orderData?.merchantId || paymentData?.merchantId || response.data?.merchantId,
            metadata: {
              paymentId: paymentId,
              orderId: orderData?.id || paymentData?.orderId || response.data?.orderId,
              paymentMethod: paymentData?.paymentMethod || response.data?.paymentMethod,
            },
            createdAt: new Date().toISOString(),
          } as any);
        } else {
          console.warn('💳 支付响应缺少必要信息:', response);
        }
      }

      // sessionId已在上面更新，这里不需要重复更新
    } catch (error: any) {
      console.error('❌ 获取响应失败:', error);
      
      // 构建友好的错误消息
      let errorContent = '抱歉，处理您的请求时出现错误。';
      
      if (error.name === 'NetworkError' || error.message?.includes('无法连接')) {
        errorContent = `❌ **连接失败**\n\n无法连接到服务器。请检查：\n\n1. **后端服务是否运行**\n   - 确认后端服务已启动（http://localhost:3001）\n   - 检查终端是否有错误信息\n\n2. **网络连接**\n   - 检查网络连接是否正常\n   - 尝试刷新页面\n\n3. **查看详细错误**\n   - 打开浏览器开发者工具（F12）\n   - 查看Console和Network标签\n\n**错误详情**: ${error.message}`;
      } else if (error.message) {
        errorContent = `❌ **错误**: ${error.message}\n\n请稍后重试，或联系技术支持。`;
      }
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: errorContent,
        timestamp: new Date(),
        metadata: {
          type: 'error',
          error: error.message,
        },
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0f1117] relative">
      {/* 模式切换器 - 仅在standalone模式下显示 */}
      {standalone && (
        <div className="flex items-center justify-center gap-2 p-4 border-b border-slate-800/60 bg-[#0f1117]/80 backdrop-blur-md">
          <div className="flex items-center gap-1 bg-neutral-800/50 rounded-xl p-1">
            <button
              onClick={() => handleModeChange('user')}
              className={`px-4 py-2 rounded-lg transition-all text-sm font-medium ${
                mode === 'user'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
              }`}
            >
              <span className="flex items-center gap-2">
                <span>👤</span>
                <span>个人</span>
              </span>
            </button>
            <button
              onClick={() => handleModeChange('merchant')}
              className={`px-4 py-2 rounded-lg transition-all text-sm font-medium ${
                mode === 'merchant'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
              }`}
            >
              <span className="flex items-center gap-2">
                <span>🏪</span>
                <span>商户</span>
              </span>
            </button>
            <button
              onClick={() => handleModeChange('developer')}
              className={`px-4 py-2 rounded-lg transition-all text-sm font-medium ${
                mode === 'developer'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
              }`}
            >
              <span className="flex items-center gap-2">
                <span>💻</span>
                <span>开发者</span>
              </span>
            </button>
          </div>
        </div>
      )}

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-8 flex flex-col">
        {/* Deep Grounding Indicator */}
        {viewMode !== 'chat' && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full w-fit mx-auto mb-8">
            <Eye size={12} className="text-indigo-400 animate-pulse" />
            <span className="text-[10px] font-medium text-indigo-300 uppercase tracking-wider">
              Grounded in {viewMode.replace('_', ' ')}
            </span>
          </div>
        )}

        {messages.length === 1 && messages[0].role === 'assistant' ? (
          // 显示欢迎界面和快捷指令卡片
          <div className="flex-1 flex flex-col items-center justify-center max-w-3xl mx-auto w-full space-y-8">
            {/* 欢迎头部 */}
            <div className="text-center space-y-3 animate-fade-in-up">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-white/5 mb-2">
                <span className="text-3xl">👋</span>
              </div>
              <h2 className="text-2xl font-semibold text-white">
                {mode === 'user' ? '下午好, Agentrix 用户' : mode === 'merchant' ? '欢迎, 商户伙伴' : '你好, 开发者'}
              </h2>
              <p className="text-slate-400 max-w-md mx-auto text-sm">
                {mode === 'user' 
                  ? '我是您的智能财务中枢。我可以协助您处理支付、管理数字资产或部署自动化交易策略。'
                  : mode === 'merchant'
                  ? '我是您的智能商户管理助手。我可以协助您处理订单、收款、对账和营销等业务。'
                  : '我是您的智能开发助手。我可以协助您生成代码、配置API、调试和集成Agentrix服务。'}
              </p>
            </div>
            
            {/* 快捷建议卡片 Grid */}
            <QuickActionCards 
              mode={mode} 
              onAction={(action, data) => {
                if (action === 'chat' && data?.message) {
                  handleSend(data.message);
                }
              }} 
            />
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
          <div
            key={message.id}
            className={`flex items-start gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {/* 头像 */}
            {message.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm font-bold">AI</span>
              </div>
            )}
            
            <div
              className={`max-w-[85%] md:max-w-[75%] rounded-2xl p-4 shadow-lg ${
                message.role === 'user'
                  ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white'
                  : message.metadata?.type === 'error'
                  ? 'bg-red-900/30 border border-red-500/50 text-red-100'
                  : 'bg-slate-900/90 backdrop-blur-sm text-slate-100 border border-slate-800/50'
              }`}
            >
              {/* 消息内容 */}
              <div className="flex items-start gap-2">
                <div className="flex-1 whitespace-pre-wrap leading-relaxed text-sm md:text-base">
                  {message.content}
                </div>
                {message.role === 'assistant' && voiceEnabled && (
                  <VoiceOutput
                    text={message.content}
                    language="zh-CN"
                    autoPlay={false}
                  />
                )}
              </div>
              
              {/* 结构化数据展示 */}
              {message.metadata?.data && message.metadata.type !== 'error' && (
                <StructuredResponseCard 
                  message={message} 
                  onSendMessage={handleSend}
                  sessionId={sessionId}
                  payingProductId={payingProductId}
                  onBuyNow={async (product) => {
                    const symbols: Record<string, string> = {
                      USD: '$',
                      USDT: '$',
                      USDC: '$',
                      CNY: '¥',
                      EUR: '€',
                    };
                    const currency = (product as any).currency || product.metadata?.currency || 'USDC';
                    const symbol = symbols[currency] || '¥';
                    
                    // V3.0: 闭环支付逻辑 - 检查是否满足直接 Zap 条件
                    const isQuickPayEligible = user && activeSession && activeSession.isActive;
                    
                    if (isQuickPayEligible) {
                      setPayingProductId(product.id);
                      try {
                        console.log('⚡ 触发闭环支付 (Closed-loop Zap):', product.name);
                        const result = await executeDirectQuickPay(
                          {
                            id: `pay_${Date.now()}`,
                            amount: product.price,
                            currency: currency,
                            description: `购买 ${product.name}`,
                            merchantId: product.merchantId,
                            metadata: {
                              productId: product.id,
                              agentId: 'Personal Agent',
                            },
                          },
                          activeSession,
                          user
                        );
                        
                        console.log('✅ 闭环支付成功:', result);
                        // 添加系统消息提示成功
                        const successMsg: ChatMessage = {
                          id: `msg_${Date.now()}`,
                          role: 'assistant',
                          content: `✅ **支付成功！**\n您已成功购买 **${product.name}**。\n交易哈希: \`${result.transactionHash || result.id}\`\n您可以前往“交易历史”查看详情。`,
                          timestamp: new Date(),
                        };
                        setMessages(prev => [...prev, successMsg]);
                      } catch (err: any) {
                        console.error('❌ 闭环支付失败:', err);
                        // 支付失败，降级到传统支付面板
                        startPayment({
                          id: `pay_${Date.now()}`,
                          amount: `${symbol}${product.price}`,
                          currency: currency,
                          description: `购买 ${product.name}`,
                          merchant: (product as any).merchantName || 'Agentrix Store',
                          agent: 'Personal Agent',
                          metadata: {
                            productId: product.id,
                            merchantId: product.merchantId,
                            error: err.message, // 传递错误原因以便面板显示
                          },
                          createdAt: new Date().toISOString(),
                        });
                      } finally {
                        setPayingProductId(null);
                      }
                      return;
                    }

                    // 如果不满足闭环支付条件，正常打开支付面板
                    startPayment({
                      id: `pay_${Date.now()}`,
                      amount: `${symbol}${product.price}`,
                      currency: currency,
                      description: `购买 ${product.name}`,
                      merchant: (product as any).merchantName || 'Agentrix Store',
                      agent: 'Personal Agent',
                      metadata: {
                        productId: product.id,
                        merchantId: product.merchantId,
                      },
                      createdAt: new Date().toISOString(),
                    });
                  }}
                  onCartUpdate={(updatedItems) => {
                    // 直接更新购物车消息的数据
                    console.log('🛒 更新购物车显示，商品数量:', updatedItems.length);
                    setMessages(prevMessages => {
                      const newMessages = [...prevMessages];
                      const lastCartMessageIndex = newMessages.findLastIndex(
                        msg => msg.metadata?.type === 'view_cart' || msg.metadata?.data?.cartItems
                      );
                      if (lastCartMessageIndex >= 0) {
                        newMessages[lastCartMessageIndex] = {
                          ...newMessages[lastCartMessageIndex],
                          metadata: {
                            ...newMessages[lastCartMessageIndex].metadata,
                            data: {
                              ...newMessages[lastCartMessageIndex].metadata?.data,
                              cartItems: updatedItems,
                              items: updatedItems,
                            },
                          },
                        };
                      }
                      return newMessages;
                    });
                  }}
                  onCartChanged={async (cartItems?: any[]) => {
                    // 购物车更新后，检查是否存在购物车消息
                    // 如果用户已登录，不传递sessionId；如果未登录，传递sessionId
                    const cartSessionId = user ? undefined : sessionId;
                    console.log('🛒 购物车已更新，检查是否需要显示购物车', { userId: user?.id, sessionId, cartSessionId });
                    if (user || sessionId) {
                      setMessages(prevMessages => {
                        const lastCartMessageIndex = prevMessages.findLastIndex(
                          msg => msg.metadata?.type === 'view_cart' || 
                                 (msg.metadata?.data?.cartItems && Array.isArray(msg.metadata.data.cartItems)) ||
                                 (msg.metadata?.data?.items && Array.isArray(msg.metadata.data.items))
                        );
                        
                        // 如果购物车消息已存在，更新它
                        if (lastCartMessageIndex >= 0) {
                          console.log('🛒 更新现有购物车消息，索引:', lastCartMessageIndex);
                          const newMessages = [...prevMessages];
                          // 如果有传入的cartItems，直接使用；否则从API获取
                          if (cartItems && cartItems.length > 0) {
                            newMessages[lastCartMessageIndex] = {
                              ...newMessages[lastCartMessageIndex],
                              metadata: {
                                ...newMessages[lastCartMessageIndex].metadata,
                                data: {
                                  ...newMessages[lastCartMessageIndex].metadata?.data,
                                  cartItems: cartItems,
                                  items: cartItems,
                                  type: 'view_cart',
                                },
                              },
                            };
                          } else {
                            // 异步获取最新数据
                            (async () => {
                              try {
                                const { cartApi } = await import('../../lib/api/cart.api');
                                const updatedCart = await cartApi.getCartWithProducts(cartSessionId);
                                setMessages(prev => {
                                  const newMsgs = [...prev];
                                  const idx = newMsgs.findLastIndex(
                                    m => m.metadata?.type === 'view_cart' || 
                                         (m.metadata?.data?.cartItems && Array.isArray(m.metadata.data.cartItems))
                                  );
                                  if (idx >= 0) {
                                    newMsgs[idx] = {
                                      ...newMsgs[idx],
                                      metadata: {
                                        ...newMsgs[idx].metadata,
                                        data: {
                                          ...newMsgs[idx].metadata?.data,
                                          cartItems: updatedCart.items || [],
                                          items: updatedCart.items || [],
                                          type: 'view_cart',
                                        },
                                      },
                                    };
                                  }
                                  return newMsgs;
                                });
                              } catch (error) {
                                console.error('获取购物车数据失败:', error);
                              }
                            })();
                          }
                          return newMessages;
                        } else {
                          // 如果购物车消息不存在，直接创建购物车消息来显示购物车
                          console.log('🛒 购物车消息不存在，直接创建购物车消息');
                          // 如果有传入的cartItems，直接使用；否则从API获取
                          if (cartItems && cartItems.length > 0) {
                            // 直接创建购物车消息
                            const cartMessage: ChatMessage = {
                              id: (Date.now() + 1).toString(),
                              role: 'assistant',
                              content: `🛒 您的购物车（${cartItems.length}件商品）\n\n💡 下一步操作：\n• 在下方选择要购买的商品，然后点击"支付"按钮\n• 说"结算"或"下单"来创建订单并支付\n• 说"继续购物"搜索更多商品`,
                              timestamp: new Date(),
                              metadata: {
                                type: 'view_cart',
                                data: {
                                  type: 'view_cart',
                                  cartItems: cartItems,
                                  items: cartItems,
                                  total: cartItems.reduce((sum, item) => sum + (item.product?.price || 0) * item.quantity, 0),
                                  itemCount: cartItems.length,
                                },
                              },
                            };
                            return [...prevMessages, cartMessage];
                          } else {
                            // 异步获取最新数据并创建购物车消息
                            (async () => {
                              try {
                                const { cartApi } = await import('../../lib/api/cart.api');
                                const updatedCart = await cartApi.getCartWithProducts(cartSessionId);
                                const cartItemsData = (updatedCart.items || []).map((item: any) => ({
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
                                
                                if (cartItemsData.length > 0) {
                                  const cartMessage: ChatMessage = {
                                    id: (Date.now() + 1).toString(),
                                    role: 'assistant',
                                    content: `🛒 您的购物车（${cartItemsData.length}件商品）\n\n💡 下一步操作：\n• 在下方选择要购买的商品，然后点击"支付"按钮\n• 说"结算"或"下单"来创建订单并支付\n• 说"继续购物"搜索更多商品`,
                                    timestamp: new Date(),
                                    metadata: {
                                      type: 'view_cart',
                                      data: {
                                        type: 'view_cart',
                                        cartItems: cartItemsData,
                                        items: cartItemsData,
                                        total: updatedCart.total || 0,
                                        itemCount: updatedCart.itemCount || cartItemsData.length,
                                      },
                                    },
                                  };
                                  setMessages(prev => [...prev, cartMessage]);
                                }
                              } catch (error) {
                                console.error('获取购物车数据失败，发送"查看购物车"消息:', error);
                                // 如果获取失败，发送消息给 Agent
                      setTimeout(() => {
                        handleSend('查看购物车');
                      }, 100);
                              }
                            })();
                          }
                          return prevMessages;
                        }
                      });
                    }
                  }}
                />
              )}
              
              {/* 时间戳 */}
              <div className={`text-xs mt-2 ${
                message.role === 'user' ? 'text-blue-100/70' : 'text-neutral-500'
              }`}>
                {message.timestamp.toLocaleTimeString('zh-CN', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </div>
            </div>
            
            {/* 用户头像 */}
            {message.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm font-bold">我</span>
              </div>
            )}
          </div>
            ))}
          </div>
        )}
        
        {/* 加载动画 */}
        {isLoading && (
          <div className="flex items-start gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-bold">AI</span>
            </div>
            <div className="bg-slate-900/90 backdrop-blur-sm rounded-2xl p-4 border border-slate-800/50">
              <div className="flex gap-2 items-center">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                <span className="text-xs text-slate-400 ml-2">正在思考...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 底部输入框 - 悬浮式设计 */}
      <div className="p-6 max-w-3xl mx-auto w-full">
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl opacity-20 group-hover:opacity-40 transition duration-500 blur"></div>
          <div className="relative flex items-end gap-2 bg-[#161b22] p-2 rounded-xl border border-slate-800 shadow-2xl">
            <button
              onClick={() => handleSend('/skills')}
              title="Skills"
              className="p-3 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <Plus size={20} />
            </button>
            <div className="flex items-center gap-2 flex-1">
              <textarea 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="输入指令或通过 @ 调用插件..." 
              className="flex-1 bg-transparent border-none text-slate-200 placeholder-slate-500 focus:ring-0 resize-none py-3 max-h-32 text-sm"
              disabled={isLoading}
              rows={1}
              style={{
                height: 'auto',
                minHeight: '48px',
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = `${Math.min(target.scrollHeight, 128)}px`;
              }}
            />
            <VoiceInput
              onTranscript={(text) => {
                setInput(text);
                // 自动发送语音识别的文本
                setTimeout(() => handleSend(text), 100);
              }}
              onError={(error) => {
                console.error('语音识别错误:', error);
              }}
              disabled={isLoading}
              language="zh-CN"
            />
            </div>
            <button
              onClick={() => handleSend()}
              disabled={isLoading || !input.trim()}
              className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={18} />
            </button>
          </div>
          <div className="text-center mt-2">
            <p className="text-[10px] text-slate-600">Agentrix AI Core v2.0 · 内容由 AI 生成，请核实重要财务信息。</p>
          </div>
        </div>
      </div>
    </div>
  );
}


