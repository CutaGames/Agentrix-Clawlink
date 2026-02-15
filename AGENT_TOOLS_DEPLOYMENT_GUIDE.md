# Agent 工具执行功能 - 部署与验证指南

**完成时间**: 2026-02-10
**修改文件**: 6 个核心文件
**状态**: ✅ 代码修改完成，待部署测试

---

## 修改总结

### 已修改的文件

1. **hq-backend/src/modules/ai/hq-ai.service.ts**
   - ✅ 添加 `tools` 参数到 `ChatCompletionOptions`
   - ✅ 添加 `toolCalls` 到 `ChatCompletionResult`
   - ✅ `bedrockChat()` 支持工具调用和 tool_use 响应
   - ✅ `geminiChat()` 支持 functionDeclarations 和 functionCall 响应

2. **hq-backend/src/modules/core/unified-chat.service.ts**
   - ✅ 注入 `ToolService`
   - ✅ 实现完整的工具执行循环（最多 5 轮）
   - ✅ 自动获取 Agent 角色对应的工具列表
   - ✅ 执行工具并将结果回传给 AI
   - ✅ 记录工具执行日志

3. **hq-backend/src/modules/tools/tools.module.ts** (新建)
   - ✅ 导出 `ToolService` 供其他模块使用

4. **hq-backend/src/modules/core/hq-core.module.ts**
   - ✅ 导入 `ToolsModule`

5. **hq-backend/src/hq/tick/tick.module.ts**
   - ✅ 导入 `ToolsModule`

6. **test-agent-tools.sh** (新建)
   - ✅ 创建测试脚本

---

## 功能说明

### 对话框工具调用

用户在 HQ Console 与 Agent 对话时，Agent 现在可以：

1. **识别需求**: 理解用户要求（"发一条推文"）
2. **决策工具**: AI 决定调用 `twitter_post` 工具
3. **执行工具**: ToolService 执行真实的 Twitter API 调用
4. **返回结果**: 将推文 ID 和状态返回给用户

**示例对话**:
```
用户: 发一条推文说 Agentrix 正式上线了！
SOCIAL-01: [调用 twitter_post 工具]
SOCIAL-01: 已发布推文！推文 ID: 1234567890，链接: https://twitter.com/AgentrixHQ/status/1234567890
```

### 自动化工具调用

Tick 系统每 10 分钟触发时，Agent 可以自主调用工具：

1. **SOCIAL-01**: 自动发推文、搜索并回复相关话题
2. **BD-01**: 自动搜索免费 API 资源并整理清单
3. **DEVREL-01**: 自动在 GitHub/论坛发帖互动
4. **GROWTH-01**: 自动分析用户增长数据

---

## 部署步骤

### 1. 本地编译测试

```bash
cd hq-backend

# 安装依赖
npm install

# TypeScript 编译
npm run build

# 检查编译错误
echo $?  # 应该返回 0
```

### 2. 部署到 Tokyo 服务器

```bash
# 上传代码
scp -i agentrix.pem hq-backend/src/modules/ai/hq-ai.service.ts \
  ubuntu@57.182.89.146:/home/ubuntu/agentrix-hq/hq-backend/src/modules/ai/

scp -i agentrix.pem hq-backend/src/modules/core/unified-chat.service.ts \
  ubuntu@57.182.89.146:/home/ubuntu/agentrix-hq/hq-backend/src/modules/core/

scp -i agentrix.pem hq-backend/src/modules/tools/tools.module.ts \
  ubuntu@57.182.89.146:/home/ubuntu/agentrix-hq/hq-backend/src/modules/tools/

scp -i agentrix.pem hq-backend/src/modules/core/hq-core.module.ts \
  ubuntu@57.182.89.146:/home/ubuntu/agentrix-hq/hq-backend/src/modules/core/

scp -i agentrix.pem hq-backend/src/hq/tick/tick.module.ts \
  ubuntu@57.182.89.146:/home/ubuntu/agentrix-hq/hq-backend/src/hq/tick/

# SSH 进入服务器
ssh -i agentrix.pem ubuntu@57.182.89.146

# 进入项目目录
cd /home/ubuntu/agentrix-hq/hq-backend

# 编译
npm run build

# 重启服务
pm2 restart hq-backend

# 查看日志
pm2 logs hq-backend --lines 50
```

### 3. 验证工具注册

```bash
# SSH 到服务器后执行
cd /home/ubuntu/agentrix-hq/hq-backend
pm2 logs hq-backend | grep "Tool Registry initialized"

# 应该看到:
# [ToolService] 🔧 Tool Registry initialized with 18 tools
```

### 4. 测试工具调用

**方式 1: 使用测试脚本**
```bash
bash test-agent-tools.sh
```

**方式 2: 手动测试**
```bash
# 测试对话工具调用
curl -X POST http://57.182.89.146:8080/api/hq/chat \
  -H "Content-Type: application/json" \
  -d '{
    "agentCode": "SOCIAL-01",
    "message": "发一条推文：Agentrix HQ tool execution is live! 🎉",
    "mode": "staff"
  }'
```

**方式 3: HQ Console 界面测试**
```
1. 打开浏览器访问: http://localhost:4000
2. 进入 Workspace 页面
3. 选择 SOCIAL-01
4. 输入: "帮我发一条推文介绍 Agentrix"
5. 查看 Agent 是否调用 twitter_post 工具
```

### 5. 监控日志

```bash
# 实时查看工具执行日志
ssh -i agentrix.pem ubuntu@57.182.89.146
pm2 logs hq-backend | grep -E "tool|Tool|twitter|execute"

# 预期看到:
# [UnifiedChatService] 🔧 Agent SOCIAL-01 has 8 tools available
# [ToolService] 🔧 Executing tool: twitter_post (agent: SOCIAL-01)
# [ToolService] ✅ Tool twitter_post completed (success: true, 1243ms)
# [UnifiedChatService] ✅ UnifiedChat complete: iterations=2, tokens=3421
```

---

## 验证清单

### 对话框工具调用

- [ ] 1. HQ Console 可以正常访问
- [ ] 2. 选择 SOCIAL-01 后发送消息
- [ ] 3. Agent 回复中提到调用了工具
- [ ] 4. 日志中看到 `[ToolService] Executing tool: xxx`
- [ ] 5. Twitter 账号出现新推文

### Tick 自动化工具调用

- [ ] 6. 等待下一次 Tick 执行（每 10 分钟）
- [ ] 7. 查看 Tick 执行日志: `GET /api/hq/tick/executions?limit=1`
- [ ] 8. 日志中看到工具执行记录
- [ ] 9. Twitter 账号有自动发布的推文
- [ ] 10. Agent 任务完成报告包含工具执行结果

### 工具执行日志

- [ ] 11. `pm2 logs` 中看到 ToolService 初始化
- [ ] 12. 看到 Agent 获取工具列表
- [ ] 13. 看到工具执行成功/失败日志
- [ ] 14. 看到工具执行耗时统计

---

## 常见问题

### Q1: Agent 不调用工具，只返回文本

**原因**: AI 可能选择不使用工具，直接回复文本

**解决**:
1. 优化提示词，明确要求使用工具
2. 检查工具是否正确注册: `grep "Tool Registry" pm2 logs`
3. 检查 Agent 角色对应的工具列表: `getClaudeTools(agentRole)`

### Q2: 工具执行失败

**可能原因**:
1. Twitter API 密钥未配置或过期
2. 网络连接问题（服务器无法访问 Twitter API）
3. 工具参数格式错误

**调试步骤**:
```bash
# 1. 检查环境变量
ssh -i agentrix.pem ubuntu@57.182.89.146
cd /home/ubuntu/agentrix-hq/hq-backend
cat .env | grep TWITTER

# 2. 测试 Twitter API
curl -X POST "https://api.twitter.com/2/tweets" \
  -H "Authorization: Bearer $TWITTER_BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text": "Test tweet"}'

# 3. 查看详细错误日志
pm2 logs hq-backend --err --lines 100
```

### Q3: 工具循环达到上限

**原因**: Agent 连续调用 5 次工具仍未完成

**解决**:
1. 检查任务是否过于复杂
2. 查看日志确认每次工具调用是否成功
3. 如有必要，增加 `maxIterations` (当前为 5)

### Q4: 编译错误

**可能错误**:
```
error TS2345: Argument of type '...' is not assignable to parameter of type '...'
```

**解决**:
```bash
# 清理并重新编译
cd hq-backend
rm -rf dist
npm run build
```

---

## 成功指标

修复完成后，在 24 小时内应该看到：

✅ **Twitter 账号活跃**:
- 自动发推 5-10 条
- 自动回复相关话题 3-5 条
- 自动转发行业内容 2-3 条

✅ **日志数据**:
- `tool_executions` 日志文件 >50 条记录
- 工具成功率 >80%
- 平均执行时长 <2 秒

✅ **Agent 报告**:
- Tick 执行报告包含工具调用统计
- Agent 每日总结提到外部互动
- 数据库 tool_usage 表有记录

---

## 回滚方案

如果出现严重问题，立即回滚：

```bash
# 1. SSH 到服务器
ssh -i agentrix.pem ubuntu@57.182.89.146

# 2. Git 回滚
cd /home/ubuntu/agentrix-hq/hq-backend
git checkout HEAD~1 src/modules/ai/hq-ai.service.ts
git checkout HEAD~1 src/modules/core/unified-chat.service.ts
git checkout HEAD~1 src/modules/core/hq-core.module.ts
git checkout HEAD~1 src/hq/tick/tick.module.ts

# 3. 删除新建文件
rm -f src/modules/tools/tools.module.ts

# 4. 重新编译
npm run build

# 5. 重启服务
pm2 restart hq-backend

# 6. 验证回滚成功
curl http://57.182.89.146:8080/api/health
```

---

## 下一步优化

1. **添加工具执行审计**: 记录所有工具调用到数据库
2. **工具成本追踪**: 统计每个工具的 API 调用成本
3. **工具执行率限制**: 防止滥用（如每小时最多发 10 条推文）
4. **工具执行可视化**: 在 HQ Console 显示工具调用进度
5. **更多工具集成**:
   - Telegram 群组管理
   - Discord 社区互动
   - GitHub Issue/PR 自动化
   - Email 营销
   - 数据分析和报表

---

## 联系方式

如有问题或需要帮助：
- 查看日志: `pm2 logs hq-backend`
- 查看诊断报告: `HQ_CRITICAL_ISSUES_DIAGNOSIS.md`
- 测试脚本: `test-agent-tools.sh`
