-- Fix agent_stats table - rename camelCase columns to snake_case
-- First check what columns exist
SELECT column_name FROM information_schema.columns WHERE table_name = 'agent_stats';

-- Rename camelCase columns to snake_case (if they exist)
DO $$ 
BEGIN
    -- totalCalls -> total_calls
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agent_stats' AND column_name = 'totalCalls') THEN
        ALTER TABLE agent_stats RENAME COLUMN "totalCalls" TO total_calls;
    END IF;
    
    -- totalRevenue -> total_revenue
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agent_stats' AND column_name = 'totalRevenue') THEN
        ALTER TABLE agent_stats RENAME COLUMN "totalRevenue" TO total_revenue;
    END IF;
    
    -- totalUsers -> total_users
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agent_stats' AND column_name = 'totalUsers') THEN
        ALTER TABLE agent_stats RENAME COLUMN "totalUsers" TO total_users;
    END IF;
    
    -- avgRating -> avg_rating
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agent_stats' AND column_name = 'avgRating') THEN
        ALTER TABLE agent_stats RENAME COLUMN "avgRating" TO avg_rating;
    END IF;
    
    -- lastActiveAt -> last_active_at
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agent_stats' AND column_name = 'lastActiveAt') THEN
        ALTER TABLE agent_stats RENAME COLUMN "lastActiveAt" TO last_active_at;
    END IF;
    
    -- agentId -> agent_id (if it exists as camelCase)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agent_stats' AND column_name = 'agentId') THEN
        ALTER TABLE agent_stats RENAME COLUMN "agentId" TO agent_id;
    END IF;
    
    -- createdAt -> created_at
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agent_stats' AND column_name = 'createdAt') THEN
        ALTER TABLE agent_stats RENAME COLUMN "createdAt" TO created_at;
    END IF;
    
    -- updatedAt -> updated_at
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agent_stats' AND column_name = 'updatedAt') THEN
        ALTER TABLE agent_stats RENAME COLUMN "updatedAt" TO updated_at;
    END IF;
END $$;

-- Verify the result
SELECT column_name FROM information_schema.columns WHERE table_name = 'agent_stats' ORDER BY ordinal_position;
