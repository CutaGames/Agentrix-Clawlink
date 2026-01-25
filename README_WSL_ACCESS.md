# WSL2 浏览器访问指南

## 🚀 快速开始

### 方法一：使用端口转发（推荐，可使用localhost）

1. **在Windows PowerShell中运行**（以管理员身份）：
```powershell
.\setup-wsl-port-forward.ps1
```

2. **在Windows浏览器中访问**：
- 前端：http://localhost:3000
- 后端：http://localhost:3001
- API文档：http://localhost:3001/api/docs

### 方法二：直接使用WSL2 IP地址

1. **获取WSL2 IP地址**：
```bash
./get-access-urls.sh
```

2. **在Windows浏览器中访问**（使用显示的IP地址）：
- 前端：http://<WSL2_IP>:3000
- 后端：http://<WSL2_IP>:3001
- API文档：http://<WSL2_IP>:3001/api/docs

## ⚠️ 常见问题

### 问题1：无法访问 localhost:3000

**原因**：WSL2使用虚拟网络，Windows无法直接访问WSL2的localhost

**解决**：
1. 运行端口转发脚本：`.\setup-wsl-port-forward.ps1`
2. 或使用WSL2 IP地址：运行 `./get-access-urls.sh` 获取IP

### 问题2：端口转发后仍无法访问

**检查**：
1. 确保服务正在运行（检查端口是否监听）
2. 检查Windows防火墙设置
3. 确认端口转发规则已创建：
   ```powershell
   netsh interface portproxy show v4tov4
   ```

### 问题3：WSL2 IP地址变化

**原因**：WSL2重启后IP地址可能会变化

**解决**：重新运行端口转发脚本

## 📝 服务启动

### 启动后端服务
```bash
cd backend
npm run start:dev
```

### 启动前端服务
```bash
cd agentrixfrontend
npm run dev
```

### 一键启动（如果存在）
```bash
./start-dev.sh
```

## 🔧 手动配置端口转发

如果脚本无法运行，可以手动配置：

```powershell
# 获取WSL2 IP
$wslIp = (wsl hostname -I).Split()[0]

# 配置前端端口转发
netsh interface portproxy add v4tov4 listenport=3000 listenaddress=0.0.0.0 connectport=3000 connectaddress=$wslIp

# 配置后端端口转发
netsh interface portproxy add v4tov4 listenport=3001 listenaddress=0.0.0.0 connectport=3001 connectaddress=$wslIp
```

## 📚 相关文件

- `setup-wsl-port-forward.ps1` - Windows端口转发脚本
- `get-access-urls.sh` - 获取WSL2访问地址脚本
- `WSL_ACCESS_FIX.md` - 详细修复指南

