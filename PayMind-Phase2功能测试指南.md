# PayMind Phase 2 功能测试指南

**版本**: V1.0  
**日期**: 2025-01-XX  
**状态**: ✅ Phase 1 + Phase 2（除拆单）已完成，可进行功能测试和集成测试

---

## 📋 目录

1. [已完成功能概览](#已完成功能概览)
2. [用户可见功能](#用户可见功能)
3. [API端点列表](#api端点列表)
4. [功能测试场景](#功能测试场景)
5. [集成测试场景](#集成测试场景)
6. [测试数据准备](#测试数据准备)

---

## ✅ 已完成功能概览

### Phase 1: 核心基础设施

#### 1. 交易大模型基础架构 ✅
- ✅ `TransactionFoundationModel` - 统一支付路由、风险评分、手续费估算
- ✅ `AssetFoundationModel` - 多链资产聚合、交易分类、风险建议
- ✅ 数据库迁移和实体定义

#### 2. 流动性网格（Liquidity Mesh）✅
- ✅ 统一流动性接口 `ILiquidityProvider`
- ✅ DEX适配器：
  - ✅ Jupiter (Solana)
  - ✅ Uniswap (Ethereum)
  - ✅ Raydium (Solana)
  - ✅ PancakeSwap (BSC/Ethereum/Polygon)
  - ✅ OpenOcean (跨链聚合器)
- ✅ `BestExecutionService` - 最优执行路径计算
- ✅ `LiquidityMeshService` - 流动性聚合服务

#### 3. 意图交易系统 ✅
- ✅ `IntentEngineService` - 自然语言意图识别
- ✅ `StrategyGraphService` - 策略树构建和执行
- ✅ `MarketMonitorService` - 市场监控和触发
- ✅ 数据库实体：`StrategyGraph`, `StrategyNode`, `MarketMonitor`, `IntentRecord`

### Phase 2: 账户与执行层

#### 4. Agent授权系统 ✅
- ✅ `AgentAuthorizationService` - Agent级别授权管理
- ✅ `StrategyPermissionEngine` - 策略级权限检查
- ✅ 数据库实体：`AgentAuthorization`, `AgentStrategyPermission`, `AgentExecutionHistory`
- ✅ RESTful API端点

#### 5. 原子结算服务 ✅
- ✅ `AtomicSettlementService` - 跨链原子结算
- ✅ 结算状态追踪
- ✅ 失败回滚机制
- ✅ 数据库实体：`AtomicSettlement`

#### 6. Groq AI集成 ✅
- ✅ `GroqIntegrationService` - Groq API集成
- ✅ Function Calling支持
- ✅ RESTful API端点

---

## 👤 用户可见功能

### 1. AI驱动的交易意图识别

**功能描述**：用户可以通过自然语言表达交易意图，系统自动转换为可执行的交易策略。

**使用场景**：
- "帮我把10%资产换成BTC"
- "每周自动定投ETH"
- "当BTC价格低于$40,000时买入"

**API端点**：
- `POST /api/trading/intent` - 提交交易意图
- `GET /api/trading/strategy/:id` - 查询策略状态

### 2. 多DEX最优执行

**功能描述**：系统自动在多个DEX中寻找最优价格和执行路径。

**使用场景**：
- 用户发起代币交换请求
- 系统自动比较Jupiter、Uniswap、Raydium等DEX价格
- 选择最优路径执行

**API端点**：
- `POST /api/liquidity/quote` - 获取最优报价
- `POST /api/liquidity/swap` - 执行交换

### 3. Agent授权管理

**功能描述**：用户可以授权Agent执行特定操作，并设置权限限制。

**使用场景**：
- 创建Agent授权，设置单次/每日限额
- 限制Agent只能执行特定策略（如只允许DCA，不允许网格交易）
- 查看Agent执行历史

**API端点**：
- `POST /api/agent-authorization` - 创建授权
- `GET /api/agent-authorization/agent/:agentId/active` - 查询激活授权
- `GET /api/agent-authorization/user` - 查询用户所有授权
- `DELETE /api/agent-authorization/:id` - 撤销授权

### 4. 原子结算

**功能描述**：确保跨链或多资产交易要么全部成功，要么全部回滚。

**使用场景**：
- 跨链资产交换（如ETH链上的USDT换Solana链上的SOL）
- 多资产同时交易
- 条件交易（满足条件才执行）

**API端点**：
- `POST /api/trading/settlement` - 创建原子结算
- `POST /api/trading/settlement/:id/execute` - 执行结算
- `GET /api/trading/settlement/:id` - 查询结算状态

### 5. Groq AI助手

**功能描述**：通过Groq AI进行自然语言交互，支持Function Calling。

**使用场景**：
- "帮我搜索PayMind Marketplace的商品"
- "购买商品X"
- "查询我的订单"

**API端点**：
- `GET /api/groq/functions` - 获取可用Function列表
- `POST /api/groq/function-call` - 执行Function调用
- `GET /api/groq/test?query=...` - 快速测试

---

## 🔌 API端点列表

### 交易意图系统

```
POST   /api/trading/intent                    # 提交交易意图
GET    /api/trading/strategy/:id              # 查询策略详情
GET    /api/trading/strategy/user/:userId      # 查询用户所有策略
POST   /api/trading/strategy/:id/execute      # 执行策略
DELETE /api/trading/strategy/:id              # 删除策略
```

### 流动性网格

```
POST   /api/liquidity/quote                    # 获取最优报价
POST   /api/liquidity/swap                     # 执行交换
GET    /api/liquidity/providers                 # 获取所有流动性提供者
GET    /api/liquidity/provider/:name           # 获取特定提供者信息
```

### Agent授权

```
POST   /api/agent-authorization                # 创建授权
GET    /api/agent-authorization/agent/:agentId/active  # 查询激活授权
GET    /api/agent-authorization/agent/:agentId        # 查询Agent所有授权
GET    /api/agent-authorization/user                   # 查询用户所有授权
DELETE /api/agent-authorization/:id                  # 撤销授权
POST   /api/agent-authorization/check-permission      # 检查权限（测试用）
```

### 原子结算

```
POST   /api/trading/settlement                 # 创建原子结算
POST   /api/trading/settlement/:id/execute     # 执行结算
GET    /api/trading/settlement/:id              # 查询结算状态
GET    /api/trading/settlement/user/:userId     # 查询用户所有结算
```

### Groq AI集成

```
GET    /api/groq/functions                     # 获取Function Schemas
POST   /api/groq/function-call                 # 执行Function Call
GET    /api/groq/test?query=...                 # 快速测试
```

---

## 🧪 功能测试场景

### 场景1: 自然语言交易意图

**测试步骤**：
1. 提交交易意图：
```bash
POST /api/trading/intent
{
  "userId": "user-123",
  "intentText": "帮我把10%资产换成BTC",
  "agentId": "agent-456"
}
```

2. 验证系统创建了策略图（StrategyGraph）
3. 验证策略节点（StrategyNode）正确生成
4. 执行策略，验证交易执行

**预期结果**：
- ✅ 意图被正确识别
- ✅ 策略图创建成功
- ✅ 策略节点包含正确的交易参数
- ✅ 交易执行成功

### 场景2: 多DEX最优执行

**测试步骤**：
1. 请求报价：
```bash
POST /api/liquidity/quote
{
  "fromToken": "USDT",
  "toToken": "ETH",
  "amount": 1000,
  "chain": "ethereum"
}
```

2. 验证返回了多个DEX的报价
3. 验证选择了最优价格
4. 执行交换

**预期结果**：
- ✅ 返回了至少3个DEX的报价
- ✅ 选择了最优价格（价格最高或滑点最小）
- ✅ 交换执行成功

### 场景3: Agent授权和权限检查

**测试步骤**：
1. 创建Agent授权：
```bash
POST /api/agent-authorization
{
  "agentId": "agent-123",
  "walletAddress": "0x...",
  "authorizationType": "trading",
  "singleLimit": 1000,
  "dailyLimit": 10000,
  "strategyPermissions": [
    {
      "strategyType": "dca",
      "allowed": true,
      "maxAmount": 500
    },
    {
      "strategyType": "grid",
      "allowed": false
    }
  ]
}
```

2. 尝试执行允许的策略（DCA），验证成功
3. 尝试执行不允许的策略（Grid），验证被拒绝
4. 尝试超过限额，验证被拒绝

**预期结果**：
- ✅ 授权创建成功
- ✅ 允许的策略可以执行
- ✅ 不允许的策略被拒绝
- ✅ 超过限额被拒绝

### 场景4: 原子结算

**测试步骤**：
1. 创建跨链原子结算：
```bash
POST /api/trading/settlement
{
  "userId": "user-123",
  "settlementType": "cross_chain",
  "chains": ["ethereum", "solana"],
  "transactions": [
    {
      "chain": "ethereum",
      "fromToken": "USDT",
      "toToken": "ETH",
      "amount": 1000
    },
    {
      "chain": "solana",
      "fromToken": "SOL",
      "toToken": "USDC",
      "amount": 10
    }
  ],
  "totalAmount": 1010
}
```

2. 执行结算
3. 验证所有交易要么全部成功，要么全部回滚

**预期结果**：
- ✅ 结算创建成功
- ✅ 如果所有交易成功，结算状态为`completed`
- ✅ 如果任一交易失败，所有交易回滚，状态为`rolled_back`

### 场景5: Groq AI Function Calling

**测试步骤**：
1. 获取Function Schemas：
```bash
GET /api/groq/functions
```

2. 测试Function Call：
```bash
POST /api/groq/function-call
{
  "function": {
    "name": "search_paymind_products",
    "arguments": "{\"query\": \"耳机\"}"
  },
  "context": {
    "userId": "user-123"
  }
}
```

3. 测试完整对话：
```bash
GET /api/groq/test?query=帮我搜索耳机
```

**预期结果**：
- ✅ 返回了Function Schemas列表
- ✅ Function Call执行成功
- ✅ 对话中AI正确调用了Function

---

## 🔗 集成测试场景

### 场景1: 端到端交易流程

**流程**：
1. 用户通过Groq AI表达意图："帮我把10%资产换成BTC"
2. Groq调用`search_trading_intent` Function
3. IntentEngine处理意图，创建StrategyGraph
4. StrategyPermissionEngine检查权限
5. 如果允许，执行策略：
   - BestExecutionService寻找最优DEX
   - 执行交换
   - 记录到AtomicSettlement

**验证点**：
- ✅ 整个流程无错误
- ✅ 权限检查正确
- ✅ 交易执行成功
- ✅ 状态追踪正确

### 场景2: Agent授权 + 策略执行

**流程**：
1. 用户创建Agent授权，限制只能执行DCA策略
2. Agent尝试执行DCA策略，验证成功
3. Agent尝试执行Grid策略，验证被拒绝
4. Agent尝试执行超过限额的交易，验证被拒绝

**验证点**：
- ✅ 授权创建成功
- ✅ 允许的策略可以执行
- ✅ 不允许的策略被拒绝
- ✅ 限额检查正确

### 场景3: 多DEX聚合 + 原子结算

**流程**：
1. 用户发起大额跨链交易
2. BestExecutionService聚合多个DEX报价
3. 选择最优路径
4. 创建AtomicSettlement
5. 执行所有交易
6. 验证原子性（全部成功或全部回滚）

**验证点**：
- ✅ 多DEX报价聚合正确
- ✅ 最优路径选择正确
- ✅ 原子结算执行正确
- ✅ 失败回滚机制正确

---

## 📊 测试数据准备

### 1. 用户数据

```json
{
  "userId": "test-user-001",
  "email": "test@paymind.com",
  "walletAddress": "0x1234..."
}
```

### 2. Agent数据

```json
{
  "agentId": "test-agent-001",
  "name": "Trading Agent",
  "type": "trading"
}
```

### 3. 代币数据

```json
{
  "ethereum": {
    "USDT": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "ETH": "native",
    "USDC": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
  },
  "solana": {
    "SOL": "native",
    "USDC": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
  }
}
```

### 4. 测试授权配置

```json
{
  "agentId": "test-agent-001",
  "authorizationType": "trading",
  "singleLimit": 1000,
  "dailyLimit": 10000,
  "strategyPermissions": [
    {
      "strategyType": "dca",
      "allowed": true,
      "maxAmount": 500
    },
    {
      "strategyType": "swap",
      "allowed": true,
      "maxAmount": 1000
    },
    {
      "strategyType": "grid",
      "allowed": false
    }
  ]
}
```

---

## 🚀 快速开始测试

### 1. 启动服务

```bash
cd backend
npm run start:dev
```

### 2. 运行Groq测试脚本

```bash
npm run test:groq
# 或
ts-node scripts/test-groq-integration.ts
```

### 3. 使用Postman/curl测试API

参考上面的API端点列表和测试场景。

---

## 📝 测试检查清单

### Phase 1 功能
- [ ] 交易大模型：路由、风险评分、手续费估算
- [ ] 流动性网格：多DEX报价聚合、最优执行
- [ ] 意图交易系统：意图识别、策略图创建、市场监控

### Phase 2 功能
- [ ] Agent授权：创建、查询、撤销
- [ ] 策略权限：权限检查、限额验证
- [ ] 原子结算：创建、执行、回滚
- [ ] Groq集成：Function Calling、对话测试

### 集成测试
- [ ] 端到端交易流程
- [ ] Agent授权 + 策略执行
- [ ] 多DEX聚合 + 原子结算

---

## 🐛 已知限制

1. **智能拆单**：尚未实现（Phase 2待完成）
2. **批处理交易**：数据库表已创建，服务未实现
3. **实际链上交易**：当前为模拟实现，需要集成真实钱包签名
4. **MEV避险**：尚未实现

---

## 📚 相关文档

- `PayMind-ABTE方案分阶段实施计划.md` - 完整实施计划
- `PayMind-Groq集成完成报告.md` - Groq集成详情
- `PayMind-Agent授权系统实施完成报告.md` - Agent授权详情
- `PayMind-流动性网络适配器架构说明.md` - 流动性网格架构

---

**最后更新**: 2025-01-XX

