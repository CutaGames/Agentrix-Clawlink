-- ============================================
-- 修复 agent_sessions 表缺失的列
-- ============================================

DO $$
BEGIN
    -- 1. 检查并添加 session_id 列
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'agent_sessions' AND column_name = 'session_id'
    ) THEN
        ALTER TABLE "agent_sessions" ADD COLUMN "session_id" VARCHAR(66);
        CREATE UNIQUE INDEX IF NOT EXISTS "IDX_agent_sessions_session_id" 
            ON "agent_sessions" ("session_id") WHERE "session_id" IS NOT NULL;
        RAISE NOTICE 'Added session_id column to agent_sessions table';
    END IF;

    -- 2. 检查并添加 user_id 列
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'agent_sessions' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE "agent_sessions" ADD COLUMN "user_id" UUID;
        RAISE NOTICE 'Added user_id column to agent_sessions table';
    END IF;

    -- 3. 检查并添加 agent_id 列
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'agent_sessions' AND column_name = 'agent_id'
    ) THEN
        ALTER TABLE "agent_sessions" ADD COLUMN "agent_id" VARCHAR;
        RAISE NOTICE 'Added agent_id column to agent_sessions table';
    END IF;

    -- 4. 检查并添加 signer_address 列
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'agent_sessions' AND column_name = 'signer_address'
    ) THEN
        ALTER TABLE "agent_sessions" ADD COLUMN "signer_address" VARCHAR(42);
        RAISE NOTICE 'Added signer_address column to agent_sessions table';
    END IF;

    -- 5. 检查并添加 owner_address 列
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'agent_sessions' AND column_name = 'owner_address'
    ) THEN
        ALTER TABLE "agent_sessions" ADD COLUMN "owner_address" VARCHAR(42);
        RAISE NOTICE 'Added owner_address column to agent_sessions table';
    END IF;

    -- 6. 检查并添加 single_limit 列
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'agent_sessions' AND column_name = 'single_limit'
    ) THEN
        ALTER TABLE "agent_sessions" ADD COLUMN "single_limit" DECIMAL(18, 6);
        RAISE NOTICE 'Added single_limit column to agent_sessions table';
    END IF;

    -- 7. 检查并添加 daily_limit 列
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'agent_sessions' AND column_name = 'daily_limit'
    ) THEN
        ALTER TABLE "agent_sessions" ADD COLUMN "daily_limit" DECIMAL(18, 6);
        RAISE NOTICE 'Added daily_limit column to agent_sessions table';
    END IF;

    -- 8. 检查并添加 status 列
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'agent_sessions' AND column_name = 'status'
    ) THEN
        ALTER TABLE "agent_sessions" ADD COLUMN "status" VARCHAR DEFAULT 'active';
        RAISE NOTICE 'Added status column to agent_sessions table';
    END IF;

END $$;
