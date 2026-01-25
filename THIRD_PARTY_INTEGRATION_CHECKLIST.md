# Agentrix 第三方服务集成清单

**最后更新**: 2025-01-XX  
**状态**: 代码已实现，部分服务需要注册和配置

---

## 📋 集成服务总览

| 服务类别 | 服务名称 | 集成状态 | 配置状态 | 优先级 |
|---------|---------|---------|---------|--------|
| 支付处理 | Stripe | ✅ 已集成 | ⚠️ 需配置 | 🔴 高 |
| OAuth登录 | Google/Apple/X | ⚠️ 模拟实现 | ❌ 未集成 | 🟡 中 |
| Embedding | OpenAI | ✅ 已集成 | ⚠️ 需配置 | 🔴 高 |
| 向量数据库 | Pinecone/ChromaDB/Milvus | ✅ 已集成 | ⚠️ 需配置 | 🟡 中 |
| KYC服务 | Sumsub/Jumio/Onfido | ⚠️ 框架已实现 | ❌ 未配置 | 🟡 中 |
| 链上分析 | Chainalysis/Elliptic | ⚠️ 框架已实现 | ❌ 未配置 | 🟡 中 |
| X402中继器 | X402 Relayer | ✅ 已集成 | ⚠️ 需配置 | 🟡 中 |
| 法币转数字货币 | 多个Provider | ⚠️ 框架已实现 | ❌ 未配置 | 🟡 中 |
| 数据库 | PostgreSQL | ✅ 已集成 | ⚠️ 需配置 | 🔴 高 |
| JWT认证 | 内置 | ✅ 已集成 | ⚠️ 需配置 | 🔴 高 |

---

## ✅ 已完成集成（代码已实现）

### 1. Stripe 支付处理 ✅

**状态**: 代码已完全集成，需要注册账号获取API密钥

**已实现功能**:
- ✅ 支付意图创建（`backend/src/modules/payment/stripe.service.ts`）
- ✅ 3D Secure支持
- ✅ Webhook处理（`backend/src/modules/payment/stripe-webhook.service.ts`）
- ✅ 前端组件集成（`agentrixfrontend/components/payment/StripePayment.tsx`）
- ✅ SDK支持（`sdk-js/src/resources/payments.ts`）

**需要配置的环境变量**:
```bash
STRIPE_SECRET_KEY=sk_test_...          # Stripe Secret Key
STRIPE_WEBHOOK_SECRET=whsec_...        # Webhook签名密钥
```

**注册和配置步骤**:
1. **注册Stripe账号**
   - 访问 https://stripe.com
   - 点击 "Sign up" 注册账号
   - 选择账户类型（个人/企业）
   - 完成邮箱验证

2. **获取API密钥**
   - 登录Stripe Dashboard: https://dashboard.stripe.com
   - 进入 "Developers" → "API keys"
   - 复制 "Secret key"（以 `sk_test_` 开头用于测试，`sk_live_` 用于生产）
   - 复制 "Publishable key"（前端使用，以 `pk_test_` 或 `pk_live_` 开头）

3. **配置Webhook**
   - 在Dashboard中进入 "Developers" → "Webhooks"
   - 点击 "Add endpoint"
   - 输入Webhook URL: `https://your-domain.com/api/payments/webhook/stripe`
   - 选择要监听的事件：
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `payment_intent.canceled`
   - 复制 "Signing secret"（以 `whsec_` 开头）

4. **配置环境变量**
   ```bash
   # 在 backend/.env 文件中添加
   STRIPE_SECRET_KEY=sk_test_51...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

5. **前端配置**（可选）
   ```bash
   # 在 agentrixfrontend/.env.local 文件中添加
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```

**测试**:
- 使用Stripe测试卡号: `4242 4242 4242 4242`
- 任意未来日期作为过期日期
- 任意3位CVC码

---

### 2. OAuth 社交登录（Google/Apple/X）⚠️

**状态**: 前端UI已实现，后端OAuth集成未完成，当前为模拟模式

**当前实现**:
- ✅ 前端登录UI（`agentrixfrontend/components/auth/LoginModal.tsx`）
- ✅ 社交登录按钮（Google、Apple、X）
- ⚠️ 后端OAuth策略未实现（需要集成Passport OAuth策略）
- ⚠️ 当前使用模拟登录（创建临时用户）

**需要实现的功能**:
1. **后端OAuth策略**（使用Passport.js）
   - Google OAuth 2.0
   - Apple Sign In
   - X (Twitter) OAuth 2.0

2. **OAuth回调处理**
   - 处理OAuth回调
   - 创建或关联用户账号
   - 生成JWT token

**需要注册的第三方服务**:

#### A. Google OAuth 2.0

**注册步骤**:
1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建新项目或选择现有项目
3. 启用 "Google+ API" 或 "Google Identity Services"
4. 进入 "Credentials" → "Create Credentials" → "OAuth client ID"
5. 配置OAuth同意屏幕：
   - 应用名称：Agentrix
   - 用户支持邮箱
   - 开发者联系信息
6. 创建OAuth客户端：
   - 应用类型：Web application
   - 授权重定向URI：`https://your-domain.com/api/auth/google/callback`
   - 本地开发：`http://localhost:3001/api/auth/google/callback`
7. 获取客户端ID和密钥

**环境变量配置**:
```bash
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3001/api/auth/google/callback
```

**集成代码示例**（需要添加到后端）:
```typescript
// backend/src/modules/auth/strategies/google.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor() {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { name, emails, photos } = profile;
    const user = {
      email: emails[0].value,
      firstName: name.givenName,
      lastName: name.familyName,
      picture: photos[0].value,
      accessToken,
    };
    done(null, user);
  }
}
```

#### B. Apple Sign In

**注册步骤**:
1. 访问 [Apple Developer Portal](https://developer.apple.com/)
2. 注册Apple Developer账号（$99/年）
3. 创建App ID：
   - 进入 "Certificates, Identifiers & Profiles"
   - 创建新的App ID
   - 启用 "Sign In with Apple" 功能
4. 创建Service ID：
   - 创建Service ID用于Web登录
   - 配置域名和重定向URL
5. 创建密钥：
   - 创建新的密钥用于Sign in with Apple
   - 下载.p8密钥文件
6. 获取配置信息：
   - Team ID
   - Client ID (Service ID)
   - Key ID
   - Private Key (.p8文件内容)

**环境变量配置**:
```bash
APPLE_CLIENT_ID=your-service-id
APPLE_TEAM_ID=your-team-id
APPLE_KEY_ID=your-key-id
APPLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
APPLE_CALLBACK_URL=http://localhost:3001/api/auth/apple/callback
```

**集成代码示例**（需要添加到后端）:
```typescript
// backend/src/modules/auth/strategies/apple.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-apple';

@Injectable()
export class AppleStrategy extends PassportStrategy(Strategy, 'apple') {
  constructor() {
    super({
      clientID: process.env.APPLE_CLIENT_ID,
      teamID: process.env.APPLE_TEAM_ID,
      keyID: process.env.APPLE_KEY_ID,
      key: process.env.APPLE_PRIVATE_KEY,
      callbackURL: process.env.APPLE_CALLBACK_URL,
      scope: ['name', 'email'],
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: any): Promise<any> {
    return {
      email: profile.email,
      firstName: profile.name?.firstName,
      lastName: profile.name?.lastName,
      appleId: profile.id,
    };
  }
}
```

#### C. X (Twitter) OAuth 2.0

**注册步骤**:
1. 访问 [Twitter Developer Portal](https://developer.twitter.com/)
2. 申请开发者账号（免费）
3. 创建应用：
   - 进入 "Developer Portal" → "Projects & Apps"
   - 创建新应用
   - 填写应用信息
4. 配置OAuth设置：
   - 进入应用设置 → "User authentication settings"
   - 启用 "OAuth 2.0"
   - 设置回调URL：`http://localhost:3001/api/auth/x/callback`
   - 设置网站URL
5. 获取API密钥：
   - Client ID
   - Client Secret

**环境变量配置**:
```bash
X_CLIENT_ID=your-x-client-id
X_CLIENT_SECRET=your-x-client-secret
X_CALLBACK_URL=http://localhost:3001/api/auth/x/callback
```

**集成代码示例**（需要添加到后端）:
```typescript
// backend/src/modules/auth/strategies/x.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-oauth2';

@Injectable()
export class XStrategy extends PassportStrategy(Strategy, 'x') {
  constructor() {
    super({
      authorizationURL: 'https://twitter.com/i/oauth2/authorize',
      tokenURL: 'https://api.twitter.com/2/oauth2/token',
      clientID: process.env.X_CLIENT_ID,
      clientSecret: process.env.X_CLIENT_SECRET,
      callbackURL: process.env.X_CALLBACK_URL,
      scope: ['tweet.read', 'users.read'],
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: any): Promise<any> {
    // 使用accessToken获取用户信息
    const userInfo = await this.getUserInfo(accessToken);
    return {
      email: userInfo.email,
      username: userInfo.username,
      xId: userInfo.id,
    };
  }

  private async getUserInfo(accessToken: string) {
    // 调用Twitter API获取用户信息
    // ...
  }
}
```

**后端实现步骤**:
1. 安装依赖：
   ```bash
   cd backend
   npm install passport-google-oauth20 passport-apple passport-oauth2
   npm install --save-dev @types/passport-google-oauth20
   ```

2. 创建OAuth策略文件（如上示例）

3. 在 `auth.module.ts` 中注册策略：
   ```typescript
   providers: [
     AuthService,
     JwtStrategy,
     LocalStrategy,
     GoogleStrategy,  // 新增
     AppleStrategy,   // 新增
     XStrategy,       // 新增
   ],
   ```

4. 在 `auth.controller.ts` 中添加OAuth路由：
   ```typescript
   @Get('google')
   @UseGuards(AuthGuard('google'))
   async googleAuth() {
     // 触发Google OAuth流程
   }

   @Get('google/callback')
   @UseGuards(AuthGuard('google'))
   async googleAuthCallback(@Request() req) {
     // 处理OAuth回调，创建/登录用户
     return this.authService.socialLogin(req.user, 'google');
   }
   ```

5. 在 `auth.service.ts` 中添加 `socialLogin` 方法：
   ```typescript
   async socialLogin(profile: any, provider: 'google' | 'apple' | 'x') {
     // 查找或创建用户
     let user = await this.userRepository.findOne({
       where: { email: profile.email },
     });

     if (!user) {
       // 创建新用户
       user = this.userRepository.create({
         email: profile.email,
         agentrixId: `pm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
         roles: ['user'],
         // 保存OAuth provider信息
         oauthProvider: provider,
         oauthId: profile.id,
       });
       user = await this.userRepository.save(user);
     }

     // 生成JWT token
     return this.login(user);
   }
   ```

**前端修改**（可选优化）:
当前前端代码已经可以工作，但可以优化为直接跳转到OAuth授权页面：
```typescript
const handleSocialLogin = (provider: 'google' | 'apple' | 'x') => {
  window.location.href = `${API_URL}/api/auth/${provider}`;
};
```

**测试**:
- Google: 使用Google账号登录测试
- Apple: 需要Apple设备或模拟器测试
- X: 使用Twitter账号登录测试

**注意事项**:
- OAuth回调URL必须在第三方平台配置中注册
- 生产环境需要使用HTTPS
- 需要处理OAuth错误和用户取消授权的情况
- 建议实现OAuth token刷新机制

---

### 3. OpenAI Embedding 服务 ✅

**状态**: 代码已完全集成，需要注册账号获取API密钥

**已实现功能**:
- ✅ Embedding生成（`backend/src/modules/search/embedding.service.ts`）
- ✅ 本地模型fallback支持
- ✅ 批量embedding生成

**需要配置的环境变量**:
```bash
OPENAI_API_KEY=sk-...                  # OpenAI API Key
# 或
EMBEDDING_API_KEY=sk-...                # 通用Embedding API Key
ENABLE_LOCAL_EMBEDDING=false           # 是否启用本地模型（可选）
```

**注册和配置步骤**:
1. **注册OpenAI账号**
   - 访问 https://platform.openai.com
   - 点击 "Sign up" 注册账号
   - 完成邮箱验证和手机验证

2. **获取API密钥**
   - 登录后进入 "API keys" 页面: https://platform.openai.com/api-keys
   - 点击 "Create new secret key"
   - 输入密钥名称（如 "Agentrix Embedding"）
   - 复制生成的API密钥（以 `sk-` 开头，只显示一次）

3. **充值账户**
   - 进入 "Billing" → "Add payment method"
   - 添加支付方式（信用卡）
   - 充值至少 $5（用于测试）

4. **配置环境变量**
   ```bash
   # 在 backend/.env 文件中添加
   OPENAI_API_KEY=sk-...
   ```

5. **测试API调用**
   ```bash
   curl https://api.openai.com/v1/embeddings \
     -H "Authorization: Bearer $OPENAI_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"model": "text-embedding-3-small", "input": "test"}'
   ```

**替代方案**:
- 使用其他Embedding API（如Cohere、Hugging Face）
- 启用本地模型（需要安装 `@xenova/transformers`）

---

### 3. 向量数据库 ✅

**状态**: 代码已集成，当前使用内存模式，需要部署实际服务

**已实现功能**:
- ✅ 向量数据库抽象层（`backend/src/modules/search/vector-db.service.ts`）
- ✅ 支持ChromaDB、Milvus、Pinecone
- ✅ 内存模式fallback

**需要配置的环境变量**:
```bash
VECTOR_DB_TYPE=pinecone                # 或 chroma, milvus, memory
PINECONE_API_KEY=...                   # 如果使用Pinecone
PINECONE_ENVIRONMENT=...               # Pinecone环境
CHROMA_URL=http://localhost:8000       # 如果使用ChromaDB
MILVUS_URL=http://localhost:19530     # 如果使用Milvus
```

#### 选项A: Pinecone（推荐，云服务）

**注册和配置步骤**:
1. **注册Pinecone账号**
   - 访问 https://www.pinecone.io
   - 点击 "Get Started" 注册账号
   - 完成邮箱验证

2. **创建索引**
   - 登录后进入控制台
   - 点击 "Create Index"
   - 配置索引：
     - Name: `agentrix-products`
     - Dimensions: `384`（如果使用text-embedding-3-small）或 `1536`（如果使用text-embedding-ada-002）
     - Metric: `cosine`
     - Pod type: `s1.x1`（免费套餐）
   - 点击 "Create Index"

3. **获取API密钥**
   - 进入 "API Keys" 页面
   - 复制 "API Key"（以 `pcsk_` 开头）
   - 记录 "Environment"（如 `us-east-1`）

4. **安装Pinecone客户端**（如果需要）
   ```bash
   cd backend
   npm install @pinecone-database/pinecone
   ```

5. **配置环境变量**
   ```bash
   VECTOR_DB_TYPE=pinecone
   PINECONE_API_KEY=pcsk_...
   PINECONE_ENVIRONMENT=us-east-1
   PINECONE_INDEX_NAME=agentrix-products
   ```

#### 选项B: ChromaDB（自托管，免费）

**安装和配置步骤**:
1. **安装ChromaDB**
   ```bash
   # 使用Docker
   docker run -d -p 8000:8000 chromadb/chroma
   
   # 或使用pip
   pip install chromadb
   chroma run --host localhost --port 8000
   ```

2. **配置环境变量**
   ```bash
   VECTOR_DB_TYPE=chroma
   CHROMA_URL=http://localhost:8000
   ```

3. **安装ChromaDB客户端**（如果需要）
   ```bash
   cd backend
   npm install chromadb
   ```

#### 选项C: Milvus（自托管，企业级）

**安装和配置步骤**:
1. **安装Milvus**
   ```bash
   # 使用Docker Compose
   wget https://github.com/milvus-io/milvus/releases/download/v2.3.0/milvus-standalone-docker-compose.yml -O docker-compose.yml
   docker-compose up -d
   ```

2. **配置环境变量**
   ```bash
   VECTOR_DB_TYPE=milvus
   MILVUS_URL=http://localhost:19530
   ```

3. **安装Milvus客户端**（如果需要）
   ```bash
   cd backend
   npm install @zilliz/milvus2-sdk-node
   ```

---

### 4. X402 中继器 ⚠️

**状态**: 代码已集成，需要实际的中继器服务

**已实现功能**:
- ✅ X402服务实现（`backend/src/modules/payment/x402.service.ts`）
- ✅ 会话创建和执行
- ✅ 交易压缩

**需要配置的环境变量**:
```bash
X402_RELAYER_URL=https://x402-relayer.example.com
X402_API_KEY=...
```

**配置步骤**:
1. **部署或使用X402中继器服务**
   - 如果已有X402中继器服务，获取API URL和密钥
   - 如果没有，需要部署X402中继器（需要智能合约支持）

2. **配置环境变量**
   ```bash
   X402_RELAYER_URL=https://your-x402-relayer.com
   X402_API_KEY=your-api-key
   ```

**注意**: 当前代码有fallback机制，如果中继器不可用，会使用模拟会话ID。

---

### 5. 数据库 PostgreSQL ✅

**状态**: 代码已集成，需要配置数据库连接

**已实现功能**:
- ✅ TypeORM配置（`backend/src/config/database.config.ts`）
- ✅ 所有实体已定义

**需要配置的环境变量**:
```bash
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=agentrix
DB_PASSWORD=your-password
DB_DATABASE=agentrix
DB_SSL=false                          # 生产环境建议true
```

**安装和配置步骤**:
1. **安装PostgreSQL**
   ```bash
   # Ubuntu/Debian
   sudo apt-get update
   sudo apt-get install postgresql postgresql-contrib
   
   # macOS
   brew install postgresql
   brew services start postgresql
   ```

2. **创建数据库**
   ```bash
   sudo -u postgres psql
   CREATE USER agentrix WITH PASSWORD 'your-password';
   CREATE DATABASE agentrix OWNER agentrix;
   GRANT ALL PRIVILEGES ON DATABASE agentrix TO agentrix;
   \q
   ```

3. **配置环境变量**
   ```bash
   DB_HOST=localhost
   DB_PORT=5432
   DB_USERNAME=agentrix
   DB_PASSWORD=your-password
   DB_DATABASE=agentrix
   ```

4. **运行迁移**
   ```bash
   cd backend
   npm run migration:run
   ```

---

### 6. JWT 认证 ✅

**状态**: 代码已集成，需要配置密钥

**已实现功能**:
- ✅ JWT策略（`backend/src/modules/auth/strategies/jwt.strategy.ts`）
- ✅ Token生成和验证

**需要配置的环境变量**:
```bash
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRES_IN=7d
```

**配置步骤**:
1. **生成JWT密钥**
   ```bash
   # 生成随机密钥
   openssl rand -base64 32
   ```

2. **配置环境变量**
   ```bash
   JWT_SECRET=your-generated-secret-key
   JWT_EXPIRES_IN=7d
   ```

---

## ⚠️ 框架已实现（需要完整集成）

### 7. KYC 服务提供商 ⚠️

**状态**: 代码框架已实现，需要注册和集成实际Provider

**已实现功能**:
- ✅ KYC服务框架（`backend/src/modules/compliance/kyc.service.ts`）
- ✅ 支持Sumsub、Jumio、Onfido
- ✅ KYC状态管理

**支持的Provider**:
- **Sumsub** (推荐，支持个人和企业KYC)
- **Jumio** (全球覆盖)
- **Onfido** (AI驱动)

#### 选项A: Sumsub（推荐）

**注册和配置步骤**:
1. **注册Sumsub账号**
   - 访问 https://sumsub.com
   - 点击 "Get Started" 注册账号
   - 选择计划（Starter/Professional/Enterprise）
   - 完成企业信息填写

2. **获取API凭证**
   - 登录后进入 "Settings" → "API"
   - 创建新的API密钥
   - 复制 "App Token" 和 "Secret Key"

3. **配置环境变量**
   ```bash
   KYC_PROVIDER=sumsub
   SUMSUB_APP_TOKEN=...
   SUMSUB_SECRET_KEY=...
   SUMSUB_BASE_URL=https://api.sumsub.com
   ```

4. **安装Sumsub SDK**（如果需要）
   ```bash
   cd backend
   npm install @sumsub/node-sdk
   ```

5. **更新代码集成**
   - 修改 `backend/src/modules/compliance/kyc.service.ts`
   - 在 `submitToKYCProvider` 方法中调用Sumsub API

#### 选项B: Jumio

**注册和配置步骤**:
1. **注册Jumio账号**
   - 访问 https://www.jumio.com
   - 联系销售获取账号
   - 完成企业认证

2. **获取API凭证**
   - 登录Jumio Portal
   - 进入 "Settings" → "API Credentials"
   - 创建新的API Token

3. **配置环境变量**
   ```bash
   KYC_PROVIDER=jumio
   JUMIO_API_TOKEN=...
   JUMIO_API_SECRET=...
   JUMIO_BASE_URL=https://netverify.com/api/v4
   ```

#### 选项C: Onfido

**注册和配置步骤**:
1. **注册Onfido账号**
   - 访问 https://onfido.com
   - 点击 "Get Started" 注册
   - 选择计划

2. **获取API Token**
   - 登录后进入 "Settings" → "API Tokens"
   - 创建新的Token
   - 复制Token（以 `api_live_` 或 `api_sandbox_` 开头）

3. **配置环境变量**
   ```bash
   KYC_PROVIDER=onfido
   ONFIDO_API_TOKEN=...
   ONFIDO_BASE_URL=https://api.onfido.com/v3
   ```

---

### 8. 链上分析服务 ⚠️

**状态**: 代码框架已实现，需要注册和集成实际服务

**已实现功能**:
- ✅ KYT检查框架（`backend/src/modules/compliance/kyc.service.ts`）
- ✅ 地址风险评分（`backend/src/modules/risk/risk.service.ts`）

**支持的Provider**:
- **Chainalysis** (行业标准)
- **Elliptic** (企业级)
- **TRM Labs** (新兴)

#### 选项A: Chainalysis（推荐）

**注册和配置步骤**:
1. **注册Chainalysis账号**
   - 访问 https://www.chainalysis.com
   - 联系销售获取企业账号
   - 完成企业认证

2. **获取API凭证**
   - 登录Chainalysis平台
   - 进入 "API" 页面
   - 创建新的API Key

3. **配置环境变量**
   ```bash
   CHAINALYSIS_API_KEY=...
   CHAINALYSIS_BASE_URL=https://api.chainalysis.com
   ```

4. **更新代码集成**
   - 修改 `backend/src/modules/risk/risk.service.ts`
   - 在 `getAddressRiskScore` 方法中调用Chainalysis API
   - 修改 `backend/src/modules/compliance/kyc.service.ts`
   - 在 `performKYT` 方法中调用Chainalysis KYT API

#### 选项B: Elliptic

**注册和配置步骤**:
1. **注册Elliptic账号**
   - 访问 https://www.elliptic.co
   - 联系销售获取账号

2. **获取API凭证**
   - 登录Elliptic平台
   - 进入 "API Settings"
   - 创建API Key

3. **配置环境变量**
   ```bash
   ELLIPTIC_API_KEY=...
   ELLIPTIC_BASE_URL=https://api.elliptic.co
   ```

---

### 9. 法币转数字货币服务 ⚠️

**状态**: 代码框架已实现，需要注册和集成实际Provider

**已实现功能**:
- ✅ 法币转数字货币服务框架（`backend/src/modules/payment/fiat-to-crypto.service.ts`）
- ✅ 报价获取和锁定
- ✅ 多Provider支持

**支持的Provider**:
- **MoonPay** (全球覆盖)
- **Ramp** (欧洲/美国)
- **Transak** (全球)
- **Wyre** (美国)

#### 选项A: MoonPay（推荐）

**注册和配置步骤**:
1. **注册MoonPay账号**
   - 访问 https://www.moonpay.com
   - 点击 "Get Started" 注册
   - 选择 "Business" 账户
   - 完成KYC认证

2. **获取API凭证**
   - 登录后进入 "Settings" → "API Keys"
   - 创建新的API Key
   - 复制 "Secret Key" 和 "Public Key"

3. **配置环境变量**
   ```bash
   MOONPAY_API_KEY=...
   MOONPAY_SECRET_KEY=...
   MOONPAY_BASE_URL=https://api.moonpay.com
   ```

4. **更新代码集成**
   - 修改 `backend/src/modules/payment/fiat-to-crypto.service.ts`
   - 实现 `getQuoteFromMoonPay` 和 `executeWithMoonPay` 方法

#### 选项B: Ramp

**注册和配置步骤**:
1. **注册Ramp账号**
   - 访问 https://ramp.network
   - 点击 "Get Started" 注册
   - 完成企业认证

2. **获取API凭证**
   - 登录后进入 "Developer" → "API Keys"
   - 创建新的API Key

3. **配置环境变量**
   ```bash
   RAMP_API_KEY=...
   RAMP_SECRET_KEY=...
   RAMP_BASE_URL=https://api.ramp.network
   ```

#### 选项C: Transak

**注册和配置步骤**:
1. **注册Transak账号**
   - 访问 https://transak.com
   - 点击 "Get Started" 注册
   - 完成企业认证

2. **获取API凭证**
   - 登录后进入 "Settings" → "API"
   - 创建新的API Key

3. **配置环境变量**
   ```bash
   TRANSAK_API_KEY=...
   TRANSAK_SECRET_KEY=...
   TRANSAK_BASE_URL=https://api.transak.com
   ```

---

## 📝 完整环境变量配置清单

创建 `backend/.env` 文件，包含以下配置：

```bash
# ============================================
# 数据库配置
# ============================================
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=agentrix
DB_PASSWORD=your-password
DB_DATABASE=agentrix
DB_SSL=false

# ============================================
# JWT认证
# ============================================
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRES_IN=7d

# ============================================
# Stripe支付
# ============================================
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# ============================================
# OpenAI Embedding
# ============================================
OPENAI_API_KEY=sk-...
ENABLE_LOCAL_EMBEDDING=false

# ============================================
# 向量数据库
# ============================================
VECTOR_DB_TYPE=memory                    # memory, pinecone, chroma, milvus
PINECONE_API_KEY=pcsk_...                # 如果使用Pinecone
PINECONE_ENVIRONMENT=us-east-1            # 如果使用Pinecone
PINECONE_INDEX_NAME=agentrix-products      # 如果使用Pinecone
CHROMA_URL=http://localhost:8000          # 如果使用ChromaDB
MILVUS_URL=http://localhost:19530        # 如果使用Milvus

# ============================================
# X402协议
# ============================================
X402_RELAYER_URL=https://x402-relayer.example.com
X402_API_KEY=...

# ============================================
# KYC服务（选择一个）
# ============================================
KYC_PROVIDER=sumsub                      # sumsub, jumio, onfido
SUMSUB_APP_TOKEN=...
SUMSUB_SECRET_KEY=...
SUMSUB_BASE_URL=https://api.sumsub.com
# 或
JUMIO_API_TOKEN=...
JUMIO_API_SECRET=...
JUMIO_BASE_URL=https://netverify.com/api/v4
# 或
ONFIDO_API_TOKEN=...
ONFIDO_BASE_URL=https://api.onfido.com/v3

# ============================================
# 链上分析服务（选择一个）
# ============================================
CHAINALYSIS_API_KEY=...
CHAINALYSIS_BASE_URL=https://api.chainalysis.com
# 或
ELLIPTIC_API_KEY=...
ELLIPTIC_BASE_URL=https://api.elliptic.co

# ============================================
# 法币转数字货币（选择一个或多个）
# ============================================
MOONPAY_API_KEY=...
MOONPAY_SECRET_KEY=...
MOONPAY_BASE_URL=https://api.moonpay.com
# 或
RAMP_API_KEY=...
RAMP_SECRET_KEY=...
RAMP_BASE_URL=https://api.ramp.network
# 或
TRANSAK_API_KEY=...
TRANSAK_SECRET_KEY=...
TRANSAK_BASE_URL=https://api.transak.com

# ============================================
# OAuth社交登录
# ============================================
# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3001/api/auth/google/callback

# Apple Sign In
APPLE_CLIENT_ID=your-service-id
APPLE_TEAM_ID=your-team-id
APPLE_KEY_ID=your-key-id
APPLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
APPLE_CALLBACK_URL=http://localhost:3001/api/auth/apple/callback

# X (Twitter) OAuth
X_CLIENT_ID=your-x-client-id
X_CLIENT_SECRET=your-x-client-secret
X_CALLBACK_URL=http://localhost:3001/api/auth/x/callback

# ============================================
# 其他配置
# ============================================
NODE_ENV=development
PORT=3001
CORS_ORIGIN=http://localhost:3000
```

---

## 🚀 快速开始指南

### 最小化配置（仅核心功能）

如果只想测试核心功能，最少需要配置：

1. **数据库**（必需）
   ```bash
   DB_HOST=localhost
   DB_PORT=5432
   DB_USERNAME=agentrix
   DB_PASSWORD=your-password
   DB_DATABASE=agentrix
   ```

2. **JWT密钥**（必需）
   ```bash
   JWT_SECRET=your-secret-key
   ```

3. **Stripe**（用于法币支付测试）
   ```bash
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

其他服务可以暂时使用模拟模式（代码中已有fallback）。

### 完整配置（生产环境）

按照上述清单逐步配置所有服务。

---

## 📊 配置优先级建议

### 第一阶段（核心功能）
1. ✅ 数据库 PostgreSQL
2. ✅ JWT认证
3. ✅ Stripe支付

### 第二阶段（增强功能）
4. ✅ OpenAI Embedding
5. ✅ 向量数据库（Pinecone推荐）

### 第三阶段（合规和高级功能）
6. ⚠️ KYC服务（Sumsub推荐）
7. ⚠️ 链上分析（Chainalysis推荐）
8. ⚠️ 法币转数字货币（MoonPay推荐）
9. ⚠️ X402中继器（如果使用X402协议）

---

## 🔍 验证配置

创建测试脚本验证配置：

```bash
# backend/scripts/verify-config.ts
# 检查所有必需的环境变量是否已配置
```

---

## 📚 相关文档

- Stripe文档: https://stripe.com/docs
- OpenAI文档: https://platform.openai.com/docs
- Pinecone文档: https://docs.pinecone.io
- Sumsub文档: https://developers.sumsub.com
- Chainalysis文档: https://docs.chainalysis.com

---

**最后更新**: 2025-01-XX

