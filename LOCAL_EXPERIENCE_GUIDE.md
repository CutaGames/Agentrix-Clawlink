# Agentrix Agent V3.0 本地体验完整指南

**版本**: V3.0  
**日期**: 2025-01-XX

---

## 🎯 快速开始（3步）

### 步骤1: 运行数据库迁移

```bash
cd backend
npm run migration:run
```

这将创建V3.0所需的所有新表。

### 步骤2: 启动所有服务

**Windows (推荐使用批处理脚本):**
```batch
启动服务-简单版.bat
```

**或手动启动（3个终端窗口）:**

**终端1 - 后端:**
```bash
cd backend
npm run start:dev
```

**终端2 - 前端:**
```bash
cd agentrixfrontend
npm run dev
```

**终端3 - SDK文档（可选）:**
```bash
cd sdk-js/docs
npx http-server -p 8080
```

### 步骤3: 访问服务

- **前端应用**: http://localhost:3000
- **Agent页面**: http://localhost:3000/agent
- **后端API**: http://localhost:3001/api
- **API文档**: http://localhost:3001/api/docs
- **SDK文档**: http://localhost:8080

---

## 📋 完整启动流程

### 1. 环境准备

#### 检查Node.js
```bash
node --version  # 需要 v18+
npm --version
```

#### 检查PostgreSQL
```bash
# Windows
Get-Service -Name postgresql*

# Linux/WSL
sudo service postgresql status
```

#### 检查环境变量
```bash
# 后端
cd backend
# 确保有 .env 文件，包含数据库配置

# 前端
cd agentrixfrontend
# 确保有 .env.local 文件
```

### 2. 安装依赖（首次运行）

```bash
# 后端依赖
cd backend
npm install

# 前端依赖
cd ../agentrixfrontend
npm install

# SDK依赖（可选）
cd ../sdk-js
npm install
```

### 3. 数据库迁移（V3.0新增）

```bash
cd backend
npm run migration:run
```

**预期输出**:
```
Migration AddAgentSessionAndAuditLog1763025405600 has been executed successfully.
Migration AddPayIntentAndQuickPayGrant1763025405601 has been executed successfully.
```

### 4. 启动服务

#### 方式1: 使用批处理脚本（Windows）

```batch
# 双击运行
启动服务-简单版.bat

# 或使用新的启动脚本
start-and-test.bat
```

#### 方式2: 使用Shell脚本（Linux/WSL）

```bash
# 一键启动所有服务
./start-all-services.sh

# 或使用WSL专用脚本
./WSL启动服务.sh
```

#### 方式3: 手动启动（推荐用于调试）

**终端1 - 后端服务:**
```bash
cd backend
npm run start:dev
```

**终端2 - 前端服务:**
```bash
cd agentrixfrontend
npm run dev
```

**终端3 - SDK文档（可选）:**
```bash
cd sdk-js/docs
npx http-server -p 8080 --cors
```

---

## 🧪 测试V3.0新功能

### 1. Agent多轮对话测试

**访问**: http://localhost:3000/agent

**测试步骤**:
1. 发送消息: "帮我找一把游戏剑，预算20美元"
2. 查看响应中的 `sessionId`
3. 继续发送: "把刚才那把加入购物车"
4. 验证Agent能记住预算和商品类型

**预期结果**:
- ✅ 第一条消息创建新会话
- ✅ 第二条消息使用相同会话
- ✅ Agent能记住预算（20美元）和商品类型（游戏剑）

### 2. 情景感知推荐测试

**API测试**:
```bash
# 先登录获取token
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# 获取推荐
curl -X POST http://localhost:3001/api/agent/recommendations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"SESSION_ID","query":"游戏装备"}'
```

**预期结果**:
- ✅ 返回3-10个推荐商品
- ✅ 每个商品有推荐理由
- ✅ 推荐来源标注

### 3. PayIntent流程测试

**访问**: http://localhost:3001/api/docs

**测试步骤**:
1. 创建PayIntent
2. 授权PayIntent
3. 执行PayIntent
4. 验证支付创建

**API测试**:
```bash
# 1. 创建PayIntent
curl -X POST http://localhost:3001/api/pay-intents \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"order_payment","amount":100,"currency":"CNY"}'

# 2. 授权PayIntent
curl -X POST http://localhost:3001/api/pay-intents/PAY_INTENT_ID/authorize \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"authorizationType":"user"}'

# 3. 执行PayIntent
curl -X POST http://localhost:3001/api/pay-intents/PAY_INTENT_ID/execute \
  -H "Authorization: Bearer $TOKEN"
```

### 4. QuickPay授权测试

```bash
# 创建QuickPay授权
curl -X POST http://localhost:3001/api/quick-pay-grants \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentMethod":{"type":"stripe"},
    "permissions":{"maxAmount":1000,"maxDailyAmount":5000}
  }'
```

### 5. 商户任务测试

```bash
# 创建任务
curl -X POST http://localhost:3001/api/merchant-tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "merchantId":"MERCHANT_ID",
    "type":"custom_service",
    "title":"定制服务",
    "description":"需要定制服务",
    "budget":5000,
    "currency":"CNY"
  }'
```

### 6. 物流跟踪测试

```bash
# 获取物流信息
curl -X GET http://localhost:3001/api/logistics/ORDER_ID \
  -H "Authorization: Bearer $TOKEN"

# 更新物流状态
curl -X PUT http://localhost:3001/api/logistics/ORDER_ID/status \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status":"shipped",
    "trackingNumber":"SF1234567890",
    "carrier":"顺丰速运"
  }'
```

### 7. 沙箱执行测试

**访问**: http://localhost:3000/agent (在代码生成功能中)

**或API测试**:
```bash
curl -X POST http://localhost:3001/api/sandbox/execute \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code":"const payment = await agentrix.payments.create({amount: 100, currency: \"CNY\"});",
    "language":"typescript"
  }'
```

---

## 🎨 UI体验

### 新的UI设计（V3.0）

访问 http://localhost:3000/agent 体验：

- ✅ **深色主题** - 未来感科技风
- ✅ **玻璃拟态效果** - AI气泡和卡片
- ✅ **AI光晕效果** - 按钮和头像
- ✅ **思考动画** - 加载状态
- ✅ **商品推荐卡片** - 横向滑动
- ✅ **支付进度条** - 可视化流程

### 使用新的Agent Chat组件

如果页面还在使用旧组件，可以替换为：

```tsx
// 旧组件
import { AgentChat } from '../../components/agent/AgentChat';

// 新组件（V3.0优化版）
import { AgentChatV3 } from '../../components/agent/AgentChatV3';
```

---

## 📊 服务端口说明

| 服务 | 端口 | 访问地址 | 说明 |
|------|------|---------|------|
| 前端 | 3000 | http://localhost:3000 | Next.js前端应用 |
| 后端API | 3001 | http://localhost:3001/api | NestJS后端服务 |
| API文档 | 3001 | http://localhost:3001/api/docs | Swagger文档 |
| SDK文档 | 8080 | http://localhost:8080 | SDK文档服务器 |

---

## 🔍 验证服务运行

### 检查后端服务

```bash
# 健康检查
curl http://localhost:3001/api/health

# 或浏览器访问
http://localhost:3001/api/health
```

### 检查前端服务

```bash
# 浏览器访问
http://localhost:3000
```

### 检查数据库表

```sql
-- 连接到PostgreSQL
psql -U postgres -d agentrix

-- 检查新表
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

## 🐛 常见问题

### 问题1: 端口被占用

**错误**: `Port 3000 is already in use`

**解决**:
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/WSL
lsof -ti:3000 | xargs kill -9
```

### 问题2: 数据库连接失败

**错误**: `Cannot connect to database`

**解决**:
1. 检查PostgreSQL是否运行
2. 检查`.env`文件中的数据库配置
3. 检查数据库用户权限

### 问题3: 迁移失败

**错误**: `relation "xxx" already exists`

**解决**:
```sql
-- 检查迁移表
SELECT * FROM migrations;

-- 如果表已存在但迁移未记录，手动插入
INSERT INTO migrations (timestamp, name) 
VALUES (1763025405600, 'AddAgentSessionAndAuditLog1763025405600');
```

### 问题4: 前端样式不生效

**解决**:
```bash
# 清除缓存并重新构建
cd agentrixfrontend
rm -rf .next
npm run dev
```

---

## 📝 测试检查清单

### 基础功能
- [ ] 数据库迁移成功
- [ ] 后端服务正常启动
- [ ] 前端服务正常启动
- [ ] API文档可访问

### Agent功能
- [ ] Agent多轮对话
- [ ] 情景感知推荐
- [ ] 商品搜索/比价
- [ ] 自动下单
- [ ] 订单查询
- [ ] 代码生成

### 支付功能
- [ ] PayIntent创建
- [ ] PayIntent授权
- [ ] PayIntent执行
- [ ] QuickPay授权

### 其他功能
- [ ] 商户任务
- [ ] 物流跟踪
- [ ] 沙箱执行
- [ ] 审计日志

---

## 🚀 快速命令参考

### 启动所有服务

**Windows:**
```batch
启动服务-简单版.bat
```

**Linux/WSL:**
```bash
./start-all-services.sh
```

### 停止所有服务

**Windows:**
```batch
# 按 Ctrl+C 在各自终端中停止
# 或使用任务管理器结束进程
```

**Linux/WSL:**
```bash
# 停止所有服务
pkill -f "npm run start:dev"
pkill -f "npm run dev"
pkill -f "http-server"
```

### 查看日志

```bash
# 后端日志
tail -f backend/logs/app.log

# 前端日志（在控制台查看）

# 或查看启动脚本生成的日志
tail -f logs/backend.log
tail -f logs/frontend.log
```

---

## 🎉 开始体验

所有服务启动后，您可以：

1. **体验Agent对话**: http://localhost:3000/agent
2. **查看API文档**: http://localhost:3001/api/docs
3. **测试API端点**: 使用Swagger UI或curl
4. **查看SDK文档**: http://localhost:8080

**祝体验愉快！** 🚀

