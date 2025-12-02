# PayMind V3.0 部署指南

**版本**: V3.0  
**部署日期**: 2025年1月  
**部署环境**: 生产环境

---

## 📋 部署前检查清单

### 1. 代码检查
- ✅ 所有测试用例通过
- ✅ 所有问题已修复
- ✅ 代码无编译错误
- ✅ 代码无Linter错误

### 2. 环境配置
- [ ] 生产环境API密钥已配置
- [ ] 数据库连接字符串已配置
- [ ] 所有环境变量已设置
- [ ] CORS策略已配置
- [ ] HTTPS证书已配置

### 3. 依赖检查
- [ ] 前端依赖已安装 (`npm install`)
- [ ] 后端依赖已安装 (`npm install`)
- [ ] 数据库迁移已执行
- [ ] 所有服务已启动

---

## 🚀 部署步骤

### 步骤1: 构建前端

```bash
cd paymindfrontend
npm install
npm run build
```

### 步骤2: 构建后端

```bash
cd backend
npm install
npm run build
```

### 步骤3: 数据库迁移

```bash
cd backend
npm run migration:run
```

### 步骤4: 启动服务

#### 开发环境
```bash
# 前端
cd paymindfrontend
npm run dev

# 后端
cd backend
npm run start:dev
```

#### 生产环境
```bash
# 前端
cd paymindfrontend
npm start

# 后端
cd backend
npm run start:prod
```

---

## 🔧 环境变量配置

### 前端环境变量 (.env.production)

```env
NEXT_PUBLIC_API_URL=https://api.paymind.io/api
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_live_...
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=...
```

### 后端环境变量 (.env)

```env
# 数据库
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=paymind
DATABASE_PASSWORD=...
DATABASE_NAME=paymind

# JWT
JWT_SECRET=...
JWT_EXPIRES_IN=7d

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Provider API Keys
MOONPAY_API_KEY=...
ALCHEMY_PAY_API_KEY=...

# 其他
NODE_ENV=production
PORT=3001
CORS_ORIGIN=https://paymind.io
```

---

## 📦 部署架构

### 前端部署
- **平台**: Vercel / Netlify / 自建服务器
- **端口**: 3000 (开发) / 80/443 (生产)
- **构建命令**: `npm run build`
- **启动命令**: `npm start`

### 后端部署
- **平台**: AWS / GCP / Azure / 自建服务器
- **端口**: 3001
- **构建命令**: `npm run build`
- **启动命令**: `npm run start:prod`

### 数据库
- **类型**: PostgreSQL
- **版本**: 14+
- **备份**: 每日自动备份

---

## 🔒 安全配置

### 1. HTTPS
- 启用HTTPS证书（Let's Encrypt / 商业证书）
- 配置HTTP到HTTPS重定向
- 启用HSTS

### 2. CORS
```typescript
// backend/src/main.ts
app.enableCors({
  origin: ['https://paymind.io', 'https://www.paymind.io'],
  credentials: true,
});
```

### 3. API限流
```typescript
// 使用 @nestjs/throttler
import { ThrottlerModule } from '@nestjs/throttler';

ThrottlerModule.forRoot({
  ttl: 60,
  limit: 100,
}),
```

### 4. 环境变量安全
- 使用密钥管理服务（AWS Secrets Manager / HashiCorp Vault）
- 不要在代码中硬编码密钥
- 定期轮换密钥

---

## 📊 监控和日志

### 1. 错误监控
- 集成Sentry或类似服务
- 配置错误告警
- 定期检查错误日志

### 2. 性能监控
- 使用APM工具（New Relic / Datadog）
- 监控API响应时间
- 监控数据库查询性能

### 3. 日志管理
- 使用日志聚合服务（ELK / CloudWatch）
- 配置日志级别
- 定期清理旧日志

---

## 🔄 回滚计划

### 如果部署失败

1. **停止新版本服务**
```bash
# 停止前端
pm2 stop paymind-frontend

# 停止后端
pm2 stop paymind-backend
```

2. **恢复旧版本**
```bash
# 前端
cd paymindfrontend
git checkout <previous-version>
npm install
npm run build
npm start

# 后端
cd backend
git checkout <previous-version>
npm install
npm run build
npm run start:prod
```

3. **检查服务状态**
```bash
# 检查前端
curl http://localhost:3000

# 检查后端
curl http://localhost:3001/api/health
```

---

## ✅ 部署后验证

### 1. 功能验证
- [ ] 首页正常加载
- [ ] 所有页面正常访问
- [ ] 登录功能正常
- [ ] 支付流程正常
- [ ] Agent Builder正常
- [ ] API调用正常

### 2. 性能验证
- [ ] 页面加载时间 < 3秒
- [ ] API响应时间 < 500ms
- [ ] 数据库查询时间 < 100ms

### 3. 安全验证
- [ ] HTTPS正常
- [ ] CORS配置正确
- [ ] API限流生效
- [ ] 错误信息不泄露敏感数据

---

## 📝 部署记录

### 部署信息
- **版本**: V3.0
- **部署时间**: 2025年1月
- **部署人员**: [待填写]
- **部署环境**: 生产环境

### 部署步骤执行记录
- [ ] 代码构建完成
- [ ] 数据库迁移完成
- [ ] 服务启动完成
- [ ] 功能验证完成
- [ ] 性能验证完成
- [ ] 安全验证完成

### 问题记录
- [ ] 无问题
- [ ] 有问题（记录在下方）

---

## 🆘 故障排查

### 常见问题

#### 1. 前端无法访问
- 检查端口是否正确
- 检查防火墙设置
- 检查服务是否启动

#### 2. 后端API无法访问
- 检查CORS配置
- 检查API路由
- 检查服务是否启动

#### 3. 数据库连接失败
- 检查数据库服务是否运行
- 检查连接字符串
- 检查网络连接

#### 4. 支付功能异常
- 检查Stripe密钥配置
- 检查Webhook配置
- 检查Provider API密钥

---

## 📞 支持联系

- **技术支持**: [待填写]
- **紧急联系**: [待填写]
- **文档**: https://docs.paymind.io

---

**部署状态**: ✅ 准备就绪  
**最后更新**: 2025年1月

