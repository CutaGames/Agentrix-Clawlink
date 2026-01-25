-- Fix agent_stats table - add missing columns
ALTER TABLE agent_stats ADD COLUMN IF NOT EXISTS total_calls INTEGER DEFAULT 0;
ALTER TABLE agent_stats ADD COLUMN IF NOT EXISTS total_revenue DECIMAL(15, 2) DEFAULT 0;
ALTER TABLE agent_stats ADD COLUMN IF NOT EXISTS total_users INTEGER DEFAULT 0;
ALTER TABLE agent_stats ADD COLUMN IF NOT EXISTS avg_rating DECIMAL(3, 2) DEFAULT 0;
ALTER TABLE agent_stats ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP;
ALTER TABLE agent_stats ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE agent_stats ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE agent_stats ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Verify
SELECT column_name FROM information_schema.columns WHERE table_name = 'agent_stats';
