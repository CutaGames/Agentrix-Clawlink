import { useEffect, useRef, useState } from 'react';
import { paymentApi } from '../../lib/api/payment.api';

interface TransakWidgetProps {
  apiKey: string;
  environment?: 'STAGING' | 'PRODUCTION';
  amount?: number;
  fiatCurrency?: string;
  cryptoCurrency?: string;
  network?: string; // 链网络（bsc、ethereum、polygon等），默认 bsc
  walletAddress?: string; // 分润佣金合约地址（Provider 兑换后自动打入此地址）
  orderId?: string;
  userId?: string;
  email?: string;
  directPayment?: boolean; // 新增：直接支付模式（不显示兑换界面，直接支付指定金额）
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
  onClose?: () => void;
  onEvent?: (eventType: string, data?: any) => void; // 新增：通用事件回调
}

/**
 * Transak Widget 组件
 * 使用 Transak SDK 集成法币转数字货币功能
 * 
 * 文档: https://docs.transak.com/docs/web-integration
 */
export function TransakWidget({
  apiKey,
  environment = 'STAGING',
  amount,
  fiatCurrency = 'USD',
  cryptoCurrency = 'USDC',
  network = 'bsc', // 默认 BSC 链
  walletAddress, // 分润佣金合约地址
  orderId,
  userId,
  email,
  directPayment = false, // 默认不是直接支付模式
  onSuccess,
  onError,
  onClose,
  onEvent, // 新增：通用事件回调
}: TransakWidgetProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [transakSessionId, setTransakSessionId] = useState<string | null>(null);
  const [sessionLoading, setSessionLoading] = useState(false);
  const widgetRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeFallbackActivated = useRef(false); // 标记是否已使用 iframe 备用方案

  // 方案1：使用 Create Session API 创建 Transak Session
  useEffect(() => {
    // 如果已经有 sessionId，跳过
    if (transakSessionId) {
      return;
    }

    // 如果没有金额，无法创建 Session
    if (!amount || !apiKey) {
      return;
    }

    // 创建 Transak Session
    const createSession = async () => {
      setSessionLoading(true);
      try {
        console.log('🔄 创建 Transak Session (方案1: Create Session API)...', {
          amount,
          fiatCurrency,
          cryptoCurrency,
          network,
          walletAddress,
          orderId,
          email,
          directPayment,
        });

        const result = await paymentApi.createTransakSession({
          amount,
          fiatCurrency: fiatCurrency || 'USD',
          cryptoCurrency: cryptoCurrency || 'USDC',
          network: network || 'bsc',
          walletAddress,
          orderId,
          email,
          redirectURL: `${window.location.origin}/payment/callback`,
          referrerDomain: window.location.host,
          hideMenu: true,
          disableWalletAddressForm: true,
          disableFiatAmountEditing: true, // 锁定金额
          isKYCRequired: !directPayment, // 如果 directPayment=false，需要 KYC
        });

        console.log('✅ Transak Session 创建成功:', result);
        setTransakSessionId(result.sessionId);
      } catch (error: any) {
        console.error('❌ 创建 Transak Session 失败:', error);
        console.warn('⚠️ 将回退到直接使用 URL 参数的方式');
        // 如果 Create Session API 失败，回退到原来的方式
        setTransakSessionId(null);
      } finally {
        setSessionLoading(false);
      }
    };

    createSession();
  }, [amount, fiatCurrency, cryptoCurrency, network, walletAddress, orderId, email, directPayment, apiKey, transakSessionId]);

  useEffect(() => {
    // 如果已经使用 iframe 备用方案，不再尝试加载 SDK
    if (iframeFallbackActivated.current) {
      console.log('⏭️ iframe fallback already activated, skipping SDK load');
      return;
    }

    // 检查 API Key
    if (!apiKey) {
      console.error('❌ Transak API Key 未配置！请设置 NEXT_PUBLIC_TRANSAK_API_KEY 环境变量');
      onError?.({ 
        message: 'Transak API Key 未配置，无法加载 SDK',
        code: 'MISSING_API_KEY',
      });
      return;
    }

    // 检查是否已经加载过 Transak SDK
    if (window.TransakSDK) {
      console.log('✅ Transak SDK 已存在，跳过加载');
      setIsLoaded(true);
      return;
    }

    // 如果容器已存在且有 iframe，说明已经使用 iframe 备用方案，不需要再加载 SDK
    if (containerRef.current && containerRef.current.querySelector('iframe')) {
      console.log('✅ Transak iframe already embedded, skipping SDK load');
      return;
    }

    // 动态加载 Transak SDK
    const script = document.createElement('script');
    // 使用正确的 Transak SDK URL（根据环境选择）
    // 注意：staging-global.transak.com 会重定向到 global-stg.transak.com
    // 直接使用 global-stg.transak.com 避免重定向
    const sdkUrl = environment === 'PRODUCTION'
      ? 'https://global.transak.com/sdk/v1.1.js'
      : 'https://global-stg.transak.com/sdk/v1.1.js';
    
    console.log('🔍 开始加载 Transak SDK:', {
      url: sdkUrl,
      environment,
      apiKey: apiKey ? `${apiKey.slice(0, 8)}...` : '未配置',
      userAgent: navigator.userAgent,
      location: window.location.href,
    });

    script.src = sdkUrl;
    script.async = true;
    script.crossOrigin = 'anonymous';
    
    // 添加超时检测
    const timeoutId = setTimeout(() => {
      console.error('⏱️ Transak SDK 加载超时（30秒）');
      if (!window.TransakSDK && script.onerror) {
        // 创建模拟的错误事件（script.onerror 接受 Event 或 string）
        const errorEvent = new Event('error');
        script.onerror(errorEvent);
      }
    }, 30000);
    
    script.onload = () => {
      clearTimeout(timeoutId);
      console.log('📦 Script 标签加载完成，检查 window.TransakSDK...');
      
      // 等待一小段时间，确保 SDK 初始化完成
      setTimeout(() => {
        if (window.TransakSDK) {
          setIsLoaded(true);
          console.log('✅ Transak SDK loaded successfully');
        } else {
          console.error('❌ Transak SDK script loaded but window.TransakSDK is not available');
          console.error('可能的原因：');
          console.error('1. SDK 脚本执行出错');
          console.error('2. CSP (Content Security Policy) 阻止了脚本执行');
          console.error('3. SDK 版本不兼容');
          onError?.({ 
            message: 'Transak SDK loaded but not available',
            code: 'SDK_NOT_AVAILABLE',
          });
        }
      }, 100);
    };

    script.onerror = (error) => {
      clearTimeout(timeoutId);
      
      // 如果已经使用 iframe 备用方案，不再处理错误
      if (iframeFallbackActivated.current) {
        console.log('⏭️ SDK load error but iframe fallback already activated, ignoring');
        return;
      }
      
      // 详细的错误诊断
      console.error('❌ Failed to load Transak SDK');
      console.error('错误详情:', {
        error,
        url: sdkUrl,
        environment,
        apiKey: apiKey ? `${apiKey.slice(0, 8)}...` : '未配置',
        networkStatus: navigator.onLine ? '在线' : '离线',
        userAgent: navigator.userAgent,
      });
      
      // 尝试诊断具体原因
      console.log('🔍 诊断 SDK 加载失败原因...');
      
      // 检查网络连接
      if (!navigator.onLine) {
        console.error('❌ 网络离线，无法加载 SDK');
      }
      
      // 尝试访问 SDK URL（使用 fetch 测试）
      fetch(sdkUrl, { method: 'HEAD', mode: 'no-cors' })
        .then(() => {
          console.log('✅ SDK URL 可访问（HEAD 请求成功）');
          console.log('可能的原因：CORS 策略或 CSP 限制');
        })
        .catch((fetchError) => {
          console.error('❌ SDK URL 无法访问:', fetchError);
          console.error('可能的原因：');
          console.error('1. 网络连接问题（防火墙、代理、VPN）');
          console.error('2. DNS 解析失败');
          console.error('3. 服务器响应错误（404、500等）');
          console.error('4. 地理位置限制（某些地区可能无法访问）');
        });
      
      console.error('尝试使用重定向方式打开 Transak...');
      
      // 如果 SDK 加载失败，使用 iframe 嵌入方式作为备用方案
      // 注意：这里会等待 transakSessionId 准备好（在另一个 useEffect 中创建）
      // 如果 transakSessionId 还未准备好，会等待或使用 URL 参数方式
      // 注意：staging-global.transak.com 会重定向到 global-stg.transak.com
      // 直接使用 global-stg.transak.com 避免重定向
      const baseUrl = environment === 'PRODUCTION' 
        ? 'https://global.transak.com'
        : 'https://global-stg.transak.com';

      const params = new URLSearchParams({
        apiKey: apiKey,
        defaultCryptoCurrency: cryptoCurrency || 'USDC',
        defaultFiatCurrency: fiatCurrency || 'USD',
        // 统一使用 BSC 链
        defaultNetwork: network || 'bsc',
        // 设置金额（包含佣金的总价）
        ...(amount && { 
          fiatAmount: amount.toString(),
          defaultAmount: amount.toString(),
          defaultFiatAmount: amount.toString(),
        }),
        // 使用分润佣金合约地址
        ...(walletAddress && { walletAddress: walletAddress }),
        ...(orderId && { partnerOrderId: orderId }),
        // 邮箱配置：自动填充但允许用户编辑
        ...(email && { email: email }),
        isAutoFillUserData: 'true', // 允许用户编辑预填的信息
        redirectURL: `${window.location.origin}/payment/callback`,
        // Transak 白标集成配置
        hideMenu: 'true',
        disableWalletAddressForm: 'true',
        disableFiatAmountEditing: 'true',
        isReadOnlyFiatAmount: 'true', // 锁定金额（URL参数方式）
        themeColor: '4F46E5', // Indigo 主题色（不带#）
      });

      const transakUrl = `${baseUrl}?${params.toString()}`;
      console.log('🔗 Using iframe fallback for Transak (方案2: URL参数):', transakUrl);
      
      // 嵌入 iframe（使用 URL 参数方式）
      if (containerRef.current) {
        // 添加 CSS 样式来尝试禁用金额输入框（备选方案）
        const style = document.createElement('style');
        style.textContent = `
          /* 尝试通过 CSS 禁用 Transak iframe 内的金额输入框 */
          iframe[src*="transak.com"] {
            pointer-events: auto;
          }
        `;
        document.head.appendChild(style);
        
        containerRef.current.innerHTML = `<iframe src="${transakUrl}" style="width: 100%; height: 700px; border: none; border-radius: 8px;" allow="camera; microphone; payment" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"></iframe>`;
        console.log('🔗 Transak iframe URL:', transakUrl);
        console.log('✅ Transak iframe embedded in container');
        
        // 监听 iframe 加载完成
        const iframe = containerRef.current.querySelector('iframe');
        if (iframe) {
          iframe.onload = () => {
            console.log('✅ Transak iframe loaded successfully');
            
            // 尝试通过 postMessage 发送配置（如果 Transak 支持）
            try {
              iframe.contentWindow?.postMessage({
                type: 'TRANSAK_CONFIG',
                config: {
                  disableFiatAmountEditing: true,
                  fiatAmount: amount,
                  isAmountEditable: false,
                }
              }, '*');
              console.log('📤 Sent postMessage to lock amount');
            } catch (e) {
              console.warn('⚠️ Failed to send postMessage:', e);
            }
          };
          
          // 监听来自 iframe 的消息（Transak 通过 postMessage 发送事件）
          const messageHandler = (event: MessageEvent) => {
            // 验证消息来源（Transak 使用多个域名）
            const validOrigins = ['transak.com', 'global.transak.com', 'global-stg.transak.com'];
            const isValidOrigin = validOrigins.some(domain => event.origin.includes(domain));
            if (!isValidOrigin) return;
            
            console.log('📨 Message from Transak iframe:', event.data);
            
            // 处理 Transak 事件
            if (event.data && typeof event.data === 'object') {
              // 触发通用事件回调 - 支持多种事件名称格式
              const eventName = event.data.eventName || event.data.event_id || event.data.type;
              if (eventName) {
                console.log('🎯 Transak event:', eventName, event.data);
                onEvent?.(eventName, event.data);
              }
              
              // 处理各种事件
              switch (eventName) {
                case 'TRANSAK_ORDER_SUCCESSFUL':
                  console.log('✅ Transak order successful via iframe:', event.data);
                  onSuccess?.(event.data);
                  break;
                case 'TRANSAK_ORDER_FAILED':
                  console.error('❌ Transak order failed via iframe:', event.data);
                  onError?.(event.data);
                  break;
                case 'TRANSAK_WIDGET_CLOSE':
                  console.log('🔒 Transak widget closed via iframe');
                  onClose?.();
                  break;
                // 以下事件已通过 onEvent 回调传递，无需额外处理
                case 'TRANSAK_WIDGET_INITIALISED':
                case 'TRANSAK_WIDGET_OPEN':
                case 'TRANSAK_ORDER_CREATED':
                case 'TRANSAK_ORDER_PROCESSING':
                case 'TRANSAK_KYC_INIT':
                case 'TRANSAK_KYC_VERIFIED':
                case 'KYC_INIT':
                case 'KYC_VERIFIED':
                  // 这些事件已通过 onEvent 传递
                  break;
              }
              
              // 处理状态变化（某些事件可能以 status 形式发送）
              if (event.data.status === 'COMPLETED') {
                console.log('✅ Transak order completed via status:', event.data);
                onEvent?.('TRANSAK_ORDER_SUCCESSFUL', event.data);
                onSuccess?.(event.data);
              } else if (event.data.status === 'FAILED') {
                console.error('❌ Transak order failed via status:', event.data);
                onEvent?.('TRANSAK_ORDER_FAILED', event.data);
                onError?.(event.data);
              }
            }
          };
          
          window.addEventListener('message', messageHandler);
          
          // 清理函数（在组件卸载时移除监听器）
          const cleanup = () => {
            window.removeEventListener('message', messageHandler);
          };
          
          // 存储清理函数以便后续使用
          (containerRef.current as any).__transakCleanup = cleanup;
        }
        
        // iframe 已成功嵌入，不触发错误回调
        // 因为 iframe 方式可以正常工作，只是不是通过 SDK
        console.log('✅ Transak iframe fallback activated - no error callback needed');
        iframeFallbackActivated.current = true; // 标记已使用 iframe 备用方案
        return;
      } else {
        // 如果容器不存在，使用新窗口作为最后备用方案
        console.log('⚠️ Container not available, opening in new window');
        const newWindow = window.open(transakUrl, '_blank', 'width=500,height=700');
        
        if (!newWindow) {
          // 如果新窗口也被阻止，才触发错误
          onError?.({ 
            message: `Transak SDK 加载失败，且无法打开新窗口。请检查浏览器弹窗设置。`,
            fallbackToRedirect: true,
            redirectUrl: transakUrl,
          });
        } else {
          // 新窗口已打开，通知父组件但不触发错误
          onError?.({ 
            message: `Transak SDK 加载失败，已在新窗口打开 Transak。`,
            fallbackToRedirect: true,
            redirectUrl: transakUrl,
          });
        }
      }
    };

    document.body.appendChild(script);

    return () => {
      // 清理
      if (widgetRef.current) {
        try {
          widgetRef.current.close();
        } catch (e) {
          // 忽略清理错误
        }
      }
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      // 清理 iframe 消息监听器
      if (containerRef.current && (containerRef.current as any).__transakCleanup) {
        (containerRef.current as any).__transakCleanup();
      }
    };
  }, []);

  // 当 sessionId 准备好后，使用 Create Session API 方式创建 iframe
  useEffect(() => {
    // 如果已经有 iframe，跳过
    if (iframeFallbackActivated.current || !containerRef.current) {
      return;
    }

    // 如果 sessionId 已准备好，使用 sessionId 方式
    if (transakSessionId && !sessionLoading) {
      // 注意：staging-global.transak.com 会重定向到 global-stg.transak.com
      // 直接使用 global-stg.transak.com 避免重定向
      const baseUrl = environment === 'PRODUCTION' 
        ? 'https://global.transak.com'
        : 'https://global-stg.transak.com';
      const transakUrl = `${baseUrl}?apiKey=${apiKey}&sessionId=${transakSessionId}`;
      console.log('🔗 Using iframe with sessionId (方案1: Create Session API):', transakUrl);
      
      if (containerRef.current) {
        containerRef.current.innerHTML = `<iframe src="${transakUrl}" style="width: 100%; height: 700px; border: none; border-radius: 8px;" allow="camera; microphone; payment" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"></iframe>`;
        console.log('✅ Transak iframe embedded with sessionId');
        iframeFallbackActivated.current = true;
        
        // 监听 iframe 消息
        const iframe = containerRef.current.querySelector('iframe');
        if (iframe) {
          iframe.onload = () => {
            console.log('✅ Transak iframe loaded successfully (with sessionId)');
          };
          
          const messageHandler = (event: MessageEvent) => {
            if (!event.origin.includes('transak.com')) return;
            console.log('📨 Message from Transak iframe:', event.data);
            
            if (event.data && typeof event.data === 'object') {
              // 触发通用事件回调
              const eventName = event.data.eventName || event.data.event_id;
              if (eventName) {
                onEvent?.(eventName, event.data);
              }
              
              if (event.data.eventName === 'TRANSAK_ORDER_SUCCESSFUL' || event.data.status === 'COMPLETED') {
                console.log('✅ Transak order successful via iframe:', event.data);
                onEvent?.('TRANSAK_ORDER_SUCCESSFUL', event.data);
                onSuccess?.(event.data);
              } else if (event.data.eventName === 'TRANSAK_ORDER_FAILED' || event.data.status === 'FAILED') {
                console.error('❌ Transak order failed via iframe:', event.data);
                onEvent?.('TRANSAK_ORDER_FAILED', event.data);
                onError?.(event.data);
              } else if (event.data.eventName === 'TRANSAK_WIDGET_CLOSE') {
                console.log('🔒 Transak widget closed via iframe');
                onEvent?.('TRANSAK_WIDGET_CLOSE', event.data);
                onClose?.();
              } else if (event.data.eventName === 'TRANSAK_WIDGET_INITIALISED') {
                onEvent?.('TRANSAK_WIDGET_INITIALISED', event.data);
              } else if (event.data.eventName === 'TRANSAK_WIDGET_OPEN') {
                onEvent?.('TRANSAK_WIDGET_OPEN', event.data);
              } else if (event.data.eventName === 'TRANSAK_ORDER_CREATED') {
                onEvent?.('TRANSAK_ORDER_CREATED', event.data);
              } else if (event.data.eventName === 'TRANSAK_ORDER_PROCESSING') {
                onEvent?.('TRANSAK_ORDER_PROCESSING', event.data);
              }
            }
          };
          
          window.addEventListener('message', messageHandler);
          (containerRef.current as any).__transakCleanup = () => {
            window.removeEventListener('message', messageHandler);
          };
        }
      }
    }
  }, [transakSessionId, sessionLoading, apiKey, environment, onSuccess, onError, onClose]);

  useEffect(() => {
    if (!isLoaded || !containerRef.current) {
      console.log('⏳ 等待 SDK 加载或容器准备...', { isLoaded, hasContainer: !!containerRef.current });
      return;
    }

    console.log('🚀 初始化 Transak Widget...', {
      hasSDK: !!window.TransakSDK,
      containerId: containerRef.current.id || 'no-id',
    });

    // 初始化 Transak Widget
    // 重要：根据 Transak 文档，email 参数会跳过邮箱输入界面
    // 使用 isAutoFillUserData=true 让用户可以编辑
    const transakConfig = {
      apiKey: apiKey,
      environment: environment,
      widgetHeight: '700px',
      widgetWidth: '500px',
      defaultCryptoCurrency: cryptoCurrency,
      defaultFiatCurrency: fiatCurrency,
      // 统一使用 BSC 链
      defaultNetwork: network || 'bsc',
      // 设置金额（包含佣金的总价）
      defaultAmount: amount,
      fiatAmount: amount, // 同时设置 fiatAmount 确保金额锁定
      // 使用分润佣金合约地址，不是用户钱包地址
      // Provider 兑换后自动打入此地址
      walletAddress: walletAddress,
      partnerOrderId: orderId,
      // 邮箱配置：如果有邮箱则自动填充，但让用户可以编辑
      // 注意：根据 Transak 文档，传入 email 会跳过邮箱输入界面
      // 如果希望用户能编辑，需要设置 isAutoFillUserData: true
      ...(email && { email: email }),
      isAutoFillUserData: true, // 允许用户编辑预填的信息（包括邮箱）
      redirectURL: `${window.location.origin}/payment/callback`,
      // Transak 白标集成配置
      // 注意：KYC 是 Transak 强制要求的，无法完全跳过
      // 但在 staging 环境，KYC 会自动通过（测试特性）
      // 在 production 环境，用户必须完成真实 KYC
      hideMenu: true, // 隐藏菜单
      disableWalletAddressForm: true, // 禁用钱包地址表单（已设置 walletAddress）
      disableFiatAmountEditing: true, // 锁定金额，不允许修改
      // 主题配置
      themeColor: '#4F46E5', // Indigo 主题色
      // 语言
      language: 'zh-CN',
      // 重要：指定容器 ID，让 Widget 嵌入到我们的 UI 中
      containerId: containerRef.current.id || 'transak-widget-container',
    };

    // 创建 Transak Widget 实例
    if (window.TransakSDK) {
      try {
        console.log('📦 创建 Transak Widget 实例...', transakConfig);
        widgetRef.current = new window.TransakSDK(transakConfig);

        // 监听事件
        widgetRef.current.on('TRANSAK_WIDGET_INITIALISED', (data: any) => {
          console.log('🔧 Transak widget initialised:', data);
          onEvent?.('TRANSAK_WIDGET_INITIALISED', data);
        });
        
        widgetRef.current.on('TRANSAK_WIDGET_OPEN', (data: any) => {
          console.log('📖 Transak widget open:', data);
          onEvent?.('TRANSAK_WIDGET_OPEN', data);
        });
        
        widgetRef.current.on('TRANSAK_ORDER_CREATED', (orderData: any) => {
          console.log('📝 Transak order created:', orderData);
          onEvent?.('TRANSAK_ORDER_CREATED', orderData);
        });
        
        widgetRef.current.on('TRANSAK_ORDER_PROCESSING', (orderData: any) => {
          console.log('⏳ Transak order processing:', orderData);
          onEvent?.('TRANSAK_ORDER_PROCESSING', orderData);
        });

        widgetRef.current.on('TRANSAK_ORDER_SUCCESSFUL', (orderData: any) => {
          console.log('✅ Transak order successful:', orderData);
          onEvent?.('TRANSAK_ORDER_SUCCESSFUL', orderData);
          onSuccess?.(orderData);
        });

        widgetRef.current.on('TRANSAK_ORDER_FAILED', (errorData: any) => {
          console.error('❌ Transak order failed:', errorData);
          onEvent?.('TRANSAK_ORDER_FAILED', errorData);
          onError?.(errorData);
        });

        widgetRef.current.on('TRANSAK_WIDGET_CLOSE', () => {
          console.log('🔒 Transak widget closed');
          onEvent?.('TRANSAK_WIDGET_CLOSE', null);
          onClose?.();
        });

        // 渲染 Widget 到容器中
        console.log('🎨 渲染 Transak Widget 到容器...', containerRef.current);
        widgetRef.current.init();
        console.log('✅ Transak Widget 初始化完成');
      } catch (error) {
        console.error('❌ Transak Widget 初始化失败:', error);
        onError?.({ 
          message: `Transak Widget 初始化失败: ${error instanceof Error ? error.message : '未知错误'}`,
          code: 'WIDGET_INIT_FAILED',
        });
      }
    } else {
      console.error('❌ window.TransakSDK 不存在，无法初始化 Widget');
      onError?.({ 
        message: 'Transak SDK 未加载，无法初始化 Widget',
        code: 'SDK_NOT_LOADED',
      });
    }
  }, [isLoaded, apiKey, environment, amount, fiatCurrency, cryptoCurrency, network, walletAddress, orderId, email, directPayment, onSuccess, onError, onClose, onEvent]);

  return (
    <div ref={containerRef} className="transak-widget-container">
      {/* Transak Widget 会在这里渲染 */}
    </div>
  );
}

// 扩展 Window 类型以包含 Transak SDK
declare global {
  interface Window {
    TransakSDK: any;
  }
}

/**
 * 使用 Transak Redirect 方式（替代方案）
 * 如果不想使用 Widget，可以使用重定向方式
 */
export function useTransakRedirect() {
  const openTransak = (config: {
    apiKey: string;
    environment?: 'STAGING' | 'PRODUCTION';
    amount?: number;
    fiatCurrency?: string;
    cryptoCurrency?: string;
    walletAddress?: string;
    orderId?: string;
    email?: string;
  }) => {
    const baseUrl = config.environment === 'PRODUCTION' 
      ? 'https://global.transak.com'
      : 'https://global-stg.transak.com';

    const params = new URLSearchParams({
      apiKey: config.apiKey,
      defaultCryptoCurrency: config.cryptoCurrency || 'USDC',
      defaultFiatCurrency: config.fiatCurrency || 'USD',
      ...(config.amount && { defaultAmount: config.amount.toString() }),
      ...(config.walletAddress && { walletAddress: config.walletAddress }),
      ...(config.orderId && { partnerOrderId: config.orderId }),
      ...(config.email && { email: config.email }),
      redirectURL: `${window.location.origin}/payment/callback`,
    });

    window.open(`${baseUrl}?${params.toString()}`, '_blank');
  };

  return { openTransak };
}

