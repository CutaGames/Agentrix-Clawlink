# Agentrix 部署指南

本文档记录了 Agentrix 项目从本地开发到云端服务器部署的完整流程。

## 📋 目录

- [本地更新流程](#本地更新流程)
- [服务器部署流程](#服务器部署流程)
- [一键部署脚本](#一键部署脚本)
- [注意事项](#注意事项)
- [常见问题](#常见问题)

---

## 🖥️ 本地更新流程

### 1. 查看修改状态

```bash
cd /mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website
git status
```

### 2. 添加修改的文件

```bash
git add .
# 或者添加特定文件
git add backend/src/entities/user.entity.ts
```

### 3. 提交更改

```bash
git commit -m "描述你的修改内容"
# 例如：
# git commit -m "fix: 修复 roles 列类型问题"
# git commit -m "feat: 添加新功能"
```

### 4. 推送到远程仓库

```bash
git push
```

---

## 🚀 服务器部署流程

### 1. 连接到服务器

```bash
ssh root@你的服务器IP
```

### 2. 进入代码目录

```bash
cd /root/Agentrix
```

### 3. 拉取最新代码

```bash
git pull
```

### 4. 部署后端

```bash
cd backend
npm run build
pm2 restart agentrix-backend --update-env
```

### 5. 部署前端（如果修改了前端代码）

```bash
cd ../frontend
npm run build
pm2 restart agentrix-frontend
```

### 6. 查看服务状态

```bash
pm2 status
pm2 logs agentrix-backend --lines 30 --nostream
```

---

## ⚡ 一键部署脚本

### 创建部署脚本

在服务器上创建 `/root/Agentrix/deploy.sh`：

```bash
#!/bin/bash
set -e

echo "🚀 开始部署 Agentrix..."

# 进入代码目录
cd /root/Agentrix

# 拉取最新代码
echo "📥 拉取最新代码..."
git pull

# 部署后端
echo "🔨 构建后端..."
cd backend
npm run build
pm2 restart agentrix-backend --update-env
echo "✅ 后端部署完成"

# 部署前端
echo "🔨 构建前端..."
cd ../frontend
npm run build
pm2 restart agentrix-frontend
echo "✅ 前端部署完成"

# 查看服务状态
echo ""
echo "📊 服务状态："
pm2 status

echo ""
echo "🎉 部署完成！"
```

### 使用部署脚本

```bash
# 添加执行权限
chmod +x /root/Agentrix/deploy.sh

# 执行部署
/root/Agentrix/deploy.sh
```

---

## ⚠️ 注意事项

### 1. 数据库迁移

如果修改了实体定义（Entity），需要：

**开发环境（自动同步）：**
- TypeORM 的 `synchronize: true` 会自动同步数据库结构

**生产环境（手动迁移）：**
- 创建迁移文件：`npm run migration:generate -- -n MigrationName`
- 执行迁移：`npm run migration:run`
- 或者手动执行 SQL 脚本（如 `fix-missing-columns.sql`）

### 2. 环境变量

如果修改了 `.env` 文件：

```bash
# 在服务器上手动更新
vi /root/Agentrix/backend/.env
vi /root/Agentrix/frontend/.env.local

# 重启服务以加载新环境变量
pm2 restart agentrix-backend --update-env
pm2 restart agentrix-frontend --update-env
```

### 3. 依赖更新

如果修改了 `package.json`：

```bash
cd /root/Agentrix/backend
npm install
npm run build
pm2 restart agentrix-backend

# 前端同理
cd /root/Agentrix/frontend
npm install
npm run build
pm2 restart agentrix-frontend
```

### 4. Nginx 配置

如果修改了 Nginx 配置：

```bash
# 测试配置
sudo nginx -t

# 重新加载配置
sudo nginx -s reload
# 或
sudo systemctl reload nginx
```

---

## 🔧 常见问题

### 1. Git Pull 失败：权限被拒绝

**问题：** `Permission denied (publickey)`

**解决：**
```bash
# 检查 SSH 密钥
ls -la ~/.ssh/

# 如果使用密码，可以配置 SSH 密钥或使用 HTTPS
git remote set-url origin https://github.com/CutaGames/Agentrix.git
```

### 2. 构建失败：TypeScript 错误

**问题：** `npm run build` 报错

**解决：**
```bash
# 清理并重新构建
rm -rf dist node_modules/.cache
npm install
npm run build
```

### 3. 服务启动失败

**问题：** PM2 服务无法启动

**解决：**
```bash
# 查看详细错误日志
pm2 logs agentrix-backend --err --lines 50

# 检查环境变量
pm2 env 0

# 手动启动测试
cd /root/Agentrix/backend
node dist/main.js
```

### 4. 数据库连接错误

**问题：** `Connection refused` 或 `Authentication failed`

**解决：**
```bash
# 检查数据库服务状态
sudo systemctl status postgresql

# 检查数据库配置
cat /root/Agentrix/backend/.env | grep DB_

# 测试数据库连接
PGPASSWORD=your_password psql -U agentrix -d paymind -h localhost
```

### 5. 端口被占用

**问题：** `EADDRINUSE: address already in use`

**解决：**
```bash
# 查找占用端口的进程
sudo lsof -i :3001
sudo lsof -i :3000

# 杀死进程
sudo kill -9 <PID>

# 或重启服务
pm2 restart agentrix-backend
```

---

## 📝 部署检查清单

部署前请确认：

- [ ] 本地代码已提交并推送到远程仓库
- [ ] 服务器代码已拉取最新版本
- [ ] 后端构建成功（`dist/main.js` 存在）
- [ ] 前端构建成功（`.next` 目录存在）
- [ ] 环境变量已正确配置
- [ ] 数据库迁移已执行（如需要）
- [ ] 服务已重启
- [ ] 日志无错误信息
- [ ] 功能测试通过

---

## 🔗 相关文档

- [项目 README](./README.md)
- [数据库修复脚本](./fix-missing-columns.sql)
- [生产环境准备清单](./PRODUCTION_READINESS.md)

---

## 📅 更新记录

- **2025-12-09**: 创建部署指南文档
- **2025-12-09**: 修复 roles 列类型问题，添加数据库修复流程

---

**最后更新：** 2025-12-09

