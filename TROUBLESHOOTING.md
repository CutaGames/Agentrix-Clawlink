# PayMind 故障排除指南

## 🌐 浏览器无法打开问题

### 问题1: 服务未启动

**症状**: 浏览器显示"无法访问此网站"或连接超时

**解决步骤**:

1. **检查服务状态**
   ```bash
   ./check-status.sh
   ```

2. **如果服务未运行，启动服务**

   **方式1: 使用启动脚本（推荐）**
   ```bash
   ./start-dev.sh
   ```

   **方式2: 分别启动**
   ```bash
   # 终端1 - 启动后端
   ./start-backend.sh
   
   # 终端2 - 启动前端
   ./start-frontend.sh
   ```

   **方式3: 手动启动**
   ```bash
   # 终端1 - 后端
   cd backend
   npm run start:dev
   
   # 终端2 - 前端
   cd paymindfrontend
   npm run dev
   ```

---

### 问题2: 端口被占用

**症状**: 启动时显示 "EADDRINUSE: address already in use"

**解决**:
```bash
# 查找占用端口的进程
lsof -i :3000  # 前端端口
lsof -i :3001  # 后端端口

# 杀死进程
kill -9 <PID>

# 或使用停止脚本
./stop-dev.sh
```

---

### 问题3: 后端启动失败

**症状**: 后端进程运行但端口未监听

**检查**:
```bash
# 查看后端日志
tail -f backend.log

# 或直接运行查看错误
cd backend
npm run start:dev
```

**常见原因**:
1. **数据库连接失败**
   - 检查 `backend/.env` 中的数据库配置
   - 确认PostgreSQL服务运行: `sudo service postgresql status`
   - 测试连接: `psql -U postgres -d paymind`

2. **缺少环境变量**
   - 确保 `backend/.env` 存在
   - 运行: `cd backend && cp .env.example .env`

3. **依赖未安装**
   - 运行: `cd backend && npm install`

---

### 问题4: 前端启动失败

**症状**: 前端无法访问或显示错误

**检查**:
```bash
# 查看前端日志
tail -f frontend.log

# 或直接运行查看错误
cd paymindfrontend
npm run dev
```

**常见原因**:
1. **缺少环境变量**
   - 确保 `paymindfrontend/.env.local` 存在
   - 运行: `cd paymindfrontend && cp .env.local.example .env.local`

2. **依赖未安装**
   - 运行: `cd paymindfrontend && npm install`

3. **端口被占用**
   - 检查: `lsof -i :3000`
   - 杀死进程或更改端口

---

### 问题5: WSL网络访问问题

**症状**: 在Windows浏览器中无法访问 localhost:3000

**解决**:

1. **使用WSL IP地址**
   ```bash
   # 获取WSL IP
   hostname -I | awk '{print $1}'
   
   # 在浏览器中访问
   # http://<WSL_IP>:3000
   # http://<WSL_IP>:3001
   ```

2. **配置Windows hosts文件** (可选)
   - 编辑 `C:\Windows\System32\drivers\etc\hosts`
   - 添加: `127.0.0.1 localhost`

3. **使用localhost.localdomain**
   - 访问: `http://localhost.localdomain:3000`

---

## 🔧 快速修复命令

### 完全重置并启动

```bash
# 1. 停止所有服务
./stop-dev.sh

# 2. 运行自动安装
./setup.sh

# 3. 启动服务
./start-dev.sh
```

### 仅重启服务

```bash
# 停止
./stop-dev.sh

# 启动
./start-dev.sh
```

### 检查并修复配置

```bash
# 检查状态
./check-status.sh

# 创建缺失的配置文件
cd backend && [ ! -f .env ] && cp .env.example .env
cd ../paymindfrontend && [ ! -f .env.local ] && cp .env.local.example .env.local
```

---

## 📊 诊断信息收集

如果问题仍然存在，请收集以下信息：

```bash
# 1. 服务状态
./check-status.sh > status.txt

# 2. 后端日志
tail -50 backend.log > backend-error.txt

# 3. 前端日志
tail -50 frontend.log > frontend-error.txt

# 4. 系统信息
node --version > system-info.txt
npm --version >> system-info.txt
psql --version >> system-info.txt 2>&1
```

---

## 🆘 紧急修复

如果所有方法都失败：

```bash
# 1. 完全清理
cd /mnt/d/wsl/Ubuntu-24.04/Code/Paymind/paymind-website
./stop-dev.sh
rm -f .backend.pid .frontend.pid backend.log frontend.log

# 2. 重新安装依赖
cd backend && rm -rf node_modules && npm install
cd ../paymindfrontend && rm -rf node_modules && npm install

# 3. 重新配置
cd ../backend && cp .env.example .env
cd ../paymindfrontend && cp .env.local.example .env.local

# 4. 启动
cd .. && ./start-dev.sh
```

---

## 📞 获取帮助

如果问题仍未解决：
1. 查看日志文件: `backend.log` 和 `frontend.log`
2. 检查浏览器控制台错误
3. 确认所有依赖已安装
4. 确认数据库服务运行正常

