# PayMind API 接口规范

本文档定义了 PayMind V2.2 后端 API 的接口规范。

## 基础信息

- **Base URL**: `http://localhost:3001/api`
- **API 版本**: `v2.2.0`
- **认证方式**: Bearer Token (JWT)

## 认证

### 登录
```
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response:
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "paymindId": "PM123456",
    "email": "user@example.com",
    "roles": ["user"]
  }
}
```

## 钱包管理

### 连接钱包
```
POST /wallets/connect
Authorization: Bearer {token}
Content-Type: application/json

{
  "walletType": "metamask",
  "walletAddress": "0x742...d35e",
  "chain": "evm",
  "chainId": "1"
}

Response:
{
  "id": "uuid",
  "walletType": "metamask",
  "walletAddress": "0x742...d35e",
  "chain": "evm",
  "isDefault": true,
  "connectedAt": "2024-01-15T10:00:00Z"
}
```

### 获取钱包列表
```
GET /wallets
Authorization: Bearer {token}

Response:
[
  {
    "id": "uuid",
    "walletType": "metamask",
    "walletAddress": "0x742...d35e",
    "chain": "evm",
    "isDefault": true
  }
]
```

### 设置默认钱包
```
PUT /wallets/{walletId}/default
Authorization: Bearer {token}

Response:
{
  "id": "uuid",
  "isDefault": true
}
```

### 断开钱包
```
DELETE /wallets/{walletId}
Authorization: Bearer {token}

Response:
{
  "message": "钱包已断开连接"
}
```

## 支付

### 创建支付意图（Stripe）
```
POST /payments/create-intent
Authorization: Bearer {token}
Content-Type: application/json

{
  "amount": 7999,
  "currency": "CNY",
  "paymentMethod": "stripe",
  "description": "商品购买"
}

Response:
{
  "clientSecret": "pi_xxx_secret_xxx",
  "paymentIntentId": "pi_xxx"
}
```

### 处理支付
```
POST /payments/process
Authorization: Bearer {token}
Content-Type: application/json

{
  "amount": 7999,
  "currency": "CNY",
  "paymentMethod": "stripe",
  "paymentIntentId": "pi_xxx",
  "description": "商品购买",
  "merchantId": "uuid",
  "agentId": "uuid"
}

Response:
{
  "id": "uuid",
  "amount": 7999,
  "status": "completed",
  "transactionHash": "0x...",
  "createdAt": "2024-01-15T10:00:00Z"
}
```

### 查询支付状态
```
GET /payments/{paymentId}
Authorization: Bearer {token}

Response:
{
  "id": "uuid",
  "amount": 7999,
  "status": "completed",
  "paymentMethod": "stripe",
  "transactionHash": "0x...",
  "createdAt": "2024-01-15T10:00:00Z"
}
```

## 自动支付

### 创建授权
```
POST /auto-pay/grants
Authorization: Bearer {token}
Content-Type: application/json

{
  "agentId": "uuid",
  "singleLimit": 100,
  "dailyLimit": 500,
  "duration": 30
}

Response:
{
  "id": "uuid",
  "agentId": "uuid",
  "singleLimit": 100,
  "dailyLimit": 500,
  "expiresAt": "2024-02-15T10:00:00Z",
  "createdAt": "2024-01-15T10:00:00Z"
}
```

### 获取授权列表
```
GET /auto-pay/grants
Authorization: Bearer {token}

Response:
[
  {
    "id": "uuid",
    "agentId": "uuid",
    "singleLimit": 100,
    "dailyLimit": 500,
    "usedToday": 0,
    "expiresAt": "2024-02-15T10:00:00Z"
  }
]
```

### 撤销授权
```
DELETE /auto-pay/grants/{id}
Authorization: Bearer {token}

Response:
{
  "message": "授权已撤销"
}
```

## 产品市场

### 获取商品列表
```
GET /products?search=笔记本

Response:
[
  {
    "id": "uuid",
    "name": "联想 Yoga 笔记本电脑",
    "price": 7999,
    "stock": 45,
    "category": "电子产品",
    "commissionRate": 5
  }
]
```

### 创建商品
```
POST /products
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "商品名称",
  "description": "商品描述",
  "price": 7999,
  "stock": 100,
  "category": "电子产品",
  "commissionRate": 5
}

Response:
{
  "id": "uuid",
  "name": "商品名称",
  "price": 7999,
  "createdAt": "2024-01-15T10:00:00Z"
}
```

## 分润结算

### 获取分润记录
```
GET /commissions
Authorization: Bearer {token}

Response:
[
  {
    "id": "uuid",
    "paymentId": "uuid",
    "amount": 400,
    "currency": "CNY",
    "status": "pending",
    "createdAt": "2024-01-15T10:00:00Z"
  }
]
```

### 获取结算记录
```
GET /commissions/settlements
Authorization: Bearer {token}

Response:
[
  {
    "id": "uuid",
    "amount": 2845.60,
    "currency": "CNY",
    "status": "completed",
    "settlementDate": "2024-01-16",
    "transactionHash": "0x..."
  }
]
```

## 订单管理

### 创建订单
```
POST /orders
Authorization: Bearer {token}
Content-Type: application/json

{
  "merchantId": "uuid",
  "productId": "uuid",
  "amount": 7999,
  "currency": "CNY",
  "agentId": "uuid"
}

Response:
{
  "id": "uuid",
  "status": "pending",
  "amount": 7999,
  "createdAt": "2024-01-15T10:00:00Z"
}
```

### 获取订单列表
```
GET /orders
Authorization: Bearer {token}

Response:
[
  {
    "id": "uuid",
    "productId": "uuid",
    "amount": 7999,
    "status": "completed",
    "createdAt": "2024-01-15T10:00:00Z"
  }
]
```

## 错误码

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 未授权 |
| 403 | 禁止访问 |
| 404 | 资源不存在 |
| 500 | 服务器错误 |

## Swagger 文档

访问 `http://localhost:3001/api/docs` 查看完整的 Swagger API 文档。

