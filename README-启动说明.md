# PayMind 启动说明

## ⚠️ 重要提示

您的项目位于 **WSL (Windows Subsystem for Linux)** 环境中，但您在 **Windows PowerShell** 中运行命令。

这会导致以下问题：
- Windows PowerShell 无法直接访问 WSL 中的 Node.js
- 需要使用 WSL 终端来运行 Node.js 命令

---

## 🎯 解决方案

### 方案一：在 WSL 终端中运行（推荐）

1. **打开 WSL 终端**（Ubuntu）
   - 在 Windows 开始菜单搜索 "Ubuntu"
   - 或使用 VS Code 的 WSL 终端

2. **导航到项目目录**
   ```bash
   cd /mnt/d/wsl/Ubuntu-24.04/Code/Paymind/paymind-website
   ```

3. **运行启动脚本**
   ```bash
   chmod +x WSL启动服务.sh
   ./WSL启动服务.sh
   ```

### 方案二：在 Windows 中安装 Node.js

如果您想在 Windows PowerShell 中直接运行：

1. **下载安装 Node.js for Windows**
   - 访问：https://nodejs.org/
   - 下载 Windows 版本（推荐 LTS）
   - 安装时选择 "Add to PATH"

2. **重启终端**
   - 关闭所有 PowerShell 窗口
   - 重新打开 PowerShell

3. **验证安装**
   ```powershell
   node --version
   npm --version
   ```

4. **运行启动脚本**
   ```powershell
   .\启动服务-简单版.bat
   ```

---

## 🔍 环境检查

### 检查 Windows 环境

运行 `检查环境.bat` 来检查：
- Node.js 是否安装
- 项目目录是否存在
- 依赖是否安装
- 环境变量文件是否存在

### 检查 WSL 环境

在 WSL 终端中运行：
```bash
node --version
npm --version
which node
```

---

## 📋 启动方式对比

| 方式 | 终端类型 | 脚本 | 说明 |
|------|---------|------|------|
| WSL | Ubuntu 终端 | `./WSL启动服务.sh` | 推荐，原生 Linux 环境 |
| Windows | PowerShell | `.\启动服务-简单版.bat` | 需要 Windows 版 Node.js |
| Windows | PowerShell | `.\start-all-services.ps1` | 需要 Windows 版 Node.js |

---

## 🚀 快速启动（WSL 环境）

### 方式一：在 WSL 终端中运行

```bash
# 1. 进入项目目录
cd /mnt/d/wsl/Ubuntu-24.04/Code/Paymind/paymind-website

# 2. 给脚本添加执行权限
chmod +x WSL启动服务.sh

# 3. 运行启动脚本
./WSL启动服务.sh
```

### 方式二：从 Windows PowerShell 中运行

```powershell
# 直接使用 bash 运行（不需要 chmod）
wsl bash WSL启动服务.sh

# 或者运行交互式脚本
wsl bash 在WSL中运行.sh
```

---

## 🚀 快速启动（Windows 环境）

```powershell
# 1. 检查环境
.\检查环境.bat

# 2. 如果 Node.js 已安装，运行启动脚本
.\启动服务-简单版.bat
```

---

## 📍 访问地址

启动成功后，访问：
- 🌐 前端应用: http://localhost:3000
- 🔧 后端API: http://localhost:3001/api
- 📖 API文档: http://localhost:3001/api/docs
- 📚 SDK文档: http://localhost:8080

---

## ❓ 常见问题

### Q: 为什么提示 "npm 无法识别"？

**A:** 这是因为您在 Windows PowerShell 中运行，但 Node.js 安装在 WSL 中。解决方案：
- 在 WSL 终端中运行命令
- 或在 Windows 中安装 Node.js

### Q: 如何知道我在哪个环境？

**A:** 
- Windows PowerShell: 提示符是 `PS C:\...>`
- WSL 终端: 提示符是 `user@hostname:~/path$`

### Q: 可以在 VS Code 中使用吗？

**A:** 可以！VS Code 支持 WSL 扩展：
1. 安装 "Remote - WSL" 扩展
2. 点击左下角绿色图标
3. 选择 "New WSL Window"
4. 在 WSL 终端中运行命令

---

## 💡 推荐工作流程

1. **使用 VS Code + WSL**
   - 安装 Remote - WSL 扩展
   - 在 WSL 环境中打开项目
   - 使用 WSL 终端运行所有命令

2. **或者使用 Windows 环境**
   - 在 Windows 中安装 Node.js
   - 使用 Windows PowerShell 运行命令

---

**选择最适合您的方式开始开发！** 🎉

