# Transak 环境变量配置说明

## 概述

Transak 使用 **API Key** 进行身份验证。虽然 Create Session API 的 header 名称是 `access-token`，但实际传入的值是 **API Key**（不是 OAuth access token）。

## 开发环境 vs 生产环境

### 主要区别

1. **API Key 不同**：开发环境和生产环境使用不同的 API Key
2. **API URL 不同**：
   - 开发环境（STAGING）：`https://api-staging.transak.com`
   - 生产环境（PRODUCTION）：`https://api.transak.com`
3. **Widget URL 不同**：
   - 开发环境（STAGING）：`https://staging-global.transak.com`
   - 生产环境（PRODUCTION）：`https://global.transak.com`

## 后端环境变量（backend/.env）

```bash
# ===== Transak Provider配置 =====

# Transak API Key（必需）
# 从 Transak Dashboard 获取：https://dashboard.transak.com/
# 开发环境和生产环境使用不同的 API Key
TRANSAK_API_KEY=your_transak_api_key_here

# Transak Access Token（可选）
# 如果 Create Session API 需要单独的 token，可以设置此项
# 如果未设置，将使用 TRANSAK_API_KEY
# 注意：Create Session API 的 'access-token' header 实际使用的是 API Key
TRANSAK_ACCESS_TOKEN=

# Transak 环境（必需）
# STAGING: 使用测试环境
# PRODUCTION: 使用生产环境
TRANSAK_ENVIRONMENT=STAGING

# Transak Webhook Secret（推荐）
# 从 Transak Dashboard 的 Webhook 设置中获取
# 用于验证 Webhook 签名的安全性
TRANSAK_WEBHOOK_SECRET=your_transak_webhook_secret_here

# Transak Webhook URL（可选）
# 如果未设置，默认使用：${API_BASE_URL}/api/payments/provider/transak/webhook
TRANSAK_WEBHOOK_URL=

# Transak Referrer Domain（可选）
# 用于 Create Session API 的 referrerDomain 参数
# 如果未设置，将从 FRONTEND_URL 自动提取域名
# 例如：如果 FRONTEND_URL=https://paymind.io，则 referrerDomain=paymind.io
TRANSAK_REFERRER_DOMAIN=

# 其他相关环境变量（已存在）
FRONTEND_URL=http://localhost:3000
API_BASE_URL=http://localhost:3001
```

## 前端环境变量（frontend/.env.local）

```bash
# ===== Transak Widget配置 =====

# Transak API Key（必需）
# 与后端使用相同的 API Key
# 注意：前端使用 NEXT_PUBLIC_ 前缀，因为需要在浏览器中访问
NEXT_PUBLIC_TRANSAK_API_KEY=your_transak_api_key_here

# Transak 环境（必需）
# STAGING: 使用测试环境
# PRODUCTION: 使用生产环境
NEXT_PUBLIC_TRANSAK_ENVIRONMENT=STAGING
```

## 环境变量说明

### 必需的环境变量

#### 后端
- `TRANSAK_API_KEY`：Transak API Key（从 Dashboard 获取）
- `TRANSAK_ENVIRONMENT`：环境类型（STAGING 或 PRODUCTION）

#### 前端
- `NEXT_PUBLIC_TRANSAK_API_KEY`：Transak API Key（与后端相同）
- `NEXT_PUBLIC_TRANSAK_ENVIRONMENT`：环境类型（STAGING 或 PRODUCTION）

### 可选的环境变量

#### 后端
- `TRANSAK_ACCESS_TOKEN`：如果 Create Session API 需要单独的 token（通常不需要，使用 API Key 即可）
- `TRANSAK_WEBHOOK_SECRET`：用于验证 Webhook 签名（推荐设置以提高安全性）
- `TRANSAK_WEBHOOK_URL`：自定义 Webhook URL（默认自动生成）
- `TRANSAK_REFERRER_DOMAIN`：Create Session API 的 referrerDomain（默认从 FRONTEND_URL 提取）

## 如何获取 API Key

1. 登录 Transak Dashboard：https://dashboard.transak.com/
2. 进入 **Settings** > **API Keys**
3. 创建新的 API Key 或使用现有的
4. **开发环境**：使用 Staging API Key
5. **生产环境**：使用 Production API Key

## 配置示例

### 开发环境（STAGING）

```bash
# 后端 .env
TRANSAK_API_KEY=7f03deb8-ee24-49b3-a919-31e7d9244030
TRANSAK_ENVIRONMENT=STAGING
TRANSAK_WEBHOOK_SECRET=your_staging_webhook_secret
FRONTEND_URL=http://localhost:3000
API_BASE_URL=http://localhost:3001

# 前端 .env.local
NEXT_PUBLIC_TRANSAK_API_KEY=7f03deb8-ee24-49b3-a919-31e7d9244030
NEXT_PUBLIC_TRANSAK_ENVIRONMENT=STAGING
```

### 生产环境（PRODUCTION）

```bash
# 后端 .env
TRANSAK_API_KEY=your_production_api_key_here
TRANSAK_ENVIRONMENT=PRODUCTION
TRANSAK_WEBHOOK_SECRET=your_production_webhook_secret
FRONTEND_URL=https://paymind.io
API_BASE_URL=https://api.paymind.io
TRANSAK_REFERRER_DOMAIN=paymind.io

# 前端 .env.local
NEXT_PUBLIC_TRANSAK_API_KEY=your_production_api_key_here
NEXT_PUBLIC_TRANSAK_ENVIRONMENT=PRODUCTION
```

## 注意事项

1. **API Key vs Access Token**：
   - Transak 使用 API Key 进行身份验证
   - Create Session API 的 header 名称是 `access-token`，但传入的值是 API Key
   - 如果设置了 `TRANSAK_ACCESS_TOKEN`，会优先使用它，否则使用 `TRANSAK_API_KEY`

2. **环境隔离**：
   - 开发环境和生产环境必须使用不同的 API Key
   - 确保在正确的环境中使用对应的 API Key

3. **安全性**：
   - 不要将 API Key 提交到 Git
   - 使用环境变量管理敏感信息
   - 生产环境建议使用密钥管理服务（如 AWS Secrets Manager、Azure Key Vault 等）

4. **Webhook 配置**：
   - 在 Transak Dashboard 中配置 Webhook URL
   - 确保 Webhook Secret 与后端配置一致
   - 开发环境可以使用 ngrok 等工具进行本地测试

## 验证配置

配置完成后，可以通过以下方式验证：

1. **后端**：检查日志中是否有 "Transak API key not configured" 警告
2. **前端**：打开浏览器控制台，检查是否有 "Transak API Key 未配置" 错误
3. **测试**：尝试创建一个支付会话，检查是否能成功调用 Create Session API

