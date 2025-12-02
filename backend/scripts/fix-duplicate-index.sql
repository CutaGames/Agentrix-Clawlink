-- 修复 agent_stats 表的重复索引问题
-- 如果索引已存在，先删除它（唯一约束会自动创建索引）

-- 检查并删除重复的索引（如果存在）
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM pg_indexes 
        WHERE tablename = 'agent_stats' 
        AND indexname = 'IDX_d08447b22df0d9e98f5d25e6d0'
    ) THEN
        DROP INDEX IF EXISTS "IDX_d08447b22df0d9e98f5d25e6d0";
        RAISE NOTICE '已删除重复索引: IDX_d08447b22df0d9e98f5d25e6d0';
    ELSE
        RAISE NOTICE '索引不存在，无需删除';
    END IF;
END $$;

