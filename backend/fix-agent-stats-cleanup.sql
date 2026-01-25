-- Check what columns currently exist in agent_stats
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'agent_stats' 
ORDER BY ordinal_position;

-- Drop the camelCase columns (we want to keep snake_case)
DO $$ 
BEGIN
    -- Drop totalCalls if total_calls exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agent_stats' AND column_name = 'totalCalls') 
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agent_stats' AND column_name = 'total_calls') THEN
        ALTER TABLE agent_stats DROP COLUMN "totalCalls";
    END IF;
    
    -- Drop totalRevenue if total_revenue exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agent_stats' AND column_name = 'totalRevenue') 
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agent_stats' AND column_name = 'total_revenue') THEN
        ALTER TABLE agent_stats DROP COLUMN "totalRevenue";
    END IF;
    
    -- Drop totalUsers if total_users exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agent_stats' AND column_name = 'totalUsers') 
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agent_stats' AND column_name = 'total_users') THEN
        ALTER TABLE agent_stats DROP COLUMN "totalUsers";
    END IF;
    
    -- Drop avgRating if avg_rating exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agent_stats' AND column_name = 'avgRating') 
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agent_stats' AND column_name = 'avg_rating') THEN
        ALTER TABLE agent_stats DROP COLUMN "avgRating";
    END IF;
END $$;

-- Verify the result
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'agent_stats' 
ORDER BY ordinal_position;
