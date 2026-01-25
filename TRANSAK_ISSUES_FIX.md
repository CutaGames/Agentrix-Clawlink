# Transak 集成问题诊断与修复方案

**日期**: 2025-01-XX  
**问题**: Transak Session 创建失败和 Widget 加载失败

---

## 🔴 问题分析

### 问题 1: 后端 AggregateError

**错误信息**:
```
[Nest] ERROR [TransakProviderService] Transak: Request error: AggregateError
[Nest] ERROR [TransakProviderService] Transak: Error setting up request: AggregateError
```

**可能原因**:
1. 网络连接问题（无法连接到 `api.transak.com`）
2. DNS 解析失败
3. 防火墙/代理阻止
4. API Key 配置错误
5. 请求超时

### 问题 2: 前端环境配置不匹配

**发现**:
- 后端: `Environment=PRODUCTION`，使用 `https://api.transak.com`
- 前端: 默认 `STAGING`，使用 `https://staging-global.transak.com`
- **环境不匹配导致前端无法正确加载 Widget**

### 问题 3: SDK 加载失败

**错误信息**:
```
GET https://staging-global.transak.com/sdk/v1.1.js net::ERR_FAILED 301 (Moved Permanently)
Access to script at 'https://staging-global.transak.com/sdk/v1.1.js' from origin 'http://localhost:3000' has been blocked by CORS policy
HEAD https://global-stg.transak.com/sdk/v1.1.js net::ERR_TIMED_OUT
```

**可能原因**:
1. SDK URL 不正确（301 重定向）
2. CORS 策略阻止
3. 网络超时
4. 地理位置限制

---

## ✅ 已实施的修复

### 1. 后端错误处理增强 ✅

**文件**: `backend/src/modules/payment/transak-provider.service.ts`

**修复内容**:
- ✅ 添加 `AggregateError` 详细处理
- ✅ 提取并记录所有子错误信息
- ✅ 增加超时时间（10秒 → 30秒）
- ✅ 添加网络错误类型识别（ENOTFOUND, ECONNREFUSED, ETIMEDOUT）
- ✅ 改进错误消息，提供更清晰的诊断信息

**代码位置**: `transak-provider.service.ts:359-404`

### 2. commissionContractAddress Fallback ✅

**文件**: `frontend/components/payment/TransakWhiteLabelModal.tsx`

**修复内容**:
- ✅ 添加 `useState` 管理 `commissionContractAddress`
- ✅ 添加 `useEffect` 在 Widget 视图时从后端获取合约地址
- ✅ 监听 `providerOption` 变化，自动更新地址

**代码位置**: `TransakWhiteLabelModal.tsx:70-99`

---

## 🔧 需要手动修复的问题

### 1. 环境配置统一 ⚠️

**问题**: 前后端环境配置不一致

**解决方案**:

#### 方案 A: 统一使用 STAGING（推荐用于开发）

**后端环境变量** (`backend/.env`):
```env
TRANSAK_ENVIRONMENT=STAGING
TRANSAK_API_KEY_STAGING=your_staging_api_key
# 或
TRANSAK_API_KEY=your_staging_api_key
```

**前端环境变量** (`frontend/.env.local`):
```env
NEXT_PUBLIC_TRANSAK_ENVIRONMENT=STAGING
NEXT_PUBLIC_TRANSAK_API_KEY=your_staging_api_key
```

#### 方案 B: 统一使用 PRODUCTION（用于生产）

**后端环境变量** (`backend/.env`):
```env
TRANSAK_ENVIRONMENT=PRODUCTION
TRANSAK_API_KEY_PRODUCTION=your_production_api_key
# 或
TRANSAK_API_KEY=your_production_api_key
```

**前端环境变量** (`frontend/.env.local`):
```env
NEXT_PUBLIC_TRANSAK_ENVIRONMENT=PRODUCTION
NEXT_PUBLIC_TRANSAK_API_KEY=your_production_api_key
```

### 2. 网络连接问题排查 ⚠️

**检查清单**:
- [ ] 检查网络连接（能否访问 `api.transak.com`）
- [ ] 检查防火墙/代理设置
- [ ] 检查 DNS 解析（`nslookup api.transak.com`）
- [ ] 检查 VPN 是否影响连接
- [ ] 检查地理位置限制（某些地区可能无法访问）

**测试命令**:
```bash
# 测试 API 连接
curl -I https://api.transak.com/auth/public/v2/session

# 测试 Staging API
curl -I https://api-staging.transak.com/auth/public/v2/session

# 测试 DNS 解析
nslookup api.transak.com
nslookup staging-global.transak.com
```

### 3. API Key 验证 ⚠️

**检查清单**:
- [ ] 确认 API Key 是否正确
- [ ] 确认 API Key 是否与环境匹配（STAGING vs PRODUCTION）
- [ ] 确认 API Key 是否有效（未过期、未撤销）
- [ ] 确认 API Key 权限（是否有 Create Session 权限）

**验证方法**:
```bash
# 使用 curl 测试 API Key
curl -X POST https://api-staging.transak.com/auth/public/v2/session \
  -H "access-token: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"widgetParams": {"referrerDomain": "localhost:3000", "fiatAmount": "100", "fiatCurrency": "USD", "cryptoCurrencyCode": "USDC"}}'
```

---

## 🛠️ 建议的改进

### 1. 添加环境配置验证

**后端**: 在服务启动时验证环境配置
```typescript
// 在 transak-provider.service.ts 构造函数中添加
if (!this.apiKey) {
  this.logger.warn('⚠️ Transak API Key not configured. Transak features will be disabled.');
}
if (this.environment === 'PRODUCTION' && !this.apiKey.includes('prod')) {
  this.logger.warn('⚠️ Using PRODUCTION environment but API Key may be for STAGING.');
}
```

**前端**: 在组件加载时验证环境配置
```typescript
// 在 TransakWidget.tsx 中添加
useEffect(() => {
  if (!apiKey) {
    console.error('❌ Transak API Key not configured');
    onError?.({ message: 'Transak API Key not configured', code: 'MISSING_API_KEY' });
  }
  if (environment === 'PRODUCTION' && apiKey.includes('staging')) {
    console.warn('⚠️ Environment mismatch: PRODUCTION with staging API Key');
  }
}, [apiKey, environment]);
```

### 2. 添加重试机制

**后端**: 添加请求重试
```typescript
// 在 createSession 方法中添加重试逻辑
let retries = 3;
let lastError: Error | null = null;

while (retries > 0) {
  try {
    const data = await new Promise<any>((resolve, reject) => {
      // ... 请求逻辑
    });
    return data;
  } catch (error) {
    lastError = error;
    retries--;
    if (retries > 0) {
      this.logger.warn(`Transak: Request failed, retrying... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒后重试
    }
  }
}
throw lastError;
```

### 3. 添加健康检查端点

**后端**: 添加 Transak 连接健康检查
```typescript
@Get('provider/transak/health')
async checkTransakHealth() {
  try {
    // 尝试连接 Transak API
    const response = await axios.get(`${this.baseUrl}/health`, {
      timeout: 5000,
    });
    return {
      status: 'healthy',
      environment: this.environment,
      baseUrl: this.baseUrl,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      environment: this.environment,
      baseUrl: this.baseUrl,
      error: error.message,
    };
  }
}
```

---

## 📋 修复步骤

### 步骤 1: 统一环境配置

1. **检查后端环境变量**:
   ```bash
   cd backend
   cat .env | grep TRANSAK
   ```

2. **检查前端环境变量**:
   ```bash
   cd frontend
   cat .env.local | grep TRANSAK
   ```

3. **统一配置**:
   - 如果后端是 `PRODUCTION`，前端也设置为 `PRODUCTION`
   - 如果后端是 `STAGING`，前端也设置为 `STAGING`

### 步骤 2: 验证 API Key

1. **确认 API Key 正确**:
   - 登录 Transak Dashboard
   - 检查 API Key 是否有效
   - 确认 API Key 与环境匹配

2. **测试 API Key**:
   ```bash
   # 使用 curl 测试
   curl -X POST https://api-staging.transak.com/auth/public/v2/session \
     -H "access-token: YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"widgetParams": {"referrerDomain": "localhost:3000", "fiatAmount": "100", "fiatCurrency": "USD", "cryptoCurrencyCode": "USDC"}}'
   ```

### 步骤 3: 测试网络连接

1. **测试 API 连接**:
   ```bash
   curl -I https://api.transak.com
   curl -I https://api-staging.transak.com
   ```

2. **测试 Widget URL**:
   ```bash
   curl -I https://global.transak.com
   curl -I https://staging-global.transak.com
   ```

### 步骤 4: 重启服务

1. **重启后端**:
   ```bash
   cd backend
   npm run start:dev
   ```

2. **重启前端**:
   ```bash
   cd frontend
   npm run dev
   ```

### 步骤 5: 测试完整流程

1. 打开支付页面
2. 选择 Provider 支付方式
3. 检查后端日志（应该看到详细的错误信息）
4. 检查前端控制台（应该看到环境配置信息）

---

## 🔍 调试技巧

### 1. 查看详细错误信息

**后端日志**:
```bash
# 查看后端日志，应该能看到详细的错误信息
tail -f backend/logs/app.log | grep Transak
```

**前端控制台**:
- 打开浏览器开发者工具
- 查看 Console 标签
- 查看 Network 标签（检查请求和响应）

### 2. 使用 Postman/curl 测试 API

```bash
# 测试 Create Session API
curl -X POST https://api-staging.transak.com/auth/public/v2/session \
  -H "access-token: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "widgetParams": {
      "referrerDomain": "localhost:3000",
      "fiatAmount": "100",
      "fiatCurrency": "USD",
      "cryptoCurrencyCode": "USDC",
      "network": "bsc",
      "walletAddress": "0x...",
      "partnerOrderId": "test-order-123",
      "redirectURL": "http://localhost:3000/payment/callback",
      "hideMenu": "true",
      "disableWalletAddressForm": "true",
      "disableFiatAmountEditing": "true",
      "isKYCRequired": "true"
    }
  }'
```

### 3. 检查 Transak Dashboard

1. 登录 Transak Dashboard
2. 检查 API Key 状态
3. 查看 API 使用日志
4. 检查 Webhook 配置

---

## 📝 常见问题解答

### Q1: 为什么会出现 AggregateError？

**A**: `AggregateError` 通常表示：
- 网络请求失败（DNS 解析失败、连接超时等）
- 多个 Promise 同时失败
- Node.js 原生模块的错误

**解决方案**: 已改进错误处理，现在会提取并显示所有子错误信息。

### Q2: 为什么 SDK 加载失败？

**A**: 可能原因：
- SDK URL 不正确（301 重定向）
- CORS 策略阻止
- 网络连接问题
- 环境配置不匹配

**解决方案**: 
- 确保前后端环境配置一致
- 检查网络连接
- 使用 iframe 回退方案

### Q3: 如何确认环境配置是否正确？

**A**: 
1. 检查后端日志：`Environment=PRODUCTION` 或 `Environment=STAGING`
2. 检查前端控制台：查看 `NEXT_PUBLIC_TRANSAK_ENVIRONMENT`
3. 确保两者一致

### Q4: iframe 回退方案为什么也失败？

**A**: 可能原因：
- 网络连接问题（无法访问 `staging-global.transak.com`）
- 地理位置限制
- DNS 解析失败

**解决方案**: 
- 检查网络连接
- 尝试使用 VPN
- 联系 Transak 技术支持

---

## ✅ 修复验证清单

- [ ] 前后端环境配置一致
- [ ] API Key 正确配置
- [ ] 网络连接正常
- [ ] 后端错误处理改进已应用
- [ ] 前端 commissionContractAddress fallback 已应用
- [ ] 测试 Create Session API 成功
- [ ] 测试 Widget 加载成功
- [ ] 测试完整支付流程

---

## 🚀 下一步行动

1. **立即修复**:
   - ✅ 统一前后端环境配置
   - ✅ 验证 API Key
   - ✅ 测试网络连接

2. **短期改进**:
   - ⚠️ 添加环境配置验证
   - ⚠️ 添加重试机制
   - ⚠️ 添加健康检查端点

3. **长期优化**:
   - ⚠️ 添加监控和告警
   - ⚠️ 添加自动故障恢复
   - ⚠️ 优化错误提示用户体验

---

**文档更新时间**: 2025-01-XX  
**状态**: ✅ 部分修复完成，需要手动配置环境变量

