# GPTs API 配置问题排查

## 🔍 问题分析

从截图看到：
- GPTs 配置的操作显示为 `api.agentrix.top`
- 工具调用：`api_agentrix_top_jit_plugin.searchProducts`
- 错误：`Failed Outbound Call` 和 `与"connector"对话时出错`

## ⚠️ 可能的问题

### 1. OpenAPI Schema URL 配置错误

**GPTs 中应该配置的 URL**：
```
https://api.agentrix.top/api/openai/openapi.json
```

**不应该配置**：
- ❌ `api.agentrix.top` (缺少协议和路径)
- ❌ `https://api.agentrix.top` (缺少路径)
- ❌ `https://api.agentrix.top/api` (缺少具体端点)

### 2. 路径问题

从工具调用看，GPTs 尝试调用 `searchProducts`，但可能：
- 路径映射不正确
- OpenAPI Schema 中的路径定义有问题

### 3. 认证问题

如果 API 需要认证，但 GPTs 中没有配置 API Key，也会导致失败。

## ✅ 解决方案

### 步骤 1: 检查 OpenAPI Schema 是否可访问

在浏览器中访问：
```
https://api.agentrix.top/api/openai/openapi.json
```

应该返回完整的 OpenAPI Schema JSON。

### 步骤 2: 在 GPTs 中正确配置

1. 打开 GPTs 编辑器
2. 进入 **"操作 (Operations)"** 部分
3. 点击 **"创建新操作"** 或编辑现有操作
4. 选择 **"Import from URL"**
5. 输入完整的 URL：
   ```
   https://api.agentrix.top/api/openai/openapi.json
   ```
6. 点击导入

### 步骤 3: 配置认证（如果需要）

如果 API 需要 API Key：
1. 在操作配置中，找到 **"Authentication"** 部分
2. 选择 **"API Key"**
3. 配置：
   - **Header name**: `X-API-Key`
   - **API Key**: 输入你的 API Key（如果需要）

### 步骤 4: 验证路径

确认 OpenAPI Schema 中的路径：
- `/marketplace/search` ✅
- `/marketplace/products/{id}` ✅
- `/marketplace/orders` ✅
- `/marketplace/payments` ✅

## 🔧 快速测试

### 测试 1: 直接访问 OpenAPI Schema

```bash
curl https://api.agentrix.top/api/openai/openapi.json
```

应该返回完整的 JSON Schema。

### 测试 2: 测试搜索端点

```bash
curl "https://api.agentrix.top/api/marketplace/search?query=AI咨询" \
  -H "X-API-Key: your-api-key"
```

### 测试 3: 检查路径映射

确认 GPTs 中的工具名称：
- `searchProducts` → `/marketplace/search`
- `getProduct` → `/marketplace/products/{id}`
- `createOrder` → `/marketplace/orders`
- `initiatePayment` → `/marketplace/payments`

## 📝 常见错误

### 错误 1: "Failed Outbound Call"

**原因**：
- URL 配置错误
- 网络连接问题
- API 服务器不可访问

**解决**：
- 检查 URL 是否正确
- 确认 API 服务器运行正常
- 检查防火墙设置

### 错误 2: "与'connector'对话时出错"

**原因**：
- OpenAPI Schema 格式错误
- 路径映射不正确
- 认证失败

**解决**：
- 验证 OpenAPI Schema 格式
- 检查路径定义
- 确认认证配置

### 错误 3: "找不到相关结果"

**原因**：
- API 调用成功，但数据库中没有数据
- 搜索参数不正确

**解决**：
- 检查数据库中是否有测试数据
- 验证搜索参数格式

## 🎯 推荐配置

### GPTs Actions 配置

```
URL: https://api.agentrix.top/api/openai/openapi.json
Authentication: API Key (Optional)
Header name: X-API-Key
```

### 环境变量检查

确保后端环境变量正确：
```bash
API_URL=https://api.agentrix.top/api
# 或
API_BASE_URL=https://api.agentrix.top
```

## ✅ 验证清单

- [ ] OpenAPI Schema URL 可访问
- [ ] GPTs 中配置了正确的 URL
- [ ] 路径映射正确
- [ ] 认证配置正确（如果需要）
- [ ] API 服务器运行正常
- [ ] 数据库中有测试数据

