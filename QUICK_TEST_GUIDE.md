# PayMind Agent V3.0 快速测试指南

**快速开始测试新功能**

---

## 🚀 一键启动（Windows）

```batch
# 双击运行或命令行执行
start-and-test.bat
```

这个脚本会：
1. ✅ 检查环境
2. ✅ 运行数据库迁移
3. ✅ 启动后端服务
4. ✅ 启动前端服务
5. ✅ 打开浏览器

---

## 🧪 快速测试清单

### ✅ 基础功能测试

1. **Agent多轮对话**
   - 访问: http://localhost:3000/agent
   - 发送: "帮我找一把游戏剑，预算20美元"
   - 继续: "把刚才那把加入购物车"
   - 验证: Agent能记住预算和商品类型

2. **情景感知推荐**
   - 发送: "推荐游戏装备"
   - 验证: 返回推荐商品，每个都有推荐理由

3. **PayIntent支付**
   - 创建PayIntent
   - 授权PayIntent
   - 执行PayIntent
   - 验证: 状态正确流转

4. **物流跟踪**
   - 查询订单物流
   - 更新物流状态
   - 验证: 物流事件记录

5. **沙箱执行**
   - 输入代码
   - 执行代码
   - 验证: 返回结果

---

## 📊 性能测试

### 运行性能测试脚本

**Linux/Mac:**
```bash
export PAYMIND_TOKEN='your-token'
./test-performance.sh
```

**Windows:**
```powershell
$env:PAYMIND_TOKEN='your-token'
# 需要安装Git Bash或WSL来运行.sh脚本
```

---

## 🔍 验证检查

### 1. 检查数据库表
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'agent_sessions', 'agent_messages', 'audit_logs',
  'user_profiles', 'merchant_tasks', 'pay_intents', 'quick_pay_grants'
);
```

### 2. 检查API端点
访问 http://localhost:3001/api/docs 确认所有端点存在

### 3. 检查日志
查看后端控制台输出，确认无错误

---

## ⚡ 快速问题排查

| 问题 | 解决方案 |
|------|---------|
| 迁移失败 | 检查PostgreSQL是否运行，检查.env配置 |
| 服务启动失败 | 检查端口是否被占用，检查依赖是否安装 |
| API 401错误 | 检查token是否有效，检查Authorization头 |
| 缓存不生效 | 检查CacheService是否正确注入 |

---

**测试愉快！** 🎉

