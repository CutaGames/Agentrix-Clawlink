-- 修复 AgentSession userId 字段允许 null
-- 执行方式：在 psql 中直接执行，或通过命令行

-- 方法1：如果数据库名是 paymind
ALTER TABLE agent_sessions ALTER COLUMN "userId" DROP NOT NULL;

-- 方法2：如果数据库名是 paymind_db
-- ALTER TABLE agent_sessions ALTER COLUMN "userId" DROP NOT NULL;

-- 验证修复是否成功
SELECT column_name, is_nullable, data_type 
FROM information_schema.columns 
WHERE table_name = 'agent_sessions' AND column_name = 'userId';

