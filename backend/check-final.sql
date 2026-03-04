-- Final check of agent_stats table
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'agent_stats' 
ORDER BY ordinal_position;
