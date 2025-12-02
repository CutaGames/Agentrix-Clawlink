# PayMind Agent V3.0 测试和启动指南

**日期**: 2025-01-XX  
**版本**: V3.0

---

## 📋 前置条件

### 1. 环境要求
- Node.js 18+ 
- PostgreSQL 14+
- Redis (可选，用于缓存)
- npm 或 yarn

### 2. 检查环境
```bash
# 检查Node.js
node --version

# 检查npm
npm --version

# 检查PostgreSQL
psql --version

# 检查PostgreSQL是否运行
# Windows (PowerShell)
Get-Service -Name postgresql*

# Linux/Mac
sudo service postgresql status
```

---

## 🗄️ 步骤1: 运行数据库迁移

### 方式1: 使用npm脚本（推荐）

```bash
# 进入backend目录
cd backend

# 运行迁移
npm run migration:run
```

### 方式2: 使用TypeORM CLI

```bash
cd backend
npx typeorm-ts-node-commonjs migration:run -d src/config/data-source.ts
```

### 方式3: 手动执行SQL（如果迁移失败）

如果迁移脚本执行失败，可以手动执行SQL：

```sql
-- 连接到PostgreSQL
psql -U postgres -d paymind

-- 执行以下SQL创建新表
-- (从迁移文件中提取SQL语句)
```

### 预期输出

```
Migration AddAgentSessionAndAuditLog1763025405600 has been executed successfully.
Migration AddPayIntentAndQuickPayGrant1763025405601 has been executed successfully.
```

### 验证迁移

```sql
-- 检查新表是否创建
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'agent_sessions',
  'agent_messages',
  'audit_logs',
  'user_profiles',
  'merchant_tasks',
  'pay_intents',
  'quick_pay_grants'
);
```

---

## 🚀 步骤2: 启动服务

### 2.1 启动后端服务

**方式1: 开发模式（推荐）**
```bash
cd backend
npm run start:dev
```

**方式2: 生产模式**
```bash
cd backend
npm run build
npm run start:prod
```

**方式3: 使用启动脚本（Linux/Mac）**
```bash
cd backend
chmod +x start-server.sh
./start-server.sh
```

### 2.2 启动前端服务

**新终端窗口**
```bash
cd paymindfrontend
npm run dev
```

### 2.3 验证服务运行

**后端健康检查**
```bash
curl http://localhost:3001/api/health
# 或浏览器访问: http://localhost:3001/api/health
```

**前端访问**
- 浏览器访问: http://localhost:3000
- Agent页面: http://localhost:3000/agent

**API文档**
- Swagger文档: http://localhost:3001/api/docs

---

## 🧪 步骤3: 运行测试脚本

### 3.1 功能测试脚本

**Linux/Mac:**
```bash
# 设置token（需要先登录获取）
export PAYMIND_TOKEN='your-token-here'

# 运行测试
chmod +x test-agent-v3.sh
./test-agent-v3.sh
```

**Windows PowerShell:**
```powershell
# 设置token
$env:PAYMIND_TOKEN='your-token-here'

# 运行测试
.\run-tests-v3.ps1
```

### 3.2 单元测试

```bash
cd backend
npm test
```

### 3.3 E2E测试

```bash
cd backend
npm run test:e2e
```

### 3.4 手动测试关键功能

#### 测试1: Agent多轮对话
```bash
# 1. 创建会话并发送消息
curl -X POST http://localhost:3001/api/agent/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"帮我找一把游戏剑，预算20美元"}'

# 2. 使用sessionId继续对话
curl -X POST http://localhost:3001/api/agent/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"把刚才那把加入购物车","sessionId":"SESSION_ID"}'
```

#### 测试2: 情景感知推荐
```bash
curl -X POST http://localhost:3001/api/agent/recommendations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"SESSION_ID","query":"游戏装备"}'
```

#### 测试3: PayIntent流程
```bash
# 创建PayIntent
curl -X POST http://localhost:3001/api/pay-intents \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"order_payment","amount":100,"currency":"CNY"}'

# 授权PayIntent
curl -X POST http://localhost:3001/api/pay-intents/PAY_INTENT_ID/authorize \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"authorizationType":"user"}'
```

#### 测试4: 物流跟踪
```bash
# 获取物流信息
curl -X GET http://localhost:3001/api/logistics/ORDER_ID \
  -H "Authorization: Bearer $TOKEN"

# 更新物流状态
curl -X PUT http://localhost:3001/api/logistics/ORDER_ID/status \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"shipped","trackingNumber":"SF1234567890","carrier":"顺丰速运"}'
```

#### 测试5: 沙箱执行
```bash
curl -X POST http://localhost:3001/api/sandbox/execute \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "const payment = await paymind.payments.create({amount: 100, currency: \"CNY\"});",
    "language": "typescript"
  }'
```

---

## 📊 步骤4: 性能测试

### 4.1 缓存性能测试

**测试语义搜索缓存效果**
```bash
# 第一次搜索（无缓存，记录时间）
time curl -X GET "http://localhost:3001/api/search/semantic?q=游戏剑&topK=10" \
  -H "Authorization: Bearer $TOKEN"

# 第二次搜索（有缓存，应该更快）
time curl -X GET "http://localhost:3001/api/search/semantic?q=游戏剑&topK=10" \
  -H "Authorization: Bearer $TOKEN"
```

**预期结果**:
- 第一次: ~500-1000ms
- 第二次: ~50-200ms (缓存命中)

### 4.2 API响应时间测试

**使用Apache Bench (ab)**
```bash
# 安装ab (如果未安装)
# Ubuntu/Debian: sudo apt-get install apache2-utils
# Mac: brew install httpd

# 测试Agent聊天API
ab -n 100 -c 10 -H "Authorization: Bearer $TOKEN" \
  -p chat-request.json -T application/json \
  http://localhost:3001/api/agent/chat
```

**使用curl测试**
```bash
# 测试响应时间
for i in {1..10}; do
  time curl -X POST http://localhost:3001/api/agent/chat \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"message":"测试消息"}' \
    -o /dev/null -s -w "%{time_total}\n"
done
```

### 4.3 数据库查询性能

**检查慢查询**
```sql
-- 在PostgreSQL中启用慢查询日志
-- 检查查询执行计划
EXPLAIN ANALYZE 
SELECT * FROM agent_sessions 
WHERE "userId" = 'user-id' 
ORDER BY "lastMessageAt" DESC 
LIMIT 20;
```

### 4.4 内存和CPU监控

**使用Node.js性能监控**
```bash
# 启动服务时启用性能监控
NODE_ENV=development node --inspect dist/main.js

# 或使用PM2
npm install -g pm2
pm2 start dist/main.js --name paymind-backend
pm2 monit
```

---

## 🔍 步骤5: 验证功能

### 5.1 检查数据库表

```sql
-- 检查所有新表
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns 
   WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_name IN (
  'agent_sessions',
  'agent_messages',
  'audit_logs',
  'user_profiles',
  'merchant_tasks',
  'pay_intents',
  'quick_pay_grants'
)
ORDER BY table_name;
```

### 5.2 检查API端点

访问 http://localhost:3001/api/docs 查看所有API端点，确认：
- ✅ Agent相关端点（12个）
- ✅ PayIntent相关端点（5个）
- ✅ QuickPay授权端点（4个）
- ✅ 商户任务端点（7个）
- ✅ 物流跟踪端点（3个）
- ✅ 沙箱执行端点（1个）

### 5.3 检查日志

**后端日志**
```bash
# 查看实时日志
tail -f backend/logs/app.log

# 或查看控制台输出
```

**审计日志（数据库）**
```sql
SELECT 
  action,
  status,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM (timestamp - "createdAt"))) as avg_duration
FROM audit_logs
WHERE "createdAt" > NOW() - INTERVAL '1 day'
GROUP BY action, status
ORDER BY count DESC;
```

---

## ⚠️ 常见问题

### 问题1: 迁移失败

**错误**: `relation "xxx" already exists`

**解决**:
```sql
-- 检查迁移表
SELECT * FROM migrations;

-- 如果表已存在但迁移未记录，手动插入
INSERT INTO migrations (timestamp, name) 
VALUES (1763025405600, 'AddAgentSessionAndAuditLog1763025405600');
```

### 问题2: 服务启动失败

**错误**: `Cannot connect to database`

**解决**:
1. 检查PostgreSQL是否运行
2. 检查`.env`文件中的数据库配置
3. 检查数据库用户权限

### 问题3: API返回401

**错误**: `Unauthorized`

**解决**:
1. 确保已登录获取token
2. 检查token是否过期
3. 检查请求头中的Authorization格式

### 问题4: 缓存不生效

**解决**:
1. 检查CacheService是否正确注入
2. 检查缓存键生成逻辑
3. 查看日志确认缓存操作

---

## 📝 测试检查清单

- [ ] 数据库迁移成功执行
- [ ] 所有新表已创建
- [ ] 后端服务正常启动
- [ ] 前端服务正常启动
- [ ] API文档可访问
- [ ] Agent多轮对话测试通过
- [ ] 推荐功能测试通过
- [ ] PayIntent流程测试通过
- [ ] 物流跟踪测试通过
- [ ] 沙箱执行测试通过
- [ ] 缓存性能测试通过
- [ ] API响应时间符合要求（<500ms）
- [ ] 审计日志正常记录

---

## 🎉 完成

所有测试通过后，PayMind Agent V3.0 即可投入使用！

**下一步**:
1. 部署到生产环境
2. 配置监控和告警
3. 进行压力测试
4. 收集用户反馈

---

**祝测试顺利！** 🚀

