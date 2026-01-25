# 测试 OpenAI 集成 - 完整步骤

## ✅ 已完成
1. ✅ 文件上传成功
2. ✅ 构建成功（无 TypeScript 错误）
3. ✅ 服务重启成功

## 🔍 检查路由注册

在服务器上执行：

```bash
# 查看所有 OpenAI 相关路由
pm2 logs agentrix-backend --lines 100 | grep -i "openai"

# 或者查看启动日志中的路由注册
pm2 logs agentrix-backend --lines 200 | grep -i "RouterExplorer.*openai"
```

应该看到：
- `/api/openai/functions` ✅
- `/api/openai/function-call` ✅
- `/api/openai/test` ✅
- `/api/openai/chat` ✅ (这个应该现在有了！)

## 🧪 测试步骤

### 1. 测试 Functions 端点

```bash
curl -s http://localhost:3001/api/openai/functions | python3 -m json.tool | head -50
```

应该返回 8+ 个 functions（包括 search_agentrix_products, add_to_agentrix_cart 等）

### 2. 测试 Function Call

```bash
curl -X POST http://localhost:3001/api/openai/function-call \
  -H "Content-Type: application/json" \
  -d '{
    "function": {
      "name": "search_agentrix_products",
      "arguments": "{\"query\": \"iPhone\"}"
    },
    "context": {"sessionId": "test-123"}
  }'
```

### 3. 测试 Chat 路由（需要 OPENAI_API_KEY）

```bash
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

**注意：** 如果返回错误说需要 API Key，说明需要配置 `OPENAI_API_KEY` 环境变量。

## 🔧 如果 Chat 路由还是 404

如果 `/api/openai/chat` 还是返回 404，检查：

1. **查看完整的启动日志**：
   ```bash
   pm2 logs agentrix-backend --lines 500 | grep -A 5 -B 5 "OpenAIIntegrationController"
   ```

2. **检查 Controller 文件**：
   ```bash
   grep -n "@Post.*chat" /var/www/agentrix-website/backend/src/modules/ai-integration/openai/openai-integration.controller.ts
   ```

3. **重新加载 PM2**：
   ```bash
   pm2 reload agentrix-backend
   ```

## ✅ 成功标志

如果一切正常，你应该看到：
- ✅ 构建无错误
- ✅ `/api/openai/chat` 路由已注册
- ✅ Functions 端点返回 8+ 个 functions
- ✅ Chat 端点可以正常调用（需要 API Key）

