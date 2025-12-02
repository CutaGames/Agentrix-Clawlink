# EPAY 对接环境变量配置

## 📋 环境变量清单

在 `backend/.env` 文件中添加以下配置：

```bash
# ============ EPAY Provider 配置 ============

# EPAY 商户ID（测试账号：test2020@epay.com）
EPAY_MERCHANT_ID=test2020@epay.com

# EPAY API密钥（测试账号的收付款key）
EPAY_API_KEY=2d00b386231806ec7e18e2d96dc043aa

# EPAY 密钥（用于签名，与API_KEY相同）
EPAY_SECRET_KEY=2d00b386231806ec7e18e2d96dc043aa

# EPAY 测试环境URL（调试环境）
EPAY_TEST_URL=https://29597375fx.epaydev.xyz/epayweb

# EPAY 生产环境URL（生产环境后续自行添加）
EPAY_PRODUCTION_URL=https://api.epay.com

# EPAY Webhook URL（EPAY回调PayMind的地址）
# 测试环境
EPAY_WEBHOOK_URL=http://localhost:3001/api/payments/provider/epay/webhook

# 生产环境（需要配置公网可访问的URL）
# EPAY_WEBHOOK_URL=https://your-domain.com/api/payments/provider/epay/webhook

# EPAY 支付密码（测试账号）
EPAY_PAYMENT_PASSWORD=230032
```

## 🔧 配置说明

### 1. 测试环境配置（当前）

**测试账号信息**：
- **登录账号**: `test2020@epay.com`
- **登录密码**: `Epay@2025123`
- **收付款Key**: `2d00b386231806ec7e18e2d96dc043aa`（用作API_KEY和SECRET_KEY）
- **支付密码**: `230032`
- **测试环境链接**: https://29597375fx.epaydev.xyz/epayweb

**重要：IP白名单配置**
- ⚠️ **测试环境需要添加服务器出口IP到白名单后才能请求API**
- 📝 **配置步骤**：
  1. 登录EPAY测试环境：https://29597375fx.epaydev.xyz/epayweb
  2. 使用测试账号登录：`test2020@epay.com` / `Epay@2025123`
  3. 进入"开发者配置"
  4. 添加服务器出口IP到白名单

**获取服务器出口IP**：
```bash
# 方法1：使用curl查询
curl ifconfig.me

# 方法2：使用wget查询
wget -qO- ifconfig.me

# 方法3：使用dig查询（如果部署在云服务器）
dig +short myip.opendns.com @resolver1.opendns.com

# 方法4（推荐）：使用内置脚本一键获取 + 连通性测试
cd backend
npx ts-node scripts/get-server-ip-and-test-epay.ts
```

> 目前脚本会自动打印出口IP（最近一次为 `183.192.109.235`）并向 `https://29597375fx.epaydev.xyz/epayweb/api/v1/order/query` 发起连通性检测。若仍为 `405 Not Allowed`，说明EPAY侧尚未放通该接口或IP未完全生效，可在白名单确认后再次执行。

### 2. 生产环境配置

- 使用 `EPAY_PRODUCTION_URL` 指向EPAY的生产环境
- 确保 `EPAY_WEBHOOK_URL` 是公网可访问的HTTPS地址
- EPAY需要能够访问该URL进行回调
- **生产环境也需要在EPAY后台添加IP白名单**

### 3. 获取生产环境API凭证

1. **注册EPAY账户**
   - 访问EPAY官网注册账户
   - 完成企业认证

2. **申请API开通**
   - 联系EPAY客服或客户经理
   - 申请API接口权限

3. **获取凭证**
   - `merchant_id`: 商户ID
   - `api_key`: API密钥
   - `secret_key`: 签名密钥

## ⚠️ 注意事项

1. **IP白名单（重要）**
   - ⚠️ **测试环境必须添加服务器出口IP到白名单**
   - ⚠️ **生产环境也需要添加IP白名单**
   - 📝 配置步骤：登录EPAY后台 → 开发者配置 → 添加IP白名单
   - 📝 获取IP方法：`curl ifconfig.me`

2. **安全性**
   - ⚠️ `EPAY_SECRET_KEY` 是敏感信息，不要提交到代码仓库
   - ⚠️ 使用环境变量或密钥管理服务存储
   - ⚠️ 测试账号信息仅用于开发测试，不要用于生产环境

3. **Webhook URL**
   - ⚠️ 生产环境的Webhook URL必须是HTTPS
   - ⚠️ 需要在EPAY后台配置Webhook URL
   - ⚠️ 确保防火墙允许EPAY的IP访问
   - ⚠️ 本地开发可以使用ngrok等工具暴露本地服务

4. **测试环境**
   - ✅ 先在测试环境完成所有测试
   - ✅ 确认功能正常后再切换到生产环境
   - ✅ 测试环境链接：https://29597375fx.epaydev.xyz/epayweb

## 🚀 快速开始

1. **配置环境变量**
   ```bash
   cd backend
   cp .env.example .env
   # 编辑 .env 文件，添加EPAY配置
   ```

2. **重启后端服务**
   ```bash
   npm run start:dev
   ```

3. **验证配置**
   - 检查日志中是否有 "EPAY Provider registered successfully"
   - 如果没有，检查环境变量是否正确配置

## 📚 参考

- EPAY官方文档: https://opendocs.epay.com/gateway/cn/
- EPAY对接方案: `EPAY Provider评估与对接方案.md`

