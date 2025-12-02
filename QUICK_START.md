# PayMind V2.2 快速启动指南

本指南将帮助您在本地环境中快速启动和测试PayMind系统。

---

## 📋 前置要求

### 必需软件

1. **Node.js** (v18+)
   ```bash
   node --version  # 应该 >= 18.0.0
   ```

2. **PostgreSQL** (v12+)
   ```bash
   psql --version  # 应该 >= 12.0
   ```

3. **npm** 或 **yarn**
   ```bash
   npm --version
   ```

### 可选软件

- **Redis** (用于缓存，可选)
- **MetaMask** 浏览器扩展（用于钱包测试）

---

## 🚀 快速启动步骤

### 第一步：数据库设置

1. **创建PostgreSQL数据库**

```bash
# 登录PostgreSQL
psql -U postgres

# 创建数据库
CREATE DATABASE paymind;

# 退出
\q
```

2. **配置数据库连接**

```bash
cd backend
cp .env.example .env
```

编辑 `.env` 文件，配置数据库连接：
```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=paymind
```

### 第二步：安装依赖

```bash
# 安装后端依赖
cd backend
npm install

# 安装前端依赖
cd ../paymindfrontend
npm install
```

### 第三步：配置环境变量

#### 后端配置

```bash
cd backend
cp .env.example .env
```

编辑 `.env` 文件，至少配置：
- `DB_*` - 数据库配置
- `JWT_SECRET` - JWT密钥（可以生成随机字符串）
- `PORT` - 后端端口（默认3001）

#### 前端配置

```bash
cd paymindfrontend
cp .env.local.example .env.local
```

编辑 `.env.local` 文件：
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

### 第四步：运行数据库迁移（可选）

```bash
cd backend
npm run migration:run
```

> 注意：如果数据库表不存在，TypeORM会自动创建（如果配置了synchronize）。

### 第五步：启动服务

#### 方式一：分别启动（推荐用于开发）

**终端1 - 启动后端**:
```bash
cd backend
npm run start:dev
```

后端将在 `http://localhost:3001` 启动
API文档在 `http://localhost:3001/api/docs`

**终端2 - 启动前端**:
```bash
cd paymindfrontend
npm run dev
```

前端将在 `http://localhost:3000` 启动

#### 方式二：使用启动脚本（待创建）

---

## 🧪 测试功能

### 1. 访问前端

打开浏览器访问：`http://localhost:3000`

### 2. 测试API

访问Swagger文档：`http://localhost:3001/api/docs`

### 3. 测试功能点

#### ✅ 可以测试的功能

1. **钱包连接**
   - 访问 `/app/user/wallets`
   - 连接MetaMask钱包
   - 查看钱包列表

2. **支付流程**
   - 访问支付页面
   - 测试智能路由推荐
   - 测试Stripe支付（需要配置Stripe密钥）

3. **自动支付授权**
   - 访问 `/app/user/auto-pay-setup`
   - 创建授权
   - 查看授权列表

4. **分润查询**
   - 访问 `/app/agent/earnings`
   - 查看分润记录

#### ⚠️ 需要配置的功能

1. **Stripe支付**
   - 需要配置 `STRIPE_SECRET_KEY` 和 `STRIPE_PUBLISHABLE_KEY`
   - 获取测试密钥：https://dashboard.stripe.com/test/apikeys

2. **合约功能**
   - 需要部署合约到测试网络
   - 配置合约地址

3. **X402协议**
   - 需要配置X402中继器URL和API密钥

---

## 🔧 常见问题

### 问题1: 数据库连接失败

**错误**: `ECONNREFUSED` 或 `password authentication failed`

**解决**:
1. 检查PostgreSQL服务是否运行：
   ```bash
   sudo service postgresql status
   # 或
   sudo systemctl status postgresql
   ```

2. 检查 `.env` 中的数据库配置是否正确

3. 检查PostgreSQL用户权限

### 问题2: 端口被占用

**错误**: `EADDRINUSE: address already in use`

**解决**:
1. 查找占用端口的进程：
   ```bash
   lsof -i :3001  # 后端端口
   lsof -i :3000  # 前端端口
   ```

2. 杀死进程或更改端口配置

### 问题3: 前端无法连接后端

**错误**: `Failed to fetch` 或 CORS错误

**解决**:
1. 检查后端是否运行
2. 检查 `.env.local` 中的 `NEXT_PUBLIC_API_URL` 配置
3. 检查后端的CORS配置

### 问题4: 类型错误

**错误**: TypeScript编译错误

**解决**:
```bash
# 重新安装依赖
cd paymindfrontend
rm -rf node_modules package-lock.json
npm install

# 或
cd backend
rm -rf node_modules package-lock.json
npm install
```

---

## 📝 开发模式说明

### 后端开发模式

- 使用 `npm run start:dev` 启动
- 支持热重载
- 自动编译TypeScript

### 前端开发模式

- 使用 `npm run dev` 启动
- Next.js热重载
- 支持快速刷新

---

## 🎯 测试检查清单

启动后，请检查：

- [ ] 后端服务运行在 `http://localhost:3001`
- [ ] 前端服务运行在 `http://localhost:3000`
- [ ] API文档可访问 `http://localhost:3001/api/docs`
- [ ] 数据库连接成功
- [ ] 前端可以访问后端API

---

## 🚨 重要提示

1. **开发环境**: 当前配置适用于开发环境，生产环境需要额外配置
2. **数据库**: 开发环境可以使用 `synchronize: true`，生产环境必须使用迁移
3. **密钥**: 所有密钥都应该使用测试密钥，不要使用生产密钥
4. **CORS**: 开发环境允许所有来源，生产环境需要限制

---

## 📚 更多文档

- [测试指南](./TESTING_GUIDE.md) - 详细的测试说明
- [完成报告](./COMPLETION_REPORT.md) - 功能完成情况
- [API文档](http://localhost:3001/api/docs) - Swagger API文档

---

## 💡 下一步

1. 配置Stripe测试密钥，测试支付功能
2. 部署合约到测试网络，测试链上功能
3. 配置X402协议，测试X402支付
4. 运行端到端测试

---

**祝您测试愉快！如有问题，请查看 [TESTING_GUIDE.md](./TESTING_GUIDE.md)**


