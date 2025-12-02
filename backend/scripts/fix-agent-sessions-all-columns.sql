-- 修复 agent_sessions 表所有缺失的列
-- 执行此脚本以添加所有必需的列

-- 1. 添加 sessionId 列（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'agent_sessions' 
        AND column_name = 'sessionId'
    ) THEN
        ALTER TABLE agent_sessions 
        ADD COLUMN "sessionId" VARCHAR(66) NULL;
        
        CREATE UNIQUE INDEX IF NOT EXISTS "IDX_agent_sessions_sessionId" 
        ON agent_sessions("sessionId") 
        WHERE "sessionId" IS NOT NULL;
        
        RAISE NOTICE 'sessionId column added successfully';
    ELSE
        RAISE NOTICE 'sessionId column already exists';
    END IF;
END $$;

-- 2. 添加 agentId 列（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'agent_sessions' 
        AND column_name = 'agentId'
    ) THEN
        ALTER TABLE agent_sessions 
        ADD COLUMN "agentId" VARCHAR(255) NULL;
        
        RAISE NOTICE 'agentId column added successfully';
    ELSE
        RAISE NOTICE 'agentId column already exists';
    END IF;
END $$;

-- 3. 添加 signerAddress 列（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'agent_sessions' 
        AND column_name = 'signerAddress'
    ) THEN
        ALTER TABLE agent_sessions 
        ADD COLUMN "signerAddress" VARCHAR(42) NULL;
        
        RAISE NOTICE 'signerAddress column added successfully';
    ELSE
        RAISE NOTICE 'signerAddress column already exists';
    END IF;
END $$;

-- 4. 添加 ownerAddress 列（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'agent_sessions' 
        AND column_name = 'ownerAddress'
    ) THEN
        ALTER TABLE agent_sessions 
        ADD COLUMN "ownerAddress" VARCHAR(42) NULL;
        
        RAISE NOTICE 'ownerAddress column added successfully';
    ELSE
        RAISE NOTICE 'ownerAddress column already exists';
    END IF;
END $$;

-- 5. 添加 singleLimit 列（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'agent_sessions' 
        AND column_name = 'singleLimit'
    ) THEN
        ALTER TABLE agent_sessions 
        ADD COLUMN "singleLimit" NUMERIC(18, 6) NULL;
        
        RAISE NOTICE 'singleLimit column added successfully';
    ELSE
        RAISE NOTICE 'singleLimit column already exists';
    END IF;
END $$;

-- 6. 添加 dailyLimit 列（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'agent_sessions' 
        AND column_name = 'dailyLimit'
    ) THEN
        ALTER TABLE agent_sessions 
        ADD COLUMN "dailyLimit" NUMERIC(18, 6) NULL;
        
        RAISE NOTICE 'dailyLimit column added successfully';
    ELSE
        RAISE NOTICE 'dailyLimit column already exists';
    END IF;
END $$;

-- 7. 添加 usedToday 列（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'agent_sessions' 
        AND column_name = 'usedToday'
    ) THEN
        ALTER TABLE agent_sessions 
        ADD COLUMN "usedToday" NUMERIC(18, 6) DEFAULT 0 NULL;
        
        RAISE NOTICE 'usedToday column added successfully';
    ELSE
        RAISE NOTICE 'usedToday column already exists';
    END IF;
END $$;

-- 8. 添加 expiry 列（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'agent_sessions' 
        AND column_name = 'expiry'
    ) THEN
        ALTER TABLE agent_sessions 
        ADD COLUMN "expiry" TIMESTAMP NULL;
        
        RAISE NOTICE 'expiry column added successfully';
    ELSE
        RAISE NOTICE 'expiry column already exists';
    END IF;
END $$;

-- 9. 添加 context 列（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'agent_sessions' 
        AND column_name = 'context'
    ) THEN
        ALTER TABLE agent_sessions 
        ADD COLUMN "context" JSONB NULL;
        
        RAISE NOTICE 'context column added successfully';
    ELSE
        RAISE NOTICE 'context column already exists';
    END IF;
END $$;

-- 10. 添加 lastMessageAt 列（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'agent_sessions' 
        AND column_name = 'lastMessageAt'
    ) THEN
        ALTER TABLE agent_sessions 
        ADD COLUMN "lastMessageAt" TIMESTAMP NULL;
        
        RAISE NOTICE 'lastMessageAt column added successfully';
    ELSE
        RAISE NOTICE 'lastMessageAt column already exists';
    END IF;
END $$;

