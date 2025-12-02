-- 修复 agent_sessions 表缺少 sessionId 列的问题
-- 执行此脚本以添加缺失的 sessionId 列

-- 1. 检查列是否存在
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'agent_sessions' 
        AND column_name = 'sessionId'
    ) THEN
        -- 如果不存在 sessionId，检查是否有 session_id（snake_case）
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'agent_sessions' 
            AND column_name = 'session_id'
        ) THEN
            -- 如果存在 session_id，重命名为 sessionId
            ALTER TABLE agent_sessions RENAME COLUMN "session_id" TO "sessionId";
        ELSE
            -- 如果都不存在，添加新列
            ALTER TABLE agent_sessions 
            ADD COLUMN "sessionId" VARCHAR(66) NULL;
        END IF;
        
        -- 添加唯一索引（如果不存在）
        CREATE UNIQUE INDEX IF NOT EXISTS "IDX_agent_sessions_sessionId" 
        ON agent_sessions("sessionId") 
        WHERE "sessionId" IS NOT NULL;
        
        RAISE NOTICE 'sessionId column added or renamed successfully';
    ELSE
        RAISE NOTICE 'sessionId column already exists';
    END IF;
END $$;

