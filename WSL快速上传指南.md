# 🐧 WSL 快速上传到 GitHub 指南

## 📋 前提条件

你说你已经用 `git clone` 拉取过代码，现在要上传到：
- **GitHub 仓库**: https://github.com/CutaGames/Agentrix

## 🎯 .gitignore 是什么？

`.gitignore` 是一个"黑名单"文件，告诉 Git 哪些文件**不要上传**。

### 举例说明

**你的需求**：
- ❌ 不上传 `.md` 文件（文档）
- ❌ 不上传 `.log` 文件（日志）
- ❌ 不上传 `.env` 文件（密码等敏感信息）

**我帮你配置的 `.gitignore`**：
```gitignore
*.md           # 所有 .md 文件
*.log          # 所有 .log 文件
.env           # 所有 .env 文件
**/.env        # 子目录的 .env
node_modules/  # 依赖目录
```

这样当你执行 `git add .` 时，Git 会**自动跳过**这些文件！

---

## 🚀 快速上传（三步走）

### 第一步：配置 Git 用户（首次必须）

```bash
# 在 WSL 终端执行
cd /mnt/d/wsl/Ubuntu-24.04/Code/Paymind/agentrix-website

# 给脚本执行权限
chmod +x 配置Git-WSL.sh

# 运行配置
./配置Git-WSL.sh
```

或手动配置：
```bash
git config --global user.name "你的名字"
git config --global user.email "你的邮箱@example.com"
```

---

### 第二步：一键上传

```bash
# 在 WSL 终端执行
cd /mnt/d/wsl/Ubuntu-24.04/Code/Paymind/agentrix-website

# 给脚本执行权限
chmod +x 上传到GitHub-WSL.sh

# 运行上传脚本
./上传到GitHub-WSL.sh
```

脚本会自动：
1. ✅ 清理 Git 缓存
2. ✅ 应用 `.gitignore` 规则
3. ✅ 检查敏感文件
4. ✅ 推送到 GitHub

---

### 第三步：验证上传

访问: https://github.com/CutaGames/Agentrix

检查：
- ✅ 代码文件已上传
- ❌ `.env` 文件**不在**仓库中
- ❌ `.log` 文件**不在**仓库中
- ❌ `.md` 文件**不在**仓库中

---

## 📝 手动命令（如果不想用脚本）

```bash
# 1. 进入项目目录
cd /mnt/d/wsl/Ubuntu-24.04/Code/Paymind/agentrix-website

# 2. 清理 Git 缓存（让 .gitignore 生效）
git rm -r --cached .
git add .

# 3. 查看将要上传的文件
git status

# 确认以下文件 NOT 在列表中：
# ❌ .env, backend/.env, agentrixfrontend/.env.local
# ❌ *.log
# ❌ *.md

# 4. 配置远程仓库
git remote remove origin
git remote add origin https://github.com/CutaGames/Agentrix.git

# 5. 拉取远程代码（如果仓库不为空）
git pull origin main --allow-unrelated-histories

# 6. 提交代码
git commit -m "Update: exclude .md, .log, .env files"

# 7. 推送到 GitHub
git push -u origin main
```

---

## 🔑 如果需要 GitHub Token

如果推送时提示需要认证：

### 方法 1: 使用 Token 推送（推荐）

```bash
# 1. 生成 Token: https://github.com/settings/tokens
#    勾选: repo 权限

# 2. 使用 Token 推送
git push https://CutaGames:你的token@github.com/CutaGames/Agentrix.git main
```

### 方法 2: 配置 Credential Helper

```bash
# 保存认证信息
git config --global credential.helper store

# 第一次推送时输入用户名和 token
git push -u origin main
# Username: CutaGames
# Password: 你的 GitHub Token

# 之后会自动记住
```

---

## 🔍 验证 .gitignore 是否生效

```bash
# 查看被忽略的文件
git status --ignored

# 应该看到：
# Ignored files:
#   backend/.env
#   frontend.log
#   README.md
#   ...
```

---

## ⚠️ 如果 .env 已经被上传了

如果你之前已经上传过 `.env`，需要从 Git 历史中删除：

```bash
# 从 Git 中删除但保留本地文件
git rm --cached backend/.env
git rm --cached agentrixfrontend/.env.local
git rm --cached contract/.env

# 提交删除
git commit -m "Remove .env files from Git tracking"

# 推送
git push
```

---

## 🎯 .gitignore 完整配置

当前为你配置的 `.gitignore`：

```gitignore
# ========================================
# Agentrix 项目 Git 忽略配置
# ========================================

# 依赖目录
node_modules/
**/node_modules/

# 构建输出
dist/
build/
.next/
out/

# 环境变量文件（敏感信息）
.env
.env.local
.env.*.local
backend/.env
agentrixfrontend/.env.local
contract/.env
**/.env

# 日志文件
*.log
logs/
backend.log
frontend.log

# Markdown 文档
*.md

# 如果想保留 README.md，添加：
!README.md

# 进程 ID 文件
*.pid
.backend.pid
.frontend.pid

# IDE 配置
.idea/
.vscode/

# 临时文件
*.tmp
*.temp
nul

# 数据库文件
*.sqlite
*.db

# 测试报告
playwright-report/
test-results/
coverage/
```

---

## 🆘 常见问题

### Q1: 为什么 .md 文件还是被上传了？

**A**: Git 缓存的问题，运行：
```bash
git rm -r --cached .
git add .
git commit -m "Apply .gitignore"
git push
```

### Q2: 如何只排除部分 .md 文件？

**A**: 修改 `.gitignore`：
```gitignore
# 排除特定文件
部署到腾讯云完整教程.md
Agentrix-*.md

# 保留 README
!README.md
```

### Q3: 推送失败怎么办？

**A**: 常见原因：
1. 网络问题 → 检查网络
2. 需要认证 → 使用 GitHub Token
3. 远程有新代码 → 先 `git pull`

---

## 📞 需要帮助？

- 查看 Git 状态: `git status`
- 查看提交历史: `git log --oneline`
- 查看远程仓库: `git remote -v`
- 撤销上次提交: `git reset --soft HEAD~1`

---

**现在你可以开始了！** 🚀

1. 运行 `./配置Git-WSL.sh`
2. 运行 `./上传到GitHub-WSL.sh`
3. 完成！✨
