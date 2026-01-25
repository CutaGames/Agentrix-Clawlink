# Agentrix 支付 V1.0 手动任务清单 (Manual Tasks)

为了使 Agentrix 支付系统完全投入运行，以下任务需要由管理员或开发人员手动完成。

## 1. Web2 社交登录配置 (OAuth)

社交登录需要向各平台申请开发者账号并配置 OAuth 应用。**注：系统已增加容错处理，缺少 Key 时后端仍可启动，但对应登录功能将不可用。**

### Google 登录 ✅
1. 访问 [Google Cloud Console](https://console.cloud.google.com/)。
2. 创建新项目并启用 **Google People API**。
3. 配置 **OAuth 同意屏幕** (External)。
4. 创建 **OAuth 2.0 客户端 ID** (Web Application)。
   - 重定向 URI: `http://localhost:3001/api/auth/google/callback` (生产环境需更换为真实域名)。
5. 将 `GOOGLE_CLIENT_ID` 和 `GOOGLE_CLIENT_SECRET` 填入 `backend/.env`。

### Apple 登录 (待办)
1. 访问 [Apple Developer Portal](https://developer.apple.com/)。
2. 注册 **App ID** 和 **Service ID**。
3. 配置 **Sign In with Apple**。
4. 生成并下载 **Private Key (.p8)**。
5. 将 `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID` 和 `APPLE_PRIVATE_KEY` 填入 `backend/.env`。

### Twitter (X) 登录 ✅
1. 访问 [Twitter Developer Portal](https://developer.twitter.com/)。
2. 创建应用并启用 **OAuth 2.0**。
3. 获取 **Consumer Key** 和 **Consumer Secret**。
4. 将 `TWITTER_CONSUMER_KEY` 和 `TWITTER_CONSUMER_SECRET` 填入 `backend/.env`。

---

## 2. EAS (Ethereum Attestation Service) 配置 (可选/待办)

用于 Agent 身份背书和审计日志链上锚定。**注：测试阶段可跳过，不影响核心支付流程。**

1. **Schema 注册**:
   - 在 [EAS Website](https://attest.sh/) 上为 `AgentRegistration` 和 `AuditRoot` 注册 Schema。
   - 示例 Schema: `string agentId, string name, string riskTier, string ownerId`。
2. **环境变量**:
   - `EAS_CONTRACT_ADDRESS`: 对应网络的 EAS 合约地址 (如 Sepolia: `0xC2679fBD37d54388Ce493F1DB75320D236e1815e`)。
   - `EAS_SIGNER_PRIVATE_KEY`: 用于发布存证的钱包私钥 (需有少量 Gas 费)。
   - `RPC_URL`: 对应网络的 RPC 节点地址。

---

## 3. 支付通道配置

### Stripe (待办)
1. 登录 [Stripe Dashboard](https://dashboard.stripe.com/)。
2. 获取 **Secret Key** (`sk_test_...`)。
3. 配置 Webhook 端点指向 `https://your-api.com/api/payments/webhook/stripe` 并获取 **Webhook Secret**。

### Transak ✅
1. 登录 [Transak Dashboard](https://dashboard.transak.com/)。
2. 获取 **API Key**。
3. 配置 Webhook 并获取 **API Secret**。

---

## 4. 数据库与环境初始化

1. **执行迁移**:
   ```bash
   cd backend
   npm run migration:run
   ```
2. **前端配置**:
   - 在 `frontend` 目录下创建 `.env.local`。
   - 设置 `NEXT_PUBLIC_API_URL=http://localhost:3001/api`。

---

## 5. AI 模型 API Key

确保以下 Key 已正确配置在 `backend/.env` 中：
- `OPENAI_API_KEY`
- `GEMINI_API_KEY`
- `deepseek_API_KEY`
