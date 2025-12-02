# PayMind Agent V3.0 快速开始指南

**版本**: V3.0  
**更新时间**: 2025-01-XX

---

## 🚀 快速启动（3步）

### 步骤1: 运行数据库迁移

```bash
cd backend
npm run migration:run
```

这将创建所有V3.0需要的新表。

### 步骤2: 启动服务

```bash
# 终端1 - 后端
cd backend
npm run start:dev

# 终端2 - 前端
cd paymindfrontend
npm run dev
```

### 步骤3: 访问应用

- **前端**: http://localhost:3000/agent
- **API文档**: http://localhost:3001/api/docs

---

## 🧪 快速测试

### 方式1: 使用测试脚本（推荐）

**Windows (PowerShell)**:
```powershell
# 先设置token（需要先登录获取）
$env:PAYMIND_TOKEN='your-token-here'
.\run-tests-v3.ps1
```

**Linux/Mac**:
```bash
# 先设置token
export PAYMIND_TOKEN='your-token-here'
chmod +x test-agent-v3.sh
./test-agent-v3.sh
```

### 方式2: 手动测试

1. **打开Agent页面**: http://localhost:3000/agent
2. **发送消息**: "帮我找一把游戏剑，预算20美元"
3. **查看响应**: 应该看到商品搜索结果和比价信息
4. **继续对话**: "把刚才那把加入购物车"
5. **验证上下文**: Agent应该记住预算和商品类型

---

## 📋 核心功能演示

### 1. 多轮对话

```
用户: 帮我找一把游戏剑，预算20美元
Agent: 让我为您搜索和对比相关商品...
      [显示商品列表和比价信息]

用户: 把刚才那把加入购物车
Agent: 好的，已为您添加到购物车...
      [记住预算20美元和商品类型]
```

### 2. 情景感知推荐

```
用户: 推荐游戏装备
Agent: 基于您的偏好和对话上下文，为您推荐：
      [显示推荐商品，每个都有推荐理由]
```

### 3. PayIntent支付流程

```
1. 创建PayIntent → 返回支付链接和二维码
2. 授权PayIntent → 用户确认
3. 执行PayIntent → 创建实际支付
4. 完成 → 返回支付结果
```

### 4. Agent→商户协作

```
1. 用户创建任务 → 发送给商户
2. 商户接受任务 → 通知用户
3. 商户更新进度 → 实时通知
4. 任务完成 → 自动结算
```

---

## 🔍 验证功能

### 检查数据库表

```sql
-- 检查新表是否创建
SELECT table_name FROM information_schema.tables 
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

### 检查API端点

访问 http://localhost:3001/api/docs 查看所有API端点。

### 检查日志

```bash
# 后端日志
tail -f backend/logs/app.log

# 查看审计日志
# 在数据库中查询 audit_logs 表
```

---

## ⚠️ 常见问题

### 1. 数据库迁移失败

**问题**: 迁移脚本执行失败

**解决**:
```bash
# 检查数据库连接
# 检查 .env 文件中的 DATABASE_URL
# 确保PostgreSQL正在运行
```

### 2. API返回401错误

**问题**: 未授权

**解决**:
- 确保已登录
- 检查token是否有效
- 检查请求头中的Authorization

### 3. 会话不保持

**问题**: 多轮对话上下文丢失

**解决**:
- 确保前端传递 `sessionId`
- 检查数据库中的 `agent_sessions` 表
- 查看后端日志

---

## 📚 相关文档

- [完整功能报告](./PAYMIND_AGENT_V3_COMPLETE.md)
- [测试验收指南](./TESTING_AND_ACCEPTANCE_GUIDE.md)
- [详细进度报告](./PAYMIND_AGENT_V3_DETAILED_PROGRESS.md)

---

**祝您使用愉快！** 🎉

