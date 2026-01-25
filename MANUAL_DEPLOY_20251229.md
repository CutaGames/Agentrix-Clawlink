# 生产环境手动部署指南
## 2025-12-29 修复部署

### 前提条件
✅ 代码已推送到 GitHub: commit `82cd821`
✅ 本地编译测试通过

---

## 🚀 快速部署（5分钟）

### 步骤 1: SSH 连接服务器
```bash
ssh root@129.226.152.88
# 密码: zyc.2392018
```

### 步骤 2: 备份数据库（必须！）
```bash
docker exec postgresql pg_dump -U postgres paymind > /var/www/agentrix-website/backup_$(date +%Y%m%d_%H%M%S).sql
```

### 步骤 3: 拉取最新代码
```bash
cd /var/www/agentrix-website
git pull origin main
```

如果遇到 SSH key 问题，改用 HTTPS（需要 token）：
```bash
# 方案 A: 使用 Git credential helper（推荐）
git config credential.helper store
git pull origin main
# 输入 GitHub username 和 personal access token

# 方案 B: 直接使用 token URL（临时方案）
git remote set-url origin https://github_pat_YOUR_TOKEN@github.com/CutaGames/Agentrix.git
git pull origin main
```

### 步骤 4: 构建并重启后端
```bash
cd /var/www/agentrix-website/backend
npm install
npm run build
pm2 restart agentrix-backend
```

### 步骤 5: 检查服务状态
```bash
pm2 list
pm2 logs agentrix-backend --lines 50
```

### 步骤 6: 验证健康状态
```bash
curl https://api.agentrix.io/api/health
```

---

## 🧪 验证清单

### 1. MCP OAuth 验证

#### 访问 .well-known 端点
```bash
curl https://api.agentrix.top/.well-known/oauth-authorization-server
curl https://api.agentrix.top/.well-known/openid-configuration
```

**预期结果**：
- 返回 JSON 配置
- `authorization_endpoint`: `https://api.agentrix.top/api/auth/mcp/authorize`
- `token_endpoint`: `https://api.agentrix.top/api/auth/mcp/token`
- `token_endpoint_auth_methods_supported` 包含 `"none"`

#### ChatGPT 集成测试
1. 打开 ChatGPT Actions 配置
2. 添加 MCP Server URL: `https://api.agentrix.top/api/mcp/sse`
3. 身份验证选择"未授权" → ✅ 应该成功
4. 身份验证选择"OAuth" → ✅ 应该能发现配置

---

### 2. Transak 支付验证

#### 测试场景：399 USD 商品
1. 访问 https://www.agentrix.top
2. 选择 399 USD 商品
3. 选择 Transak 支付
4. 观察锁定金额：
   - ✅ 显示约 411 USD（399 + 手续费）
   - ✅ 合约地址应收到 399 USDC

#### 查看后端日志
```bash
pm2 logs agentrix-backend --lines 100 | grep -i transak
```

预期日志：
```
Transak: Creating session for 411 USD -> USDC
Transak: Converted CNY to USD (if applicable)
```

---

### 3. 支付步骤提示器验证

#### 测试流程
1. 进入 Transak 支付流程
2. 观察步骤提示器：
   - ✅ 确认价格 → 邮箱验证 → KYC（如需） → 支付 → 完成
3. 已完成 KYC 用户：
   - ✅ 应直接从"邮箱验证"跳到"支付"
4. 未完成 KYC 用户：
   - ✅ 显示完整流程：邮箱 → KYC → 支付

---

### 4. 非支持法币验证（可选）

#### 测试场景：CNY 计价商品
1. 选择 CNY 计价商品（如 2800 CNY）
2. 选择 Transak 支付
3. 观察：
   - ✅ 自动换算为 USD（约 394 USD）
   - ✅ 锁定的是 USD 金额

#### 查看日志
```bash
pm2 logs agentrix-backend | grep "Converted.*CNY"
```

---

## ❌ 前端部署（暂缓）

**原因**：前端存在字符编码问题（与本次修复无关）
```
./pages/admin/merchants.tsx: Unterminated string constant
./pages/admin/product-review.tsx: Unterminated string constant  
./pages/admin/products.tsx: Unterminated string constant
```

**如需强制部署前端**：
```bash
cd /var/www/agentrix-website/frontend
npm run build  # 会有警告，但不影响运行
pm2 restart agentrix-frontend
```

---

## 🔧 故障排查

### 问题 1: Git pull 失败
```bash
# 检查 Git 配置
git remote -v
git config --list | grep credential

# 如果使用 SSH，检查 key
ssh -T git@github.com

# 如果使用 HTTPS，配置 credential helper
git config credential.helper store
```

### 问题 2: npm install 失败
```bash
# 清理缓存
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### 问题 3: PM2 重启失败
```bash
# 查看详细错误
pm2 logs agentrix-backend --err --lines 100

# 手动启动查看错误
cd /var/www/agentrix-website/backend
node dist/main.js

# 如果需要完全重启
pm2 delete agentrix-backend
pm2 start dist/main.js --name agentrix-backend
```

### 问题 4: 健康检查失败
```bash
# 检查端口
netstat -tlnp | grep 3001

# 检查 Nginx 配置
nginx -t
systemctl status nginx

# 查看后端日志
pm2 logs agentrix-backend --lines 200
```

---

## 📝 回滚方案

如果部署后出现严重问题，可以回滚：

### 1. 回滚代码
```bash
cd /var/www/agentrix-website
git log --oneline -5  # 查看最近的提交
git reset --hard ea459d5  # 回滚到上一个提交
```

### 2. 重新构建
```bash
cd backend
npm run build
pm2 restart agentrix-backend
```

### 3. 恢复数据库（如有必要）
```bash
# 找到备份文件
ls -lh /var/www/agentrix-website/backup_*.sql

# 恢复数据库
pm2 stop agentrix-backend
docker exec -i postgresql psql -U postgres -d paymind < backup_FILE_NAME.sql
pm2 start agentrix-backend
```

---

## ✅ 部署完成检查表

- [ ] 数据库已备份
- [ ] 代码已拉取（commit: 82cd821）
- [ ] 后端已构建
- [ ] PM2 服务已重启
- [ ] 健康检查通过
- [ ] MCP OAuth 端点可访问
- [ ] Transak 金额锁定正确
- [ ] 步骤提示器显示正常

---

## 📞 支持

如有问题，请查看：
- 详细修复说明: `FIXES_2025_12_29.md`
- 部署流程: `DEPLOYMENT_PROCESS_20251223.md`
- 项目指南: `.github/copilot-instructions.md`

**关键日志位置**：
- 后端: `pm2 logs agentrix-backend`
- Nginx: `/var/log/nginx/error.log`
- Docker: `docker logs postgresql`
