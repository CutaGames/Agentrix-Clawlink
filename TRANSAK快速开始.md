# Transak 快速开始

## 回答你的问题

### Q: 本地开发时需要配置 TRANSAK_WEBHOOK_URL 吗？

**A: 是的，需要配置。有两种方式：**

#### 方式 1：使用 ngrok（推荐，用于本地测试 webhook）

1. 安装 ngrok：
```bash
# macOS
brew install ngrok

# 或从 https://ngrok.com/download 下载
```

2. 启动本地后端：
```bash
cd backend
npm run start:dev
```

3. 在另一个终端启动 ngrok：
```bash
ngrok http 3001
```

4. 复制 ngrok 提供的 HTTPS URL（例如：`https://abc123.ngrok.io`）

5. 在 `backend/.env` 中配置：
```env
TRANSAK_WEBHOOK_URL=https://abc123.ngrok.io/api/payments/provider/transak/webhook
```

6. 在 Transak Dashboard 中配置这个 webhook URL

#### 方式 2：使用生产环境 URL（简单但不推荐）

如果暂时无法使用 ngrok，可以：
```env
TRANSAK_WEBHOOK_URL=https://www.agentrix.top/api/payments/provider/transak/webhook
```

⚠️ **注意**：使用方式 2 时，本地测试的 webhook 会发送到生产环境，可能导致数据混乱。建议使用方式 1。

## 快速配置步骤

### 1. 配置后端环境变量

编辑 `backend/.env`：

```env
# Transak 配置
TRANSAK_API_KEY=your_transak_api_key_here
TRANSAK_ENVIRONMENT=STAGING  # 测试环境使用 STAGING，生产环境使用 PRODUCTION
TRANSAK_WEBHOOK_SECRET=your_webhook_secret_here
TRANSAK_WEBHOOK_URL=https://www.agentrix.top/api/payments/provider/transak/webhook
API_BASE_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3000
```

### 2. 配置前端环境变量

编辑 `frontend/.env.local`：

```env
NEXT_PUBLIC_TRANSAK_API_KEY=your_transak_api_key_here
NEXT_PUBLIC_TRANSAK_ENVIRONMENT=STAGING
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

### 3. 启动服务

```bash
# 终端 1：启动后端
cd backend
npm run start:dev

# 终端 2：启动前端
cd frontend
npm run dev

# 终端 3：启动 ngrok（用于本地测试 webhook）
ngrok http 3001
```

### 4. 测试集成

1. 访问 `http://localhost:3000/payment-demo`
2. 点击"使用 Transak 购买"按钮
3. 在 Transak Widget 中完成测试支付

## 详细文档

- [完整配置指南](./TRANSAK集成配置指南.md)
- [前端集成指南](./TRANSAK前端集成指南.md)
- [测试指南](./TRANSAK测试指南.md)

## 获取 API Key

1. 访问 [Transak Partner Dashboard](https://partner.transak.com/)
2. 登录或注册账户
3. 在 Dashboard 中获取 API Key 和 Webhook Secret
4. 配置 Webhook URL

## 下一步

配置完成后，开始测试：
1. 验证 Provider 注册（查看后端日志）
2. 测试前端 Widget 加载
3. 完成一笔测试交易
4. 验证 Webhook 回调

