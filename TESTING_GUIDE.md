# Agentrix V2.2 测试指南

**更新日期**: 2025-01-XX

---

## 🧪 测试环境准备

### 后端测试

```bash
cd backend
npm install
cp .env.example .env
# 配置环境变量
npm run start:dev
```

### 合约测试

```bash
cd contract
npm install
npx hardhat compile
npx hardhat test
```

### 前端测试

```bash
cd agentrixfrontend
npm install
npm run dev
```

---

## 📋 测试清单

### 一、后端API测试

#### 1. 钱包管理API

```bash
# 1. 连接钱包
curl -X POST http://localhost:3001/api/wallets/connect \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "walletType": "metamask",
    "walletAddress": "0x742...d35e",
    "chain": "evm",
    "chainId": "1"
  }'

# 2. 获取钱包列表
curl http://localhost:3001/api/wallets \
  -H "Authorization: Bearer YOUR_TOKEN"

# 3. 设置默认钱包
curl -X PUT http://localhost:3001/api/wallets/WALLET_ID/default \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 2. 支付API测试

```bash
# 1. 获取支付路由建议
curl "http://localhost:3001/api/payments/routing?amount=100&currency=CNY&isOnChain=true" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 2. 创建Stripe支付意图
curl -X POST http://localhost:3001/api/payments/create-intent \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 7999,
    "currency": "CNY",
    "paymentMethod": "stripe",
    "description": "测试支付"
  }'

# 3. 处理支付
curl -X POST http://localhost:3001/api/payments/process \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 7999,
    "currency": "CNY",
    "paymentMethod": "stripe",
    "paymentIntentId": "pi_xxx",
    "description": "测试支付"
  }'
```

#### 3. 自动支付API测试

```bash
# 1. 创建授权
curl -X POST http://localhost:3001/api/auto-pay/grants \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "agent-uuid",
    "singleLimit": 100,
    "dailyLimit": 500,
    "duration": 30
  }'

# 2. 执行自动支付
curl -X POST http://localhost:3001/api/auto-pay/execute \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "grantId": "grant-uuid",
    "amount": 50,
    "recipient": "0x...",
    "description": "自动支付测试"
  }'
```

#### 4. 分润结算API测试

```bash
# 1. 获取分润记录
curl http://localhost:3001/api/commissions \
  -H "Authorization: Bearer YOUR_TOKEN"

# 2. 执行结算
curl -X POST http://localhost:3001/api/commissions/settle \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "payeeType": "agent",
    "currency": "CNY"
  }'
```

---

### 二、合约测试

#### 运行所有测试

```bash
cd contract
npx hardhat test
```

#### 运行特定测试

```bash
# AutoPay合约测试
npx hardhat test test/AutoPay.test.ts

# PaymentRouter测试
npx hardhat test test/PaymentRouter.test.ts

# X402Adapter测试
npx hardhat test test/X402Adapter.test.ts

# Commission测试
npx hardhat test test/Commission.test.ts
```

#### 测试覆盖率

```bash
npx hardhat coverage
```

---

### 三、前端集成测试

#### 1. 钱包连接测试

1. 访问 `/app/user/wallets`
2. 点击"连接MetaMask"
3. 确认钱包连接成功
4. 验证钱包列表显示
5. 测试设置默认钱包
6. 测试断开钱包

#### 2. 支付流程测试

1. 访问 `/pay/agent` 或 `/pay/merchant`
2. 点击"立即支付"
3. 验证智能路由推荐
4. 选择支付方式
5. 完成支付流程
6. 验证支付状态更新

#### 3. 自动支付测试

1. 访问 `/app/user/auto-pay-setup`
2. 创建自动支付授权
3. 访问 `/app/user/grants`
4. 验证授权列表
5. 测试撤销授权

#### 4. 分润结算测试

1. 访问 `/app/agent/earnings`
2. 验证分润记录显示
3. 访问 `/app/merchant/settlements`
4. 验证结算记录

---

## 🔍 端到端测试场景

### 场景1: AI Agent对话支付

1. **前置条件**: 用户已登录，已连接钱包
2. **步骤**:
   - 访问Agent支付页面
   - AI推荐商品
   - 用户点击支付
   - 选择支付方式（智能路由推荐）
   - 完成支付
   - 验证支付成功
   - 验证分润自动计算

### 场景2: 商户直接支付

1. **前置条件**: 用户已登录
2. **步骤**:
   - 访问商户商品页面
   - 选择商品
   - 点击购买
   - 选择支付方式
   - 完成支付（Stripe）
   - 验证订单创建
   - 验证分润计算

### 场景3: 自动支付执行

1. **前置条件**: 用户已创建自动支付授权
2. **步骤**:
   - Agent发起自动支付请求
   - 验证授权有效性
   - 执行自动支付
   - 验证支付成功
   - 验证使用量更新

### 场景4: T+1自动结算

1. **前置条件**: 有未结算的分润记录
2. **步骤**:
   - 等待T+1时间到达
   - 验证自动结算任务执行
   - 验证结算记录创建
   - 验证分润状态更新

---

## 🐛 常见问题排查

### 后端问题

1. **数据库连接失败**
   - 检查PostgreSQL服务是否运行
   - 检查`.env`配置是否正确

2. **Stripe Webhook失败**
   - 检查`STRIPE_WEBHOOK_SECRET`配置
   - 使用Stripe CLI测试Webhook

3. **合约事件监听失败**
   - 检查RPC URL配置
   - 检查合约地址配置

### 前端问题

1. **API请求失败**
   - 检查后端服务是否运行
   - 检查CORS配置
   - 检查Token是否有效

2. **钱包连接失败**
   - 检查钱包扩展是否安装
   - 检查网络配置

3. **支付状态不更新**
   - 检查轮询是否启动
   - 检查API响应

### 合约问题

1. **编译失败**
   - 检查Solidity版本
   - 检查依赖安装

2. **测试失败**
   - 检查测试网络配置
   - 检查合约部署

---

## 📊 性能测试

### API响应时间

```bash
# 使用Apache Bench测试
ab -n 100 -c 10 http://localhost:3001/api/health
```

### 并发测试

```bash
# 使用wrk测试
wrk -t12 -c400 -d30s http://localhost:3001/api/health
```

---

## ✅ 测试检查清单

- [ ] 所有API端点测试通过
- [ ] 合约单元测试通过
- [ ] 前端集成测试通过
- [ ] 端到端测试场景通过
- [ ] 错误处理测试
- [ ] 性能测试达标
- [ ] 安全测试通过

---

## 📝 测试报告模板

测试完成后，请填写以下信息：

- **测试日期**: 
- **测试人员**: 
- **测试环境**: 
- **测试结果**: 
- **发现的问题**: 
- **修复状态**: 

