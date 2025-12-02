# EPAY Provider 评估与对接方案

## 📋 EPAY 概述

**EPAY** 是一家提供支付网关服务的平台，支持代收（收款）和代付（付款）功能。

**官方文档**: https://opendocs.epay.com/gateway/cn/

---

## ✅ EPAY 优势评估

### 1. **适合测试环境** ⭐⭐⭐⭐⭐
- ✅ **有调试环境**：提供测试环境，方便开发调试
- ✅ **对接简单**：收银台网关代收，商家对接简单，快速集成
- ✅ **API完善**：提供完整的API文档和接口
- ✅ **支持多种支付方式**：银行、电子钱包等

### 2. **功能匹配度** ⭐⭐⭐⭐
- ✅ **代收功能**（On-ramp）：✅ 支持
  - 收银台代收
  - 快捷代收
  - 支持多种支付渠道
- ✅ **代付功能**（Off-ramp）：✅ 支持
  - 银行代付
  - 电子钱包代付
- ✅ **转账功能**：✅ 支持 EPAY 转账

### 3. **对接难度** ⭐⭐⭐⭐
- ✅ **收银台对接**：简单，跳转EPAY网关实现代收
- ✅ **API对接**：提供完整API文档
- ✅ **签名机制**：有接口签名机制（需要实现）
- ✅ **异步通知**：支持异步通知回调

### 4. **商家要求** ⭐⭐⭐
- ⚠️ **需要注册EPAY账户**
- ⚠️ **需要完成企业认证**
- ⚠️ **需要API开通**

---

## 🔍 功能对比分析

| 功能 | EPAY支持 | PayMind需求 | 匹配度 |
|------|---------|------------|--------|
| **On-ramp（法币→数字货币）** | ✅ 代收 | ✅ 需要 | ✅ 完全匹配 |
| **Off-ramp（数字货币→法币）** | ✅ 代付 | ✅ 需要 | ✅ 完全匹配 |
| **多种支付方式** | ✅ 银行/电子钱包 | ✅ 需要 | ✅ 完全匹配 |
| **测试环境** | ✅ 调试环境 | ✅ 需要 | ✅ 完全匹配 |
| **API接口** | ✅ 完整API | ✅ 需要 | ✅ 完全匹配 |
| **异步通知** | ✅ 支持 | ✅ 需要 | ✅ 完全匹配 |
| **汇率查询** | ✅ 计算汇率接口 | ✅ 需要 | ✅ 完全匹配 |
| **订单查询** | ✅ 查询订单接口 | ✅ 需要 | ✅ 完全匹配 |

---

## 📊 对接方案设计

### 方案1：收银台对接（推荐用于初期测试）⭐⭐⭐⭐⭐

**优点**：
- ✅ 对接最简单，快速上线
- ✅ 无需处理复杂的支付流程
- ✅ EPAY负责KYC/AML
- ✅ 适合快速验证流程

**流程**：
```
用户选择法币支付 → PayMind创建订单 → 跳转EPAY收银台 → 用户完成支付 → EPAY回调通知 → PayMind接收USDC → 自动分账
```

**实现步骤**：
1. 调用EPAY"收银台代收"接口，获取收银台URL
2. 前端跳转到EPAY收银台
3. 用户完成支付
4. EPAY异步通知PayMind
5. PayMind验证签名，接收USDC
6. 调用Commission合约自动分账

### 方案2：API对接（推荐用于生产环境）⭐⭐⭐⭐

**优点**：
- ✅ 更灵活，可定制化
- ✅ 用户体验更好（无需跳转）
- ✅ 可以集成到PayMind UI中

**流程**：
```
用户选择法币支付 → PayMind调用EPAY API → EPAY返回支付链接/二维码 → 用户完成支付 → EPAY回调通知 → PayMind接收USDC → 自动分账
```

---

## 🛠️ 技术实现方案

### 1. EPAY Provider Service 实现

需要实现 `IProvider` 接口：

```typescript
export class EPAYProviderService implements IProvider {
  id = 'epay';
  name = 'EPAY Gateway';
  supportsOnRamp = true;
  supportsOffRamp = true;

  // 1. 获取报价（调用EPAY"计算汇率"接口）
  async getQuote(amount, fromCurrency, toCurrency): Promise<ProviderQuote> {
    // 调用 EPAY API: Before.计算汇率
  }

  // 2. 执行On-ramp（调用EPAY"收银台代收"或"快捷代收"接口）
  async executeOnRamp(params: OnRampParams): Promise<OnRampResult> {
    // 调用 EPAY API: Payment.收银台代收 或 Payment.快捷代收
    // 返回收银台URL或支付链接
  }

  // 3. 执行Off-ramp（调用EPAY"代付"接口）
  async executeOffRamp(params: OffRampParams): Promise<OffRampResult> {
    // 调用 EPAY API: Payment.BANK-创建订单 或 Payment.EWALLET-创建订单
  }
}
```

### 2. EPAY API 接口映射

| PayMind需求 | EPAY API | 说明 |
|------------|---------|------|
| 获取汇率 | `Before.计算汇率` | 获取法币→数字货币汇率 |
| 创建On-ramp订单 | `Payment.收银台代收` | 创建代收订单，返回收银台URL |
| 创建Off-ramp订单 | `Payment.BANK-创建订单` | 创建银行代付订单 |
| 查询订单状态 | `After.查询订单` | 查询订单支付状态 |
| 接收支付通知 | `异步通知` | EPAY回调PayMind Webhook |

### 3. 签名机制

EPAY使用接口签名机制，需要：
- ✅ 实现签名生成函数
- ✅ 实现签名验证函数（用于Webhook回调）
- ✅ 参考EPAY文档的"接口签名"章节

### 4. Webhook处理

需要实现EPA的异步通知处理：
- ✅ 接收EPAY回调
- ✅ 验证签名
- ✅ 更新订单状态
- ✅ 触发Commission合约分账

---

## 📝 对接步骤

### 阶段1：准备阶段（1-2天）

1. **注册EPAY账户**
   - 访问EPAY官网注册
   - 完成企业认证
   - 申请API开通

2. **获取API凭证**
   - 获取 `merchant_id`
   - 获取 `api_key` / `secret_key`
   - 获取测试环境配置

3. **阅读文档**
   - 熟悉EPAY API文档
   - 理解签名机制
   - 理解异步通知流程

### 阶段2：开发阶段（3-5天）

1. **实现EPAY Provider Service**
   - 实现 `EPAYProviderService` 类
   - 实现签名生成和验证
   - 实现API调用封装

2. **实现Webhook处理**
   - 创建 `EPAYWebhookController`
   - 实现签名验证
   - 实现订单状态更新

3. **集成到Payment Flow**
   - 在 `ProviderManagerService` 中注册EPAY
   - 更新前端UI，显示EPAY选项
   - 测试完整支付流程

### 阶段3：测试阶段（2-3天）

1. **测试环境测试**
   - 使用EPAY调试环境
   - 测试On-ramp流程
   - 测试Off-ramp流程
   - 测试Webhook回调

2. **集成测试**
   - 测试与Commission合约的集成
   - 测试分账流程
   - 测试错误处理

### 阶段4：上线准备（1-2天）

1. **生产环境配置**
   - 配置生产环境API凭证
   - 配置生产环境Webhook URL
   - 进行生产环境测试

---

## ⚠️ 注意事项

### 1. **合规要求**
- ⚠️ EPAY需要企业认证，可能需要营业执照等材料
- ⚠️ 需要完成KYC/AML流程（EPAY负责）
- ⚠️ 需要遵守EPAY的服务条款

### 2. **技术注意事项**
- ⚠️ 签名机制需要严格按照EPAY文档实现
- ⚠️ 异步通知需要验证签名，防止伪造
- ⚠️ 需要处理订单超时、失败等情况
- ⚠️ 需要实现订单查询接口，用于对账

### 3. **费用考虑**
- ⚠️ EPAY可能有手续费，需要了解费率
- ⚠️ 测试环境可能有免费额度限制
- ⚠️ 生产环境需要评估成本

---

## 🎯 推荐策略

### 初期（测试阶段）
1. ✅ **使用EPAY调试环境**进行开发测试
2. ✅ **使用收银台对接**，快速验证流程
3. ✅ **实现基础功能**：On-ramp、订单查询、Webhook

### 中期（逐步完善）
1. ✅ **优化用户体验**：考虑API对接，减少跳转
2. ✅ **完善错误处理**：处理各种异常情况
3. ✅ **实现Off-ramp**：支持商户提现

### 后期（多Provider支持）
1. ✅ **接入其他Provider**：MoonPay、Alchemy Pay、Binance等
2. ✅ **实现Provider比价**：选择最优汇率
3. ✅ **实现Provider切换**：某个Provider失败时自动切换

---

## 📚 参考资源

- **EPAY官方文档**: https://opendocs.epay.com/gateway/cn/
- **接口签名文档**: 需要查看EPAY文档的"接口签名"章节
- **异步通知文档**: 需要查看EPAY文档的"异步通知"章节
- **API列表**: 需要查看EPAY文档的"API列表"章节

---

## ✅ 结论

**EPAY非常适合作为初期测试的Provider**，原因：

1. ✅ **功能完整**：支持On-ramp和Off-ramp
2. ✅ **对接简单**：收银台对接快速上线
3. ✅ **有测试环境**：方便开发调试
4. ✅ **文档完善**：有完整的API文档
5. ✅ **适合渐进式接入**：可以先对接EPAY，再逐步接入其他Provider

**建议**：
- 🎯 **立即开始**：注册EPAY账户，申请API开通
- 🎯 **优先实现**：On-ramp功能（收银台对接）
- 🎯 **逐步完善**：Off-ramp功能、API对接、多Provider支持

