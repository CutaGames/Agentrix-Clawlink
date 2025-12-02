import { useState, useRef, useEffect } from 'react';
import { useUser } from '../../contexts/UserContext';
import { usePayment } from '../../contexts/PaymentContext';
import { agentApi } from '../../lib/api/agent.api';
import { GlassCard } from '../ui/GlassCard';
import { AIButton } from '../ui/AIButton';
import { StructuredResponseCard } from './StructuredResponseCard';
import { QuickActionCards } from './QuickActionCards';
import { VoiceInput } from './voice/VoiceInput';
import { VoiceOutput } from './voice/VoiceOutput';
import { Plus, Send, Search } from 'lucide-react';

export type AgentMode = 'user' | 'merchant' | 'developer';

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
  standalone?: boolean;
}

/**
 * 统一Agent对话界面
 * 支持用户、商户、开发者三种模式
 * 集成所有P0功能
 */
export function UnifiedAgentChat({
  mode: initialMode = 'user',
  onModeChange,
  standalone = false,
}: UnifiedAgentChatProps) {
  const { user } = useUser();
  const { startPayment } = usePayment();
  const [mode, setMode] = useState<AgentMode>(initialMode);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
      user: `👋 欢迎使用 **PayMind 个人Agent**！

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
      merchant: `👋 欢迎使用 **PayMind 商户Agent**！

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
      developer: `👋 欢迎使用 **PayMind 开发者Agent**！

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
        const response = await fetch('http://localhost:3001/api/agent/health');
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

    try {
      console.log('📤 发送消息:', {
        message: messageText,
        mode,
        sessionId: sessionId || 'new',
      });

      const response = await agentApi.chat({
        message: messageText,
        context: { mode, userId: user?.id },
        sessionId: sessionId,
      });

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

      setMessages((prev) => [...prev, assistantMessage]);

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

      // 更新sessionId（如果响应中包含）
      if ((response as any).sessionId) {
        setSessionId((response as any).sessionId);
        console.log('💾 保存Session ID:', (response as any).sessionId);
      }
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
        {messages.length === 1 && messages[0].role === 'assistant' ? (
          // 显示欢迎界面和快捷指令卡片
          <div className="flex-1 flex flex-col items-center justify-center max-w-3xl mx-auto w-full space-y-8">
            {/* 欢迎头部 */}
            <div className="text-center space-y-3 animate-fade-in-up">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-white/5 mb-2">
                <span className="text-3xl">👋</span>
              </div>
              <h2 className="text-2xl font-semibold text-white">
                {mode === 'user' ? '下午好, PayMind 用户' : mode === 'merchant' ? '欢迎, 商户伙伴' : '你好, 开发者'}
              </h2>
              <p className="text-slate-400 max-w-md mx-auto text-sm">
                {mode === 'user' 
                  ? '我是您的智能财务中枢。我可以协助您处理支付、管理数字资产或部署自动化交易策略。'
                  : mode === 'merchant'
                  ? '我是您的智能商户管理助手。我可以协助您处理订单、收款、对账和营销等业务。'
                  : '我是您的智能开发助手。我可以协助您生成代码、配置API、调试和集成PayMind服务。'}
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
                  onCartChanged={async () => {
                    // 购物车更新后，自动刷新购物车显示
                    console.log('🛒 购物车已更新，刷新显示');
                    if (sessionId) {
                      // 延迟一下确保后端数据已更新
                      setTimeout(() => {
                        handleSend('查看购物车');
                      }, 200);
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
            <button className="p-3 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition-colors">
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
            <p className="text-[10px] text-slate-600">PayMind AI Core v2.0 · 内容由 AI 生成，请核实重要财务信息。</p>
          </div>
        </div>
      </div>
    </div>
  );
}


