# Agentrix OAuth 配置指南

本文档说明如何配置各平台的 OAuth 社交登录。

## 1. Google OAuth 配置

### 1.1 创建 Google Cloud 项目

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建新项目或选择现有项目
3. 启用 Google+ API 和 Google Identity API

### 1.2 配置 OAuth 同意屏幕

1. 进入 "APIs & Services" > "OAuth consent screen"
2. 选择 "External" 用户类型
3. 填写应用信息：
   - App name: Agentrix
   - User support email: support@agentrix.top
   - Developer contact: dev@agentrix.top
4. 添加 Scopes: email, profile, openid

### 1.3 创建 OAuth 凭据

1. 进入 "APIs & Services" > "Credentials"
2. 点击 "Create Credentials" > "OAuth client ID"
3. 应用类型选择 "Web application"
4. 添加授权的 JavaScript 来源：
   - `http://localhost:3000`
   - `https://agentrix.top`
   - `https://api.agentrix.top`
5. 添加授权的重定向 URI：
   - `http://localhost:3001/auth/google/callback`
   - `https://api.agentrix.top/auth/google/callback`
6. 记录 Client ID 和 Client Secret

### 1.4 环境变量配置

```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=https://api.agentrix.top/auth/google/callback
```

---

## 2. Twitter (X) OAuth 配置

### 2.1 创建 Twitter 开发者应用

1. 访问 [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. 创建新项目和应用

### 2.2 配置 OAuth 1.0a

1. 进入 App Settings > User authentication settings
2. 启用 OAuth 1.0a
3. App permissions: Read and write
4. Type of App: Web App, Automated App or Bot
5. Callback URLs:
   - `http://localhost:3001/auth/twitter/callback`
   - `https://api.agentrix.top/auth/twitter/callback`
6. Website URL: `https://agentrix.top`

### 2.3 获取密钥

1. 进入 Keys and tokens
2. 获取 API Key (Consumer Key) 和 API Key Secret (Consumer Secret)
3. 如需要，生成 Access Token 和 Access Token Secret

### 2.4 环境变量配置

```env
TWITTER_CONSUMER_KEY=your-api-key
TWITTER_CONSUMER_SECRET=your-api-key-secret
TWITTER_CALLBACK_URL=https://api.agentrix.top/auth/twitter/callback
```

---

## 3. MCP OAuth 配置（用于 ChatGPT/Claude 集成）

### 3.1 概述

MCP OAuth 用于 AI 平台（如 ChatGPT）调用 Agentrix API 时的用户授权。

### 3.2 端点配置

- Discovery: `https://api.agentrix.top/.well-known/oauth-authorization-server`
- Authorization: `https://api.agentrix.top/api/auth/mcp/authorize`
- Token: `https://api.agentrix.top/api/auth/mcp/token`
- JWKS: `https://api.agentrix.top/api/auth/mcp/jwks`

### 3.3 在 ChatGPT 中配置

1. 创建 GPT 并添加 Action
2. Authentication Type: OAuth
3. Client URL: `https://api.agentrix.top/api/auth/mcp/authorize`
4. Token URL: `https://api.agentrix.top/api/auth/mcp/token`
5. Scope: `marketplace:read order:write payment:execute`

### 3.4 环境变量配置

```env
MCP_OAUTH_CLIENT_ID=agentrix-chatgpt
MCP_OAUTH_CLIENT_SECRET=your-mcp-oauth-secret
```

---

## 4. 钱包登录配置

### 4.1 EVM 钱包

支持 MetaMask、WalletConnect 等标准 EVM 钱包。

```env
# 可选：WalletConnect Project ID
WALLETCONNECT_PROJECT_ID=your-project-id
```

### 4.2 Solana 钱包

支持 Phantom、Solflare 等 Solana 钱包。

无需额外配置，前端会自动检测已安装的钱包。

---

## 5. 完整环境变量示例

```env
# ========== OAuth Providers ==========
# Google
GOOGLE_CLIENT_ID=123456789.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx
GOOGLE_CALLBACK_URL=https://api.agentrix.top/auth/google/callback

# Twitter (X)
TWITTER_CONSUMER_KEY=xxxxxxx
TWITTER_CONSUMER_SECRET=xxxxxxx
TWITTER_CALLBACK_URL=https://api.agentrix.top/auth/twitter/callback

# MCP OAuth (for ChatGPT/Claude)
MCP_OAUTH_CLIENT_ID=agentrix-chatgpt
MCP_OAUTH_CLIENT_SECRET=your-secret-here

# ========== URLs ==========
API_BASE_URL=https://api.agentrix.top
FRONTEND_URL=https://agentrix.top

# ========== JWT ==========
JWT_SECRET=your-jwt-secret-at-least-32-chars
JWT_EXPIRES_IN=7d
```

---

## 6. 故障排除

### Google OAuth 错误

1. **redirect_uri_mismatch**: 检查 Google Console 中的重定向 URI 是否与代码中的 callback URL 完全匹配
2. **invalid_client**: 检查 Client ID 和 Secret 是否正确

### Twitter OAuth 错误

1. **Desktop applications only support the oauth_callback value 'oob'**: 确保应用类型设置为 Web App
2. **Callback URL not approved**: 确保在 Twitter Developer Portal 中添加了回调 URL

### MCP OAuth 错误

1. **Token refresh failed**: 检查 token 是否过期，需要用户重新授权
2. **Invalid scope**: 确保请求的 scope 在允许列表中

---

## 7. 安全建议

1. **生产环境**：永远不要在代码中硬编码密钥
2. **密钥轮换**：定期轮换 OAuth 密钥
3. **最小权限**：只请求必要的 OAuth scope
4. **HTTPS**：确保所有 OAuth 回调使用 HTTPS
5. **Session 管理**：Twitter OAuth 1.0a 需要 session 支持，确保 main.ts 中已启用
