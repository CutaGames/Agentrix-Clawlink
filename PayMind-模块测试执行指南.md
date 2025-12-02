# PayMind 模块测试执行指南

**创建日期**: 2025-01-XX  
**目标**: 系统化测试所有功能模块，确保本地运行正常后再部署上线

---

## 🚀 快速开始

### 1. 启动服务

```bash
# 终端1: 启动后端服务
cd backend
npm run start:dev

# 终端2: 启动前端服务（可选，用于UI测试）
cd paymindfrontend
npm run dev
```

### 2. 验证服务运行

```bash
# 检查后端服务
curl http://localhost:3001/api

# 检查前端服务
curl http://localhost:3000
```

---

## 📋 模块测试清单

### ✅ 阶段1：核心功能模块测试（P0）

#### 1.1 用户认证系统 ✅

**测试步骤：**

```bash
# 1. 测试用户注册
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123456",
    "username": "testuser"
  }'

# 2. 测试用户登录（保存Token）
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123456"
  }' | jq -r '.accessToken')

echo "Token: $TOKEN"

# 3. 测试获取用户信息
curl -X GET http://localhost:3001/api/user/profile \
  -H "Authorization: Bearer $TOKEN"
```

**预期结果：**
- ✅ 注册成功
- ✅ 登录成功并返回Token
- ✅ 可以获取用户信息

**前端测试：**
- 访问 http://localhost:3000/auth/login
- 测试钱包连接
- 测试社交登录（Mock）

---

#### 1.2 支付系统 ✅

**测试步骤：**

```bash
# 使用上面获取的TOKEN
TOKEN="your_token_here"

# 1. 测试创建支付意图
curl -X POST http://localhost:3001/api/payments/intent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "amount": 100,
    "currency": "USD",
    "paymentMethod": "stripe"
  }'

# 2. 测试查询支付状态
curl -X GET http://localhost:3001/api/payments/{intent_id} \
  -H "Authorization: Bearer $TOKEN"
```

**预期结果：**
- ✅ 支付意图创建成功
- ✅ 支付状态查询正常

**前端测试：**
- 访问 http://localhost:3000/pay/agent-payment
- 测试支付流程

**第三方集成：**
- ⚠️ Stripe需要配置API密钥（见下方配置步骤）

---

#### 1.3 Agent系统 ✅

**测试步骤：**

```bash
TOKEN="your_token_here"

# 1. 测试Agent对话
curl -X POST http://localhost:3001/api/agent/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "message": "我想买一台笔记本电脑",
    "sessionId": "test-session-123"
  }'

# 2. 测试商品搜索
curl -X GET "http://localhost:3001/api/products/search?q=laptop" \
  -H "Authorization: Bearer $TOKEN"

# 3. 测试Agent生成
curl -X POST http://localhost:3001/api/agent/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "templateId": "shopping-agent",
    "name": "我的购物Agent"
  }'
```

**预期结果：**
- ✅ Agent对话正常
- ✅ 商品搜索正常
- ✅ Agent生成正常

**前端测试：**
- 访问 http://localhost:3000/agent
- 测试Agent对话
- 测试商品浏览和购物车

---

#### 1.4 Auto-Earn系统 ✅

**测试步骤：**

```bash
TOKEN="your_token_here"

# 1. 测试空投查询
curl -X GET http://localhost:3001/api/auto-earn/airdrops \
  -H "Authorization: Bearer $TOKEN"

# 2. 测试套利扫描（Mock数据）
curl -X POST http://localhost:3001/api/auto-earn/arbitrage/scan \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "chain": "solana",
    "pairs": ["SOL/USDC"]
  }'

# 3. 测试Launchpad项目发现（Mock数据）
curl -X GET "http://localhost:3001/api/auto-earn/launchpad/projects?platforms=pump.fun" \
  -H "Authorization: Bearer $TOKEN"
```

**预期结果：**
- ✅ 空投查询正常
- ✅ 套利扫描返回Mock数据
- ✅ Launchpad项目发现正常（Mock）

**前端测试：**
- 访问 http://localhost:3000/agent（Auto-Earn面板）
- 测试套利、Launchpad、策略功能

---

#### 1.5 商户系统 ✅

**测试步骤：**

```bash
TOKEN="your_token_here"

# 1. 测试创建商品
curl -X POST http://localhost:3001/api/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "测试商品",
    "price": 99.99,
    "currency": "USD",
    "description": "这是一个测试商品",
    "category": "electronics"
  }'

# 2. 测试查询订单
curl -X GET http://localhost:3001/api/orders \
  -H "Authorization: Bearer $TOKEN"

# 3. 测试AI自动接单（Mock）
curl -X POST http://localhost:3001/api/merchant/auto-order/decide \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "orderId": "order_123",
    "amount": 100
  }'
```

**预期结果：**
- ✅ 商品创建成功
- ✅ 订单查询正常
- ✅ AI自动接单正常（Mock）

**前端测试：**
- 访问 http://localhost:3000/app/merchant
- 测试商品管理、订单管理、自动化配置

---

#### 1.6 Marketplace系统 ✅

**测试步骤：**

```bash
TOKEN="your_token_here"

# 1. 测试Agent搜索
curl -X GET "http://localhost:3001/api/marketplace/agents/search?q=shopping" \
  -H "Authorization: Bearer $TOKEN"

# 2. 测试Agent推荐
curl -X GET http://localhost:3001/api/marketplace/agents/recommend \
  -H "Authorization: Bearer $TOKEN"

# 3. 测试Agent统计
curl -X GET http://localhost:3001/api/marketplace/agents/stats \
  -H "Authorization: Bearer $TOKEN"

# 4. 测试Agent排行榜
curl -X GET http://localhost:3001/api/marketplace/agents/rankings \
  -H "Authorization: Bearer $TOKEN"
```

**预期结果：**
- ✅ Agent搜索正常
- ✅ Agent推荐正常
- ✅ Agent统计和排行榜正常

**前端测试：**
- 访问 http://localhost:3000/marketplace
- 测试Agent搜索、推荐、排行榜

---

### 🔌 阶段2：第三方服务集成测试

#### 2.1 Stripe支付集成 ⚠️

**配置步骤：**

1. **注册Stripe账号**
   - 访问 https://stripe.com
   - 注册账号并完成邮箱验证

2. **获取API密钥**
   - 登录 https://dashboard.stripe.com
   - 进入 "Developers" → "API keys"
   - 复制 "Secret key"（以 `sk_test_` 开头）
   - 复制 "Publishable key"（以 `pk_test_` 开头）

3. **配置环境变量**
   ```bash
   # 编辑 backend/.env
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...  # 需要配置Webhook后获取
   ```

4. **配置Webhook（可选）**
   - 在Stripe Dashboard中进入 "Developers" → "Webhooks"
   - 添加端点：`https://your-domain.com/api/payments/webhook/stripe`
   - 选择事件：`payment_intent.succeeded`, `payment_intent.payment_failed`
   - 复制 "Signing secret"

5. **测试支付**
   ```bash
   # 使用测试卡号：4242 4242 4242 4242
   # 任意未来日期作为过期日期
   # 任意3位CVC码
   ```

**测试步骤：**

```bash
TOKEN="your_token_here"

# 创建支付意图
curl -X POST http://localhost:3001/api/payments/intent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "amount": 1000,
    "currency": "usd",
    "paymentMethod": "stripe"
  }'
```

---

#### 2.2 OpenAI Embedding集成 ⚠️

**配置步骤：**

1. **注册OpenAI账号**
   - 访问 https://platform.openai.com
   - 注册账号并完成验证

2. **获取API Key**
   - 进入 "API keys" 页面
   - 创建新的API Key
   - 复制API Key（以 `sk-` 开头）

3. **配置环境变量**
   ```bash
   # 编辑 backend/.env
   OPENAI_API_KEY=sk-...
   ```

4. **测试语义搜索**
   ```bash
   TOKEN="your_token_here"
   
   curl -X POST http://localhost:3001/api/search/semantic \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer $TOKEN" \
     -d '{
       "query": "笔记本电脑",
       "limit": 10
     }'
   ```

---

#### 2.3 其他第三方服务集成 ❌

**待集成的服务：**
- DEX API（Jupiter, Uniswap等）- 当前Mock
- Launchpad API（Pump.fun等）- 当前Mock
- AI API（OpenAI GPT, Claude）- 当前Mock
- OAuth服务（Google, Apple, X）- 当前Mock

**集成步骤：**
参考 `PayMind-完整功能实现清单.md` 中的详细集成步骤

---

## 🧪 阶段3：端到端流程测试

### 流程1：用户注册 → 创建Agent → 使用Agent购物 → 支付

**测试步骤：**

1. **用户注册/登录**
   ```bash
   # 注册
   curl -X POST http://localhost:3001/api/auth/register ...
   # 登录获取Token
   ```

2. **创建购物Agent**
   ```bash
   curl -X POST http://localhost:3001/api/agent/generate ...
   ```

3. **通过Agent浏览商品**
   ```bash
   curl -X POST http://localhost:3001/api/agent/chat ...
   ```

4. **添加商品到购物车**
   ```bash
   # 通过前端操作或API
   ```

5. **创建订单**
   ```bash
   curl -X POST http://localhost:3001/api/orders ...
   ```

6. **完成支付**
   ```bash
   curl -X POST http://localhost:3001/api/payments/process ...
   ```

7. **查看订单状态**
   ```bash
   curl -X GET http://localhost:3001/api/orders/{order_id} ...
   ```

---

## 📊 测试记录

### 模块测试记录表

| 模块 | 测试日期 | 测试人员 | 状态 | 问题 | 备注 |
|------|---------|---------|------|------|------|
| 用户认证 | | | ✅/❌ | | |
| 支付系统 | | | ✅/❌ | | |
| Agent系统 | | | ✅/❌ | | |
| Auto-Earn | | | ✅/❌ | | |
| 商户系统 | | | ✅/❌ | | |
| Marketplace | | | ✅/❌ | | |

---

## 🚀 部署前检查清单

### 代码检查
- [ ] 所有编译错误已修复
- [ ] 所有测试通过
- [ ] 代码已提交到版本控制

### 配置检查
- [ ] 环境变量配置完成
- [ ] 数据库连接配置正确
- [ ] 第三方服务API密钥配置
- [ ] Webhook端点配置

### 服务检查
- [ ] 后端服务可正常启动
- [ ] 前端服务可正常启动
- [ ] 所有API端点可访问
- [ ] Swagger文档可访问（http://localhost:3001/api/docs）

---

## 📝 下一步行动

1. **立即开始**: 从阶段1开始，逐个模块测试
2. **优先级**: 先测试P0功能（用户认证、支付、Agent）
3. **第三方集成**: 先配置Stripe和OpenAI，其他逐步集成
4. **记录问题**: 使用测试记录表记录所有问题
5. **修复问题**: 发现问题后立即修复，然后重新测试

---

**最后更新**: 2025-01-XX  
**维护者**: PayMind开发团队

