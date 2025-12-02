# 运行测试商品脚本说明

## 问题

用户尝试使用 `cd` 命令进入一个文件，这是错误的。`cd` 只能用于目录，不能用于文件。

## 正确的运行方式

### 方式 1: 使用 npm 脚本（推荐）

```bash
cd backend
npm run ts-node scripts/create-test-products-for-chatgpt.ts
```

### 方式 2: 直接使用 ts-node

```bash
cd backend
npx ts-node scripts/create-test-products-for-chatgpt.ts
```

### 方式 3: 使用 node 运行编译后的文件

```bash
cd backend
npm run build
node dist/scripts/create-test-products-for-chatgpt.js
```

## 脚本位置

脚本文件位于：
- `backend/scripts/create-test-products-for-chatgpt.ts`

## 注意事项

1. **需要先启动后端服务**：脚本会调用 API，确保后端服务正在运行
2. **需要认证 Token**：脚本需要 `TEST_TOKEN` 环境变量
3. **数据库连接**：确保数据库已连接并可访问

## 环境变量设置

在运行脚本前，设置必要的环境变量：

```bash
export TEST_TOKEN="your-auth-token-here"
export API_BASE_URL="http://localhost:3001/api"
```

## 完整运行步骤

```bash
# 1. 进入后端目录
cd backend

# 2. 设置环境变量（如果需要）
export TEST_TOKEN="your-token"

# 3. 运行脚本
npm run ts-node scripts/create-test-products-for-chatgpt.ts
```

## 常见错误

### 错误 1: `cd: backend/scripts/create-test-products-for-chatgpt.ts: Not a directory`
**原因**：试图 `cd` 到一个文件
**解决**：使用 `cd backend` 进入目录，然后运行脚本

### 错误 2: `Cannot find module`
**原因**：依赖未安装
**解决**：运行 `npm install`

### 错误 3: `API request failed`
**原因**：后端服务未运行或 Token 无效
**解决**：启动后端服务并检查 Token

