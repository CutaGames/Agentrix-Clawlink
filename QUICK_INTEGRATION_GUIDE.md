# Agentrix 第三方服务快速集成指南

## 🎯 快速参考

### ✅ 已集成（代码完成，只需配置）

| 服务 | 必需配置 | 优先级 | 预计时间 |
|------|---------|--------|---------|
| **PostgreSQL** | DB_HOST, DB_USERNAME, DB_PASSWORD | 🔴 必需 | 10分钟 |
| **JWT认证** | JWT_SECRET | 🔴 必需 | 2分钟 |
| **Stripe** | STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET | 🔴 高 | 15分钟 |
| **OpenAI** | OPENAI_API_KEY | 🟡 中 | 10分钟 |
| **向量数据库** | PINECONE_API_KEY (或自托管) | 🟡 中 | 20分钟 |

### ⚠️ 框架已实现（需要完整集成）

| 服务 | 必需配置 | 优先级 | 预计时间 |
|------|---------|--------|---------|
| **KYC服务** | SUMSUB/JUMIO/ONFIDO API Key | 🟡 中 | 1-2天 |
| **链上分析** | CHAINALYSIS/ELLIPTIC API Key | 🟡 中 | 1-2天 |
| **法币转数字货币** | MOONPAY/RAMP/TRANSAK API Key | 🟡 中 | 1-2天 |
| **X402中继器** | X402_RELAYER_URL, X402_API_KEY | 🟢 低 | 待定 |

---

## 🚀 5分钟快速启动（最小配置）

### 步骤1: 配置数据库（2分钟）

```bash
# 安装PostgreSQL（如果未安装）
sudo apt-get install postgresql postgresql-contrib

# 创建数据库
sudo -u postgres psql
CREATE USER agentrix WITH PASSWORD 'agentrix123';
CREATE DATABASE agentrix OWNER agentrix;
\q
```

### 步骤2: 配置JWT（1分钟）

```bash
# 生成密钥
openssl rand -base64 32
```

### 步骤3: 创建.env文件（2分钟）

```bash
cd backend
cat > .env << EOF
# 数据库
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=agentrix
DB_PASSWORD=agentrix123
DB_DATABASE=agentrix

# JWT
JWT_SECRET=$(openssl rand -base64 32)
JWT_EXPIRES_IN=7d

# 其他（可选）
NODE_ENV=development
PORT=3001
CORS_ORIGIN=http://localhost:3000
EOF
```

### 步骤4: 启动服务

```bash
# 启动后端
cd backend
npm install
npm run start:dev

# 启动前端（新终端）
cd agentrixfrontend
npm install
npm run dev
```

**✅ 现在可以测试基础功能了！**

---

## 📋 完整配置清单

### 必需配置（核心功能）

#### 1. PostgreSQL 数据库 ✅

```bash
# .env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=agentrix
DB_PASSWORD=your-password
DB_DATABASE=agentrix
```

**快速安装**:
```bash
# Ubuntu/Debian
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql

# macOS
brew install postgresql
brew services start postgresql
```

#### 2. JWT 认证 ✅

```bash
# .env
JWT_SECRET=your-super-secret-key-min-32-chars
JWT_EXPIRES_IN=7d
```

**生成密钥**:
```bash
openssl rand -base64 32
```

#### 3. Stripe 支付 ✅

**注册**: https://stripe.com  
**获取密钥**: Dashboard → Developers → API keys  
**Webhook配置**: Dashboard → Developers → Webhooks

```bash
# .env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**测试卡号**: `4242 4242 4242 4242`

---

### 推荐配置（增强功能）

#### 4. OpenAI Embedding ✅

**注册**: https://platform.openai.com  
**获取密钥**: API keys 页面  
**充值**: 至少 $5

```bash
# .env
OPENAI_API_KEY=sk-...
```

**替代方案**: 启用本地模型（需要安装模型文件）

#### 5. Pinecone 向量数据库 ✅

**注册**: https://www.pinecone.io  
**创建索引**: 控制台 → Create Index  
**获取密钥**: API Keys 页面

```bash
# .env
VECTOR_DB_TYPE=pinecone
PINECONE_API_KEY=pcsk_...
PINECONE_ENVIRONMENT=us-east-1
PINECONE_INDEX_NAME=agentrix-products
```

**免费套餐**: 1个索引，100K向量

---

### 可选配置（高级功能）

#### 6. Sumsub KYC服务 ⚠️

**注册**: https://sumsub.com  
**获取凭证**: Settings → API  
**预计时间**: 1-2天（需要企业认证）

```bash
# .env
KYC_PROVIDER=sumsub
SUMSUB_APP_TOKEN=...
SUMSUB_SECRET_KEY=...
```

#### 7. Chainalysis 链上分析 ⚠️

**注册**: https://www.chainalysis.com  
**联系销售**: 获取企业账号  
**预计时间**: 1-2天

```bash
# .env
CHAINALYSIS_API_KEY=...
```

#### 8. MoonPay 法币转数字货币 ⚠️

**注册**: https://www.moonpay.com  
**获取凭证**: Settings → API Keys  
**预计时间**: 1-2天（需要KYC）

```bash
# .env
MOONPAY_API_KEY=...
MOONPAY_SECRET_KEY=...
```

---

## 🔧 配置验证脚本

创建 `backend/scripts/check-config.ts`:

```typescript
import * as dotenv from 'dotenv';
dotenv.config();

const required = [
  'DB_HOST',
  'DB_USERNAME',
  'DB_PASSWORD',
  'DB_DATABASE',
  'JWT_SECRET',
];

const optional = [
  'STRIPE_SECRET_KEY',
  'OPENAI_API_KEY',
  'PINECONE_API_KEY',
  'SUMSUB_APP_TOKEN',
  'CHAINALYSIS_API_KEY',
  'MOONPAY_API_KEY',
];

console.log('🔍 检查配置...\n');

let missing = 0;
required.forEach(key => {
  if (!process.env[key]) {
    console.log(`❌ ${key} - 必需但未配置`);
    missing++;
  } else {
    console.log(`✅ ${key} - 已配置`);
  }
});

console.log('\n可选配置:');
optional.forEach(key => {
  if (process.env[key]) {
    console.log(`✅ ${key} - 已配置`);
  } else {
    console.log(`⚪ ${key} - 未配置（可选）`);
  }
});

if (missing > 0) {
  console.log(`\n⚠️  缺少 ${missing} 个必需配置项`);
  process.exit(1);
} else {
  console.log('\n✅ 所有必需配置已就绪！');
}
```

运行:
```bash
cd backend
npx ts-node scripts/check-config.ts
```

---

## 📊 配置状态检查表

使用此表跟踪配置进度：

```
[ ] PostgreSQL 数据库
[ ] JWT 认证密钥
[ ] Stripe 支付
[ ] Stripe Webhook
[ ] OpenAI Embedding
[ ] Pinecone 向量数据库
[ ] Sumsub KYC
[ ] Chainalysis 链上分析
[ ] MoonPay 法币转数字货币
[ ] X402 中继器
```

---

## 🆘 常见问题

### Q: 哪些服务是必需的？
A: 只有数据库和JWT是必需的。其他服务都有fallback机制。

### Q: 如何快速测试？
A: 只需配置数据库和JWT，其他服务会使用模拟模式。

### Q: 生产环境需要哪些？
A: 建议配置所有服务，特别是Stripe、OpenAI、向量数据库、KYC服务。

### Q: 如何选择KYC Provider？
A: 
- **Sumsub**: 推荐，支持个人和企业，价格合理
- **Jumio**: 全球覆盖，企业级
- **Onfido**: AI驱动，快速验证

### Q: 向量数据库选择？
A:
- **Pinecone**: 推荐，云服务，易于使用
- **ChromaDB**: 免费，自托管
- **Milvus**: 企业级，高性能

---

**详细步骤请参考**: `THIRD_PARTY_INTEGRATION_CHECKLIST.md`

