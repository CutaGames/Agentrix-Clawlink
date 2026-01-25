# Agentrix 标准生产环境部署与更新指南 (2025-12-27 更新)

## 0. 标准部署工作流 (Git-First)
为了保证代码一致性，必须遵循以下顺序：
1. **本地开发与测试**: 在本地环境完成代码修改并验证。
2. **推送至 GitHub**:
   ```bash
   git add .
   git commit -m "feat: update mcp and payment fixes"
   git push origin main
   ```![alt text](image.png)
3. **服务器拉取 (使用 sshpass)**:
   ```bash
   sshpass -p 'zyc.2392018' ssh root@129.226.152.88 "cd /var/www/agentrix-website && git pull origin main"
   ```
4. **构建与重启**: 执行后端/前端构建并重启 PM2 进程。

### 快速同步 (rsync 备选方案)
如果 Git 推送不便，可使用 rsync 直接同步：
```bash
sshpass -p 'zyc.2392018' rsync -avz --exclude='node_modules' --exclude='.git' --exclude='.env' --exclude='dist' --exclude='.next' ./ root@129.226.152.88:/var/www/agentrix-website/
```

## 1. 数据库备份与恢复 (更新前必做)
在执行任何可能影响数据库的操作（如 `migration:run` 或代码更新）前，必须备份数据。

### 备份数据库
```bash
sshpass -p 'zyc.2392018' ssh root@129.226.152.88 "docker exec postgresql pg_dump -U postgres paymind > /var/www/agentrix-website/backup_\$(date +%Y%m%d_%H%M%S).sql"
```

### 恢复数据库 (仅在数据丢失时)
```bash
# 停止后端服务防止写入
pm2 stop agentrix-backend
# 恢复数据
docker exec -i postgresql psql -U postgres -d paymind < backup_FILE_NAME.sql
# 重启后端
pm2 start agentrix-backend
```

## 2. 环境信息
- **服务器 IP**: `129.226.152.88`
- **域名**: `https://www.agentrix.top` / `https://api.agentrix.io`
- **部署路径**: `/var/www/agentrix-website`
- **数据库**: Docker 容器 `postgresql` (库名: `paymind`)
- **进程管理**: PM2 (agentrix-backend, agentrix-frontend)

## 3. 更新步骤与命令顺序

### 第一阶段：代码同步
```bash
# 登录服务器
ssh root@129.226.152.88

# 进入项目目录
cd /var/www/agentrix-website

# 拉取最新代码
git pull origin main
```

### 第二阶段：后端构建与重启
```bash
cd /var/www/agentrix-website/backend
# 安装依赖 (如有新增)
npm install
# 构建
npm run build
# 运行迁移 (如有)
npm run migration:run
# 重启服务
pm2 restart agentrix-backend
```

### 第三阶段：前端构建与重启
```bash
cd /var/www/agentrix-website/frontend
# 构建
npm run build
# 重启服务
pm2 restart agentrix-frontend
```

## 4. 状态检查
```bash
# 查看服务运行状态
pm2 list
# 查看后端实时日志
pm2 logs agentrix-backend --lines 100
# 检查健康状态
curl https://api.agentrix.io/api/health
```

## 5. 常见问题
- **Twitter 登录失败**: 检查 `.env` 中的 `TWITTER_CALLBACK_URL` 是否与 Twitter Developer Portal 配置一致。
- **MCP OAuth 404**: 确保 `.well-known/openid-configuration` 路由已部署且 Nginx 已正确转发。
- **数据丢失**: 检查 `DB_SYNC` 是否为 `false`。如果为 `true`，TypeORM 可能会在启动时清空表。
