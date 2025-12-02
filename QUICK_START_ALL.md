# PayMind 全服务快速启动指南

## 🚀 一键启动所有服务

### 方法1: 使用启动脚本（推荐）

在WSL中运行：
```bash
./start-all.sh
```

或使用npm：
```bash
npm run start:all
```

这将同时启动：
- ✅ 前端服务 (端口 3000)
- ✅ 后端服务 (端口 3001)
- ✅ SDK文档服务 (端口 3002)

---

### 方法2: 手动启动

#### 1. 启动前端
```bash
cd paymindfrontend
npm run dev
```

#### 2. 启动后端（新终端）
```bash
cd backend
npm run start:dev
```

#### 3. 生成并启动SDK文档（新终端）
```bash
cd sdk-js
npm install --save-dev typedoc  # 首次需要
npm run docs:generate
npm run docs:serve
```

---

## 🌐 配置Windows端口转发（使用localhost）

### 在Windows PowerShell中运行（以管理员身份）：

```powershell
.\setup-all-ports.ps1
```

或手动配置：
```powershell
# 获取WSL IP
$wslIp = (wsl hostname -I).Split()[0]

# 配置端口转发
netsh interface portproxy add v4tov4 listenport=3000 listenaddress=0.0.0.0 connectport=3000 connectaddress=$wslIp
netsh interface portproxy add v4tov4 listenport=3001 listenaddress=0.0.0.0 connectport=3001 connectaddress=$wslIp
netsh interface portproxy add v4tov4 listenport=3002 listenaddress=0.0.0.0 connectport=3002 connectaddress=$wslIp
```

---

## 📍 访问地址

### 在Windows浏览器中访问：

#### 使用 localhost（配置端口转发后）：
- **前端**: http://localhost:3000
- **后端**: http://localhost:3001
- **API文档**: http://localhost:3001/api/docs
- **SDK文档**: http://localhost:3002

#### 使用 WSL IP（无需配置）：
```bash
# 获取WSL IP
hostname -I | awk '{print $1}'
```

然后访问：
- **前端**: http://172.22.252.176:3000（替换为你的WSL IP）
- **后端**: http://172.22.252.176:3001
- **API文档**: http://172.22.252.176:3001/api/docs
- **SDK文档**: http://172.22.252.176:3002

---

## 📋 服务状态检查

### 检查服务是否运行：
```bash
# 检查端口监听
netstat -tlnp | grep -E ":(3000|3001|3002)"
```

### 查看服务日志：
```bash
# 前端日志
tail -f /tmp/paymind-frontend.log

# 后端日志
tail -f /tmp/paymind-backend.log

# SDK文档日志
tail -f /tmp/paymind-sdk-docs.log
```

---

## 🛑 停止所有服务

如果使用 `start-all.sh` 启动，按 `Ctrl+C` 即可停止所有服务。

或手动停止：
```bash
# 查找进程
ps aux | grep -E "(next|nest|serve)" | grep -v grep

# 停止进程（替换PID）
kill <PID>
```

---

## ⚠️ 常见问题

### Q1: 端口已被占用
**解决方法**:
```bash
# 查找占用端口的进程
lsof -i :3000
lsof -i :3001
lsof -i :3002

# 停止进程
kill <PID>
```

### Q2: Windows浏览器无法访问
**解决方法**:
1. 确保已配置端口转发（运行 `setup-all-ports.ps1`）
2. 检查Windows防火墙设置
3. 使用WSL IP地址直接访问

### Q3: SDK文档服务启动失败
**解决方法**:
```bash
cd sdk-js
npm install --save-dev typedoc
npm run docs:generate
npm run docs:serve
```

### Q4: WSL IP地址变化
**解决方法**:
重新运行 `setup-all-ports.ps1` 更新端口转发规则。

---

## 🎯 快速命令参考

```bash
# 启动所有服务
./start-all.sh

# 配置Windows端口转发（在PowerShell中）
.\setup-all-ports.ps1

# 查看服务状态
netstat -tlnp | grep -E ":(3000|3001|3002)"

# 查看日志
tail -f /tmp/paymind-*.log
```

---

**最后更新**: 2025-01-XX

