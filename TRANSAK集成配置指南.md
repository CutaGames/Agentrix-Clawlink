# Transak 集成配置指南

## 环境变量配置

### 后端环境变量（backend/.env）

#### 生产环境配置
```env
# Transak 配置
TRANSAK_API_KEY=your_production_api_key_here
TRANSAK_ENVIRONMENT=PRODUCTION
TRANSAK_WEBHOOK_SECRET=your_webhook_secret_here
TRANSAK_WEBHOOK_URL=https://www.agentrix.top/api/payments/provider/transak/webhook
API_BASE_URL=https://www.agentrix.top
FRONTEND_URL=https://www.agentrix.top
```

#### 本地开发环境配置

**选项 1：使用 ngrok 暴露本地服务（推荐用于本地测试 webhook）**

1. 安装 ngrok：
```bash
# macOS
brew install ngrok

# 或从官网下载：https://ngrok.com/download
```

2. 启动本地后端服务（端口 3001）

3. 在另一个终端运行 ngrok：
```bash
ngrok http 3001
```

4. 复制 ngrok 提供的 HTTPS URL（例如：`https://abc123.ngrok.io`）

5. 在 `backend/.env` 中配置：
```env
# Transak 配置（本地开发）
TRANSAK_API_KEY=your_staging_api_key_here
TRANSAK_ENVIRONMENT=STAGING
TRANSAK_WEBHOOK_SECRET=your_webhook_secret_here
TRANSAK_WEBHOOK_URL=https://abc123.ngrok.io/api/payments/provider/transak/webhook
API_BASE_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3000
```

**选项 2：直接使用生产环境 webhook URL（简单但不推荐）**

```env
# Transak 配置（本地开发 - 使用生产 webhook）
TRANSAK_API_KEY=your_staging_api_key_here
TRANSAK_ENVIRONMENT=STAGING
TRANSAK_WEBHOOK_SECRET=your_webhook_secret_here
TRANSAK_WEBHOOK_URL=https://www.agentrix.top/api/payments/provider/transak/webhook
API_BASE_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3000
```

> ⚠️ **注意**：使用选项 2 时，本地测试的 webhook 会发送到生产环境，可能导致数据混乱。建议使用选项 1。

### 前端环境变量（frontend/.env.local）

```env
# Transak 前端配置
NEXT_PUBLIC_TRANSAK_API_KEY=your_transak_api_key_here
NEXT_PUBLIC_TRANSAK_ENVIRONMENT=STAGING  # 或 PRODUCTION
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

## 获取 Transak API Key

1. 访问 [Transak Partner Dashboard](https://partner.transak.com/)
2. 登录或注册账户
3. 在 Dashboard 中获取 API Key
4. 在 Webhook 设置中配置 webhook URL 和 Secret

## 本地测试 Webhook 的步骤

### 使用 ngrok（推荐）

1. **启动本地后端服务**
```bash
cd backend
npm run start:dev
```

2. **启动 ngrok**
```bash
ngrok http 3001
```

3. **复制 ngrok URL**（例如：`https://abc123.ngrok.io`）

4. **更新环境变量**
```env
TRANSAK_WEBHOOK_URL=https://abc123.ngrok.io/api/payments/provider/transak/webhook
```

5. **在 Transak Dashboard 中配置 Webhook URL**
   - 登录 Transak Partner Dashboard
   - 进入 Webhook 设置
   - 将 webhook URL 设置为 ngrok 提供的 URL

6. **测试 Webhook**
   - 在 Transak 测试环境中创建一笔交易
   - 检查后端日志，确认 webhook 已接收

### 使用生产环境（不推荐，仅用于快速测试）

如果暂时无法使用 ngrok，可以：
1. 将 `TRANSAK_WEBHOOK_URL` 设置为生产环境 URL
2. 在本地进行其他功能的测试
3. Webhook 会发送到生产环境，需要手动检查生产环境日志

## 验证配置

### 检查后端配置

```bash
cd backend
npm run start:dev
```

查看启动日志，应该看到：
```
[TransakProviderService] Transak Provider registered successfully
```

如果看到警告：
```
[TransakProviderService] Transak API key not configured. Transak Provider will not work.
```

说明需要配置 `TRANSAK_API_KEY`。

### 检查前端配置

前端会在浏览器控制台显示 Transak SDK 加载状态。

## 常见问题

### Q: 本地开发时 webhook 收不到怎么办？

A: 
1. 确保使用 ngrok 暴露本地服务
2. 检查 ngrok URL 是否正确配置在环境变量中
3. 在 Transak Dashboard 中确认 webhook URL 已更新
4. 检查后端日志，查看是否有 webhook 请求

### Q: 如何区分测试和生产环境？

A: 
- 使用 `TRANSAK_ENVIRONMENT=STAGING` 进行测试
- 使用 `TRANSAK_ENVIRONMENT=PRODUCTION` 用于生产
- Transak 会提供不同的 API Key 用于测试和生产

### Q: Webhook 签名验证失败怎么办？

A: 
1. 确保 `TRANSAK_WEBHOOK_SECRET` 配置正确
2. 检查 Transak Dashboard 中的 Webhook Secret 是否匹配
3. 查看后端日志中的签名验证错误信息

## 下一步

配置完成后，请参考：
- [Transak 前端集成指南](./TRANSAK前端集成指南.md)
- [Transak 测试指南](./TRANSAK测试指南.md)

