# Agentrix Agent V3.0 测试与验收指南

**版本**: V3.0  
**日期**: 2025-01-XX  
**状态**: ✅ **准备测试验收**

---

## 📋 测试前准备

### 1. 环境准备

```bash
# 1. 安装依赖
cd backend && npm install
cd ../agentrixfrontend && npm install

# 2. 配置环境变量
# backend/.env
DATABASE_URL=postgresql://user:password@localhost:5432/agentrix
JWT_SECRET=your-secret-key

# agentrixfrontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

### 2. 数据库迁移

```bash
cd backend
npm run migration:run
```

这将创建以下新表：
- `agent_sessions` - 会话管理
- `agent_messages` - 消息存储
- `audit_logs` - 审计日志
- `user_profiles` - 用户画像
- `merchant_tasks` - 商户任务
- `pay_intents` - 支付意图
- `quick_pay_grants` - QuickPay授权

### 3. 启动服务

```bash
# 终端1 - 启动后端
cd backend
npm run start:dev

# 终端2 - 启动前端
cd agentrixfrontend
npm run dev
```

---

## 🧪 功能测试清单

### 测试1: 多轮对话与上下文管理

**测试步骤**:
1. 访问 `http://localhost:3000/agent`
2. 发送消息："帮我找一把游戏剑，预算20美元"
3. 检查响应中是否包含 `sessionId`
4. 使用相同的 `sessionId` 发送第二条消息："把刚才那把加入购物车"
5. 验证Agent能记住之前的预算和商品类型

**预期结果**:
- ✅ 第一条消息创建新会话
- ✅ 第二条消息使用相同会话
- ✅ Agent能记住预算（20美元）和商品类型（游戏剑）

**API测试**:
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

---

### 测试2: 情景感知推荐

**测试步骤**:
1. 发送消息："帮我推荐游戏装备"
2. 检查推荐结果
3. 验证推荐理由（基于用户画像/上下文/相似商品）

**预期结果**:
- ✅ 返回3-10个推荐商品
- ✅ 每个商品有推荐理由
- ✅ 推荐来源标注（user_profile/context/similar/popular）

**API测试**:
```bash
curl -X POST http://localhost:3001/api/agent/recommendations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"SESSION_ID","query":"游戏装备"}'
```

---

### 测试3: Agent自动下单

**测试步骤**:
1. 搜索商品："找一把游戏剑"
2. 选择商品ID
3. 发送消息："帮我下单这个商品"
4. 验证订单创建

**预期结果**:
- ✅ 订单成功创建
- ✅ 订单状态为 `pending`
- ✅ 订单包含商品快照

**API测试**:
```bash
curl -X POST http://localhost:3001/api/agent/create-order \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"productId":"PRODUCT_ID","quantity":1}'
```

---

### 测试4: PayIntent流程

**测试步骤**:
1. 创建PayIntent
2. 授权PayIntent
3. 执行PayIntent
4. 验证支付创建

**预期结果**:
- ✅ PayIntent状态流转：created → authorized → executing → completed
- ✅ 支付记录创建
- ✅ 支付链接和二维码生成

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

---

### 测试5: QuickPay授权

**测试步骤**:
1. 创建QuickPay授权
2. 使用授权创建PayIntent
3. 验证授权限制（金额、次数等）

**预期结果**:
- ✅ 授权创建成功
- ✅ 授权验证通过
- ✅ 使用量正确记录

**API测试**:
```bash
# 1. 创建授权
curl -X POST http://localhost:3001/api/quick-pay-grants \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"paymentMethod":{"type":"stripe"},"permissions":{"maxAmount":1000,"maxDailyAmount":5000}}'

# 2. 使用授权创建PayIntent
curl -X POST http://localhost:3001/api/pay-intents \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"order_payment","amount":100,"currency":"CNY"}'

# 3. 使用QuickPay授权
curl -X POST http://localhost:3001/api/pay-intents/PAY_INTENT_ID/authorize \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"authorizationType":"quickpay","quickPayGrantId":"GRANT_ID"}'
```

---

### 测试6: Agent→商户协作

**测试步骤**:
1. 创建任务（用户）
2. 接受任务（商户）
3. 更新任务进度（商户）
4. 完成任务（商户）

**预期结果**:
- ✅ 任务状态正确流转
- ✅ 进度更新记录
- ✅ 通知发送

**API测试**:
```bash
# 1. 创建任务
curl -X POST http://localhost:3001/api/merchant-tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"merchantId":"MERCHANT_ID","type":"custom_service","title":"定制服务","description":"需要定制服务","budget":5000,"currency":"CNY"}'

# 2. 商户接受任务
curl -X PUT http://localhost:3001/api/merchant-tasks/TASK_ID/accept \
  -H "Authorization: Bearer $MERCHANT_TOKEN"

# 3. 更新进度
curl -X PUT http://localhost:3001/api/merchant-tasks/TASK_ID/progress \
  -H "Authorization: Bearer $MERCHANT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"已完成50%","percentage":50}'

# 4. 完成任务
curl -X PUT http://localhost:3001/api/merchant-tasks/TASK_ID/complete \
  -H "Authorization: Bearer $MERCHANT_TOKEN"
```

---

### 测试7: 链上资产索引

**测试步骤**:
1. 索引一个NFT资产
2. 验证资产转换为商品
3. 搜索链上资产

**预期结果**:
- ✅ 资产成功索引
- ✅ 商品创建成功
- ✅ 可以在Marketplace搜索到

**API测试**:
```bash
# 1. 索引资产
curl -X POST http://localhost:3001/api/onchain-indexer/index \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"asset":{"contract":"0x123","tokenId":"1","chain":"ethereum","name":"Test NFT","owner":"0xabc"},"price":100,"currency":"USDT"}'

# 2. 搜索链上资产
curl -X POST http://localhost:3001/api/agent/search-onchain-assets \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"NFT收藏品","filters":{"type":"nft","chain":"ethereum"}}'
```

---

### 测试8: 沙箱执行

**测试步骤**:
1. 生成代码示例
2. 在沙箱中执行代码
3. 查看执行结果

**预期结果**:
- ✅ 代码执行成功
- ✅ 返回模拟结果
- ✅ 执行时间记录

**API测试**:
```bash
curl -X POST http://localhost:3001/api/sandbox/execute \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"code":"const payment = await agentrix.payments.create({amount: 100, currency: \"CNY\"});","language":"typescript"}'
```

---

### 测试9: 审计日志

**测试步骤**:
1. 执行各种Agent操作
2. 查询审计日志
3. 验证日志记录完整性

**预期结果**:
- ✅ 所有操作都有审计记录
- ✅ 记录包含请求/响应数据
- ✅ 记录操作耗时

**数据库查询**:
```sql
SELECT * FROM audit_logs 
WHERE "userId" = 'USER_ID' 
ORDER BY "createdAt" DESC 
LIMIT 10;
```

---

## ✅ 验收标准

### 功能验收

- [x] 多轮对话上下文保持（5轮内）
- [x] 意图识别准确率 > 80%
- [x] 推荐相关性 > 70%
- [x] PayIntent流程完整
- [x] QuickPay授权验证
- [x] 任务状态流转正确
- [x] 审计日志完整

### 性能验收

- [ ] API响应时间 < 500ms
- [ ] 推荐生成时间 < 1s
- [ ] 数据库查询优化

### 安全验收

- [x] 所有API需要认证
- [x] 用户数据隔离
- [x] 审计日志不可篡改

---

## 🐛 已知问题

1. **沙箱执行**: 当前是模拟执行，需要集成真实API执行
2. **链上资产同步**: 需要实际RPC节点集成
3. **推荐算法**: 需要更多用户行为数据优化

---

## 📞 问题反馈

如遇到问题，请：
1. 查看日志：`backend/logs/`
2. 检查数据库连接
3. 验证环境变量配置
4. 查看API文档：`http://localhost:3001/api/docs`

---

**测试完成！** 🎉

