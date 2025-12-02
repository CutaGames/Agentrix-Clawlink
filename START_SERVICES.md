# PayMind 服务启动指南

## 🔍 问题诊断

如果无法访问 http://localhost:3000 或 http://localhost:3001，请按以下步骤检查：

### 1. 检查服务是否运行

```bash
# 检查端口占用
lsof -i :3000 -i :3001

# 检查进程
ps aux | grep -E "(nest|next)" | grep -v grep
```

### 2. 检查数据库连接

```bash
# 测试PostgreSQL连接
psql -h localhost -U postgres -d paymind -c "SELECT 1;"
```

如果连接失败，需要：
1. 确认PostgreSQL正在运行：`sudo systemctl status postgresql`
2. 检查密码是否正确（在 `backend/.env` 中配置）
3. 确认数据库是否存在：`psql -h localhost -U postgres -l | grep paymind`

### 3. 修复数据库连接问题

#### 方法1: 更新数据库密码

```bash
# 编辑后端环境变量
cd backend
nano .env

# 更新以下配置（根据你的PostgreSQL实际配置）:
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=你的实际密码
DB_DATABASE=paymind
```

#### 方法2: 重置PostgreSQL密码

```bash
# 切换到postgres用户
sudo -u postgres psql

# 在psql中执行
ALTER USER postgres PASSWORD 'postgres';
\q
```

#### 方法3: 创建数据库（如果不存在）

```bash
# 连接到PostgreSQL
sudo -u postgres psql

# 创建数据库
CREATE DATABASE paymind;
\q
```

### 4. 重新启动服务

```bash
# 停止现有服务
./stop-dev.sh

# 启动服务
./start-dev.sh
```

### 5. 验证服务

等待30-60秒后，检查：

```bash
# 检查后端
curl http://localhost:3001/api

# 检查前端
curl http://localhost:3000

# 检查API文档
curl http://localhost:3001/api/docs
```

## 🚀 快速修复步骤

如果遇到数据库连接问题，执行以下命令：

```bash
# 1. 停止服务
./stop-dev.sh

# 2. 检查并修复数据库配置
cd backend
cat .env | grep DB_

# 3. 测试数据库连接
PGPASSWORD=你的密码 psql -h localhost -U postgres -d paymind -c "SELECT 1;"

# 4. 如果数据库不存在，创建它
PGPASSWORD=你的密码 psql -h localhost -U postgres -c "CREATE DATABASE paymind;"

# 5. 返回项目根目录并启动服务
cd ..
./start-dev.sh

# 6. 等待30秒后检查
sleep 30
curl http://localhost:3001/api
curl http://localhost:3000
```

## 📝 常见问题

### 问题1: 端口被占用

```bash
# 查找占用端口的进程
lsof -i :3000
lsof -i :3001

# 杀死进程
kill -9 <PID>
```

### 问题2: 编译错误

```bash
# 检查后端编译
cd backend
npm run build

# 检查前端编译
cd ../paymindfrontend
npm run build
```

### 问题3: 依赖缺失

```bash
# 重新安装依赖
cd backend && npm install
cd ../paymindfrontend && npm install
```

## 🔧 手动启动（如果脚本不工作）

### 启动后端

```bash
cd backend
npm run start:dev
```

在另一个终端启动前端：

```bash
cd paymindfrontend
npm run dev
```

## 📞 需要帮助？

如果以上步骤都无法解决问题，请检查：

1. **日志文件**:
   - `backend.log` - 后端日志
   - `frontend.log` - 前端日志

2. **环境变量**:
   - `backend/.env` - 后端配置
   - `paymindfrontend/.env.local` - 前端配置

3. **系统要求**:
   - Node.js >= 18
   - PostgreSQL >= 12
   - npm 或 yarn

