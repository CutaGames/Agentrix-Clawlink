# 数据库迁移问题修复指南

## 🔍 问题分析

从终端输出可以看到：

```
error: relation "users" already exists
Migration "InitialSchema1700000000000" failed
```

**原因**:
- 数据库已经有V2.2的表（通过 `synchronize: true` 自动创建）
- 但 `migrations` 表中没有记录
- TypeORM认为需要执行所有迁移，包括创建已存在的表

---

## ✅ 解决方案

### 方案1: 使用修复脚本（最简单）

**Windows:**
```batch
快速修复迁移.bat
```

**Linux/WSL:**
```bash
chmod +x 快速修复迁移.sh
./快速修复迁移.sh
```

### 方案2: 手动修复

#### 步骤1: 检查迁移状态

```bash
cd backend
npm run migration:check
```

这会显示：
- 已执行的迁移列表
- V3.0新表的存在状态

#### 步骤2: 修复迁移记录

```bash
cd backend
npm run migration:fix
```

这会：
- 检查哪些表已存在
- 为已存在的表插入迁移记录

#### 步骤3: 运行V3.0新迁移

```bash
cd backend
npm run migration:v3-only
```

这会：
- 检查V3.0新表是否存在
- 如果不存在，运行迁移创建
- 如果已存在，只插入迁移记录

#### 步骤4: 验证

```bash
cd backend
npm run migration:check
```

应该看到所有V3.0新表都已存在。

---

## 🔧 手动SQL修复（如果脚本失败）

如果修复脚本失败，可以手动执行SQL：

```sql
-- 连接到PostgreSQL
psql -U postgres -d agentrix

-- 1. 检查migrations表
SELECT * FROM migrations ORDER BY timestamp;

-- 2. 如果users表已存在，插入初始迁移记录
INSERT INTO migrations (timestamp, name) 
VALUES (1700000000000, 'InitialSchema1700000000000')
ON CONFLICT DO NOTHING;

-- 3. 插入其他已存在的迁移记录
INSERT INTO migrations (timestamp, name) 
VALUES (1763025405599, 'AddUserFieldsAndNotification1763025405599')
ON CONFLICT DO NOTHING;

-- 4. 检查V3.0新表是否存在
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

-- 5. 如果V3.0新表不存在，运行迁移
-- 退出psql，然后运行：
-- cd backend && npm run migration:run
```

---

## 🚀 修复后重新启动

迁移修复完成后，重新启动服务：

```bash
# 停止当前服务
./停止所有服务.sh

# 重新启动
./启动所有服务-V3.sh
```

---

## 📊 验证服务运行

### 检查后端服务

```bash
curl http://localhost:3001/api/health
```

### 检查数据库表

```sql
-- 检查所有V3.0新表
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
)
ORDER BY table_name;
```

应该看到7个表都存在。

---

## ⚠️ 注意事项

1. **不要删除现有表** - 只插入迁移记录
2. **备份数据库** - 修复前建议备份
3. **检查迁移记录** - 确保迁移记录正确

---

## 🎯 快速修复命令

**一键修复（推荐）:**

```bash
# Linux/WSL
chmod +x 快速修复迁移.sh
./快速修复迁移.sh

# 然后重新启动
./启动所有服务-V3.sh
```

---

**修复完成后，所有V3.0功能即可正常使用！** ✅

