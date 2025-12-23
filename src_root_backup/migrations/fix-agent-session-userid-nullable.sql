-- 修复 AgentSession userId 字段允许 null
-- 执行方式：在数据库中直接运行此SQL，或通过TypeORM迁移

-- PostgreSQL
ALTER TABLE agent_sessions ALTER COLUMN "userId" DROP NOT NULL;

-- 如果外键约束存在，需要先删除再重新创建
-- ALTER TABLE agent_sessions DROP CONSTRAINT IF EXISTS "FK_agent_sessions_user";
-- ALTER TABLE agent_sessions ADD CONSTRAINT "FK_agent_sessions_user" 
--   FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL;

