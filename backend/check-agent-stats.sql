-- Check agent_stats table columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'agent_stats' 
ORDER BY ordinal_position;
