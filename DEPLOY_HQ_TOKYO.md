# HQ 项目部署到东京服务器指南

## 服务器信息
- **服务器地址**: 57.182.89.146
- **SSH用户**: ubuntu  
- **PEM密钥**: 需要放在 Windows 桌面上，文件名 `agentrix.pem`
- **远程路径**: /home/ubuntu/Agentrix-independent-HQ/

## 前置条件

### 1. 确保PEM文件在桌面
```powershell
# 检查PEM文件是否存在
Test-Path "$env:USERPROFILE\Desktop\agentrix.pem"
```

如果返回 `False`，请把 agentrix.pem 文件复制到桌面上。

### 2. 测试SSH连接
```bash
# 在 WSL 中测试
wsl ssh -i /mnt/c/Users/xiaocui/Desktop/agentrix.pem ubuntu@57.182.89.146 "echo 'SSH连接成功'"
```

## 部署方式

### 方式一: 使用自动化脚本（推荐）

修复 PEM 文件路径后运行:
```bash
cd d:\wsl\Ubuntu-24.04\Code\Agentrix\Agentrix-website
wsl bash deploy-hq-tokyo.sh
```

### 方式二: 手动部署步骤

#### 步骤 1: 同步 HQ Backend
```bash
wsl rsync -avz --delete \
    --exclude 'node_modules' \
    --exclude 'dist' \
    --exclude '.env' \
    --exclude '.git' \
    -e "ssh -i /mnt/c/Users/xiaocui/Desktop/agentrix.pem -o StrictHostKeyChecking=no" \
    /mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website/hq-backend/ \
    ubuntu@57.182.89.146:/home/ubuntu/Agentrix-independent-HQ/hq-backend/
```

#### 步骤 2: 同步 HQ Console
```bash
wsl rsync -avz --delete \
    --exclude 'node_modules' \
    --exclude '.next' \
    --exclude '.env' \
    --exclude '.git' \
    -e "ssh -i /mnt/c/Users/xiaocui/Desktop/agentrix.pem -o StrictHostKeyChecking=no" \
    /mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website/hq-console/ \
    ubuntu@57.182.89.146:/home/ubuntu/Agentrix-independent-HQ/hq-console/
```

#### 步骤 3: SSH 到服务器执行构建
```bash
wsl ssh -i /mnt/c/Users/xiaocui/Desktop/agentrix.pem ubuntu@57.182.89.146
```

在服务器上执行:
```bash
# Backend 构建
cd /home/ubuntu/Agentrix-independent-HQ/hq-backend
npm install
npm run migration:run  # 运行数据库迁移
npm run build

# Console 构建
cd /home/ubuntu/Agentrix-independent-HQ/hq-console
npm install
npm run build

# 重启服务
pm2 restart hq-backend --update-env
pm2 restart hq-console
pm2 save

# 检查状态
pm2 status
curl http://localhost:3005/api/health
```

## 本次部署的新功能

### HQ Backend (hq-backend)
1. **聊天历史持久化**
   - Entity: ChatHistory
   - Service: ChatHistoryService
   - Controller: /api/hq/chat/history
   - 数据库迁移: AddChatHistory1770379581368

2. **Agent 通信系统**
   - Controller: /api/hq/agents/communication
   - 功能: send, delegate, respond, history

3. **Tick 执行监控**
   - Controller: /api/hq/tick
   - 功能: execute, stats, pause, resume

### HQ Console (hq-console)
1. **WebSocket 自动重连** (useHqWebSocket.ts)
   - 最多10次重试
   - 指数退避策略

2. **多标签代码编辑器** (MultiTabEditor.tsx)
   - Monaco Editor
   - Ctrl+S 保存
   - 修改状态指示器

3. **集成终端** (IntegratedTerminal.tsx)
   - xterm.js v6.0.0
   - 命令执行支持

4. **Tick 执行仪表盘** (TickDashboard.tsx)
   - 实时监控
   - 统计展示

## 验证部署

### 1. 检查 PM2 状态
```bash
ssh -i ~/Desktop/agentrix.pem ubuntu@57.182.89.146 'pm2 status'
```

### 2. 测试 Backend API
```bash
# Health Check
curl http://57.182.89.146:8080/api/health

# Agents List
curl http://57.182.89.146:8080/api/hq/agents

# Chat History
curl http://57.182.89.146:8080/api/hq/chat/history
```

### 3. 访问前端
打开浏览器访问: http://57.182.89.146:8080

测试功能:
- Workspace 多标签编辑器
- 集成终端
- Tick Dashboard
- Agent Chat

### 4. 检查数据库迁移
```bash
ssh -i ~/Desktop/agentrix.pem ubuntu@57.182.89.146 << 'EOF'
docker exec agentrix-postgres psql -U postgres -d agentrix_hq -c "\dt"
docker exec agentrix-postgres psql -U postgres -d agentrix_hq -c "SELECT * FROM migrations ORDER BY timestamp DESC LIMIT 5;"
EOF
```

## 查看日志

```bash
# Backend 日志
ssh -i ~/Desktop/agentrix.pem ubuntu@57.182.89.146 'pm2 logs hq-backend --lines 100'

# Console 日志
ssh -i ~/Desktop/agentrix.pem ubuntu@57.182.89.146 'pm2 logs hq-console --lines 100'

# 实时日志
ssh -i ~/Desktop/agentrix.pem ubuntu@57.182.89.146 'pm2 logs'
```

## 回滚方案

如果部署出现问题:

```bash
ssh -i ~/Desktop/agentrix.pem ubuntu@57.182.89.146

# 停止服务
pm2 stop hq-backend hq-console

# 恢复到上一个版本（如果有备份）
cd /home/ubuntu/Agentrix-independent-HQ
git checkout <previous-commit>

# 重新构建
cd hq-backend && npm run build
cd ../hq-console && npm run build

# 重启
pm2 restart hq-backend hq-console
```

## 常见问题

### Q: 部署后 API 502 错误
A: 检查 Backend 是否正常运行:
```bash
pm2 logs hq-backend --err
```

### Q: 数据库连接失败
A: 检查 .env 配置和 PostgreSQL 容器:
```bash
docker ps | grep postgres
```

### Q: WebSocket 连接失败
A: 确认 nginx 配置支持 WebSocket:
```nginx
location /hq/ {
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

## 环境变量配置

### hq-backend/.env
```env
PORT=3005
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=<your_password>
DATABASE_NAME=agentrix_hq
JWT_SECRET=<your_jwt_secret>
```

### hq-console/.env
```env
NEXT_PUBLIC_HQ_API_URL=http://57.182.89.146:8080/api
NEXT_PUBLIC_HQ_WS_URL=http://57.182.89.146:3005
```

## 监控和维护

### 定期检查
```bash
# 每天检查一次服务状态
ssh -i ~/Desktop/agentrix.pem ubuntu@57.182.89.146 << 'EOF'
pm2 status
df -h  # 磁盘使用
free -m  # 内存使用
docker stats --no-stream agentrix-postgres  # 数据库状态
EOF
```

### 日志清理
```bash
# 清理旧日志（保留最近7天）
ssh -i ~/Desktop/agentrix.pem ubuntu@57.182.89.146 'pm2 flush'
```
