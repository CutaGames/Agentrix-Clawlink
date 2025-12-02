# PayMind Backend API

PayMind V2.2 后端服务

## 技术栈

- **框架**: NestJS 10.x
- **数据库**: PostgreSQL + TypeORM
- **缓存**: Redis
- **认证**: JWT
- **支付**: Stripe
- **Web3**: ethers.js, @solana/web3.js

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并填写配置：

```bash
cp .env.example .env
```

### 3. 启动数据库

确保 PostgreSQL 和 Redis 服务正在运行。

### 4. 运行数据库迁移

```bash
npm run migration:run
```

### 5. 启动开发服务器

```bash
npm run start:dev
```

服务器将在 `http://localhost:3001` 启动。

### 6. 查看API文档

访问 `http://localhost:3001/api/docs` 查看 Swagger API 文档。

## 项目结构

```
src/
├── main.ts                 # 应用入口
├── app.module.ts          # 根模块
├── config/                # 配置文件
│   └── database.config.ts
├── entities/              # 数据库实体
│   ├── user.entity.ts
│   ├── wallet-connection.entity.ts
│   ├── payment.entity.ts
│   └── ...
├── modules/               # 功能模块
│   ├── auth/             # 认证模块
│   ├── wallet/           # 钱包模块
│   ├── payment/          # 支付模块
│   ├── auto-pay/         # 自动支付模块
│   ├── product/          # 产品模块
│   ├── commission/       # 分润模块
│   └── order/            # 订单模块
└── migrations/            # 数据库迁移
```

## API 端点

### 认证
- `POST /api/auth/login` - 用户登录

### 钱包管理
- `POST /api/wallets/connect` - 连接钱包
- `GET /api/wallets` - 获取钱包列表
- `PUT /api/wallets/:id/default` - 设置默认钱包
- `DELETE /api/wallets/:id` - 断开钱包
- `POST /api/wallets/verify-signature` - 验证签名

### 支付
- `POST /api/payments/create-intent` - 创建支付意图（Stripe）
- `POST /api/payments/process` - 处理支付
- `GET /api/payments/:id` - 查询支付状态

## 开发

### 运行测试

```bash
npm run test
```

### 代码格式化

```bash
npm run format
```

### 代码检查

```bash
npm run lint
```

## 部署

### 构建

```bash
npm run build
```

### 生产环境启动

```bash
npm run start:prod
```

