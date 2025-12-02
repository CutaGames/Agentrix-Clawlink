# PayMind V7.0 测试验证指南

**版本**: V7.0  
**日期**: 2025年1月

---

## 🧪 测试流程

### 第一步：验证服务启动

#### 1.1 检查后端服务

```bash
cd backend
npm run start:dev
```

**验证点**:
- ✅ 服务启动成功（无错误）
- ✅ 数据库连接成功
- ✅ 所有模块加载成功

**预期输出**:
```
[Nest] INFO  PayMindRelayerService Relayer initialized with contract: 0x...
[Nest] INFO  PreflightCheckService Pre-flight check service initialized
```

#### 1.2 检查前端服务

```bash
cd paymindfrontend
npm run dev
```

**验证点**:
- ✅ 前端启动成功
- ✅ 可以访问 http://localhost:3000
- ✅ 无编译错误

---

### 第二步：验证 API 端点

#### 2.1 测试 Pre-Flight Check

```bash
# 需要先获取 JWT Token（通过登录）
curl -X GET "http://localhost:3001/payment/preflight?amount=10&currency=USDC" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**预期响应**:
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
  "estimatedTime": "< 1 second"
}
```

#### 2.2 测试 Session 创建

```bash
curl -X POST "http://localhost:3001/sessions" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "signer": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "singleLimit": 10000000,
    "dailyLimit": 100000000,
    "expiryDays": 30,
    "signature": "0x..."
  }'
```

**预期响应**:
```json
{
  "sessionId": "0x...",
  "signer": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "singleLimit": "10.00",
  "dailyLimit": "100.00",
  "expiry": "2025-02-01T00:00:00.000Z",
  "createdAt": "2025-01-01T00:00:00.000Z"
}
```

#### 2.3 测试 Relayer QuickPay

```bash
curl -X POST "http://localhost:3001/relayer/quickpay" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "0x...",
    "paymentId": "payment_123",
    "to": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "amount": "1000000",
    "signature": "0x...",
    "nonce": 1234567890
  }'
```

**预期响应**:
```json
{
  "success": true,
  "paymentId": "payment_123",
  "confirmedAt": "2025-01-01T00:00:00.000Z"
}
```

---

### 第三步：前端功能测试

#### 3.1 测试 Session Key 生成

在浏览器控制台运行：

```javascript
import { SessionKeyManager } from '@/lib/session-key-manager';

// 生成 Session Key
const sessionKey = await SessionKeyManager.generateSessionKey();
console.log('Session Key:', sessionKey);

// 列出所有 Session Key
const keys = await SessionKeyManager.listSessionKeys();
console.log('All Session Keys:', keys);
```

**验证点**:
- ✅ Session Key 生成成功
- ✅ 私钥已加密存储
- ✅ 可以列出所有 Session Key

#### 3.2 测试智能收银台

```typescript
// 在 React 组件中使用
import { SmartCheckout } from '@/components/payment/SmartCheckout';

function TestCheckout() {
  const order = {
    id: 'test_order_123',
    amount: 9.90,
    currency: 'USDC',
    description: 'Test Payment',
    merchantId: 'test_merchant',
    to: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  };

  return (
    <SmartCheckout
      order={order}
      onSuccess={(result) => console.log('Success:', result)}
      onCancel={() => console.log('Cancelled')}
    />
  );
}
```

**验证点**:
- ✅ Pre-Flight Check 自动执行
- ✅ UI 根据路由结果动态渲染
- ✅ QuickPay 按钮可用（如果有 Session）
- ✅ 支付流程正常

#### 3.3 测试 Session 管理

```typescript
// 在 React 组件中使用
import { SessionManager } from '@/components/payment/SessionManager';

function TestSessionManager() {
  return <SessionManager />;
}
```

**验证点**:
- ✅ Session 列表显示正常
- ✅ 创建 Session 表单可用
- ✅ 撤销 Session 功能正常
- ✅ 限额显示正确

---

### 第四步：完整流程测试

#### 4.1 QuickPay 完整流程

1. **创建 Session**
   ```typescript
   // 使用 SessionManager 组件创建
   // 或通过 API 创建
   ```

2. **Pre-Flight Check**
   ```typescript
   // SmartCheckout 组件自动执行
   // 应该返回 quickPayAvailable: true
   ```

3. **执行 QuickPay**
   ```typescript
   // 点击 QuickPay 按钮
   // 应该立即确认（< 1秒）
   ```

4. **验证结果**
   ```typescript
   // 检查支付记录状态
   // 应该为 'completed'
   // 稍后检查 transactionHash（异步上链）
   ```

#### 4.2 Wallet 支付流程

1. **Pre-Flight Check**
   ```typescript
   // 如果没有 Session 或余额不足
   // 应该返回 recommendedRoute: 'wallet'
   ```

2. **连接钱包**
   ```typescript
   // 用户连接钱包
   // 钱包签名确认
   ```

3. **链上确认**
   ```typescript
   // 等待链上确认
   // 更新支付状态
   ```

#### 4.3 Crypto-Rail 流程

1. **Pre-Flight Check**
   ```typescript
   // 如果余额不足
   // 应该返回 recommendedRoute: 'crypto-rail'
   ```

2. **Provider 选择**
   ```typescript
   // 显示 Provider 选项（MoonPay/Meld）
   // 用户选择 Provider
   ```

3. **完成支付**
   ```typescript
   // 在 Provider 页面完成支付
   // USDC 到账
   // 链上结算
   ```

---

## 🔍 问题排查

### 问题 1: Pre-Flight Check 返回错误

**症状**: API 返回 500 错误或超时

**排查步骤**:
1. 检查 RPC 连接
   ```bash
   curl -X POST $RPC_URL \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
   ```

2. 检查合约地址
   ```bash
   echo $ERC8004_CONTRACT_ADDRESS
   ```

3. 查看后端日志
   ```bash
   # 查看 PreflightCheckService 日志
   ```

**解决方案**:
- 确保 RPC URL 可访问
- 确认合约地址正确
- 检查环境变量配置

---

### 问题 2: Relayer 服务无法启动

**症状**: Relayer 服务启动失败

**排查步骤**:
1. 检查环境变量
   ```bash
   echo $RELAYER_PRIVATE_KEY
   echo $RPC_URL
   ```

2. 检查钱包余额（用于付 Gas）
   ```bash
   # 在链上查询 Relayer 地址余额
   ```

**解决方案**:
- 确保 `RELAYER_PRIVATE_KEY` 已设置
- 确保 Relayer 钱包有足够的 Gas
- 检查 RPC 连接

---

### 问题 3: Session Key 生成失败

**症状**: 浏览器报错或无法生成

**排查步骤**:
1. 检查浏览器支持
   ```javascript
   console.log('Web Crypto API:', !!window.crypto?.subtle);
   console.log('IndexedDB:', !!window.indexedDB);
   ```

2. 检查控制台错误
   ```javascript
   // 查看浏览器控制台
   ```

**解决方案**:
- 使用现代浏览器（Chrome, Firefox, Safari 最新版）
- 确保使用 HTTPS 或 localhost
- 检查浏览器权限设置

---

### 问题 4: 支付确认但未上链

**症状**: QuickPay 立即确认，但 transactionHash 为空

**排查步骤**:
1. 检查 Relayer 队列
   ```bash
   curl -X GET "http://localhost:3001/relayer/queue/status" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
   ```

2. 查看 Relayer 日志
   ```bash
   # 查看 PayMindRelayerService 日志
   ```

**解决方案**:
- 这是正常的！QuickPay 是即时确认 + 异步上链
- 等待批量上链（最多 30 秒）
- 检查 Relayer 服务是否正常运行

---

## 📊 性能测试

### 测试 Pre-Flight Check 响应时间

```bash
# 使用 time 命令测试
time curl -X GET "http://localhost:3001/payment/preflight?amount=10&currency=USDC" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**目标**: < 200ms

### 测试 QuickPay 确认时间

```javascript
const startTime = Date.now();
await paymentApi.relayerQuickPay({...});
const elapsed = Date.now() - startTime;
console.log('QuickPay confirmed in:', elapsed, 'ms');
```

**目标**: < 1000ms

### 测试批量上链 Gas 节省

```bash
# 查看 Relayer 日志中的 gasUsed
# 对比单笔执行和批量执行的 Gas
```

**目标**: > 30% 节省

---

## ✅ 测试检查清单

### 功能测试
- [ ] Pre-Flight Check 正常工作
- [ ] Session 创建成功
- [ ] Session 撤销成功
- [ ] QuickPay 即时确认
- [ ] 批量上链正常
- [ ] Wallet 支付正常
- [ ] Crypto-Rail 流程正常

### 性能测试
- [ ] Pre-Flight Check < 200ms
- [ ] QuickPay 确认 < 1s
- [ ] 批量上链 Gas 节省 > 30%

### 安全测试
- [ ] 签名验证正常
- [ ] Nonce 防重放正常
- [ ] 限额保护正常
- [ ] Session Key 加密存储

### UI 测试
- [ ] 智能收银台渲染正常
- [ ] Session 管理界面正常
- [ ] 错误提示正常
- [ ] 响应式设计正常

---

## 🎯 下一步

1. **完成所有测试项**
2. **修复发现的问题**
3. **性能优化**
4. **部署到测试网**
5. **生产环境部署**

---

**文档版本**: V1.0  
**最后更新**: 2025年1月

