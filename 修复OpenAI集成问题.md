# 修复 OpenAI 集成问题

## 🔍 发现的问题

1. **只返回了 2 个 functions**（应该是 8 个基础 + 系统级能力）
2. **function-call 参数格式错误**
3. **/api/openai/chat 路由 404**

## 🛠️ 修复步骤

### 1. 上传最新代码到服务器

```bash
# 在本地执行
cd /mnt/d/wsl/Ubuntu-24.04/Code/Paymind/paymind-website

# 上传 OpenAI 集成文件
scp backend/src/modules/ai-integration/openai/*.ts root@129.226.152.88:/var/www/agentrix-website/backend/src/modules/ai-integration/openai/
```

### 2. 在服务器上重新构建

```bash
ssh root@129.226.152.88
cd /var/www/agentrix-website/backend

# 重新构建
npm run build

# 重启服务
pm2 restart agentrix-backend --update-env
```

### 3. 检查日志

```bash
# 查看 PM2 日志
pm2 logs agentrix-backend --lines 50

# 查看是否有 OpenAI 相关的日志
pm2 logs agentrix-backend | grep -i openai
```

### 4. 测试修复

```bash
# 测试 Functions（应该返回 8+ 个）
curl -s http://localhost:3001/api/openai/functions | python3 -m json.tool | grep -c '"name"'

# 测试 Function Call（修复参数格式）
curl -X POST http://localhost:3001/api/openai/function-call \
  -H "Content-Type: application/json" \
  -d '{
    "function": {
      "name": "search_agentrix_products",
      "arguments": "{\"query\": \"iPhone\"}"
    },
    "context": {"sessionId": "test-123"}
  }'

# 测试 Chat 路由
curl -X POST http://localhost:3001/api/openai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "我要买 iPhone 15"}
    ],
    "context": {
      "sessionId": "test-123"
    }
  }'
```

## 🔧 可能的原因

### 问题 1: 只返回 2 个 functions

**可能原因：**
- 服务器上的代码版本较旧
- `basicFunctions` 数组被截断
- `systemSchemas` 返回空数组

**解决方案：**
- 确保上传最新代码
- 检查 `getFunctionSchemas` 方法的返回语句
- 添加调试日志查看实际返回数量

### 问题 2: function-call 参数格式错误

**可能原因：**
- `arguments` 字段应该是 JSON 字符串，但传入了对象
- 或者相反

**解决方案：**
- 测试时使用 JSON 字符串：`"arguments": "{\"query\": \"iPhone\"}"`
- 或者使用对象：`"arguments": {"query": "iPhone"}`

### 问题 3: /api/openai/chat 路由 404

**可能原因：**
- 模块未正确注册
- Controller 未加载
- 路由前缀问题

**解决方案：**
- 检查 `app.module.ts` 中是否导入了 `OpenAIIntegrationModule`
- 检查 Controller 的 `@Controller('openai')` 装饰器
- 确认全局路由前缀是 `/api`

## 📋 检查清单

- [ ] 上传最新代码到服务器
- [ ] 重新构建项目
- [ ] 重启服务
- [ ] 检查日志
- [ ] 测试 Functions 端点（应该返回 8+ 个）
- [ ] 测试 Function Call（修复参数格式）
- [ ] 测试 Chat 路由

## 🚀 快速修复命令

```bash
# 1. 上传文件
scp backend/src/modules/ai-integration/openai/*.ts root@129.226.152.88:/var/www/agentrix-website/backend/src/modules/ai-integration/openai/

# 2. SSH 到服务器
ssh root@129.226.152.88

# 3. 重新构建和重启
cd /var/www/agentrix-website/backend
npm run build
pm2 restart agentrix-backend --update-env

# 4. 测试
curl -s http://localhost:3001/api/openai/functions | python3 -m json.tool | grep -c '"name"'
```

