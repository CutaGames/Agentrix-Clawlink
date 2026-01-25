# Transak White Label 当前流程说明

**日期**: 2025-01-XX  
**状态**: ⚠️ 部分功能正常，存在网络连接问题

---

## 📊 当前白标流程（设计）

### 完整流程步骤

```
1. 用户进入支付页面
   └─> SmartCheckout 组件

2. 执行 Pre-Flight Check
   └─> 返回 providerOptions（含 commissionContractAddress）

3. 路由决策：选择 provider 路由
   └─> 自动打开 TransakWhiteLabelModal

4. 显示介绍页面（Intro View）
   └─> 显示支付摘要、手续费、合规说明

5. 用户点击"开始 Agentrix Pay 流程"
   └─> 切换到 Widget 视图

6. TransakWidget 初始化
   └─> 尝试创建 Transak Session（方案1）
       ├─> 成功 → 使用 sessionId 加载 Widget
       └─> 失败 → 回退到 URL 参数方式（方案2）

7. 加载 Transak Widget
   ├─> 方案1：使用 sessionId（推荐）
   │   └─> iframe: https://global.transak.com?apiKey=...&sessionId=...
   └─> 方案2：使用 URL 参数（回退）
       └─> iframe: https://staging-global.transak.com?apiKey=...&fiatAmount=...

8. 用户在 Widget 中完成支付
   └─> Transak 处理法币 → USDC 转换

9. 支付成功回调
   └─> 记录支付状态到后端

10. 关闭弹窗，显示成功
```

---

## 🔴 当前遇到的问题

### 问题 1: 后端 Create Session API 失败

**错误**: `AggregateError` - 无法连接到 Transak API

**可能原因**:
1. 网络连接问题（无法访问 `api.transak.com`）
2. DNS 解析失败
3. 防火墙/代理阻止
4. API Key 配置错误
5. 环境配置不匹配

**当前状态**: 
- ✅ 已改进错误处理，会显示详细错误信息
- ⚠️ 需要检查网络连接和 API Key 配置

### 问题 2: 前端 SDK 加载失败

**错误**: 
- `net::ERR_FAILED 301 (Moved Permanently)`
- `CORS policy: No 'Access-Control-Allow-Origin' header`
- `net::ERR_TIMED_OUT`

**可能原因**:
1. SDK URL 不正确（301 重定向）
2. CORS 策略阻止
3. 网络超时
4. 环境配置不匹配（后端 PRODUCTION，前端 STAGING）

**当前状态**:
- ✅ 已实现 iframe 回退方案
- ⚠️ iframe 回退也失败（网络问题）

### 问题 3: 环境配置不匹配

**发现**:
- 后端: `Environment=PRODUCTION`
- 前端: 默认 `STAGING`

**影响**:
- 后端调用 `api.transak.com`（生产环境）
- 前端尝试加载 `staging-global.transak.com`（测试环境）
- **环境不匹配导致无法正常工作**

---

## ✅ 已实施的修复

### 1. 后端错误处理增强 ✅

**改进内容**:
- ✅ 添加 `AggregateError` 详细处理
- ✅ 提取并记录所有子错误信息
- ✅ 增加超时时间（10秒 → 30秒）
- ✅ 添加网络错误类型识别
- ✅ 改进错误消息，提供更清晰的诊断信息
- ✅ 添加环境配置验证和警告

**代码位置**: `transak-provider.service.ts:359-404, 28-60`

### 2. commissionContractAddress Fallback ✅

**改进内容**:
- ✅ 添加 `useState` 管理 `commissionContractAddress`
- ✅ 添加 `useEffect` 在 Widget 视图时从后端获取合约地址
- ✅ 监听 `providerOption` 变化，自动更新地址

**代码位置**: `TransakWhiteLabelModal.tsx:70-99`

### 3. 环境配置验证 ✅

**改进内容**:
- ✅ 在服务启动时验证 API Key 配置
- ✅ 检查环境与 API Key 是否匹配
- ✅ 记录详细的配置信息

**代码位置**: `transak-provider.service.ts:28-60`

---

## 🔧 需要手动修复的问题

### 1. 统一环境配置 ⚠️ **重要**

**问题**: 前后端环境配置不一致

**解决方案**:

#### 选项 A: 统一使用 STAGING（推荐用于开发测试）

**后端** (`backend/.env`):
```env
TRANSAK_ENVIRONMENT=STAGING
TRANSAK_API_KEY_STAGING=your_staging_api_key
# 或使用统一配置
TRANSAK_API_KEY=your_staging_api_key
```

**前端** (`frontend/.env.local`):
```env
NEXT_PUBLIC_TRANSAK_ENVIRONMENT=STAGING
NEXT_PUBLIC_TRANSAK_API_KEY=your_staging_api_key
```

#### 选项 B: 统一使用 PRODUCTION（用于生产环境）

**后端** (`backend/.env`):
```env
TRANSAK_ENVIRONMENT=PRODUCTION
TRANSAK_API_KEY_PRODUCTION=your_production_api_key
# 或使用统一配置
TRANSAK_API_KEY=your_production_api_key
```

**前端** (`frontend/.env.local`):
```env
NEXT_PUBLIC_TRANSAK_ENVIRONMENT=PRODUCTION
NEXT_PUBLIC_TRANSAK_API_KEY=your_production_api_key
```

### 2. 验证网络连接 ⚠️

**测试命令**:
```bash
# 测试生产环境 API
curl -I https://api.transak.com

# 测试测试环境 API
curl -I https://api-staging.transak.com

# 测试 Widget URL
curl -I https://global.transak.com
curl -I https://staging-global.transak.com

# 测试 DNS 解析
nslookup api.transak.com
nslookup staging-global.transak.com
```

### 3. 验证 API Key ⚠️

**测试 Create Session API**:
```bash
curl -X POST https://api-staging.transak.com/auth/public/v2/session \
  -H "access-token: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "widgetParams": {
      "referrerDomain": "localhost:3000",
      "fiatAmount": "100",
      "fiatCurrency": "USD",
      "cryptoCurrencyCode": "USDC",
      "network": "bsc"
    }
  }'
```

---

## 📋 当前流程详细说明

### 阶段 1: 支付入口

1. **用户进入支付页面**
   - `SmartCheckout` 组件接收订单信息
   - 订单金额: `¥1299.00 CNY`
   - 商品: 小米 AX9000 WiFi 6E 三频路由器

2. **执行 Pre-Flight Check**
   - 检查用户 KYC 状态: `kycLevel: 'none'` → 需要 KYC
   - 检查钱包连接: 已连接
   - 获取 Provider 报价: 总价 `¥1339.269`（含手续费 `¥40.27`）
   - 返回 `providerOptions`，包含 `commissionContractAddress`

3. **路由决策**
   - 用户有钱包，但选择了 Provider 支付
   - 路由类型: `provider`（Transak）

### 阶段 2: Transak 白标弹窗

1. **显示介绍页面**
   - ✅ 支付摘要: `¥1299.00 CNY`
   - ✅ 支付渠道: Google Pay
   - ✅ 预计到账: 2-5 分钟
   - ✅ 手续费: 总费 40.27 CNY / Provider 38.97 / Agentrix 费 1.30
   - ✅ 合规支持: Powered by Transak
   - ✅ KYC 提示: 需要完成 KYC 验证

2. **用户点击"开始 Agentrix Pay 流程"**
   - 切换到 Widget 视图

### 阶段 3: Transak Widget 初始化（当前失败）

1. **尝试创建 Transak Session**
   - 调用 `/api/payments/provider/transak/session`
   - **后端错误**: `AggregateError` - 无法连接到 Transak API
   - **状态**: ❌ 失败

2. **回退到 URL 参数方式**
   - 使用 iframe 嵌入方式
   - URL: `https://staging-global.transak.com?apiKey=...&fiatAmount=...`
   - **前端错误**: `net::ERR_TIMED_OUT` - 网络超时
   - **状态**: ❌ 失败

3. **Widget 无法加载**
   - iframe 显示破损图标
   - 无法继续支付流程

---

## 🔍 问题根本原因分析

### 主要原因

1. **网络连接问题** ⚠️
   - 无法访问 Transak API（`api.transak.com`）
   - 无法访问 Transak Widget（`staging-global.transak.com`）
   - 可能是：
     - 防火墙/代理阻止
     - DNS 解析失败
     - 地理位置限制
     - 网络不稳定

2. **环境配置不匹配** ⚠️
   - 后端: PRODUCTION
   - 前端: STAGING
   - 导致前后端使用不同的 API 端点

3. **API Key 可能无效** ⚠️
   - API Key 可能已过期
   - API Key 可能与环境不匹配
   - API Key 可能没有 Create Session 权限

---

## ✅ 修复建议

### 立即修复（必须）

1. **统一环境配置**
   ```bash
   # 后端
   TRANSAK_ENVIRONMENT=STAGING  # 或 PRODUCTION
   
   # 前端
   NEXT_PUBLIC_TRANSAK_ENVIRONMENT=STAGING  # 或 PRODUCTION
   ```

2. **验证 API Key**
   - 登录 Transak Dashboard
   - 检查 API Key 状态
   - 确认 API Key 与环境匹配

3. **测试网络连接**
   ```bash
   curl -I https://api-staging.transak.com
   curl -I https://staging-global.transak.com
   ```

### 短期改进

1. **添加环境配置检查**
   - 在服务启动时验证配置
   - 在组件加载时验证配置
   - 显示清晰的错误提示

2. **添加重试机制**
   - Session 创建失败时自动重试
   - SDK 加载失败时自动重试

3. **改进错误提示**
   - 显示更友好的错误信息
   - 提供解决方案建议

---

## 📊 当前状态总结

| 组件 | 状态 | 说明 |
|------|------|------|
| Pre-Flight Check | ✅ 正常 | 正确返回 providerOptions |
| TransakWhiteLabelModal | ✅ 正常 | 正确显示介绍页面 |
| Create Session API | ❌ 失败 | AggregateError - 网络问题 |
| SDK 加载 | ❌ 失败 | 网络超时/CORS 错误 |
| iframe 回退 | ❌ 失败 | 网络超时 |
| 支付流程 | ⏸️ 阻塞 | 无法继续 |

---

## 🚀 下一步行动

1. **立即修复**:
   - [ ] 统一前后端环境配置
   - [ ] 验证 API Key
   - [ ] 测试网络连接

2. **验证修复**:
   - [ ] 测试 Create Session API
   - [ ] 测试 Widget 加载
   - [ ] 测试完整支付流程

3. **监控和优化**:
   - [ ] 添加健康检查
   - [ ] 添加监控告警
   - [ ] 优化错误处理

---

**文档更新时间**: 2025-01-XX  
**当前状态**: ⚠️ 需要手动配置环境变量和验证网络连接

