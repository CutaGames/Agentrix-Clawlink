# Pre-Flight Check 响应分析

**测试时间**: 2025-01-24  
**API端点**: `GET /api/payment/preflight?amount=10&currency=USDC`

---

## 📊 当前响应

```json
{
  "recommendedRoute": "crypto-rail",
  "quickPayAvailable": false,
  "requiresKYC": true,
  "estimatedTime": "2-5 minutes"
}
```

---

## 🔍 响应分析

### ✅ 响应状态：正常

根据代码逻辑（`preflight-check.service.ts` 第95-101行），当用户**没有连接钱包**时，会返回这个简化响应：

```typescript
if (!wallet) {
  return {
    recommendedRoute: 'crypto-rail',
    quickPayAvailable: false,
    requiresKYC: true,
    estimatedTime: '2-5 minutes',
  };
}
```

### 📋 字段说明

| 字段 | 值 | 含义 |
|------|-----|------|
| `recommendedRoute` | `"crypto-rail"` | 推荐使用法币入金（因为用户没有钱包） |
| `quickPayAvailable` | `false` | QuickPay不可用（因为没有Session） |
| `requiresKYC` | `true` | 需要KYC验证（新用户） |
| `estimatedTime` | `"2-5 minutes"` | 预计完成时间 |

### ⚠️ 缺失的字段

如果用户**已连接钱包**，响应应该包含：

```json
{
  "recommendedRoute": "...",
  "quickPayAvailable": false,
  "sessionLimit": {          // ❌ 缺失（因为没有Session）
    "singleLimit": "...",
    "dailyLimit": "...",
    "dailyRemaining": "..."
  },
  "walletBalance": "...",   // ❌ 缺失（因为没有钱包）
  "requiresKYC": true,
  "estimatedTime": "...",
  "fees": {                  // ❌ 缺失（因为没有钱包）
    "gasFee": "...",
    "providerFee": "...",
    "total": "..."
  }
}
```

---

## 🎯 原因分析

### 为什么返回简化响应？

1. **用户没有连接钱包**
   - `WalletConnection` 表中没有该用户的记录
   - 或者 `isDefault: true` 的钱包不存在

2. **代码逻辑**
   - 第91-93行：查询用户默认钱包
   - 第95行：如果没有钱包，直接返回简化响应
   - 因此不会查询余额、Session等信息

---

## ✅ 这是正常行为

**当前响应完全正常**，因为：
- ✅ 用户确实没有连接钱包
- ✅ 系统正确推荐了 `crypto-rail`（法币入金）
- ✅ 符合V7.0的设计逻辑

---

## 🔄 如何获得完整响应？

### 方法1：连接钱包后测试

1. **在数据库中创建钱包连接记录**：
   ```sql
   INSERT INTO wallet_connections (user_id, wallet_address, is_default, created_at, updated_at)
   VALUES (
     '246cd785-1a73-480b-b528-21b9d40d72c2',  -- 你的用户ID
     '0x2bee8AE78e4E41cf7facc4A4387A8F299dd2b8f3',  -- 钱包地址
     true,
     NOW(),
     NOW()
   );
   ```

2. **再次调用Pre-Flight Check**，应该会返回：
   ```json
   {
     "recommendedRoute": "wallet" | "quickpay" | "crypto-rail",
     "quickPayAvailable": false,
     "walletBalance": "1000.00",  // ✅ 会显示
     "requiresKYC": true,
     "estimatedTime": "...",
     "fees": {                     // ✅ 会显示
       "gasFee": "...",
       "total": "..."
     }
   }
   ```

### 方法2：通过前端连接钱包

在前端界面中：
1. 连接MetaMask或其他钱包
2. 钱包地址会自动保存到 `WalletConnection` 表
3. 再次测试Pre-Flight Check

---

## 📈 完整响应示例

### 场景1：有钱包，有Session，余额充足

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
    "gasFee": "0",
    "providerFee": "0",
    "total": "0"
  }
}
```

### 场景2：有钱包，无Session，余额充足

```json
{
  "recommendedRoute": "wallet",
  "quickPayAvailable": false,
  "walletBalance": "1000.00",
  "requiresKYC": false,
  "estimatedTime": "30-60 seconds",
  "fees": {
    "gasFee": "~$0.50",
    "total": "~$0.50"
  }
}
```

### 场景3：有钱包，余额不足（当前场景）

```json
{
  "recommendedRoute": "crypto-rail",
  "quickPayAvailable": false,
  "walletBalance": "0.00",
  "requiresKYC": true,
  "estimatedTime": "2-5 minutes",
  "fees": {
    "providerFee": "~2.9%",
    "total": "~$0.29"
  }
}
```

---

## 🎯 结论

### ✅ 当前响应是正常的

- 用户没有连接钱包 → 返回简化响应
- 推荐路由 `crypto-rail` 是正确的
- 系统逻辑工作正常

### 📝 下一步建议

1. **连接钱包**：在前端或数据库中创建钱包连接记录
2. **再次测试**：验证完整响应是否包含 `walletBalance` 和 `fees`
3. **创建Session**：测试QuickPay流程

---

**最后更新**: 2025-01-24  
**状态**: ✅ 响应正常，符合预期

