# PayMind 模块化测试和部署计划

**创建日期**: 2025-01-XX  
**目标**: 系统化测试所有功能模块，对接第三方服务，确保本地运行正常后再部署上线

---

## 📋 测试总览

| 阶段 | 内容 | 状态 | 优先级 |
|------|------|------|--------|
| **阶段1** | 核心功能模块测试 | ⏳ 待开始 | 🔴 P0 |
| **阶段2** | 第三方服务集成测试 | ⏳ 待开始 | 🔴 P0 |
| **阶段3** | 端到端流程测试 | ⏳ 待开始 | 🟡 P1 |
| **阶段4** | 性能和安全测试 | ⏳ 待开始 | 🟡 P1 |
| **阶段5** | 生产环境部署 | ⏳ 待开始 | 🔴 P0 |

---

## 🎯 阶段1：核心功能模块测试

### 1.1 用户认证系统 ✅

#### 测试清单
- [ ] **Web3钱包登录**
  - [ ] MetaMask 连接
  - [ ] Phantom 连接
  - [ ] WalletConnect 连接
  - [ ] OKX Wallet 连接
  - [ ] 签名验证

- [ ] **Web2社交登录**（Mock）
  - [ ] Google OAuth（当前Mock）
  - [ ] Apple OAuth（当前Mock）
  - [ ] X OAuth（当前Mock）

- [ ] **用户管理**
  - [ ] 用户注册
  - [ ] 用户登录
  - [ ] JWT Token 生成和验证
  - [ ] 用户信息查询
  - [ ] 用户登出

#### 测试步骤
```bash
# 1. 启动后端服务
cd backend
npm run start:dev

# 2. 启动前端服务
cd paymindfrontend
npm run dev

# 3. 测试端点
# - POST /api/auth/login
# - POST /api/auth/register
# - GET /api/user/profile
# - POST /api/auth/logout
```

#### 预期结果
- ✅ 所有登录方式正常工作
- ✅ JWT Token 正确生成和验证
- ✅ 用户信息正确保存和查询

---

### 1.2 支付系统 ✅

#### 测试清单
- [ ] **支付意图创建**
  - [ ] 创建支付意图
  - [ ] 支付方式选择
  - [ ] 金额验证

- [ ] **支付处理**
  - [ ] Stripe 支付（需配置API密钥）
  - [ ] 钱包支付（Web3）
  - [ ] X402 支付
  - [ ] 支付状态追踪

- [ ] **支付路由**
  - [ ] 智能路由选择
  - [ ] 价格对比
  - [ ] 手续费计算

#### 测试步骤
```bash
# 1. 测试支付意图创建
curl -X POST http://localhost:3001/api/payments/intent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "amount": 100,
    "currency": "USD",
    "paymentMethod": "stripe"
  }'

# 2. 测试支付处理
curl -X POST http://localhost:3001/api/payments/process \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "intentId": "intent_id",
    "paymentMethod": "stripe"
  }'
```

#### 预期结果
- ✅ 支付意图正确创建
- ✅ 支付流程正常执行
- ✅ 支付状态正确更新

---

### 1.3 Agent系统 ✅

#### 测试清单
- [ ] **Agent对话**
  - [ ] 消息发送和接收
  - [ ] 上下文保持
  - [ ] 意图识别

- [ ] **Marketplace功能**
  - [ ] 商品浏览
  - [ ] 商品搜索
  - [ ] 商品筛选

- [ ] **购物车功能**
  - [ ] 添加商品
  - [ ] 更新数量
  - [ ] 删除商品
  - [ ] 结算

- [ ] **订单管理**
  - [ ] 订单创建
  - [ ] 订单查询
  - [ ] 订单状态更新

- [ ] **Agent生成**
  - [ ] 模板选择
  - [ ] Agent创建
  - [ ] Agent配置

#### 测试步骤
```bash
# 1. 测试Agent对话
curl -X POST http://localhost:3001/api/agent/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "message": "我想买一台笔记本电脑",
    "sessionId": "session_id"
  }'

# 2. 测试商品搜索
curl -X GET "http://localhost:3001/api/products/search?q=laptop" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 预期结果
- ✅ Agent对话流畅
- ✅ 商品搜索和浏览正常
- ✅ 购物车和订单功能正常

---

### 1.4 Auto-Earn系统 ✅

#### 测试清单
- [ ] **空投监控**
  - [ ] 空投发现
  - [ ] 空投领取
  - [ ] 收益统计

- [ ] **套利功能**（Mock）
  - [ ] 套利机会扫描
  - [ ] 价格对比
  - [ ] 套利执行（Mock）

- [ ] **Launchpad功能**（Mock）
  - [ ] 项目发现
  - [ ] 项目参与
  - [ ] 收益监控

- [ ] **策略管理**
  - [ ] DCA策略
  - [ ] 网格策略
  - [ ] 跟单策略

#### 测试步骤
```bash
# 1. 测试空投发现
curl -X GET http://localhost:3001/api/auto-earn/airdrops \
  -H "Authorization: Bearer YOUR_TOKEN"

# 2. 测试套利扫描
curl -X POST http://localhost:3001/api/auto-earn/arbitrage/scan \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "chain": "solana",
    "pairs": ["SOL/USDC"]
  }'
```

#### 预期结果
- ✅ 空投监控正常
- ✅ 套利和Launchpad功能正常（Mock数据）
- ✅ 策略配置和执行正常

---

### 1.5 商户系统 ✅

#### 测试清单
- [ ] **商品管理**
  - [ ] 商品创建
  - [ ] 商品更新
  - [ ] 商品删除
  - [ ] 商品查询

- [ ] **订单管理**
  - [ ] 订单查询
  - [ ] 订单状态更新
  - [ ] 订单统计

- [ ] **自动化功能**
  - [ ] AI自动接单（Mock）
  - [ ] AI客服（Mock）
  - [ ] 自动营销（Mock）

#### 测试步骤
```bash
# 1. 测试商品创建
curl -X POST http://localhost:3001/api/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "测试商品",
    "price": 99.99,
    "currency": "USD",
    "description": "这是一个测试商品"
  }'
```

#### 预期结果
- ✅ 商品管理功能正常
- ✅ 订单管理功能正常
- ✅ 自动化功能正常（Mock）

---

### 1.6 Marketplace系统 ✅

#### 测试清单
- [ ] **商品/服务浏览**
  - [ ] 列表展示
  - [ ] 搜索功能
  - [ ] 筛选功能

- [ ] **Agent Marketplace**
  - [ ] Agent搜索
  - [ ] Agent推荐
  - [ ] Agent统计
  - [ ] Agent排行榜

#### 测试步骤
```bash
# 1. 测试Agent搜索
curl -X GET "http://localhost:3001/api/marketplace/agents/search?q=shopping" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 2. 测试Agent推荐
curl -X GET http://localhost:3001/api/marketplace/agents/recommend \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 预期结果
- ✅ 搜索和推荐功能正常
- ✅ Agent统计和排行榜正常

---

### 1.7 其他核心模块 ✅

#### 测试清单
- [ ] **物流系统**
  - [ ] 物流跟踪
  - [ ] 物流信息查询

- [ ] **优惠券系统**
  - [ ] 优惠券创建
  - [ ] 优惠券使用
  - [ ] 优惠券验证

- [ ] **分润系统**
  - [ ] 分润计算
  - [ ] 分润结算
  - [ ] 推广分成

- [ ] **通知系统**
  - [ ] 通知发送
  - [ ] 通知查询
  - [ ] 通知已读标记

---

## 🔌 阶段2：第三方服务集成测试

### 2.1 已集成但需配置的服务 ⚠️

#### 2.1.1 Stripe支付 ⚠️

**配置步骤：**
1. 注册 Stripe 账号：https://stripe.com
2. 获取 API 密钥：
   - 登录 Dashboard: https://dashboard.stripe.com
   - 进入 "Developers" → "API keys"
   - 复制 "Secret key" 和 "Publishable key"
3. 配置环境变量：
   ```bash
   # backend/.env
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```
4. 配置 Webhook：
   - 进入 "Developers" → "Webhooks"
   - 添加端点：`https://your-domain.com/api/payments/webhook/stripe`
   - 选择事件：`payment_intent.succeeded`, `payment_intent.payment_failed`

**测试步骤：**
```bash
# 1. 测试支付意图创建
curl -X POST http://localhost:3001/api/payments/intent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "amount": 1000,
    "currency": "usd",
    "paymentMethod": "stripe"
  }'

# 2. 使用测试卡号：4242 4242 4242 4242
```

**预期结果：**
- ✅ 支付意图创建成功
- ✅ 支付流程正常
- ✅ Webhook 正常接收

---

#### 2.1.2 OpenAI Embedding ⚠️

**配置步骤：**
1. 注册 OpenAI 账号：https://platform.openai.com
2. 获取 API Key：
   - 进入 "API keys" 页面
   - 创建新的 API Key
3. 配置环境变量：
   ```bash
   # backend/.env
   OPENAI_API_KEY=sk-...
   ```

**测试步骤：**
```bash
# 测试语义搜索
curl -X POST http://localhost:3001/api/search/semantic \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "query": "笔记本电脑",
    "limit": 10
  }'
```

**预期结果：**
- ✅ Embedding 生成正常
- ✅ 语义搜索正常

---

### 2.2 框架已实现但未集成的服务 ❌

#### 2.2.1 DEX API集成 ❌

**需要集成的服务：**
- Jupiter (Solana)
- Uniswap (Ethereum)
- PancakeSwap (BSC)
- 1inch (Ethereum)
- Raydium (Solana)

**集成步骤：**
1. 更新 `backend/src/integrations/dex/dex-integration.service.ts`
2. 实现真实 API 调用（替换 Mock）
3. 配置环境变量（如需要）
4. 测试 API 调用

**测试步骤：**
```bash
# 测试价格查询
curl -X GET "http://localhost:3001/api/auto-earn/arbitrage/scan?chain=solana&pair=SOL/USDC" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

#### 2.2.2 Launchpad API集成 ❌

**需要集成的服务：**
- Pump.fun (Solana)
- Raydium AcceleRaytor (Solana)
- TON Memepad (TON)

**集成步骤：**
1. 更新 `backend/src/integrations/launchpad/launchpad-integration.service.ts`
2. 实现真实 API 调用（替换 Mock）
3. 配置环境变量（如需要）
4. 测试 API 调用

---

#### 2.2.3 AI API集成 ❌

**需要集成的服务：**
- OpenAI GPT
- Anthropic Claude
- 本地AI模型（可选）

**集成步骤：**
1. 注册 OpenAI/Anthropic 账号
2. 获取 API Key
3. 更新 `backend/src/integrations/ai/ai-integration.service.ts`
4. 实现真实 API 调用（替换 Mock）
5. 配置环境变量
6. 测试 API 调用

**测试步骤：**
```bash
# 测试AI客服
curl -X POST http://localhost:3001/api/merchant/ai-customer/message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "merchantId": "merchant_id",
    "customerId": "customer_id",
    "message": "你好，我想咨询商品信息"
  }'
```

---

#### 2.2.4 OAuth服务集成 ❌

**需要集成的服务：**
- Google OAuth
- Apple Sign In
- X (Twitter) OAuth

**集成步骤：**
1. 注册相应的开发者账号
2. 创建 OAuth 应用
3. 获取 Client ID 和 Secret
4. 更新 OAuth 策略文件
5. 配置环境变量
6. 测试 OAuth 流程

---

## 🧪 阶段3：端到端流程测试

### 3.1 完整用户流程

#### 流程1：用户注册 → 创建Agent → 使用Agent购物 → 支付

**测试步骤：**
1. 用户注册/登录
2. 创建购物Agent
3. 通过Agent浏览商品
4. 添加商品到购物车
5. 创建订单
6. 完成支付
7. 查看订单状态

**预期结果：**
- ✅ 整个流程顺畅
- ✅ 数据正确保存
- ✅ 状态正确更新

---

#### 流程2：商户注册 → 上架商品 → 接收订单 → 自动处理

**测试步骤：**
1. 商户注册/登录
2. 上架商品
3. 配置自动化功能
4. 接收订单
5. AI自动处理订单
6. 更新订单状态

**预期结果：**
- ✅ 商户流程顺畅
- ✅ 自动化功能正常

---

#### 流程3：Agent推广商户 → 商户交易 → 分成结算

**测试步骤：**
1. Agent推广商户
2. 商户完成交易
3. 系统计算分成
4. 分成结算

**预期结果：**
- ✅ 推广关系正确记录
- ✅ 分成正确计算
- ✅ 结算正常执行

---

## 📊 阶段4：性能和安全测试

### 4.1 性能测试

#### 测试项
- [ ] API响应时间
- [ ] 并发用户测试
- [ ] 数据库查询性能
- [ ] 支付处理性能

#### 工具
- Apache Bench (ab)
- k6
- JMeter

---

### 4.2 安全测试

#### 测试项
- [ ] SQL注入防护
- [ ] XSS防护
- [ ] CSRF防护
- [ ] JWT Token安全
- [ ] API限流
- [ ] 敏感数据加密

---

## 🚀 阶段5：生产环境部署

### 5.1 部署前检查清单

#### 代码检查
- [ ] 所有编译错误已修复
- [ ] 所有测试通过
- [ ] 代码已提交到版本控制
- [ ] 代码审查完成

#### 配置检查
- [ ] 环境变量配置完成
- [ ] 数据库连接配置正确
- [ ] 第三方服务API密钥配置
- [ ] Webhook端点配置

#### 数据库检查
- [ ] 数据库迁移脚本准备就绪
- [ ] 数据库备份策略
- [ ] 数据库索引优化

#### 服务检查
- [ ] 后端服务可正常启动
- [ ] 前端服务可正常启动
- [ ] 所有API端点可访问
- [ ] Swagger文档可访问

---

### 5.2 部署步骤

#### 1. 服务器准备
- [ ] 服务器环境配置
- [ ] Node.js 安装
- [ ] PostgreSQL 安装和配置
- [ ] Nginx 配置（如需要）

#### 2. 代码部署
- [ ] 代码拉取
- [ ] 依赖安装
- [ ] 构建项目
- [ ] 数据库迁移

#### 3. 服务启动
- [ ] 后端服务启动
- [ ] 前端服务启动
- [ ] 服务监控配置

#### 4. 验证
- [ ] 服务健康检查
- [ ] API端点测试
- [ ] 前端页面访问
- [ ] 关键流程测试

---

## 📝 测试记录模板

### 模块测试记录

**模块名称**: _______________  
**测试日期**: _______________  
**测试人员**: _______________  

#### 测试结果

| 测试项 | 状态 | 备注 |
|--------|------|------|
| 功能1 | ✅/❌ | |
| 功能2 | ✅/❌ | |
| 功能3 | ✅/❌ | |

#### 发现的问题

1. **问题描述**:  
   **严重程度**: 高/中/低  
   **状态**: 待修复/已修复

#### 测试结论

- [ ] 通过
- [ ] 不通过（需修复后重测）

---

## 🎯 下一步行动

1. **立即开始**: 阶段1 - 核心功能模块测试
2. **优先级**: 先测试P0功能（用户认证、支付、Agent）
3. **第三方集成**: 先配置Stripe和OpenAI，其他逐步集成
4. **测试工具**: 使用Postman或curl进行API测试
5. **记录问题**: 使用测试记录模板记录所有问题

---

**最后更新**: 2025-01-XX  
**维护者**: PayMind开发团队

