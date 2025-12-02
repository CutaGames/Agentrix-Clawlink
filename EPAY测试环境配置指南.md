# EPAY 测试环境配置指南

## 📋 测试账号信息

**测试环境链接**: https://29597375fx.epaydev.xyz/epayweb

**测试账号**:
- **登录账号**: `test2020@epay.com`
- **登录密码**: `Epay@2025123`
- **收付款Key**: `2d00b386231806ec7e18e2d96dc043aa`（用作API_KEY和SECRET_KEY）
- **支付密码**: `230032`

## ⚠️ 重要：IP白名单配置

**测试环境必须添加服务器出口IP到白名单后才能请求API**

### 配置步骤

1. **登录EPAY测试环境**
   - 访问：https://29597375fx.epaydev.xyz/epayweb
   - 使用测试账号登录：`test2020@epay.com` / `Epay@2025123`

2. **进入开发者配置**
   - 登录后，进入"开发者配置"页面
   - 找到"IP白名单"设置

3. **获取服务器出口IP**
   ```bash
   # 方法1：使用curl查询（推荐）
   curl ifconfig.me
   
   # 方法2：使用wget查询
   wget -qO- ifconfig.me
   
   # 方法3：使用dig查询（如果部署在云服务器）
   dig +short myip.opendns.com @resolver1.opendns.com
   
   # 方法4：在WSL中查询
   curl -s https://api.ipify.org
   ```

4. **添加IP到白名单**
   - 在EPAY后台的"IP白名单"中添加查询到的IP地址
   - 保存配置

### 注意事项

- ⚠️ **本地开发环境**：如果后端运行在本地（localhost），需要查询本地网络的公网IP
- ⚠️ **云服务器**：如果后端部署在云服务器，需要添加云服务器的公网IP
- ⚠️ **动态IP**：如果IP是动态的，可能需要定期更新白名单
- ⚠️ **生产环境**：生产环境也需要在EPAY后台添加IP白名单

## 🔧 环境变量配置

在 `backend/.env` 文件中添加以下配置：

```bash
# ============ EPAY Provider 配置 ============

# EPAY 商户ID（测试账号）
EPAY_MERCHANT_ID=test2020@epay.com

# EPAY API密钥（测试账号的收付款key）
EPAY_API_KEY=2d00b386231806ec7e18e2d96dc043aa

# EPAY 密钥（用于签名，与API_KEY相同）
EPAY_SECRET_KEY=2d00b386231806ec7e18e2d96dc043aa

# EPAY 测试环境URL
EPAY_TEST_URL=https://29597375fx.epaydev.xyz/epayweb

# EPAY 生产环境URL（生产环境后续自行添加）
EPAY_PRODUCTION_URL=https://api.epay.com

# EPAY Webhook URL（EPAY回调PayMind的地址）
# 测试环境（本地开发）
EPAY_WEBHOOK_URL=http://localhost:3001/api/payments/provider/epay/webhook

# 测试环境（如果使用ngrok等工具暴露本地服务）
# EPAY_WEBHOOK_URL=https://your-ngrok-url.ngrok.io/api/payments/provider/epay/webhook

# 生产环境（需要配置公网可访问的HTTPS地址）
# EPAY_WEBHOOK_URL=https://your-domain.com/api/payments/provider/epay/webhook

# EPAY 支付密码（测试账号，某些API可能需要）
EPAY_PAYMENT_PASSWORD=230032
```

## 🧪 测试步骤

### 1. 验证IP白名单

```bash
# 查询当前服务器出口IP
curl ifconfig.me

# 确认该IP已添加到EPAY后台白名单
```

### 2. 验证环境变量

```bash
# 检查环境变量是否正确配置
cd backend
cat .env | grep EPAY
```

### 3. 启动后端服务

```bash
cd backend
npm run start:dev
```

### 4. 检查日志

查看后端启动日志，确认EPAY Provider已注册：
```
[EPAYProviderService] EPAY Provider registered successfully
```

如果没有看到此日志，检查：
- 环境变量是否正确配置
- IP白名单是否已添加
- 网络连接是否正常

### 5. 测试API调用

```bash
# 测试获取汇率（需要先配置IP白名单）
curl -X GET "http://localhost:3001/api/payments/fiat-to-crypto/quotes?fromAmount=100&fromCurrency=CNY&toCurrency=USDT"
```

## 📚 参考文档

- **EPAY官方文档**: https://opendocs.epay.com/gateway/cn/
- **EPAY对接方案**: `EPAY Provider评估与对接方案.md`
- **环境变量配置**: `EPAY对接环境变量配置.md`

## 🔍 常见问题

### Q1: API调用返回403或IP被拒绝

**原因**: 服务器出口IP未添加到EPAY白名单

**解决**:
1. 查询服务器出口IP：`curl ifconfig.me`
2. 登录EPAY测试环境后台
3. 在"开发者配置"中添加IP到白名单
4. 等待1-2分钟让配置生效
5. 重新测试API调用

### Q2: 签名验证失败

**原因**: SECRET_KEY配置错误

**解决**:
1. 确认 `EPAY_SECRET_KEY` 与 `EPAY_API_KEY` 相同（测试账号）
2. 检查签名生成逻辑是否正确
3. 参考EPAY文档的"接口签名"章节

### Q3: Webhook无法接收回调

**原因**: Webhook URL不可访问

**解决**:
1. 本地开发：使用ngrok等工具暴露本地服务
2. 测试环境：确保Webhook URL是公网可访问的HTTPS地址
3. 检查防火墙设置，确保EPAY可以访问Webhook URL

### Q4: 测试环境URL无法访问

**原因**: 网络问题或URL配置错误

**解决**:
1. 确认测试环境URL：`https://29597375fx.epaydev.xyz/epayweb`
2. 检查网络连接
3. 尝试在浏览器中直接访问测试环境链接

