# Transak 前端集成指南

## 安装依赖

Transak 提供两种集成方式：
1. **SDK 方式**（推荐）- 在页面中嵌入 Widget
2. **Redirect 方式** - 重定向到 Transak 页面

### SDK 方式（无需安装，动态加载）

SDK 会动态加载，无需 npm 安装。

### 如果使用 npm 包（可选）

```bash
npm install @transak/transak-sdk
```

## 基础集成

### 1. 使用 TransakWidget 组件

```tsx
import { TransakWidget } from '../components/payment/TransakWidget';

function PaymentPage() {
  const handleSuccess = (data: any) => {
    console.log('Payment successful:', data);
    // 处理支付成功
  };

  const handleError = (error: any) => {
    console.error('Payment failed:', error);
    // 处理支付错误
  };

  return (
    <div>
      <TransakWidget
        apiKey={process.env.NEXT_PUBLIC_TRANSAK_API_KEY || ''}
        environment={process.env.NEXT_PUBLIC_TRANSAK_ENVIRONMENT as 'STAGING' | 'PRODUCTION' || 'STAGING'}
        amount={100}
        fiatCurrency="USD"
        cryptoCurrency="USDC"
        walletAddress="0x..."
        orderId="order_123"
        userId="user_123"
        email="user@example.com"
        onSuccess={handleSuccess}
        onError={handleError}
        onClose={() => console.log('Widget closed')}
      />
    </div>
  );
}
```

### 2. 使用 Redirect 方式

```tsx
import { useTransakRedirect } from '../components/payment/TransakWidget';

function PaymentPage() {
  const { openTransak } = useTransakRedirect();

  const handleBuyCrypto = () => {
    openTransak({
      apiKey: process.env.NEXT_PUBLIC_TRANSAK_API_KEY || '',
      environment: 'STAGING',
      amount: 100,
      fiatCurrency: 'USD',
      cryptoCurrency: 'USDC',
      walletAddress: '0x...',
      orderId: 'order_123',
    });
  };

  return (
    <button onClick={handleBuyCrypto}>
      使用 Transak 购买加密货币
    </button>
  );
}
```

## 集成到支付流程

### 在 PaymentContext 中添加 Transak 支持

更新 `frontend/contexts/PaymentContext.tsx`：

```tsx
// 在 PaymentMethod 类型中添加 transak
const transakMethod: PaymentMethod = {
  type: 'transak',
  name: 'Transak',
  icon: '💳',
  description: '使用银行卡购买加密货币',
  fee: '1.5%',
};
```

### 在支付选择界面添加 Transak 选项

```tsx
import { TransakWidget } from '../components/payment/TransakWidget';

function PaymentMethodSelector({ onSelect }: { onSelect: (method: string) => void }) {
  const [showTransak, setShowTransak] = useState(false);

  return (
    <div>
      <button onClick={() => setShowTransak(true)}>
        使用 Transak 购买加密货币
      </button>

      {showTransak && (
        <TransakWidget
          apiKey={process.env.NEXT_PUBLIC_TRANSAK_API_KEY || ''}
          environment="STAGING"
          onSuccess={(data) => {
            // 处理成功，通知支付上下文
            onSelect('transak');
            setShowTransak(false);
          }}
          onError={(error) => {
            console.error('Transak error:', error);
            setShowTransak(false);
          }}
          onClose={() => setShowTransak(false)}
        />
      )}
    </div>
  );
}
```

## 处理支付回调

### 创建回调页面

创建 `frontend/pages/payment/callback.tsx`：

```tsx
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function PaymentCallback() {
  const router = useRouter();

  useEffect(() => {
    // 从 URL 参数中获取订单信息
    const { orderId, status, transactionHash } = router.query;

    if (status === 'success' || status === 'completed') {
      // 支付成功，跳转到成功页面
      router.push(`/payment/success?orderId=${orderId}&txHash=${transactionHash}`);
    } else {
      // 支付失败，跳转到失败页面
      router.push(`/payment/failed?orderId=${orderId}`);
    }
  }, [router.query]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-4">处理支付结果...</p>
      </div>
    </div>
  );
}
```

## 环境变量配置

在 `frontend/.env.local` 中添加：

```env
NEXT_PUBLIC_TRANSAK_API_KEY=your_transak_api_key_here
NEXT_PUBLIC_TRANSAK_ENVIRONMENT=STAGING  # 或 PRODUCTION
```

## 自定义样式

Transak Widget 支持主题自定义：

```tsx
<TransakWidget
  // ... 其他配置
  themeColor="#000000"  // 主题颜色
  language="zh-CN"      // 语言
/>
```

## 完整示例

查看 `frontend/components/payment/TransakWidget.tsx` 获取完整实现。

## 下一步

- 参考 [Transak 测试指南](./TRANSAK测试指南.md) 进行测试
- 查看 [Transak 官方文档](https://docs.transak.com/docs) 了解更多配置选项

