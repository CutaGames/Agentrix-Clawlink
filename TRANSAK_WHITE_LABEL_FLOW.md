# Transak White Label 支付流程详解

**日期**: 2025-01-XX  
**版本**: V7.0

---

## 📊 完整流程图

```
用户进入支付页面
    ↓
SmartCheckout 组件初始化
    ↓
执行 Pre-Flight Check
    ↓
路由决策：选择 provider 路由
    ↓
自动打开 TransakWhiteLabelModal（白标弹窗）
    ↓
显示介绍页面（intro view）
    ↓
用户点击"开始 Agentrix Pay 流程"
    ↓
切换到 Widget 视图（widget view）
    ↓
TransakWidget 组件初始化
    ↓
创建 Transak Session（后端 API）
    ↓
加载 Transak Widget（SDK 或 iframe）
    ↓
用户在 Widget 中完成支付
    ↓
Transak 处理支付（法币 → USDC）
    ↓
支付成功回调
    ↓
记录支付状态（后端）
    ↓
关闭弹窗，显示成功
```

---

## 🔄 详细流程步骤

### 阶段 1: 支付入口和路由决策

#### 1.1 用户进入支付页面
**位置**: `SmartCheckout.tsx`

```typescript
// 用户打开支付弹窗，传入订单信息
<SmartCheckout 
  order={{
    id: "order-123",
    amount: 100,
    currency: "CNY",
    description: "商品购买",
    merchantId: "merchant-456",
    metadata: {
      merchantPaymentConfig: "both", // 或 "fiat_only" | "crypto_only"
      userCountry: "CN",
      merchantCountry: "US",
    }
  }}
  onSuccess={handleSuccess}
  onCancel={handleCancel}
/>
```

#### 1.2 执行 Pre-Flight Check
**位置**: `SmartCheckout.tsx:195-311`

```typescript
// 1. 加载用户信息（检查 KYC 状态）
const profile = await userApi.getProfile();
setUserProfile(profile);

// 2. 加载活跃 Session（如果已连接钱包）
if (isConnected) {
  const session = await loadActiveSession();
  setCurrentSession(session);
}

// 3. 执行 Pre-Flight Check
const result = await paymentApi.preflightCheck({
  amount: order.amount.toString(),
  currency: order.currency || 'USDC',
});
```

**Pre-Flight Check 返回**:
```typescript
{
  recommendedRoute: 'provider', // 或 'quickpay' | 'wallet'
  quickPayAvailable: false,
  requiresKYC: true,
  providerOptions: [
    {
      id: 'google',
      name: 'Google Pay',
      price: 102.9, // 含手续费
      currency: 'CNY',
      requiresKYC: true,
      provider: 'transak',
      fee: 2.9, // 总手续费
      providerFee: 2.5, // Provider 费用
      agentrixFee: 0.4, // Agentrix 平台费用
      commissionContractAddress: '0x...', // 分润佣金合约地址
      minAmount: 20, // 最低兑换金额（USD）
      available: true, // 是否可用
    },
    // ... 其他选项（apple, card, local）
  ]
}
```

#### 1.3 路由决策
**位置**: `SmartCheckout.tsx:243-285`

```typescript
// 路由选择逻辑：
// 1. 如果有 QuickPay Session 且限额内 → quickpay
// 2. 如果用户有钱包 → wallet
// 3. 如果用户没有钱包 → provider (Transak)

if (quickPayEligible) {
  setRouteType('quickpay');
} else if (hasWallet) {
  setRouteType('wallet');
} else {
  setRouteType('provider'); // 👈 走 Transak 通路
}
```

#### 1.4 自动打开 Transak 弹窗
**位置**: `SmartCheckout.tsx:1152-1157`

```typescript
// 当路由为 provider 时，自动打开 Transak Widget
useEffect(() => {
  if (routeType === 'provider' && status === 'ready' && !providerModalAutoOpened.current) {
    providerModalAutoOpened.current = true;
    setShowProviderModal(true); // 👈 打开 TransakWhiteLabelModal
  }
}, [routeType, status]);
```

---

### 阶段 2: Transak 白标弹窗

#### 2.1 显示介绍页面（Intro View）
**位置**: `TransakWhiteLabelModal.tsx:250-283`

**显示内容**:
- ✅ 支付摘要（金额、币种、描述）
- ✅ 支付渠道信息（Google Pay / Apple Pay / 银行卡）
- ✅ 预计到账时间
- ✅ 手续费明细
- ✅ 合规支持说明（Powered by Transak）
- ✅ KYC 状态提示
- ✅ 亮点介绍（合规、白标体验、多种支付方式、实时到账）

**用户操作**:
- 点击"开始 Agentrix Pay 流程" → 切换到 Widget 视图
- 点击"返回其他支付方式" → 关闭弹窗

#### 2.2 切换到 Widget 视图
**位置**: `TransakWhiteLabelModal.tsx:132-135`

```typescript
const handleStart = () => {
  setErrorMessage(null);
  setView('widget'); // 👈 切换到 Widget 视图
};
```

---

### 阶段 3: Transak Widget 初始化

#### 3.1 TransakWidget 组件初始化
**位置**: `TransakWidget.tsx:42-105`

**接收参数**:
```typescript
{
  apiKey: process.env.NEXT_PUBLIC_TRANSAK_API_KEY,
  environment: 'STAGING' | 'PRODUCTION',
  amount: providerOption?.price || order.amount, // 含手续费的总金额
  fiatCurrency: providerOption?.currency || order.currency || 'USD',
  cryptoCurrency: "USDC", // 固定
  network: "bsc", // 固定 BSC 链
  walletAddress: commissionContractAddress, // 分润佣金合约地址
  orderId: order.id,
  userId: userProfile?.id,
  email: userProfile?.email,
  directPayment: !needsKYC, // 如果已 KYC，直接支付
}
```

#### 3.2 创建 Transak Session（方案 1：推荐）
**位置**: `TransakWidget.tsx:63-105`

```typescript
// 方案 1：使用 Create Session API（推荐）
const createSession = async () => {
  setSessionLoading(true);
  try {
    const result = await paymentApi.createTransakSession({
      amount,
      fiatCurrency: fiatCurrency || 'USD',
      cryptoCurrency: cryptoCurrency || 'USDC',
      network: network || 'bsc',
      walletAddress, // 分润佣金合约地址
      orderId,
      email,
      redirectURL: `${window.location.origin}/payment/callback`,
      hideMenu: true, // 隐藏 Transak 菜单
      disableWalletAddressForm: true, // 禁用钱包地址输入（已锁定）
      disableFiatAmountEditing: true, // 禁用金额编辑（已锁定）
      isKYCRequired: !directPayment, // 如果 directPayment=false，需要 KYC
    });
    
    setTransakSessionId(result.sessionId);
  } catch (error) {
    // 如果 Create Session API 失败，回退到方案 2
    setTransakSessionId(null);
  }
};
```

**后端处理** (`payment.controller.ts:127-174`):
```typescript
@Post('provider/transak/session')
async createTransakSession(@Request() req, @Body() dto) {
  const transakProvider = this.providerManagerService.getOnRampProviders()
    .find(p => p.id === 'transak');
  
  const user = req.user;
  const frontendUrl = this.configService.get<string>('FRONTEND_URL');
  
  return transakProvider.createSession({
    amount: dto.amount,
    fiatCurrency: dto.fiatCurrency,
    cryptoCurrency: dto.cryptoCurrency || 'USDC',
    network: dto.network || 'bsc',
    walletAddress: dto.walletAddress, // 分润佣金合约地址
    orderId: dto.orderId,
    userId: user.id, // 从 req.user 获取
    email: dto.email || user.email, // 优先使用传入值
    redirectURL: dto.redirectURL || `${frontendUrl}/payment/callback`,
    hideMenu: dto.hideMenu !== undefined ? dto.hideMenu : true,
    disableWalletAddressForm: dto.disableWalletAddressForm !== undefined ? dto.disableWalletAddressForm : true,
    disableFiatAmountEditing: dto.disableFiatAmountEditing !== undefined ? dto.disableFiatAmountEditing : true,
    isKYCRequired: dto.isKYCRequired !== undefined ? dto.isKYCRequired : true,
  });
}
```

**Transak Provider 服务** (`transak-provider.service.ts:241-405`):
```typescript
async createSession(params) {
  // 1. 构建 widgetParams（这些参数会在 Session 创建时锁定）
  const widgetParams = {
    referrerDomain: referrerDomain,
    fiatAmount: params.amount.toString(),
    fiatCurrency: params.fiatCurrency,
    cryptoCurrencyCode: params.cryptoCurrency,
    network: params.network,
    walletAddress: params.walletAddress, // 👈 分润佣金合约地址
    partnerOrderId: params.orderId,
    email: params.email,
    redirectURL: params.redirectURL,
    hideMenu: params.hideMenu.toString(),
    disableWalletAddressForm: params.disableWalletAddressForm.toString(),
    disableFiatAmountEditing: params.disableFiatAmountEditing.toString(),
    isKYCRequired: params.isKYCRequired.toString(),
  };
  
  // 2. 调用 Transak Create Session API
  const response = await https.request({
    url: 'https://api.transak.com/auth/public/v2/session',
    method: 'POST',
    headers: {
      'access-token': accessToken, // Transak API Key
      'content-type': 'application/json',
    },
    body: JSON.stringify({ widgetParams }),
  });
  
  // 3. 返回 sessionId 和 widgetUrl
  return {
    sessionId: response.data.sessionId,
    widgetUrl: response.data.widgetUrl,
  };
}
```

#### 3.3 加载 Transak Widget
**位置**: `TransakWidget.tsx:107-460`

**方案 1：使用 Session ID（推荐）**
```typescript
// 如果有 sessionId，使用 iframe 加载 Widget
if (transakSessionId) {
  const widgetUrl = `https://global.transak.com?sessionId=${transakSessionId}`;
  
  // 创建 iframe
  const iframe = document.createElement('iframe');
  iframe.src = widgetUrl;
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.border = 'none';
  containerRef.current.appendChild(iframe);
  
  // 监听 iframe 消息
  window.addEventListener('message', (event) => {
    if (event.data.eventName === 'TRANSAK_ORDER_SUCCESSFUL') {
      onSuccess?.(event.data);
    }
  });
}
```

**方案 2：使用 SDK（回退方案）**
```typescript
// 如果没有 sessionId，使用 Transak SDK
if (window.TransakSDK) {
  const widget = new window.TransakSDK({
    apiKey: apiKey,
    environment: environment,
    fiatAmount: amount,
    fiatCurrency: fiatCurrency,
    cryptoCurrencyCode: cryptoCurrency,
    network: network,
    walletAddress: walletAddress, // 分润佣金合约地址
    partnerOrderId: orderId,
    email: email,
    // ... 其他配置
  });
  
  widget.on('TRANSAK_ORDER_SUCCESSFUL', (orderData) => {
    onSuccess?.(orderData);
  });
  
  widget.init();
}
```

---

### 阶段 4: 用户完成支付

#### 4.1 用户在 Widget 中操作
1. **KYC 验证**（如果需要）:
   - 上传身份证/护照
   - 人脸识别
   - 地址证明

2. **选择支付方式**:
   - Google Pay
   - Apple Pay
   - 银行卡（Visa/MasterCard）
   - 本地银行卡

3. **完成支付**:
   - 输入支付信息
   - 确认支付
   - Transak 处理法币 → USDC 转换

#### 4.2 Transak 处理支付
- Transak 接收法币支付
- 转换为 USDC（BSC 链）
- **直接打入分润佣金合约地址**（不是用户钱包）
- 生成交易哈希（transactionHash）

---

### 阶段 5: 支付成功回调

#### 5.1 Widget 触发成功事件
**位置**: `TransakWidget.tsx:435-450`

```typescript
// 监听 iframe 消息
window.addEventListener('message', (event) => {
  if (event.data.eventName === 'TRANSAK_ORDER_SUCCESSFUL' || 
      event.data.status === 'COMPLETED') {
    console.log('✅ Transak order successful:', event.data);
    onSuccess?.(event.data); // 👈 触发成功回调
  }
});

// 或 SDK 事件
widget.on('TRANSAK_ORDER_SUCCESSFUL', (orderData) => {
  onSuccess?.(orderData); // 👈 触发成功回调
});
```

**回调数据** (`transakData`):
```typescript
{
  orderId: "transak-order-123",
  status: "COMPLETED",
  transactionHash: "0x...",
  cryptoAmount: "100.0",
  cryptoCurrency: "USDC",
  fiatAmount: "700.0",
  fiatCurrency: "CNY",
  walletAddress: "0x...", // 分润佣金合约地址
  // ... 其他数据
}
```

#### 5.2 TransakWhiteLabelModal 处理成功回调
**位置**: `TransakWhiteLabelModal.tsx:137-169`

```typescript
const handleTransakSuccess = async (transakData: any) => {
  try {
    setIsRecording(true);
    
    // 调用后端 API 记录支付
    const result = await paymentApi.process({
      amount: order.amount, // 原始订单金额
      currency: order.currency, // 原始订单币种
      paymentMethod: 'transak',
      merchantId: order.merchantId,
      description: order.description,
      metadata: {
        provider: 'transak',
        transakOrderId: transakData?.orderId, // Transak 订单 ID
        transactionHash: transakData?.transactionHash, // 链上交易哈希
        quote: providerOption, // Provider 报价信息
        widgetPayload: transakData, // 完整的 Transak 回调数据
      },
    });
    
    setIsRecording(false);
    if (onSuccess) {
      onSuccess(result); // 👈 通知 SmartCheckout 支付成功
    }
    onClose(); // 👈 关闭弹窗
  } catch (error) {
    // 错误处理
    setErrorMessage(error.message);
    if (onError) {
      onError(error.message);
    }
  }
};
```

#### 5.3 后端处理支付记录
**位置**: `payment.service.ts:618-636`

```typescript
else if (dto.paymentMethod === PaymentMethod.TRANSAK) {
  // Transak 支付处理（通过 Widget 在前端完成，等待 Webhook 回调）
  // 如果已经有 transakOrderId，说明前端已经创建了订单
  if (dto.metadata?.transakOrderId) {
    savedPayment.status = PaymentStatus.PROCESSING;
    savedPayment.metadata = {
      ...savedPayment.metadata,
      provider: 'transak',
      transakOrderId: dto.metadata.transakOrderId,
      transactionHash: dto.metadata.transactionHash,
    };
  } else {
    // 创建支付记录，等待 Transak Widget 完成支付后通过 Webhook 更新
    savedPayment.status = PaymentStatus.PENDING;
    savedPayment.metadata = {
      ...savedPayment.metadata,
      provider: 'transak',
      waitingForTransak: true,
    };
  }
}
```

---

### 阶段 6: Webhook 回调（可选）

#### 6.1 Transak Webhook 回调
**位置**: `transak-webhook.controller.ts`

```typescript
@Post('webhook')
async handleWebhook(@Req() req, @Body() body) {
  const {
    eventType, // 'ORDER_COMPLETED' | 'ORDER_FAILED'
    status, // 'COMPLETED' | 'FAILED'
    orderId, // Transak 订单 ID
    partnerOrderId, // 我们的订单 ID
    transactionHash, // 链上交易哈希
    cryptoAmount,
    cryptoCurrency,
    fiatAmount,
    fiatCurrency,
    walletAddress, // 分润佣金合约地址
  } = body;
  
  // 1. 验证签名（如果配置了）
  // 2. 查找支付记录（通过 partnerOrderId 或 orderId）
  // 3. 更新支付状态
  if (status === 'COMPLETED') {
    payment.status = PaymentStatus.COMPLETED;
    payment.transactionHash = transactionHash;
    await this.paymentRepository.save(payment);
  }
  
  return { success: true };
}
```

---

## 🔑 关键设计点

### 1. 白标体验
- ✅ **全程保持 Agentrix 品牌界面**
- ✅ 用户无需离开 Agentrix 网站
- ✅ Transak Widget 嵌入在 Agentrix 弹窗中
- ✅ 隐藏 Transak 菜单（`hideMenu: true`）

### 2. 金额和地址锁定
- ✅ **金额锁定**: `disableFiatAmountEditing: true`
- ✅ **钱包地址锁定**: `disableWalletAddressForm: true`
- ✅ **目标地址**: 分润佣金合约地址（不是用户钱包）
- ✅ **目标币种**: USDC（BSC 链）

### 3. 资金流向
```
用户法币支付
    ↓
Transak 处理（法币 → USDC）
    ↓
直接打入分润佣金合约地址
    ↓
合约自动分润
    ↓
商家收到 USDC（或通过 Off-ramp 转换为法币）
```

### 4. KYC 处理
- ✅ **已 KYC 用户**: `directPayment: true`，跳过 KYC 步骤
- ✅ **未 KYC 用户**: `directPayment: false`，需要完成 KYC
- ✅ KYC 状态从 `userProfile.kycLevel` 获取

### 5. 错误处理
- ✅ **Session 创建失败**: 回退到 SDK 方式
- ✅ **SDK 加载失败**: 回退到 iframe 方式
- ✅ **支付失败**: 显示错误信息，允许重试
- ✅ **记录失败**: 显示警告，但支付已成功

---

## 📋 数据流总结

### 前端数据流
```
SmartCheckout
  └─> preflightCheck() 
      └─> providerOptions (含 commissionContractAddress)
          └─> TransakWhiteLabelModal
              └─> TransakWidget
                  └─> createTransakSession()
                      └─> 加载 Widget
                          └─> 支付成功
                              └─> handleTransakSuccess()
                                  └─> paymentApi.process()
```

### 后端数据流
```
payment.controller.ts
  └─> createTransakSession()
      └─> transakProvider.createSession()
          └─> Transak Create Session API
              └─> 返回 sessionId 和 widgetUrl

payment.service.ts
  └─> processPayment()
      └─> 记录支付状态 (PROCESSING)
          └─> 等待 Webhook 或手动确认
              └─> 更新状态为 COMPLETED
```

---

## ✅ 流程检查清单

- [x] Pre-Flight Check 返回 `commissionContractAddress`
- [x] `TransakWhiteLabelModal` 正确显示介绍页面
- [x] 用户点击开始后切换到 Widget 视图
- [x] `TransakWidget` 创建 Session 成功
- [x] Widget 正确加载（SDK 或 iframe）
- [x] 用户完成支付后触发成功回调
- [x] 支付记录正确保存到后端
- [x] Webhook 回调正确处理（如果配置）

---

## 🚀 优化建议

1. **缓存 Session**: 考虑缓存已创建的 Session，避免重复创建
2. **状态轮询**: 如果 Webhook 不可用，添加状态轮询机制
3. **错误重试**: 添加自动重试机制（Session 创建失败时）
4. **用户体验**: 添加支付进度提示（KYC → 支付 → 确认）

---

**文档更新时间**: 2025-01-XX  
**版本**: V7.0

