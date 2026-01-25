# Agentrix WSL 使用说明

## 🐧 在 WSL 终端中使用

如果您在 **WSL 终端**中（Linux 环境），请使用 **Linux 脚本**：

### 安装依赖

```bash
# 在 WSL 终端中运行
bash install.sh

# 或直接运行（需要执行权限）
./install.sh
```

### 启动服务

```bash
# 在 WSL 终端中运行
bash start.sh

# 或直接运行（需要执行权限）
./start.sh
```

---

## 🪟 在 Windows PowerShell 中使用

如果您在 **Windows PowerShell** 中，请使用 **Windows 脚本**：

### 安装依赖

```powershell
# 在 PowerShell 中运行
.\install.ps1

# 或使用批处理文件
.\安装.bat
.\快速开始.bat
```

### 启动服务

```powershell
# 在 PowerShell 中运行
.\start.ps1

# 或使用批处理文件
.\启动.bat
```

---

## 📋 脚本对应关系

| 环境 | 安装脚本 | 启动脚本 |
|------|---------|---------|
| **WSL/Linux** | `install.sh` | `start.sh` |
| **Windows PowerShell** | `install.ps1` | `start.ps1` |
| **Windows 批处理** | `安装.bat` | `启动.bat` |

---

## ⚠️ 常见错误

### 错误 1: `command not found`

**原因**: 在 WSL 中运行了 Windows 脚本（`.bat` 或 `.ps1`）

**解决**: 使用 Linux 脚本（`.sh`）

```bash
# ❌ 错误
.\install.ps1
.\安装.bat

# ✅ 正确
bash install.sh
./install.sh
```

### 错误 2: `Permission denied`

**原因**: 脚本没有执行权限

**解决**: 添加执行权限

```bash
chmod +x install.sh
chmod +x start.sh
./install.sh
```

---

## 🚀 快速开始（WSL）

```bash
# 1. 确保在项目根目录
cd /mnt/d/wsl/Ubuntu-24.04/Code/Paymind/agentrix-website

# 2. 添加执行权限（如果需要）
chmod +x install.sh start.sh

# 3. 安装依赖
bash install.sh

# 4. 启动服务
bash start.sh
```

---

## 🚀 快速开始（Windows PowerShell）

```powershell
# 1. 确保在项目根目录
cd D:\wsl\Ubuntu-24.04\Code\Paymind\agentrix-website

# 2. 安装依赖
.\install.ps1

# 3. 启动服务
.\start.ps1
```

---

## 💡 提示

- **WSL 终端**: 使用 `bash install.sh` 或 `./install.sh`
- **PowerShell**: 使用 `.\install.ps1` 或 `.\安装.bat`
- 脚本会自动检测项目根目录，可以在任何子目录中运行

