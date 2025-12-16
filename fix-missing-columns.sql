-- ============================================
-- 一次性修复所有缺失的数据库列
-- ============================================

-- 1. 修复 users 表缺失的列
-- 1.1 添加 googleId 列（可空，唯一）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'googleId'
    ) THEN
        ALTER TABLE "users" ADD COLUMN "googleId" VARCHAR;
        CREATE UNIQUE INDEX IF NOT EXISTS "IDX_users_googleId" 
            ON "users" ("googleId") WHERE "googleId" IS NOT NULL;
        RAISE NOTICE 'Added googleId column to users table';
    ELSE
        RAISE NOTICE 'googleId column already exists in users table';
    END IF;
END $$;

-- 1.2 添加 metadata 列（JSONB，可空）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'metadata'
    ) THEN
        ALTER TABLE "users" ADD COLUMN "metadata" JSONB;
        RAISE NOTICE 'Added metadata column to users table';
    ELSE
        RAISE NOTICE 'metadata column already exists in users table';
    END IF;
END $$;

-- 1.3 修复 agentrixId 列（如果存在且为 NOT NULL，改为可空）
-- 注意：实体中没有定义此字段，但数据库中可能存在，需要改为可空
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
          AND column_name = 'agentrixId'
          AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE "users" ALTER COLUMN "agentrixId" DROP NOT NULL;
        RAISE NOTICE 'Changed agentrixId column to nullable in users table';
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
          AND column_name = 'agentrixId'
    ) THEN
        RAISE NOTICE 'agentrixId column already nullable in users table';
    ELSE
        RAISE NOTICE 'agentrixId column does not exist in users table (no action needed)';
    END IF;
END $$;

-- 1.4 修复 roles 列类型和默认值
-- 注意：实体中定义为 enum[]，数据库应该是 varchar[] 数组类型
DO $$
DECLARE
    roles_col_type text;
    roles_col_exists boolean;
BEGIN
    -- 检查 roles 列是否存在
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'roles'
    ) INTO roles_col_exists;
    
    IF roles_col_exists THEN
        -- 获取当前列的类型
        SELECT udt_name INTO roles_col_type
        FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'roles';
        
        RAISE NOTICE 'roles column exists with type: %', roles_col_type;
        
        -- 确保所有 NULL 值都有默认值
        UPDATE "users" 
        SET "roles" = ARRAY['user']::varchar[] 
        WHERE "roles" IS NULL;
        
        -- 尝试设置默认值（如果列类型是数组类型）
        BEGIN
            ALTER TABLE "users" ALTER COLUMN "roles" SET DEFAULT ARRAY['user']::varchar[];
            RAISE NOTICE 'Set default value for roles column';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not set default value for roles: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE 'roles column does not exist in users table';
    END IF;
END $$;

-- 2. 修复 market_monitors 表缺失的列
-- 2.1 添加 strategy_graph_id 列（UUID，可空）
-- 注意：TypeORM 会将 camelCase (strategyGraphId) 转换为 snake_case (strategy_graph_id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'market_monitors' AND column_name = 'strategy_graph_id'
    ) THEN
        ALTER TABLE "market_monitors" ADD COLUMN "strategy_graph_id" UUID;
        RAISE NOTICE 'Added strategy_graph_id column to market_monitors table';
    ELSE
        RAISE NOTICE 'strategy_graph_id column already exists in market_monitors table';
    END IF;
END $$;

-- 3. 验证所有列已正确添加和修复
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable,
    CASE 
        WHEN column_name = 'googleId' AND table_name = 'users' THEN '✓'
        WHEN column_name = 'metadata' AND table_name = 'users' THEN '✓'
        WHEN column_name = 'agentrixId' AND table_name = 'users' AND is_nullable = 'YES' THEN '✓ (nullable)'
        WHEN column_name = 'agentrixId' AND table_name = 'users' AND is_nullable = 'NO' THEN '⚠ (still NOT NULL)'
        WHEN column_name = 'strategy_graph_id' AND table_name = 'market_monitors' THEN '✓'
        ELSE ''
    END as status
FROM information_schema.columns 
WHERE (table_name = 'users' AND column_name IN ('googleId', 'metadata', 'agentrixId'))
   OR (table_name = 'market_monitors' AND column_name = 'strategy_graph_id')
ORDER BY table_name, column_name;

