# 快速修复验证指南

## 已完成的修改

### 1. ✅ 工具执行集成到聊天流程

**修改文件**: `hq-backend/src/modules/core/hq-core.service.ts`
- `/chat` 端点现在调用 `UnifiedChatService.chat()`
- `/chat/stream` 端点也会获得工具执行能力
- Agent 会自动调用工具（最多 5 轮）

### 2. ⚠️ Twitter API 配置检查

**需要的环境变量** (`hq-backend/.env`):
```bash
TWITTER_API_KEY=your_api_key
TWITTER_API_SECRET=your_api_secret
TWITTER_ACCESS_TOKEN=your_access_token
TWITTER_ACCESS_SECRET=your_access_secret
```

**需要安装的包**:
```bash
cd hq-backend
npm install twitter-api-v2
```

---

## 立即验证步骤

### 步骤 1: 检查服务器环境变量

```bash
# SSH 到东京服务器
ssh -i agentrix.pem ubuntu@57.182.89.146

# 检查 Twitter 配置
cd /home/ubuntu/agentrix-hq/hq-backend
cat .env | grep TWITTER

# 如果没有，需要添加（从 Twitter Developer Portal 获取）
```

### 步骤 2: 安装依赖并重启

```bash
# 在服务器上执行
cd /home/ubuntu/agentrix-hq/hq-backend

# 安装 twitter-api-v2
npm install twitter-api-v2

# 编译
npm run build

# 重启服务
pm2 restart hq-backend

# 查看启动日志
pm2 logs hq-backend --lines 50
```

### 步骤 3: 本地测试（无需 Twitter API）

使用 `web_search` 工具测试（不需要 API 密钥）：

```bash
curl -X POST http://57.182.89.146:8080/api/hq/chat \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "BD-01",
    "messages": [{"role": "user", "content": "帮我搜索2026年最新的免费 AI API"}]
  }'
```

预期结果：
```json
{
  "response": "我已经帮你搜索了...[搜索结果]",
  "model": "gemini-2.5-flash",
  "tokensUsed": 1234
}
```

### 步骤 4: 前端测试（HQ Console）

1. **启动本地前端**:
```bash
cd hq-console
npm run dev
```

2. **访问**: http://localhost:4000

3. **测试对话**:
   - 进入 Workspace 页面
   - 选择 BD-01
   - 输入: "搜索最新的免费 AI API 资源"
   - 查看回复是否包含搜索结果

4. **查看日志**:
```bash
# 在服务器上
pm2 logs hq-backend | grep -E "tool|Tool|Executing"

# 预期看到:
# [UnifiedChatService] 🔧 Agent BD-01 has 8 tools available
# [UnifiedChatService] 🔧 Iteration 1: Agent wants to call 1 tools
# [ToolService] 🔧 Executing tool: web_search (agent: BD-01)
# [ToolService] ✅ Tool web_search: success
```

---

## Twitter API 配置（如需发推文）

### 获取 Twitter API 密钥

1. 访问: https://developer.twitter.com/en/portal/dashboard
2. 创建 App（或使用现有）
3. 在 "Keys and tokens" 标签页生成:
   - API Key & Secret
   - Access Token & Secret
4. 确保 App 权限设置为 "Read and Write"

### 配置到服务器

```bash
# SSH 到服务器
ssh -i agentrix.pem ubuntu@57.182.89.146

# 编辑 .env
cd /home/ubuntu/agentrix-hq/hq-backend
nano .env

# 添加（替换为你的真实密钥）:
TWITTER_API_KEY=abc123...
TWITTER_API_SECRET=xyz789...
TWITTER_ACCESS_TOKEN=111-abc...
TWITTER_ACCESS_SECRET=def456...

# 保存并退出（Ctrl+X, Y, Enter）

# 重启服务
pm2 restart hq-backend
```

### 测试推文功能

```bash
curl -X POST http://57.182.89.146:8080/api/hq/chat \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "SOCIAL-01",
    "messages": [{"role": "user", "content": "发一条推文：Agentrix HQ 工具系统上线了！🚀"}]
  }'
```

预期响应：
```json
{
  "response": "已成功发布推文！推文 ID: 1234567890",
  "model": "claude-sonnet-4-5",
  "tokensUsed": 892
}
```

---

## 问题排查

### 问题 1: Agent 回复很短，没有流式效果

**原因**: 流式端点 `/chat/stream` 可能还未完全支持工具循环

**临时方案**: 使用 `/chat` 端点（非流式）验证工具执行

**后续优化**: 修改 `chatStream` 方法支持流式工具执行

### 问题 2: 推文没有真实发出

**可能原因**:
1. ❌ 环境变量未配置
2. ❌ `twitter-api-v2` 未安装
3. ❌ Twitter API 密钥无效
4. ❌ App 权限不足（需要 Read and Write）

**调试步骤**:
```bash
# 1. 检查环境变量
cat .env | grep TWITTER

# 2. 检查包是否安装
npm list twitter-api-v2

# 3. 查看详细错误日志
pm2 logs hq-backend --err --lines 100 | grep -i twitter

# 4. 测试 Twitter API（手动）
node -e "
const { TwitterApi } = require('twitter-api-v2');
const client = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_API_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_SECRET,
});
client.v2.tweet({ text: 'Test from Agentrix' })
  .then(r => console.log('✅ Success:', r.data))
  .catch(e => console.error('❌ Error:', e.message));
"
```

### 问题 3: 工具执行循环达到上限

**症状**: 日志显示 "reached max tool iterations (5)"

**原因**: 任务太复杂或工具执行失败

**解决**:
1. 查看每次迭代的日志
2. 确认工具是否成功执行
3. 如有必要，增加 `maxIterations`（在 `unified-chat.service.ts` Line 123）

---

## 成功验证清单

- [ ] 1. 服务器环境变量已配置
- [ ] 2. `twitter-api-v2` 已安装
- [ ] 3. 服务成功重启，无编译错误
- [ ] 4. 日志显示 "Tool Registry initialized with 18 tools"
- [ ] 5. 测试 `web_search` 工具成功
- [ ] 6. HQ Console 对话框能调用工具
- [ ] 7. （可选）Twitter 推文成功发出

---

## 下一步

1. **验证工具执行**: 使用 `web_search` 测试（无需 API）
2. **配置 Twitter**: 添加真实 API 密钥
3. **测试推文**: 确认能真实发推
4. **流式优化**: 修改 `chatStream` 支持流式工具执行
5. **监控自动化**: 等待下次 Tick，查看 Agent 自动工作

---

**当前状态**: ✅ 代码修改完成，待服务器部署验证
**预计工作量**: 10-15 分钟（如有 Twitter API 密钥）
