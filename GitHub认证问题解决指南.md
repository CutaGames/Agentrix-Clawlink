# 🔐 GitHub 认证问题解决指南

## ❌ 错误信息

```
remote: Invalid username or token. 
Password authentication is not supported for Git operations.
fatal: Authentication failed
```

---

## 🎯 问题原因

GitHub 从 2021 年 8 月 13 日起，**禁止使用密码进行 Git 操作**，必须使用以下方式之一：

1. ✅ **Personal Access Token (PAT)** - 推荐
2. ✅ **SSH 密钥** - 一劳永逸

---

## 🚀 解决方案 A：使用 Personal Access Token（最快）

### 1️⃣ 创建 Token

访问：**https://github.com/settings/tokens/new**

配置如下：

| 选项 | 值 |
|------|-----|
| **Note** | `Agentrix Project` |
| **Expiration** | `90 days`（或 `No expiration`） |
| **Select scopes** | ✅ `repo`（完整仓库权限） |

点击 **Generate token**，复制生成的 Token（以 `ghp_` 开头）

⚠️ **重要**：Token 只显示一次，立即复制保存！

---

### 2️⃣ 使用 Token 推送

#### 方法 A：手动输入（每次都要输入）

```bash
git push -u origin main

# 提示时输入：
Username: CutaGames
Password: ghp_你的Token（粘贴）
```

#### 方法 B：使用配置脚本（推荐）

```bash
# 运行配置脚本
bash 配置GitHub-Token.sh

# 按提示输入用户名和 Token
# 之后推送不需要再输入
```

#### 方法 C：直接修改 URL（永久保存）

```bash
# 更新远程仓库 URL
git remote set-url origin https://CutaGames:ghp_你的Token@github.com/CutaGames/Agentrix.git

# 配置凭证存储
git config --global credential.helper store

# 推送
git push -u origin main
```

---

## 🔒 解决方案 B：使用 SSH（一劳永逸）

### 1️⃣ 生成 SSH 密钥

```bash
# 生成密钥
ssh-keygen -t ed25519 -C "your_email@example.com"

# 一路回车（不设置密码）
# 会在 ~/.ssh/ 生成密钥对
```

---

### 2️⃣ 添加公钥到 GitHub

```bash
# 复制公钥
cat ~/.ssh/id_ed25519.pub
```

访问：**https://github.com/settings/ssh/new**

| 选项 | 值 |
|------|-----|
| **Title** | `WSL Ubuntu` |
| **Key** | 粘贴上面复制的公钥 |

点击 **Add SSH key**

---

### 3️⃣ 测试并更新仓库 URL

```bash
# 测试 SSH 连接
ssh -T git@github.com
# 应该显示: Hi CutaGames! You've successfully authenticated...

# 更新仓库 URL 为 SSH
git remote set-url origin git@github.com:CutaGames/Agentrix.git

# 推送（无需密码）
git push -u origin main
```

---

## 📋 快速对比

| 方式 | 优点 | 缺点 | 推荐场景 |
|------|------|------|---------|
| **Personal Access Token** | 简单快速 | Token 会过期，需定期更新 | 临时项目、快速上手 |
| **SSH 密钥** | 一次配置永久使用 | 初次配置稍复杂 | 长期项目、多个仓库 |

---

## ⚡ 推荐流程（最快解决）

### **立即操作（3 分钟）**

```bash
# 1. 创建 Token
# 访问: https://github.com/settings/tokens/new
# 勾选 repo，生成 Token，复制

# 2. 运行配置脚本
cd /mnt/d/wsl/Ubuntu-24.04/Code/Paymind/agentrix-website
bash 配置GitHub-Token.sh

# 3. 推送
git push -u origin main
```

---

## 🔍 常见问题

### Q1: Token 忘记了怎么办？
**A**: Token 只显示一次，忘记了只能重新生成。访问 https://github.com/settings/tokens 删除旧的，创建新的。

### Q2: Token 过期了怎么办？
**A**: 重新生成一个新 Token，然后更新配置：
```bash
bash 配置GitHub-Token.sh
```

### Q3: 多个项目都要配置吗？
**A**: 
- **Token 方式**：每个项目单独配置
- **SSH 方式**：配置一次，所有项目通用

### Q4: 哪种方式更安全？
**A**: SSH 密钥更安全，因为私钥永远不会传输，而 Token 会在网络中传输。

---

## 📚 相关链接

- [GitHub Token 创建页面](https://github.com/settings/tokens/new)
- [GitHub SSH 密钥管理](https://github.com/settings/keys)
- [GitHub 官方文档](https://docs.github.com/en/authentication)

---

## ✅ 验证成功

推送成功后，应该看到：

```bash
Enumerating objects: xxx, done.
Counting objects: 100% (xxx/xxx), done.
Writing objects: 100% (xxx/xxx), xxx KiB | xxx MiB/s, done.
Total xxx (delta xxx), reused xxx (delta xxx)
To https://github.com/CutaGames/Agentrix.git
   xxxxxx..xxxxxx  main -> main
```

访问：https://github.com/CutaGames/Agentrix

应该能看到你的代码已经上传！🎉

---

**选择一个方案，立即开始吧！** 推荐先用 **Token 方式**（最快），之后有空再配置 SSH。
