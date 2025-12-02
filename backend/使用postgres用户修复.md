# 使用 postgres 用户修复数据库

## 问题
`.env` 文件中配置的密码是 `postgres`，但 `paymind` 用户的密码可能不匹配。

## 解决方案：使用 postgres 超级用户

### 方法 1：直接执行 SQL 脚本（推荐）

在 WSL 终端中执行：

```bash
cd /mnt/d/wsl/Ubuntu-24.04/Code/Paymind/paymind-website/backend

# 使用 postgres 用户执行修复脚本
PGPASSWORD='postgres' psql -U postgres -d paymind_db -h localhost -f scripts/fix-with-postgres.sql
```

### 方法 2：手动连接并执行

```bash
# 1. 使用 postgres 用户连接
PGPASSWORD='postgres' psql -U postgres -d paymind_db -h localhost

# 2. 在 psql 中执行：
DELETE FROM agent_sessions WHERE "userId" IS NULL;
ALTER TABLE agent_sessions DROP CONSTRAINT IF EXISTS "FK_40a6b0600d60c067ae0f8659ce0";
ALTER TABLE agent_sessions ALTER COLUMN "userId" SET NOT NULL;

# 3. 退出
\q
```

### 方法 3：重置 paymind 用户密码（可选）

如果你想统一密码，可以在修复后重置：

```bash
# 使用 postgres 用户连接
PGPASSWORD='postgres' psql -U postgres -d postgres -h localhost

# 重置 paymind 用户密码为 postgres（与 .env 文件一致）
ALTER USER paymind WITH PASSWORD 'postgres';

# 退出
\q
```

## 修复后

重启后端服务：

```bash
cd backend
npm run start:dev
```

应该看到：
```
🚀 PayMind Backend is running on: http://0.0.0.0:3001
📚 API Documentation: http://0.0.0.0:3001/api/docs
```

