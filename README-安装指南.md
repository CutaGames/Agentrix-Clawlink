# Agentrix 依赖安装指南

本指南将帮助您安装 Agentrix 项目所需的所有依赖和软件。

---

## 🎯 快速安装

### WSL/Ubuntu 用户（推荐）

```bash
# 给脚本添加执行权限
chmod +x 安装依赖-WSL.sh

# 运行安装脚本
./安装依赖-WSL.sh
```

### Windows 用户

```powershell
# 运行 PowerShell 安装脚本
.\安装依赖-Windows.ps1
```

---

## 📋 项目依赖清单

### 必需软件

| 软件 | 版本要求 | 说明 |
|------|---------|------|
| **Node.js** | v18+ | JavaScript 运行时 |
| **npm** | 随 Node.js 安装 | 包管理器 |
| **PostgreSQL** | v12+ | 数据库（必需） |
| **Redis** | 最新 | 缓存（可选） |

### 项目依赖

- **后端依赖**: `backend/package.json`
- **前端依赖**: `agentrixfrontend/package.json`
- **SDK依赖**: `sdk-js/package.json`
- **根目录依赖**: `package.json`

---

## 🔧 手动安装步骤

### 1. 安装 Node.js

#### WSL/Ubuntu:
```bash
# 使用 NodeSource 安装 Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证安装
node --version  # 应该 >= v18.0.0
npm --version
```

#### Windows:
1. 访问 https://nodejs.org/
2. 下载 Windows 版本（推荐 LTS）
3. 安装时选择 "Add to PATH"
4. 重启终端后验证：
   ```powershell
   node --version
   npm --version
   ```

---

### 2. 安装 PostgreSQL

#### WSL/Ubuntu:
```bash
# 安装 PostgreSQL
sudo apt-get update
sudo apt-get install -y postgresql postgresql-contrib

# 启动服务
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 创建数据库和用户
sudo -u postgres psql <<EOF
CREATE USER agentrix WITH PASSWORD 'agentrix123';
CREATE DATABASE agentrix OWNER agentrix;
GRANT ALL PRIVILEGES ON DATABASE agentrix TO agentrix;
\q
EOF
```

#### Windows:
1. 访问 https://www.postgresql.org/download/windows/
2. 下载并安装 PostgreSQL
3. 记住安装时设置的密码
4. 使用 pgAdmin 或命令行创建数据库：
   ```sql
   CREATE USER agentrix WITH PASSWORD 'agentrix123';
   CREATE DATABASE agentrix OWNER agentrix;
   ```

#### 或使用 Docker:
```bash
docker run --name agentrix-postgres \
  -e POSTGRES_PASSWORD=agentrix123 \
  -e POSTGRES_USER=agentrix \
  -e POSTGRES_DB=agentrix \
  -p 5432:5432 \
  -d postgres
```

---

### 3. 安装 Redis（可选）

#### WSL/Ubuntu:
```bash
sudo apt-get install -y redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

#### Windows:
使用 Docker:
```bash
docker run --name agentrix-redis -p 6379:6379 -d redis
```

---

### 4. 安装项目依赖

#### 使用脚本（推荐）:
```bash
# WSL
./安装依赖-WSL.sh

# Windows
.\安装依赖-Windows.ps1
```

#### 手动安装:
```bash
# 根目录
npm install

# 后端
cd backend
npm install
cd ..

# 前端
cd agentrixfrontend
npm install
cd ..

# SDK
cd sdk-js
npm install
cd ..
```

---

### 5. 配置环境变量

#### 后端配置 (`backend/.env`):
```bash
cd backend
cp .env.example .env
```

编辑 `.env` 文件，至少配置：
```env
# 数据库
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=agentrix
DB_PASSWORD=agentrix123
DB_DATABASE=agentrix

# JWT
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d

# 服务器
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

生成 JWT 密钥：
```bash
# Linux/Mac
openssl rand -base64 32

# Windows PowerShell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

#### 前端配置 (`agentrixfrontend/.env.local`):
```bash
cd agentrixfrontend
cp .env.local.example .env.local
```

编辑 `.env.local` 文件：
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## ✅ 验证安装

### 检查软件版本:
```bash
node --version    # 应该 >= v18.0.0
npm --version
psql --version    # 如果安装了 PostgreSQL
redis-server --version  # 如果安装了 Redis
```

### 检查依赖安装:
```bash
# 检查后端依赖
cd backend
npm list --depth=0

# 检查前端依赖
cd ../agentrixfrontend
npm list --depth=0
```

### 测试数据库连接:
```bash
# PostgreSQL
psql -U agentrix -d agentrix -h localhost

# 如果连接成功，输入 \q 退出
```

---

## 🐛 常见问题

### 1. Node.js 版本过低

**问题**: `node --version` 显示版本 < 18

**解决**:
- WSL: 使用 NodeSource 安装新版本
- Windows: 从官网下载最新版本

### 2. npm 安装失败

**问题**: `npm install` 报错

**解决**:
```bash
# 清除缓存
npm cache clean --force

# 删除 node_modules 和 package-lock.json
rm -rf node_modules package-lock.json

# 重新安装
npm install
```

### 3. PostgreSQL 连接失败

**问题**: 无法连接到数据库

**解决**:
- 检查 PostgreSQL 服务是否运行
- 检查 `.env` 中的数据库配置
- 检查防火墙设置

### 4. 权限错误

**问题**: 安装时提示权限不足

**解决**:
- 不要使用 `sudo npm install`（项目依赖）
- 使用 `sudo` 安装全局工具（如 http-server）

---

## 📝 下一步

安装完成后：

1. **运行数据库迁移**:
   ```bash
   cd backend
   npm run migration:run
   ```

2. **启动服务**:
   ```bash
   # WSL
   ./WSL启动服务.sh
   
   # Windows
   .\启动服务-简单版.bat
   ```

3. **访问应用**:
   - 前端: http://localhost:3000
   - 后端API: http://localhost:3001/api
   - API文档: http://localhost:3001/api/docs

---

**祝您安装顺利！** 🎉

