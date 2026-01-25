# Provider API密钥配置指南

## 📋 配置说明

Provider API密钥是可选的。如果未配置，系统将使用模拟模式（开发环境）。

### 配置步骤

1. **打开 `.env` 文件**
   ```bash
   cd backend
   # 如果.env不存在，复制.env.example
   cp .env.example .env
   ```

2. **添加Provider API密钥**

   在 `.env` 文件中添加以下配置：

   ```env
   # MoonPay API（可选）
   MOONPAY_API_KEY=your_moonpay_api_key

   # Alchemy Pay API（可选）
   ALCHEMY_PAY_API_KEY=your_alchemy_pay_api_key

   # Binance API（可选）
   BINANCE_API_KEY=your_binance_api_key
   BINANCE_API_SECRET=your_binance_api_secret
   ```

3. **重启后端服务**

   ```bash
   # 停止当前服务（Ctrl+C）
   # 重新启动
   npm run start:dev
   ```

## 🔑 获取API密钥

### MoonPay
1. 访问 https://www.moonpay.com/
2. 注册/登录账户
3. 进入开发者设置
4. 创建API密钥

### Alchemy Pay
1. 访问 https://alchemypay.com/
2. 注册/登录账户
3. 进入API设置
4. 创建API密钥

### Binance
1. 访问 https://www.binance.com/
2. 注册/登录账户
3. 进入API管理
4. 创建API密钥和Secret

## ⚠️ 注意事项

- **开发环境**：可以不配置API密钥，系统会使用模拟模式
- **生产环境**：建议配置真实API密钥以获得完整功能
- **安全性**：不要将API密钥提交到代码仓库
- **权限**：确保API密钥有足够的权限执行所需操作

## 🧪 测试

配置完成后，可以通过以下方式测试：

```bash
# 测试提现功能（会使用真实API）
curl -X POST http://localhost:3001/api/payments/withdraw \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "fromCurrency": "USDC",
    "toCurrency": "CNY",
    "bankAccount": "1234567890"
  }'
```

如果API密钥未配置或无效，系统会自动fallback到模拟模式。

