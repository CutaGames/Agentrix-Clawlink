# PayMind 快速开始指南

## ⚠️ 重要提示

您当前在 **Windows PowerShell** 中，但项目位于 **WSL** 环境中。

**推荐方式**: 在 WSL 终端中运行所有命令

---

## 🚀 三种启动方式

### 方式一：使用快速安装工具（最简单）

双击运行 `快速安装.bat`，然后选择：
- **选项1**: 在 WSL 中安装（推荐）
- **选项2**: 在 Windows 中安装

---

### 方式二：在 WSL 终端中运行（推荐）

1. **打开 WSL 终端**
   - 在开始菜单搜索 "Ubuntu"
   - 或在 VS Code 中使用 WSL 终端

2. **运行安装脚本**
   ```bash
   cd /mnt/d/wsl/Ubuntu-24.04/Code/Paymind/paymind-website
   bash 安装依赖-WSL.sh
   ```

3. **启动服务**
   ```bash
   bash WSL启动服务.sh
   ```

---

### 方式三：从 PowerShell 中运行 WSL 命令

在 PowerShell 中，您可以直接运行 WSL 命令：

```powershell
# 安装依赖
wsl bash 安装依赖-WSL.sh

# 启动服务
wsl bash WSL启动服务.sh

# 或使用交互式脚本
wsl bash 在WSL中运行.sh
```

**注意**: 使用 `wsl bash` 不需要 `chmod`，因为 WSL 会自动处理权限。

---

## 📋 安装步骤

### 1. 安装依赖

**WSL 终端中**:
```bash
bash 安装依赖-WSL.sh
```

**或从 PowerShell**:
```powershell
wsl bash 安装依赖-WSL.sh
```

### 2. 配置环境变量

安装脚本会自动创建环境变量文件，但您可能需要检查：

- `backend/.env` - 后端配置
- `paymindfrontend/.env.local` - 前端配置

### 3. 启动服务

**WSL 终端中**:
```bash
bash WSL启动服务.sh
```

**或从 PowerShell**:
```powershell
wsl bash WSL启动服务.sh
```

---

## 🎯 访问地址

启动成功后，访问：

- 🌐 **前端应用**: http://localhost:3000
- 🔧 **后端API**: http://localhost:3001/api
- 📖 **API文档**: http://localhost:3001/api/docs
- 📚 **SDK文档**: http://localhost:8080

---

## ❓ 常见问题

### Q: 为什么 `chmod` 命令不可用？

**A**: `chmod` 是 Linux 命令，在 Windows PowerShell 中不可用。解决方案：
- 在 WSL 终端中运行命令
- 或使用 `wsl bash 脚本名.sh` 从 PowerShell 运行

### Q: 如何打开 WSL 终端？

**A**: 
1. 开始菜单搜索 "Ubuntu"
2. 或在 VS Code 中安装 "Remote - WSL" 扩展

### Q: 可以直接在 PowerShell 中运行吗？

**A**: 可以，但需要：
1. 在 Windows 中安装 Node.js
2. 使用 PowerShell 版本的脚本：`.\安装依赖-Windows.ps1`

---

## 💡 推荐工作流程

1. **打开 WSL 终端**（Ubuntu）
2. **运行安装脚本**: `bash 安装依赖-WSL.sh`
3. **启动服务**: `bash WSL启动服务.sh`
4. **打开浏览器**: 访问 http://localhost:3000

---

**选择最适合您的方式开始！** 🎉

