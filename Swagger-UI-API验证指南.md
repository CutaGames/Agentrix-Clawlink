# Swagger UI API 验证指南

**目标**: 在 Swagger UI 中逐步验证 V7.0 统一支付的所有 API 端点  
**访问地址**: http://localhost:3001/api/docs

---

## 📋 验证前准备

### 1. 确认服务运行状态

- ✅ 后端服务已启动（`npm run start:dev`）
- ✅ Swagger UI 可访问: http://localhost:3001/api/docs
- ✅ 环境变量已配置（合约地址、Relayer私钥等）

---

## 🔐 第一步：获取 JWT Token（认证）

### 方法1：注册新用户

1. **在 Swagger UI 中找到 `POST /api/auth/register`**
   - 展开该端点
   - 点击 "Try it out" 按钮

2. **填写请求体**：
```json
{
  "email": "test@example.com",
  "password": "Test123456",
  "agentrixId": "test-user-001"
}
```

3. **点击 "Execute"**

4. **预期响应**（200 OK）：
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "email": "test@example.com",
    "agentrixId": "test-user-001"
  }
}
```

5. **复制 `access_token` 值**（后续步骤需要使用）

### 方法2：登录现有用户

1. **找到 `POST /api/auth/login`**
   - 展开该端点
   - 点击 "Try it out"

2. **填写请求体**：
```json
{
  "email": "test@example.com",
  "password": "Test123456"
}
```

3. **点击 "Execute"**

4. **复制返回的 `access_token`**

### 设置全局认证（重要！）

1. **在 Swagger UI 页面顶部找到 "Authorize" 按钮**（🔒图标）
2. **点击 "Authorize"**
3. **在弹出的对话框中**：
   - 在 `bearer` 或 `Bearer` 字段中粘贴你的 `access_token`
   - 点击 "Authorize"
   - 点击 "Close"
4. **现在所有需要认证的 API 都会自动使用这个 Token**

---

## 🚀 第二步：测试 Pre-Flight Check API

### 端点：`GET /api/payment/preflight`

**功能**: 在200ms内返回支付路由建议（QuickPay / Wallet / Crypto-Rail）

### 操作步骤：

1. **找到 `GET /api/payment/preflight`**
   - 展开该端点
   - 点击 "Try it out"

2. **填写查询参数**：
   - `amount`: `10`（支付金额，单位：USDC）
   - `currency`: `USDC`（可选，默认USDC）

3. **点击 "Execute"**

### 预期响应（200 OK）：

```json
{
  "recommendedRoute": "quickpay",
  "quickPayAvailable": true,
  "sessionLimit": {
    "singleLimit": "10.00",
    "dailyLimit": "100.00",
    "dailyRemaining": "90.00"
  },
  "walletBalance": "1000.00",
  "requiresKYC": false,
  "estimatedTime": "< 1 second",
  "fees": {
    "gasFee": "0.001",
    "providerFee": "0",
    "total": "0.001"
  }
}
```

### 验证点：

- ✅ `recommendedRoute` 为 `"quickpay"`、`"wallet"` 或 `"crypto-rail"`
- ✅ `quickPayAvailable` 为 `true` 或 `false`（取决于是否有活跃Session）
- ✅ 响应时间 < 200ms（查看响应时间）

### 可能的路由结果：

1. **`"quickpay"`**: 用户有活跃Session，推荐使用QuickPay
2. **`"wallet"`**: 用户钱包余额充足，推荐直接钱包支付
3. **`"crypto-rail"`**: 用户需要法币入金，推荐使用Crypto-Rail

---

## 🔑 第三步：测试 Session 管理 API

### 3.1 创建 Session

**端点**: `POST /api/sessions`

**功能**: 创建 ERC-8004 Session Key 授权

#### 操作步骤：

1. **找到 `POST /api/sessions`**
   - 展开该端点
   - 点击 "Try it out"

2. **填写请求体**：
```json
{
  "signer": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "singleLimit": 10000000,
  "dailyLimit": 100000000,
  "expiryDays": 30,
  "signature": "0x...",
  "agentId": "my-agent-001"
}
```

**参数说明**：
- `signer`: Session Key 地址（EOA地址）
- `singleLimit`: 单笔限额（单位：USDC的最小单位，10000000 = 10 USDC）
- `dailyLimit`: 每日限额（单位：USDC的最小单位，100000000 = 100 USDC）
- `expiryDays`: 过期天数（30天）
- `signature`: 用户签名（可选，如果后端自动生成Session Key则不需要）
- `agentId`: Agent ID（可选）

3. **点击 "Execute"**

#### 预期响应（201 Created）：

```json
{
  "sessionId": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  "signer": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "singleLimit": "10.00",
  "dailyLimit": "100.00",
  "expiry": "2025-02-23T00:00:00.000Z",
  "createdAt": "2025-01-24T00:00:00.000Z",
  "status": "active"
}
```

#### 验证点：

- ✅ 返回 `sessionId`（32字节的hex字符串）
- ✅ `status` 为 `"active"`
- ✅ 合约中已创建Session（可在BSCScan验证）

#### 常见错误：

- `400 Bad Request`: 参数格式错误
- `401 Unauthorized`: Token无效或过期
- `500 Internal Server Error`: 合约调用失败（检查RPC连接）

---

### 3.2 获取用户的所有 Session

**端点**: `GET /api/sessions`

**功能**: 获取当前用户创建的所有Session

#### 操作步骤：

1. **找到 `GET /api/sessions`**
   - 展开该端点
   - 点击 "Try it out"

2. **点击 "Execute"**（无需参数）

#### 预期响应（200 OK）：

```json
[
  {
    "sessionId": "0x1234...",
    "signer": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "singleLimit": "10.00",
    "dailyLimit": "100.00",
    "expiry": "2025-02-23T00:00:00.000Z",
    "status": "active",
    "createdAt": "2025-01-24T00:00:00.000Z"
  },
  {
    "sessionId": "0x5678...",
    "signer": "0x...",
    "singleLimit": "5.00",
    "dailyLimit": "50.00",
    "expiry": "2025-02-20T00:00:00.000Z",
    "status": "revoked",
    "createdAt": "2025-01-20T00:00:00.000Z"
  }
]
```

---

### 3.3 获取活跃 Session

**端点**: `GET /api/sessions/active`

**功能**: 获取当前用户的活跃Session（用于QuickPay）

#### 操作步骤：

1. **找到 `GET /api/sessions/active`**
   - 展开该端点
   - 点击 "Try it out"

2. **点击 "Execute"**

#### 预期响应（200 OK）：

```json
{
  "sessionId": "0x1234...",
  "signer": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "singleLimit": "10.00",
  "dailyLimit": "100.00",
  "dailyRemaining": "90.00",
  "expiry": "2025-02-23T00:00:00.000Z",
  "status": "active"
}
```

**如果没有活跃Session**：
```json
{
  "message": "No active session found"
}
```

---

### 3.4 撤销 Session

**端点**: `DELETE /api/sessions/{sessionId}`

**功能**: 撤销指定的Session（链上调用）

#### 操作步骤：

1. **找到 `DELETE /api/sessions/{sessionId}`**
   - 展开该端点
   - 点击 "Try it out"

2. **填写路径参数**：
   - `sessionId`: 要撤销的Session ID（例如：`0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef`）

3. **点击 "Execute"**

#### 预期响应（200 OK）：

```json
{
  "success": true,
  "message": "Session revoked successfully",
  "txHash": "0x..."
}
```

#### 验证点：

- ✅ 返回 `txHash`（链上交易哈希）
- ✅ 合约中Session状态已更新为 `revoked`
- ✅ 可在BSCScan查看交易详情

---

## ⚡ 第四步：测试 Relayer QuickPay API

### 端点：`POST /api/relayer/quickpay`

**功能**: 处理QuickPay请求（链下验证 + 即时确认 + 异步上链）

### 操作步骤：

1. **找到 `POST /api/relayer/quickpay`**
   - 展开该端点
   - 点击 "Try it out"

2. **填写请求体**：
```json
{
  "sessionId": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  "paymentId": "payment_123456",
  "to": "0x2bee8AE78e4E41cf7facc4A4387A8F299dd2b8f3",
  "amount": "1000000",
  "signature": "0x...",
  "nonce": 1234567890
}
```

**参数说明**：
- `sessionId`: Session ID（从步骤3.1获取）
- `paymentId`: 支付ID（唯一标识，用于防重放）
- `to`: 收款地址（商户地址）
- `amount`: 支付金额（单位：USDC的最小单位，1000000 = 1 USDC）
- `signature`: Session Key的签名（EIP-191格式）
- `nonce`: 随机数（防重放攻击）

3. **点击 "Execute"**

### 预期响应（200 OK）：

```json
{
  "success": true,
  "paymentId": "payment_123456",
  "confirmedAt": "2025-01-24T10:30:00.000Z",
  "txHash": null,
  "message": "Payment confirmed instantly. Transaction will be batched on-chain."
}
```

**注意**: `txHash` 可能为 `null`，因为交易是异步批量上链的。

### 验证点：

- ✅ 响应时间 < 1秒（即时确认）
- ✅ `success` 为 `true`
- ✅ 返回 `confirmedAt` 时间戳
- ✅ 支付状态在数据库中已更新为 `COMPLETED`

### 常见错误：

- `400 Bad Request`: 签名验证失败
- `403 Forbidden`: Session已过期或已撤销
- `403 Forbidden`: 超出单笔限额或每日限额
- `500 Internal Server Error`: Relayer服务异常

---

## 📊 第五步：测试 Relayer 队列状态 API

### 端点：`GET /api/relayer/queue/status`

**功能**: 获取Relayer队列状态（监控用）

### 操作步骤：

1. **找到 `GET /api/relayer/queue/status`**
   - 展开该端点
   - 点击 "Try it out"

2. **点击 "Execute"**

### 预期响应（200 OK）：

```json
{
  "queueSize": 5,
  "pendingTransactions": 3,
  "lastBatchTime": "2025-01-24T10:25:00.000Z",
  "nextBatchTime": "2025-01-24T10:30:00.000Z",
  "batchInterval": 300000
}
```

**参数说明**：
- `queueSize`: 队列中待处理的支付数量
- `pendingTransactions`: 等待上链的交易数量
- `lastBatchTime`: 上次批量上链时间
- `nextBatchTime`: 下次批量上链时间
- `batchInterval`: 批量上链间隔（毫秒）

---

## 🔄 完整流程验证（端到端）

### 场景：用户使用 QuickPay 完成支付

#### 步骤1：创建 Session
- ✅ 调用 `POST /api/sessions` 创建Session
- ✅ 记录返回的 `sessionId`

#### 步骤2：Pre-Flight Check
- ✅ 调用 `GET /api/payment/preflight?amount=10&currency=USDC`
- ✅ 验证 `recommendedRoute` 为 `"quickpay"`
- ✅ 验证 `quickPayAvailable` 为 `true`

#### 步骤3：QuickPay 支付
- ✅ 使用Session Key签名支付请求
- ✅ 调用 `POST /api/relayer/quickpay`
- ✅ 验证即时确认（< 1秒）
- ✅ 验证支付状态已更新

#### 步骤4：验证链上交易
- ✅ 等待批量上链（查看Relayer日志）
- ✅ 在BSCScan查看交易详情
- ✅ 验证USDC转账成功

---

## 📝 验证结果记录表

完成验证后，记录结果：

| API端点 | 状态 | 响应时间 | 备注 |
|---------|------|----------|------|
| `POST /api/auth/register` | ✅ / ❌ | ___ms | |
| `POST /api/auth/login` | ✅ / ❌ | ___ms | |
| `GET /api/payment/preflight` | ✅ / ❌ | ___ms | 应 < 200ms |
| `POST /api/sessions` | ✅ / ❌ | ___ms | |
| `GET /api/sessions` | ✅ / ❌ | ___ms | |
| `GET /api/sessions/active` | ✅ / ❌ | ___ms | |
| `DELETE /api/sessions/{id}` | ✅ / ❌ | ___ms | |
| `POST /api/relayer/quickpay` | ✅ / ❌ | ___ms | 应 < 1秒 |
| `GET /api/relayer/queue/status` | ✅ / ❌ | ___ms | |

---

## 🐛 常见问题排查

### 问题1：401 Unauthorized

**原因**: Token无效或过期

**解决**:
1. 重新登录获取新的Token
2. 在 "Authorize" 中更新Token

### 问题2：500 Internal Server Error

**原因**: 后端服务异常

**排查**:
1. 查看后端日志
2. 检查环境变量配置
3. 检查RPC连接

### 问题3：Pre-Flight Check 超时

**原因**: RPC连接慢或失败

**解决**:
1. 检查 `RPC_URL` 配置
2. 使用更快的RPC服务（如NodeReal）
3. 添加RPC重试机制

### 问题4：Session创建失败

**原因**: 合约调用失败

**排查**:
1. 检查合约地址配置
2. 检查用户钱包USDC余额（需要授权）
3. 检查RPC连接

---

## 🎯 下一步

完成API验证后：

1. **前端验证**: 启动前端服务，测试智能收银台组件
2. **完整流程测试**: 按照时序图进行端到端测试
3. **性能测试**: 验证Pre-Flight Check < 200ms，QuickPay < 1秒
4. **压力测试**: 测试并发支付场景

---

**最后更新**: 2025-01-24  
**维护者**: Agentrix 开发团队

