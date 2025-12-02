# PayMind 快速访问修复

## 🚀 立即访问（无需配置）

### 在Windows浏览器中直接访问：

**前端**: http://172.22.252.176:3000  
**后端**: http://172.22.252.176:3001  
**API文档**: http://172.22.252.176:3001/api/docs

---

## 🔧 如果想使用 localhost 访问

### 在Windows PowerShell中运行（以管理员身份）：

```powershell
# 获取WSL IP
$wslIp = (wsl hostname -I).Split()[0]

# 配置端口转发
netsh interface portproxy add v4tov4 listenport=3000 listenaddress=0.0.0.0 connectport=3000 connectaddress=$wslIp
netsh interface portproxy add v4tov4 listenport=3001 listenaddress=0.0.0.0 connectport=3001 connectaddress=$wslIp
```

然后访问：
- http://localhost:3000
- http://localhost:3001

---

## ⚠️ 如果后端无法访问

后端服务可能还在启动中或启动失败。检查方法：

```bash
# 在WSL中运行
cd backend
npm run start:dev
```

查看是否有错误信息。

---

## 📋 完整修复指南

详细步骤请参考: `ACCESS_FIX_GUIDE.md`

