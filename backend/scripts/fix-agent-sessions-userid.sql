-- 修复 agent_sessions 表中 userId 为 NULL 的问题
-- 执行此脚本后，userId 列将被设置为 NOT NULL

-- 1. 查看有多少条 userId 为 NULL 的记录
SELECT COUNT(*) as null_user_count 
FROM agent_sessions 
WHERE "userId" IS NULL;

-- 2. 删除所有 userId 为 NULL 的记录（如果这些是无效数据）
-- 注意：如果这些记录很重要，请先备份或修改为分配一个有效的 userId
DELETE FROM agent_sessions 
WHERE "userId" IS NULL;

-- 3. 如果表中有外键约束，先删除它
-- 查找外键约束名称
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'agent_sessions'
  AND kcu.column_name = 'userId';

-- 4. 删除外键约束（将 'FK_40a6b0600d60c067ae0f8659ce0' 替换为实际的外键名称）
-- ALTER TABLE agent_sessions DROP CONSTRAINT IF EXISTS "FK_40a6b0600d60c067ae0f8659ce0";

-- 5. 将 userId 设置为 NOT NULL
ALTER TABLE agent_sessions 
ALTER COLUMN "userId" SET NOT NULL;

-- 6. 重新创建外键约束（如果需要）
-- ALTER TABLE agent_sessions 
-- ADD CONSTRAINT "FK_40a6b0600d60c067ae0f8659ce0" 
-- FOREIGN KEY ("userId") 
-- REFERENCES users(id) 
-- ON DELETE NO ACTION 
-- ON UPDATE NO ACTION;

