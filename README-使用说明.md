# Agentrix 使用说明

## 🚀 快速开始

### 在任何目录中运行（推荐）

脚本会自动检测项目根目录，您可以在任何子目录中运行：

```powershell
# 安装依赖（在任何目录中都可以运行）
.\install.ps1

# 启动服务（在任何目录中都可以运行）
.\start.ps1
```

### 在项目根目录中运行

```powershell
# 进入项目根目录
cd D:\wsl\Ubuntu-24.04\Code\Paymind\agentrix-website

# 安装依赖
.\install.ps1

# 启动服务
.\start.ps1
```

---

## 📋 脚本说明

### 英文文件名脚本（推荐）

| 脚本 | 说明 | 使用方式 |
|------|------|---------|
| `install.ps1` | 安装依赖 | `.\install.ps1` |
| `start.ps1` | 启动服务 | `.\start.ps1` |
| `install.sh` | WSL 安装脚本 | `wsl bash install.sh` |
| `start.sh` | WSL 启动脚本 | `wsl bash start.sh` |

### 中文文件名脚本（备用）

| 脚本 | 说明 | 使用方式 |
|------|------|---------|
| `安装依赖.ps1` | 安装依赖 | `.\安装依赖.ps1` |
| `启动服务.ps1` | 启动服务 | `.\启动服务.ps1` |

---

## ✅ 功能特性

### 自动目录检测

脚本会自动：
- ✅ 检测当前是否在项目根目录
- ✅ 如果在子目录中，自动切换到项目根目录
- ✅ 显示切换路径信息

### 智能脚本选择

脚本会：
- ✅ 优先使用英文文件名（避免编码问题）
- ✅ 如果英文文件不存在，自动使用中文文件名
- ✅ 自动处理路径转换

---

## 🎯 使用示例

### 示例 1: 在项目根目录中运行

```powershell
PS D:\wsl\Ubuntu-24.04\Code\Paymind\agentrix-website> .\install.ps1
✅ 项目根目录: D:\wsl\Ubuntu-24.04\Code\Paymind\agentrix-website
开始安装依赖...
```

### 示例 2: 在子目录中运行

```powershell
PS D:\wsl\Ubuntu-24.04\Code\Paymind\agentrix-website\agentrixfrontend> .\install.ps1
📍 检测到您在子目录中，切换到项目根目录...
   从: D:\wsl\Ubuntu-24.04\Code\Paymind\agentrix-website\agentrixfrontend
   到: D:\wsl\Ubuntu-24.04\Code\Paymind\agentrix-website
✅ 项目根目录: D:\wsl\Ubuntu-24.04\Code\Paymind\agentrix-website
开始安装依赖...
```

---

## 🔧 故障排除

### 问题 1: 找不到项目根目录

**错误**: `❌ 无法找到项目根目录`

**解决**: 
- 确保您在项目目录中（包含 `backend` 和 `agentrixfrontend` 文件夹）
- 或者手动进入项目根目录

### 问题 2: 找不到脚本文件

**错误**: `❌ 找不到安装脚本`

**解决**:
- 确保 `install.sh` 或 `安装依赖-WSL.sh` 文件存在
- 检查文件是否在项目根目录

### 问题 3: WSL 不可用

**错误**: `❌ WSL 未安装或未启用`

**解决**:
```powershell
# 安装 WSL
wsl --install

# 重启电脑后验证
wsl --version
```

---

## 💡 提示

1. **推荐使用英文文件名脚本** (`install.ps1`, `start.ps1`)
   - 避免编码问题
   - 更好的兼容性

2. **可以在任何目录中运行**
   - 脚本会自动找到项目根目录
   - 无需手动切换目录

3. **使用 PowerShell 脚本**
   - 自动处理路径转换
   - 更好的错误提示
   - 自动检测环境

---

**现在您可以在任何目录中运行 `.\install.ps1` 来安装依赖！** 🎉

