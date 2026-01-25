# Transak 集成测试指南

## 测试前准备

### 1. 配置环境变量

确保已按照 [Transak 集成配置指南](./TRANSAK集成配置指南.md) 配置好环境变量。

### 2. 启动服务

```bash
# 启动后端
cd backend
npm run start:dev

# 启动前端（另一个终端）
cd frontend
npm run dev
```

### 3. 配置 ngrok（用于本地测试 webhook）

```bash
# 安装 ngrok（如果还没有）
# macOS: brew install ngrok
# 或从 https://ngrok.com/download 下载

# 启动 ngrok
ngrok http 3001

# 复制 HTTPS URL（例如：https://abc123.ngrok.io）
# 更新 backend/.env 中的 TRANSAK_WEBHOOK_URL
```

## 测试步骤

### 测试 1: 验证 Provider 注册

1. 启动后端服务
2. 查看启动日志，应该看到：
```
[TransakProviderService] Transak Provider registered successfully
[ProviderManagerService] Provider registered: transak (Transak)
```

如果看到警告，检查 `TRANSAK_API_KEY` 是否配置。

### 测试 2: 测试获取报价

使用 API 测试工具（如 Postman 或 curl）：

```bash
curl -X GET "http://localhost:3001/api/payments/provider/transak/quote?amount=100&fromCurrency=USD&toCurrency=USDC" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

预期响应：
```json
{
  "providerId": "transak",
  "rate": 0.9985,
  "fee": 1.5,
  "estimatedAmount": 99.85,
  "expiresAt": "2024-01-01T12:05:00.000Z"
}
```

### 测试 3: 测试前端 Widget 加载

1. 访问前端页面（例如：`http://localhost:3000/payment-demo`）
2. 打开浏览器开发者工具（F12）
3. 点击"使用 Transak 购买"按钮
4. 检查控制台，应该看到：
   - Transak SDK 加载成功
   - Widget 初始化成功

### 测试 4: 测试完整支付流程（测试环境）

1. **创建测试订单**
   - 在前端选择 Transak 支付方式
   - 输入金额（例如：10 USD）
   - 选择加密货币（例如：USDC）

2. **打开 Transak Widget**
   - Widget 应该正常显示
   - 使用测试银行卡信息（Transak 会提供）

3. **完成支付**
   - 在 Transak Widget 中完成支付流程
   - 使用测试数据（不需要真实银行卡）

4. **验证 Webhook**
   - 检查后端日志，应该看到 webhook 请求
   - 验证支付状态已更新

### 测试 5: 测试 Webhook 回调

#### 使用 Transak 测试工具

1. 登录 Transak Partner Dashboard
2. 进入 Webhook 测试工具
3. 发送测试 webhook 到你的 ngrok URL

#### 手动测试 Webhook

使用 curl 模拟 webhook：

```bash
curl -X POST "https://your-ngrok-url.ngrok.io/api/payments/provider/transak/webhook" \
  -H "Content-Type: application/json" \
  -H "X-Transak-Signature: YOUR_SIGNATURE" \
  -d '{
    "eventId": "ORDER_COMPLETED",
    "data": {
      "orderId": "test_order_123",
      "status": "COMPLETED",
      "fiatAmount": 100,
      "fiatCurrency": "USD",
      "cryptoAmount": 99.85,
      "cryptoCurrency": "USDC",
      "transactionHash": "0x123...",
      "partnerOrderId": "your_order_id"
    }
  }'
```

检查后端日志，应该看到：
```
[TransakWebhookController] Received Transak webhook: ...
[TransakWebhookController] Found payment ... for order ...
[TransakWebhookController] Payment ... marked as completed
```

### 测试 6: 测试错误处理

1. **无效 API Key**
   - 将 `TRANSAK_API_KEY` 设置为无效值
   - 重启服务
   - 应该看到警告日志

2. **Webhook 签名验证失败**
   - 发送一个无效签名的 webhook
   - 应该返回错误响应

3. **支付失败场景**
   - 在 Transak Widget 中取消支付
   - 验证错误回调被触发

## 测试检查清单

- [ ] Provider 成功注册
- [ ] 可以获取报价
- [ ] 前端 Widget 正常加载
- [ ] 可以打开 Transak Widget
- [ ] 支付流程可以完成
- [ ] Webhook 可以正常接收
- [ ] 支付状态正确更新
- [ ] 错误处理正常工作

## 常见问题排查

### 问题 1: Widget 无法加载

**症状**：点击按钮后 Widget 不显示

**排查步骤**：
1. 检查浏览器控制台是否有错误
2. 确认 `NEXT_PUBLIC_TRANSAK_API_KEY` 已配置
3. 检查网络连接，确认可以访问 `global.transak.com`
4. 查看 TransakWidget 组件的加载状态

### 问题 2: Webhook 收不到

**症状**：支付完成但后端没有收到 webhook

**排查步骤**：
1. 确认 ngrok 正在运行
2. 检查 `TRANSAK_WEBHOOK_URL` 配置是否正确
3. 在 Transak Dashboard 中确认 webhook URL 已配置
4. 检查后端日志，查看是否有请求到达
5. 使用 ngrok 的 Web Interface 查看请求历史

### 问题 3: 签名验证失败

**症状**：Webhook 返回 "Invalid signature"

**排查步骤**：
1. 确认 `TRANSAK_WEBHOOK_SECRET` 配置正确
2. 在 Transak Dashboard 中确认 Webhook Secret 匹配
3. 检查后端日志中的签名验证详情

### 问题 4: 找不到支付记录

**症状**：Webhook 收到但显示 "Payment not found"

**排查步骤**：
1. 确认 `partnerOrderId` 在创建支付时已设置
2. 检查支付记录的 `metadata` 中是否包含 `providerOrderId`
3. 查看后端日志中的订单 ID 匹配逻辑

## 生产环境测试

在生产环境部署前，确保：

1. **环境变量已更新为生产环境值**
   ```env
   TRANSAK_ENVIRONMENT=PRODUCTION
   TRANSAK_API_KEY=production_api_key
   TRANSAK_WEBHOOK_URL=https://www.agentrix.top/api/payments/provider/transak/webhook
   ```

2. **在 Transak Dashboard 中配置生产环境 Webhook**

3. **进行小额真实交易测试**

4. **监控日志和错误**

## 下一步

测试通过后：
- 查看 [Transak 官方文档](https://docs.transak.com/docs) 了解更多功能
- 根据业务需求自定义 Widget 样式和配置
- 集成到完整的支付流程中

