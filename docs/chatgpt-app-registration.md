# ChatGPT App (GPTs) 注册表单内容

本文档提供 Agentrix 在 OpenAI GPT Store 注册 GPTs 应用所需的所有表单内容。

---

## 1. 基本信息 (Basic Information)

| 字段 | 英文值 | 中文值 |
|------|--------|--------|
| **Name** | Agentrix Commerce Assistant | Agentrix 商务助手 |
| **Description** | AI-powered commerce assistant that enables seamless product discovery, smart payments, and autonomous transactions across global marketplaces. | AI 驱动的商务助手，支持无缝商品发现、智能支付和跨全球市场的自主交易。 |
| **Category** | Productivity / Shopping | 生产力 / 购物 |

---

## 2. 详细描述 (Detailed Description)

### English Version
```
Agentrix Commerce Assistant is your AI-powered shopping and payment companion. 

Key Features:
• 🛒 Smart Product Discovery - Search and compare products across multiple marketplaces
• 💳 Seamless Payments - Execute secure payments with QuickPay, X402, and crypto support
• 🤖 Autonomous Transactions - Set spending limits and let AI handle routine purchases
• 🔐 Secure Wallet Management - MPC wallet technology for maximum security
• 📊 Transaction Insights - Track spending, analyze patterns, and optimize budgets

Powered by Agentrix infrastructure, this GPT can:
- Search products from verified merchants
- Compare prices and features
- Execute payments with user authorization
- Manage subscriptions and recurring purchases
- Provide real-time order tracking

Start by saying "Help me find..." or "I want to buy..."
```

### 中文版本
```
Agentrix 商务助手是您的 AI 驱动购物和支付伙伴。

核心功能：
• 🛒 智能商品发现 - 跨多个市场搜索和比较商品
• 💳 无缝支付 - 支持 QuickPay、X402 和加密货币的安全支付
• 🤖 自主交易 - 设置消费限额，让 AI 处理日常购买
• 🔐 安全钱包管理 - MPC 钱包技术保障最大安全性
• 📊 交易洞察 - 跟踪消费、分析模式、优化预算

基于 Agentrix 基础设施，此 GPT 可以：
- 从认证商户搜索商品
- 比较价格和功能
- 在用户授权下执行支付
- 管理订阅和定期购买
- 提供实时订单跟踪

开始使用：说 "帮我找..." 或 "我想买..."
```

---

## 3. 对话开场白 (Conversation Starters)

| # | English | 中文 |
|---|---------|------|
| 1 | Help me find the best laptop under $1000 | 帮我找 1000 美元以下最好的笔记本电脑 |
| 2 | I want to buy AirPods Pro, compare prices | 我想买 AirPods Pro，比较一下价格 |
| 3 | Set up a monthly subscription for cloud storage | 设置云存储月度订阅 |
| 4 | Show my recent transactions and spending analysis | 显示我最近的交易和消费分析 |
| 5 | Connect my wallet and check balance | 连接我的钱包并查看余额 |

---

## 4. 能力配置 (Capabilities)

| 能力 | 启用状态 | 说明 |
|------|----------|------|
| **Web Browsing** | ✅ 启用 | 用于获取实时商品信息 |
| **DALL·E Image Generation** | ❌ 禁用 | 不需要 |
| **Code Interpreter** | ✅ 启用 | 用于数据分析和计算 |
| **Actions** | ✅ 启用 | 连接 Agentrix API |

---

## 5. Actions 配置 (API Integration)

### OpenAPI Schema URL
```
https://api.agentrix.io/openapi/gpts-actions.json
```

### 认证方式 (Authentication)
- **Type**: OAuth 2.0
- **Authorization URL**: `https://api.agentrix.io/oauth/authorize`
- **Token URL**: `https://api.agentrix.io/oauth/token`
- **Scope**: `read write payment`
- **Client ID**: `[在 Agentrix 开发者控制台获取]`

### 主要 Actions 端点

| Action | Endpoint | 描述 |
|--------|----------|------|
| `searchProducts` | `GET /api/products/search` | 搜索商品 |
| `getProductDetails` | `GET /api/products/{id}` | 获取商品详情 |
| `createPaymentIntent` | `POST /api/payments/intent` | 创建支付意图 |
| `executePayment` | `POST /api/payments/execute` | 执行支付 |
| `getWalletBalance` | `GET /api/wallet/balance` | 查询钱包余额 |
| `getTransactionHistory` | `GET /api/transactions` | 获取交易历史 |
| `subscribeToAgent` | `POST /api/agents/{id}/subscribe` | 订阅 Agent |

---

## 6. 隐私政策 (Privacy Policy)

### URL
```
https://agentrix.io/privacy
```

### 关键条款摘要
- 用户数据加密存储
- 不与第三方共享支付信息
- 用户可随时删除账户和数据
- 符合 GDPR 和 CCPA 规范

---

## 7. 使用条款 (Terms of Service)

### URL
```
https://agentrix.io/terms
```

---

## 8. 开发者信息 (Developer Information)

| 字段 | 值 |
|------|-----|
| **Organization** | Agentrix Labs |
| **Website** | https://agentrix.io |
| **Support Email** | support@agentrix.io |
| **Developer Email** | dev@agentrix.io |

---

## 9. 图标和品牌资源 (Branding Assets)

| 资源 | 规格 | 路径 |
|------|------|------|
| **App Icon** | 512x512 PNG | `/public/brand/agentrix-icon-512.png` |
| **Banner** | 1200x630 PNG | `/public/brand/agentrix-banner.png` |
| **Logo (Dark)** | SVG | `/public/brand/agentrix-logo-dark.svg` |
| **Logo (Light)** | SVG | `/public/brand/agentrix-logo-light.svg` |

---

## 10. 系统提示词 (System Instructions)

```markdown
You are Agentrix Commerce Assistant, an AI-powered shopping and payment agent.

## Core Behaviors
1. Always prioritize user security and privacy
2. Require explicit user confirmation before executing any payment
3. Provide transparent pricing including all fees
4. Respect spending limits set by the user

## Payment Authorization Rules
- For amounts under $10: Proceed with single confirmation
- For amounts $10-$100: Require double confirmation
- For amounts over $100: Require explicit "I confirm this purchase" statement
- Never store or display full payment credentials

## Response Style
- Be concise and helpful
- Use bullet points for comparisons
- Always show prices in user's preferred currency
- Provide alternatives when requested item is unavailable

## Error Handling
- If payment fails, explain the reason clearly
- Suggest alternative payment methods if available
- Never retry failed payments without user consent

## Limitations
- Cannot process refunds directly (direct to customer support)
- Cannot modify subscription terms (provide links to settings)
- Cannot access user's private wallet keys
```

---

## 11. 测试清单 (Testing Checklist)

### 功能测试
- [ ] 商品搜索返回正确结果
- [ ] 商品详情显示完整信息
- [ ] 支付流程正常执行
- [ ] 钱包连接成功
- [ ] 交易历史正确显示
- [ ] 订阅功能正常工作

### 安全测试
- [ ] OAuth 认证流程正常
- [ ] Token 刷新机制正常
- [ ] 敏感信息不会泄露
- [ ] 支付确认流程符合预期

### 边界测试
- [ ] 无网络时的错误处理
- [ ] API 超时处理
- [ ] 无效输入处理
- [ ] 余额不足处理

---

## 12. 提交前检查 (Pre-submission Checklist)

- [ ] 所有链接已验证可访问
- [ ] Privacy Policy 页面内容完整
- [ ] Terms of Service 页面内容完整
- [ ] OpenAPI Schema 格式正确
- [ ] OAuth 端点已配置并测试
- [ ] 图标和品牌资源已上传
- [ ] 系统提示词已审核
- [ ] 所有功能测试通过

---

## 13. 联系方式

如有问题，请联系：
- **技术支持**: tech@agentrix.io
- **商务合作**: business@agentrix.io
- **安全问题**: security@agentrix.io

---

*文档版本: 1.0*
*最后更新: 2026-01-08*
