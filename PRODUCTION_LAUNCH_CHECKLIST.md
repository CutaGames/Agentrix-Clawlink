# Agentrix 生产环境上线检查清单

**创建日期**: 2026-01-11  
**状态**: 待执行

---

## 📊 当前系统状态总结

### ✅ 已完成的核心功能

| 模块 | 状态 | 说明 |
|------|------|------|
| 认证系统 | ✅ | JWT、OAuth (Google/Apple/Twitter)、钱包登录 |
| 支付系统 | ✅ | Stripe、法币转加密、托管交易、X402 协议 |
| Skill 生态 V2 | ✅ | 四层架构、统一市场、MCP 代理、工作流编排 |
| 商户系统 | ✅ | 商品管理、订单、佣金分成 |
| Agent 系统 | ✅ | Agent 授权、MPC 钱包、AI 集成 |
| 数据库迁移 | ✅ | 16 个迁移文件 |
| 测试框架 | ✅ | 单元测试、E2E 测试框架 |
| Docker 配置 | ✅ | Dockerfile、docker-compose.yml |
| 健康检查 | ✅ | /api/health、/api/ready、/api/live |
| 环境变量模板 | ✅ | .env.example (前后端) |

---

## 🔴 上线前必须完成 (P0)

### 1. 安全配置

- [ ] **生成生产环境密钥**
  ```bash
  # JWT 密钥 (256位)
  openssl rand -base64 64
  
  # 数据库密码
  openssl rand -base64 32
  
  # 会话密钥
  openssl rand -base64 32
  ```

- [ ] **配置密钥管理**
  - [ ] 使用 AWS Secrets Manager / Azure Key Vault / HashiCorp Vault
  - [ ] 禁止在代码中硬编码密钥
  - [ ] 确认 .gitignore 排除所有 .env 文件

- [ ] **HTTPS 配置**
  - [ ] SSL/TLS 证书 (Let's Encrypt 或商业证书)
  - [ ] 强制 HTTPS 重定向
  - [ ] HSTS 配置

### 2. 数据库配置

- [ ] **生产数据库设置**
  - [ ] 创建生产数据库实例 (RDS / Cloud SQL / 自建)
  - [ ] 配置 SSL 连接
  - [ ] 设置 IP 白名单
  - [ ] 创建只读副本 (可选)

- [ ] **执行数据库迁移**
  ```bash
  cd backend
  npm run migration:run
  ```

- [ ] **配置备份策略**
  - [ ] 每日自动备份
  - [ ] 备份保留 30 天
  - [ ] 测试备份恢复

### 3. 第三方服务配置

- [ ] **支付服务**
  - [ ] Stripe 生产环境 API 密钥
  - [ ] Stripe Webhook 端点配置
  - [ ] 测试支付流程

- [ ] **OAuth 配置**
  - [ ] Google OAuth 生产回调 URL
  - [ ] Apple OAuth 生产回调 URL
  - [ ] Twitter OAuth 生产回调 URL

- [ ] **区块链 RPC**
  - [ ] 以太坊主网 RPC (Infura/Alchemy)
  - [ ] BSC 主网 RPC
  - [ ] 备用 RPC 节点

### 4. 环境变量配置

- [ ] **后端 .env.production**
  ```env
  NODE_ENV=production
  DB_HOST=<生产数据库地址>
  DB_SSL=true
  JWT_SECRET=<256位随机密钥>
  CORS_ORIGIN=https://your-domain.com
  ```

- [ ] **前端 .env.production**
  ```env
  NEXT_PUBLIC_API_URL=https://api.your-domain.com/api
  NEXT_PUBLIC_APP_URL=https://your-domain.com
  NEXT_PUBLIC_CHAIN_ID=1
  ```

---

## 🟡 上线前建议完成 (P1)

### 5. 监控和日志

- [ ] **应用监控**
  - [ ] 集成 APM (Sentry / New Relic / Datadog)
  - [ ] 配置错误告警
  - [ ] 配置性能监控

- [ ] **日志管理**
  - [ ] 集中式日志 (ELK / Loki)
  - [ ] 日志级别设为 INFO
  - [ ] 敏感信息脱敏

- [ ] **告警配置**
  - [ ] 服务器资源告警 (CPU > 80%, 内存 > 85%)
  - [ ] API 错误率告警 (> 1%)
  - [ ] 支付失败告警

### 6. 性能优化

- [ ] **后端优化**
  - [ ] 数据库连接池配置 (max: 20)
  - [ ] 启用 Redis 缓存
  - [ ] API 响应压缩

- [ ] **前端优化**
  - [ ] 启用 CDN
  - [ ] 图片优化
  - [ ] 代码分割

### 7. 测试验证

- [ ] **功能测试**
  - [ ] 用户注册/登录流程
  - [ ] 支付流程端到端测试
  - [ ] Agent 授权流程测试
  - [ ] Skill 市场功能测试

- [ ] **压力测试**
  - [ ] API 负载测试 (100 并发)
  - [ ] 数据库压力测试
  - [ ] 确定系统容量上限

---

## 🟢 上线后持续改进 (P2)

### 8. 文档完善

- [ ] API 文档 (Swagger)
- [ ] SDK 集成文档
- [ ] 用户使用指南
- [ ] 故障排除手册

### 9. 合规性

- [ ] 隐私政策
- [ ] 服务条款
- [ ] Cookie 政策
- [ ] GDPR 合规 (如服务欧盟用户)

### 10. 技术债务

- [ ] 代码重构
- [ ] 测试覆盖率提升
- [ ] 性能优化

---

## 🚀 部署步骤

### 方式一：Docker Compose 部署

```bash
# 1. 克隆代码
git clone https://github.com/CutaGames/Agentrix.git
cd Agentrix

# 2. 配置环境变量
cp backend/.env.example backend/.env.production
cp frontend/.env.example frontend/.env.production
# 编辑 .env.production 文件填入生产配置

# 3. 构建并启动
docker-compose --env-file .env.production up -d --build

# 4. 执行数据库迁移
docker-compose exec backend npm run migration:run

# 5. 检查服务状态
docker-compose ps
curl http://localhost:3001/api/health
```

### 方式二：PM2 部署

```bash
# 1. 安装依赖
cd backend && npm ci --production
cd ../frontend && npm ci

# 2. 构建
cd backend && npm run build
cd ../frontend && npm run build

# 3. 启动服务
pm2 start ecosystem.config.js --env production

# 4. 保存 PM2 配置
pm2 save
pm2 startup
```

---

## 📋 上线前 24 小时检查

- [ ] 所有 P0 任务完成
- [ ] 生产环境配置验证
- [ ] 数据库备份验证
- [ ] 监控和告警测试
- [ ] 支付流程端到端测试
- [ ] 回滚计划准备
- [ ] 团队通知

---

## 🚨 上线后监控重点 (前 7 天)

| 指标 | 目标值 |
|------|--------|
| API 响应时间 (P95) | < 500ms |
| 错误率 | < 0.1% |
| 支付成功率 | > 99% |
| CPU 使用率 | < 70% |
| 内存使用率 | < 80% |
| 数据库慢查询 | < 1% |

---

## 📞 紧急联系

- **技术负责人**: [待填写]
- **运维联系**: [待填写]
- **第三方服务支持**:
  - Stripe: https://support.stripe.com
  - Infura: https://infura.io/support

---

**最后更新**: 2026-01-11
