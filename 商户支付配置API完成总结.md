# 商户支付配置API完成总结

**日期**: 2025年1月  
**状态**: ✅ **已完成**

---

## 📋 完成的功能

### 1. 后端API端点 ✅

**文件**: `backend/src/modules/merchant/merchant.controller.ts`

**新增端点**:
- ✅ `GET /api/merchant/payment-settings` - 获取商户支付配置
- ✅ `POST /api/merchant/payment-settings` - 更新商户支付配置

**实现细节**:
- 从User实体的`metadata.paymentSettings`字段读取配置
- 保存配置到User实体的`metadata.paymentSettings`字段
- 验证配置（如启用Off-ramp需要银行账户）
- 使用UserRepository保存到数据库

**配置结构**:
```typescript
{
  paymentConfig: 'fiat_only' | 'crypto_only' | 'both',
  autoOffRampEnabled: boolean,
  preferredFiatCurrency: string,
  bankAccount?: string,
  minOffRampAmount: number,
}
```

---

### 2. 前端API方法 ✅

**文件**: `paymindfrontend/lib/api/merchant.api.ts`

**新增方法**:
- ✅ `getPaymentSettings()` - 获取支付配置
- ✅ `updatePaymentSettings(settings)` - 更新支付配置

**使用示例**:
```typescript
// 获取配置
const settings = await merchantApi.getPaymentSettings();

// 更新配置
await merchantApi.updatePaymentSettings({
  paymentConfig: 'both',
  autoOffRampEnabled: true,
  preferredFiatCurrency: 'CNY',
  bankAccount: '1234567890',
  minOffRampAmount: 10,
});
```

---

### 3. 前端页面更新 ✅

**文件**: `paymindfrontend/pages/app/merchant/payment-settings.tsx`

**更新内容**:
- ✅ 移除localStorage临时存储
- ✅ 使用真实API获取配置
- ✅ 使用真实API保存配置
- ✅ 添加错误处理和默认配置fallback

**功能**:
- 页面加载时从后端获取配置
- 保存时调用后端API
- 如果API失败，使用默认配置并显示错误提示

---

### 4. 模块依赖更新 ✅

**文件**: `backend/src/modules/merchant/merchant.module.ts`

**更新内容**:
- ✅ 导入UserModule（用于UserRepository）
- ✅ 导入User实体到TypeOrmModule

**依赖关系**:
```
MerchantModule
  ├── UserModule (forwardRef)
  └── TypeOrmModule.forFeature([User])
```

---

## 🔧 技术实现

### 数据存储

**位置**: `User.metadata.paymentSettings`

**结构**:
```typescript
{
  metadata: {
    paymentSettings: {
      paymentConfig: 'both',
      autoOffRampEnabled: false,
      preferredFiatCurrency: 'CNY',
      bankAccount: '',
      minOffRampAmount: 10,
    }
  }
}
```

**优势**:
- 不需要创建新表
- 利用现有的User实体
- 灵活的JSON结构，易于扩展

---

### API端点详情

#### GET /api/merchant/payment-settings

**请求**: 无参数（从JWT token获取商户ID）

**响应**:
```json
{
  "paymentConfig": "both",
  "autoOffRampEnabled": false,
  "preferredFiatCurrency": "CNY",
  "bankAccount": "",
  "minOffRampAmount": 10
}
```

**逻辑**:
1. 从JWT token获取用户ID
2. 从数据库查询User实体
3. 从`metadata.paymentSettings`读取配置
4. 如果不存在，返回默认配置

---

#### POST /api/merchant/payment-settings

**请求体**:
```json
{
  "paymentConfig": "both",
  "autoOffRampEnabled": true,
  "preferredFiatCurrency": "CNY",
  "bankAccount": "1234567890",
  "minOffRampAmount": 10
}
```

**响应**:
```json
{
  "success": true,
  "settings": {
    "paymentConfig": "both",
    "autoOffRampEnabled": true,
    "preferredFiatCurrency": "CNY",
    "bankAccount": "1234567890",
    "minOffRampAmount": 10
  }
}
```

**验证**:
- 如果`autoOffRampEnabled`为`true`，必须提供`bankAccount`
- 如果验证失败，返回400错误

**逻辑**:
1. 验证配置参数
2. 从数据库查询User实体
3. 更新`metadata.paymentSettings`
4. 保存到数据库
5. 返回更新后的配置

---

## ✅ 测试建议

### 1. 获取配置测试

```bash
# 使用商户JWT token
curl -X GET http://localhost:3001/api/merchant/payment-settings \
  -H "Authorization: Bearer <merchant_jwt_token>"
```

**预期结果**:
- 返回默认配置或已保存的配置
- 如果用户不存在，返回400错误

---

### 2. 更新配置测试

```bash
# 更新配置
curl -X POST http://localhost:3001/api/merchant/payment-settings \
  -H "Authorization: Bearer <merchant_jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentConfig": "both",
    "autoOffRampEnabled": true,
    "preferredFiatCurrency": "CNY",
    "bankAccount": "1234567890",
    "minOffRampAmount": 10
  }'
```

**预期结果**:
- 返回成功响应和更新后的配置
- 配置已保存到数据库

---

### 3. 验证测试

```bash
# 测试验证逻辑（缺少银行账户）
curl -X POST http://localhost:3001/api/merchant/payment-settings \
  -H "Authorization: Bearer <merchant_jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentConfig": "both",
    "autoOffRampEnabled": true,
    "preferredFiatCurrency": "CNY",
    "bankAccount": "",
    "minOffRampAmount": 10
  }'
```

**预期结果**:
- 返回400错误："启用自动Off-ramp需要填写银行账户信息"

---

### 4. 前端测试

1. **登录商户后台**
   - 访问 `/app/merchant/payment-settings`
   - 验证配置加载成功

2. **更新配置**
   - 修改收款货币配置
   - 启用Off-ramp自动兑换
   - 填写银行账户信息
   - 点击"保存配置"
   - 验证保存成功提示

3. **验证配置**
   - 刷新页面
   - 验证配置已保存
   - 验证配置正确显示

---

## 🎯 完成情况

| 功能 | 后端 | 前端 | 状态 |
|------|------|------|------|
| 获取支付配置API | ✅ | ✅ | ✅ 完成 |
| 更新支付配置API | ✅ | ✅ | ✅ 完成 |
| 配置验证 | ✅ | ✅ | ✅ 完成 |
| 数据库存储 | ✅ | N/A | ✅ 完成 |
| 前端页面集成 | N/A | ✅ | ✅ 完成 |

---

## 🚀 可以开始测试

**所有功能已完成！**

**已完成功能**:
- ✅ 后端API端点（GET/POST）
- ✅ 前端API方法
- ✅ 前端页面集成
- ✅ 数据库存储
- ✅ 配置验证

**下一步**:
1. 测试后端API端点
2. 测试前端页面功能
3. 验证配置保存和加载
4. 测试配置验证逻辑

---

**完成日期**: 2025年1月  
**状态**: ✅ **所有功能已实现，可以开始测试**

