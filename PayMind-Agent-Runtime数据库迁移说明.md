# PayMind Agent Runtime 数据库迁移说明

## 🗄️ 运行数据库迁移

### 方式1：在 WSL 中运行（推荐）

如果您在 WSL 环境中，使用以下命令：

```bash
# 进入 backend 目录
cd backend

# 运行迁移
npm run migration:run
```

### 方式2：在 PowerShell 中使用 WSL

```powershell
# 使用 WSL 运行命令
wsl bash -c "cd /mnt/d/wsl/Ubuntu-24.04/Code/Paymind/paymind-website/backend && npm run migration:run"
```

### 方式3：直接使用 TypeORM CLI

```bash
cd backend
npx typeorm-ts-node-commonjs migration:run -d src/config/data-source.ts
```

---

## 📋 需要创建的数据库表

运行迁移后，将创建以下表：

1. **agent_memory** - Agent 记忆表
   - 用于持久化上下文记忆
   - 支持跨轮次引用

2. **agent_workflow** - Agent 流程表
   - 用于管理多步骤流程
   - 支持流程状态跟踪

---

## ✅ 验证迁移

### 方式1：使用 SQL 查询

```sql
-- 连接到 PostgreSQL
psql -U postgres -d paymind

-- 检查表是否创建
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('agent_memory', 'agent_workflow');
```

### 方式2：检查迁移记录

```sql
-- 查看迁移记录
SELECT * FROM migrations 
WHERE name LIKE '%AgentMemory%' OR name LIKE '%AgentWorkflow%'
ORDER BY timestamp DESC;
```

---

## 🔧 如果迁移失败

### 问题1：表已存在

如果表已经存在，迁移可能会失败。可以：

1. **跳过迁移**（如果表结构正确）
2. **手动删除表后重新运行**
   ```sql
   DROP TABLE IF EXISTS agent_workflow CASCADE;
   DROP TABLE IF EXISTS agent_memory CASCADE;
   ```
3. **检查迁移文件是否正确**

### 问题2：权限问题

确保数据库用户有创建表的权限：

```sql
-- 授予权限
GRANT ALL PRIVILEGES ON DATABASE paymind TO your_user;
```

### 问题3：连接问题

检查 `.env` 文件中的数据库配置：

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=paymind
```

---

## 📝 迁移文件位置

迁移文件位于：
```
backend/src/migrations/1768000001000-AddAgentMemoryAndWorkflow.ts
```

---

## 🚀 迁移完成后

迁移完成后，可以：

1. **启动服务**
   ```bash
   cd backend
   npm run start:dev
   ```

2. **测试 Runtime 功能**
   - 参考 `PayMind-Agent-Runtime测试指南.md`
   - 测试完整电商流程

---

**注意**：如果遇到问题，请查看控制台错误信息，或检查数据库连接配置。

