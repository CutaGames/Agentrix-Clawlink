-- 快速修复 agent_sessions 表的 userId NULL 值问题
-- 1. 删除所有 userId 为 NULL 的记录
DELETE FROM agent_sessions WHERE "userId" IS NULL;

-- 2. 删除外键约束（如果存在）
ALTER TABLE agent_sessions DROP CONSTRAINT IF EXISTS "FK_40a6b0600d60c067ae0f8659ce0";

-- 3. 将 userId 设置为 NOT NULL
ALTER TABLE agent_sessions ALTER COLUMN "userId" SET NOT NULL;

